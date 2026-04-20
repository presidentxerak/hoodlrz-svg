import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract, Interface } from "ethers";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID } from "@/lib/web3/config";

export const dynamic = "force-dynamic";

// Mainnet fallback if env vars aren't set on preview deployments
const CONTRACT_ADDRESS = HOODLRZ_NFT_ADDRESS || "0x3468802ffcE5Aa75793cA555eb485A4eCD67449e";
const CHAIN_ID = HOODLRZ_NFT_ADDRESS ? HOODLRZ_CHAIN_ID : 1;

// Multicall3 is deployed at the same address on mainnet and Sepolia.
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const RPC_URLS: Record<number, string[]> = {
  1: [
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
    "https://eth.llamarpc.com",
    "https://1rpc.io/eth",
    "https://eth.drpc.org",
  ],
  11155111: [
    "https://rpc.sepolia.org",
    "https://rpc.ankr.com/eth_sepolia",
  ],
};

// Simple in-memory cache — good enough to smooth over page refreshes.
interface CacheEntry {
  at: number;
  payload: { tokens: TokenInfo[]; totalSupply: number; debug?: string };
}
const CACHE_TTL_MS = 30_000;
let cache: CacheEntry | null = null;

interface TokenInfo {
  tokenId: number;
  seed: string;
  owner: string;
}

interface Multicall3Result {
  success: boolean;
  returnData: string;
}

async function getProvider(): Promise<JsonRpcProvider> {
  const urls = RPC_URLS[CHAIN_ID] ?? RPC_URLS[1];

  for (const url of urls) {
    try {
      const provider = new JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log(`[api/gallery] Connected to RPC: ${url}`);
      return provider;
    } catch (err) {
      console.warn(`[api/gallery] RPC failed: ${url}`, (err as Error).message);
    }
  }

  throw new Error(`All ${urls.length} RPCs failed for chain ${CHAIN_ID}. Tried: ${urls.join(", ")}`);
}

export async function GET() {
  console.log("[api/gallery] NFT_ADDRESS:", CONTRACT_ADDRESS, "CHAIN_ID:", CHAIN_ID, "ENV_SET:", !!HOODLRZ_NFT_ADDRESS);

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    console.log(`[api/gallery] Cache hit (${cache.payload.tokens.length} tokens)`);
    return NextResponse.json(cache.payload);
  }

  try {
    const provider = await getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, HOODLRZ_NFT_ABI, provider);

    const supply = Number(await contract.totalSupply());
    console.log(`[api/gallery] totalSupply: ${supply}`);

    if (supply === 0) {
      const payload = { tokens: [], totalSupply: 0 };
      cache = { at: Date.now(), payload };
      return NextResponse.json(payload);
    }

    const iface = new Interface(HOODLRZ_NFT_ABI);
    const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

    // Build one call pair (tokenSeed + ownerOf) per tokenId.
    type Call = { target: string; allowFailure: boolean; callData: string };
    const calls: Call[] = [];
    for (let id = 1; id <= supply; id++) {
      calls.push({
        target: CONTRACT_ADDRESS,
        allowFailure: true,
        callData: iface.encodeFunctionData("tokenSeed", [id]),
      });
      calls.push({
        target: CONTRACT_ADDRESS,
        allowFailure: true,
        callData: iface.encodeFunctionData("ownerOf", [id]),
      });
    }

    // Chunk into sub-multicalls to stay under RPC request size limits.
    const CHUNK = 200; // 100 tokens worth of call pairs
    const allResults: Multicall3Result[] = [];
    let multicallFailures = 0;
    for (let i = 0; i < calls.length; i += CHUNK) {
      const slice = calls.slice(i, i + CHUNK);
      try {
        const res = await multicall.aggregate3.staticCall(slice);
        for (const r of res) {
          allResults.push({ success: r.success, returnData: r.returnData });
        }
      } catch (err) {
        console.warn(`[api/gallery] Multicall chunk ${i / CHUNK} failed:`, (err as Error).message);
        multicallFailures++;
        // Pad with failures so indices stay aligned.
        for (let j = 0; j < slice.length; j++) {
          allResults.push({ success: false, returnData: "0x" });
        }
      }
    }

    const tokens: TokenInfo[] = [];
    let tokenFailures = 0;
    for (let id = 1; id <= supply; id++) {
      const seedRes = allResults[(id - 1) * 2];
      const ownerRes = allResults[(id - 1) * 2 + 1];

      if (!seedRes?.success || !ownerRes?.success) {
        tokenFailures++;
        continue;
      }

      try {
        const seedBig = iface.decodeFunctionResult("tokenSeed", seedRes.returnData)[0] as bigint;
        const owner = iface.decodeFunctionResult("ownerOf", ownerRes.returnData)[0] as string;
        tokens.push({ tokenId: id, seed: seedBig.toString(), owner });
      } catch (err) {
        console.warn(`[api/gallery] Decode failed for token ${id}:`, (err as Error).message);
        tokenFailures++;
      }
    }

    console.log(`[api/gallery] Returning ${tokens.length}/${supply} tokens (failures: ${tokenFailures}, chunks: ${multicallFailures})`);

    const payload = {
      tokens,
      totalSupply: supply,
      debug:
        tokenFailures > 0
          ? `${tokenFailures} token(s) failed to load; ${multicallFailures} multicall chunk(s) errored`
          : undefined,
    };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[api/gallery] Error:", message);
    return NextResponse.json(
      { error: message, tokens: [], totalSupply: 0 },
      { status: 500 }
    );
  }
}
