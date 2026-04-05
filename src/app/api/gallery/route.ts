import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract } from "ethers";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID } from "@/lib/web3/config";

export const dynamic = "force-dynamic";

// Mainnet fallback if env vars aren't set on preview deployments
const CONTRACT_ADDRESS = HOODLRZ_NFT_ADDRESS || "0x3468802ffcE5Aa75793cA555eb485A4eCD67449e";
const CHAIN_ID = HOODLRZ_NFT_ADDRESS ? HOODLRZ_CHAIN_ID : 1;

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

  try {
    const provider = await getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, HOODLRZ_NFT_ABI, provider);

    const supply = Number(await contract.totalSupply());
    console.log(`[api/gallery] totalSupply: ${supply}`);

    if (supply === 0) {
      return NextResponse.json({ tokens: [], totalSupply: 0 });
    }

    // Fetch all token data in parallel batches
    const BATCH = 10;
    const tokens: Array<{ tokenId: number; seed: string; owner: string }> = [];

    for (let start = 1; start <= supply; start += BATCH) {
      const end = Math.min(start + BATCH - 1, supply);
      const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      const results = await Promise.all(
        batch.map(async (tokenId) => {
          try {
            const [seedBig, owner] = await Promise.all([
              contract.tokenSeed(tokenId) as Promise<bigint>,
              contract.ownerOf(tokenId) as Promise<string>,
            ]);
            return { tokenId, seed: seedBig.toString(), owner };
          } catch (err) {
            console.warn(`[api/gallery] Token ${tokenId} failed:`, (err as Error).message);
            return null;
          }
        })
      );

      for (const r of results) {
        if (r) tokens.push(r);
      }
    }

    console.log(`[api/gallery] Returning ${tokens.length} tokens`);
    return NextResponse.json({ tokens, totalSupply: supply });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[api/gallery] Error:", message);
    return NextResponse.json(
      { error: message, tokens: [], totalSupply: 0 },
      { status: 500 }
    );
  }
}
