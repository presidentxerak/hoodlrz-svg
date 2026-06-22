import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract, Interface } from "ethers";
import { HOODLRZ_STREET_ADDRESS, HOODLRZ_STREET_CHAIN_ID } from "@/lib/web3/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTRACT_ADDRESS = HOODLRZ_STREET_ADDRESS;
const CHAIN_ID = HOODLRZ_STREET_CHAIN_ID;

// Minimal ERC-721 + Enumerable ABI
const ERC721_ABI = [
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
] as const;

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

const RPC_URLS: string[] = [
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
];

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://nftstorage.link/ipfs/",
];

interface TraitAttribute {
  trait_type: string;
  value: string | number;
}

interface RawMetadata {
  name?: string;
  image?: string;
  description?: string;
  attributes?: TraitAttribute[];
}

interface CollectionToken {
  tokenId: number;
  name: string;
  image: string;
  attributes: TraitAttribute[];
}

interface Payload {
  tokens: CollectionToken[];
  totalSupply: number;
  facets: Record<string, string[]>;
  contract: string;
  chainId: number;
  debug?: string;
}

let cache: { at: number; payload: Payload } | null = null;
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes — metadata is immutable

async function getProvider(): Promise<JsonRpcProvider> {
  for (const url of RPC_URLS) {
    try {
      const provider = new JsonRpcProvider(url);
      await provider.getBlockNumber();
      return provider;
    } catch {
      // try next
    }
  }
  throw new Error("All RPCs failed");
}

function resolveUri(uri: string, gatewayIndex = 0): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "");
    return IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length] + path;
  }
  if (uri.startsWith("ar://")) {
    return "https://arweave.net/" + uri.replace(/^ar:\/\//, "");
  }
  return uri;
}

async function fetchMetadata(uri: string): Promise<RawMetadata | null> {
  // Try a couple of IPFS gateways on failure (handles flaky public gateways).
  for (let g = 0; g < IPFS_GATEWAYS.length; g++) {
    const target = resolveUri(uri, g);
    try {
      const res = await fetch(target, { cache: "force-cache" });
      if (!res.ok) continue;
      // Some metadata is base64-encoded data URI
      const text = await res.text();
      const data = JSON.parse(text);
      return data as RawMetadata;
    } catch {
      if (!uri.startsWith("ipfs://")) return null; // not IPFS, no fallback
    }
  }
  return null;
}

function decodeDataUri(uri: string): RawMetadata | null {
  if (!uri.startsWith("data:")) return null;
  try {
    const comma = uri.indexOf(",");
    const head = uri.slice(0, comma);
    const body = uri.slice(comma + 1);
    const isBase64 = head.includes(";base64");
    const json = isBase64
      ? Buffer.from(body, "base64").toString("utf8")
      : decodeURIComponent(body);
    return JSON.parse(json) as RawMetadata;
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload);
  }

  try {
    const provider = await getProvider();
    const contract = new Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

    const supply = Number(await contract.totalSupply());
    if (supply === 0) {
      const payload: Payload = {
        tokens: [],
        totalSupply: 0,
        facets: {},
        contract: CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
      };
      cache = { at: Date.now(), payload };
      return NextResponse.json(payload);
    }

    // --- Multicall tokenURI for every minted id ---
    const iface = new Interface(ERC721_ABI);
    const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

    const calls = [];
    for (let id = 1; id <= supply; id++) {
      calls.push({
        target: CONTRACT_ADDRESS,
        allowFailure: true,
        callData: iface.encodeFunctionData("tokenURI", [id]),
      });
    }

    const CHUNK = 200;
    const uris: (string | null)[] = new Array(supply).fill(null);
    for (let i = 0; i < calls.length; i += CHUNK) {
      const slice = calls.slice(i, i + CHUNK);
      try {
        const res = await multicall.aggregate3.staticCall(slice);
        res.forEach((r: { success: boolean; returnData: string }, k: number) => {
          if (!r.success) return;
          try {
            const decoded = iface.decodeFunctionResult("tokenURI", r.returnData)[0] as string;
            uris[i + k] = decoded;
          } catch {
            // skip
          }
        });
      } catch (err) {
        console.warn(`[api/hoodlrz/collection] multicall chunk ${i / CHUNK} failed:`, (err as Error).message);
      }
    }

    // --- Fetch metadata JSON for each URI in batches ---
    const tokens: CollectionToken[] = [];
    const facetMap: Record<string, Set<string>> = {};
    const META_BATCH = 12;
    for (let i = 0; i < uris.length; i += META_BATCH) {
      const batch = uris.slice(i, i + META_BATCH);
      const results = await Promise.all(
        batch.map(async (uri, k) => {
          const tokenId = i + k + 1;
          if (!uri) return null;
          const meta = uri.startsWith("data:")
            ? decodeDataUri(uri)
            : await fetchMetadata(uri);
          if (!meta) return null;
          return { tokenId, meta };
        }),
      );
      for (const r of results) {
        if (!r) continue;
        const { tokenId, meta } = r;
        const image = resolveUri(meta.image ?? "");
        const attrs = Array.isArray(meta.attributes)
          ? meta.attributes.filter(
              (a) => a && typeof a.trait_type === "string" && a.value !== undefined && a.value !== null,
            )
          : [];
        tokens.push({
          tokenId,
          name: meta.name ?? `Hoodlrz #${tokenId}`,
          image,
          attributes: attrs,
        });
        for (const a of attrs) {
          const v = String(a.value);
          if (!facetMap[a.trait_type]) facetMap[a.trait_type] = new Set();
          facetMap[a.trait_type].add(v);
        }
      }
    }

    tokens.sort((a, b) => a.tokenId - b.tokenId);

    const facets: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(facetMap)) {
      facets[k] = Array.from(v).sort();
    }

    const payload: Payload = {
      tokens,
      totalSupply: supply,
      facets,
      contract: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      debug:
        tokens.length < supply
          ? `Loaded ${tokens.length}/${supply} tokens (some metadata fetches failed)`
          : undefined,
    };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[api/hoodlrz/collection] Error:", message);
    return NextResponse.json(
      { error: message, tokens: [], totalSupply: 0, facets: {}, contract: CONTRACT_ADDRESS, chainId: CHAIN_ID },
      { status: 500 },
    );
  }
}
