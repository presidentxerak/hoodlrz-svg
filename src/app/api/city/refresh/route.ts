// POST /api/city/refresh
//
// Pulls every Hoodlrz holder + their NFT art from Alchemy and upserts
// it into the city_holders / city_tokens cache tables. Same logic as
// the original Supabase Edge Function (`refresh-holders`) but runs as
// a Node.js serverless function on Vercel, so no Supabase CLI / Docker
// is needed.
//
// Triggered by:
//   1. The Vercel Cron declared in vercel.json (every 30 min)
//   2. A manual `curl -X POST ... -H "Authorization: Bearer $CRON_SECRET"`
//
// Required env vars (set in Vercel project settings):
//   ALCHEMY_KEY                 - https://alchemy.com (free tier OK)
//   CRON_SECRET                 - random string, must match the header sent
//   SUPABASE_SERVICE_ROLE_KEY   - already configured for the app
//   NEXT_PUBLIC_SUPABASE_URL    - already configured for the app
//
// Optional:
//   HOODLRZ_CONTRACT  (defaults to 0xdde5...bfa2)
//   ALCHEMY_NETWORK   (defaults to eth-mainnet)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JsonRpcProvider, Contract, Interface } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default is 10s for Hobby, 60s for Pro. Pulling ~333 NFTs
// with Alchemy's paginated API takes ~5-20s, so bump the ceiling.
export const maxDuration = 60;

const CONTRACT =
  process.env.HOODLRZ_CONTRACT ?? "0xdde5f965f9d80da49c5cb2951d046156f26ebfa2";
const NETWORK = process.env.ALCHEMY_NETWORK ?? "eth-mainnet";

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
const ERC721_ABI = [
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
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

async function getRpcProvider(): Promise<JsonRpcProvider> {
  for (const url of RPC_URLS) {
    try {
      const p = new JsonRpcProvider(url);
      await p.getBlockNumber();
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error("All RPCs failed");
}
function resolveIpfsToHttp(uri: string | null | undefined, gIdx = 0): string | null {
  if (!uri || typeof uri !== "string") return null;
  if (uri.startsWith("ipfs://")) {
    return IPFS_GATEWAYS[gIdx % IPFS_GATEWAYS.length] + uri.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "");
  }
  if (uri.startsWith("ar://")) return "https://arweave.net/" + uri.replace(/^ar:\/\//, "");
  return uri;
}
async function fetchMetadataJson(uri: string): Promise<{ image?: string } | null> {
  for (let g = 0; g < IPFS_GATEWAYS.length; g++) {
    const target = resolveIpfsToHttp(uri, g);
    if (!target) return null;
    try {
      const res = await fetch(target, { cache: "force-cache" });
      if (!res.ok) continue;
      const text = await res.text();
      return JSON.parse(text);
    } catch {
      if (!uri.startsWith("ipfs://")) return null;
    }
  }
  return null;
}
function decodeDataUri(uri: string): { image?: string } | null {
  if (!uri.startsWith("data:")) return null;
  try {
    const comma = uri.indexOf(",");
    const head = uri.slice(0, comma);
    const body = uri.slice(comma + 1);
    const json = head.includes(";base64") ? Buffer.from(body, "base64").toString("utf8") : decodeURIComponent(body);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Direct-from-chain image fetch. For tokens Alchemy fails to return an
 * image for, we read tokenURI off the contract and fetch the metadata
 * JSON ourselves through up to 3 IPFS gateways. Same logic as
 * /api/hoodlrz/collection so the source of truth is identical.
 */
async function fetchTokenImagesDirect(tokenIds: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (tokenIds.length === 0) return out;
  const provider = await getRpcProvider();
  const iface = new Interface(ERC721_ABI);
  const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);
  // Multicall tokenURI in chunks of 200
  const uris = new Map<number, string>();
  const CHUNK = 200;
  for (let i = 0; i < tokenIds.length; i += CHUNK) {
    const slice = tokenIds.slice(i, i + CHUNK);
    const calls = slice.map((id) => ({
      target: CONTRACT,
      allowFailure: true,
      callData: iface.encodeFunctionData("tokenURI", [id]),
    }));
    try {
      const res = await multicall.aggregate3.staticCall(calls);
      res.forEach((r: { success: boolean; returnData: string }, k: number) => {
        if (!r.success) return;
        try {
          const decoded = iface.decodeFunctionResult("tokenURI", r.returnData)[0] as string;
          if (decoded) uris.set(slice[k], decoded);
        } catch {
          /* skip */
        }
      });
    } catch (err) {
      console.warn(`[direct] multicall chunk ${i / CHUNK} failed:`, (err as Error).message);
    }
  }
  // Fetch metadata JSON in parallel batches
  const ids = Array.from(uris.keys());
  const BATCH = 16;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (id) => {
        const uri = uris.get(id)!;
        const meta = uri.startsWith("data:") ? decodeDataUri(uri) : await fetchMetadataJson(uri);
        if (!meta?.image) return;
        const httpImage = resolveIpfsToHttp(meta.image);
        if (httpImage) out.set(id, httpImage);
      }),
    );
  }
  return out;
}

interface AlchemyOwner {
  ownerAddress?: string;
  tokenBalances?: { tokenId?: string }[];
}

interface AlchemyNFT {
  tokenId?: string;
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
  };
  media?: { gateway?: string; raw?: string; thumbnail?: string }[];
  metadata?: { image?: string };
  rawMetadata?: { image?: string };
  tokenUri?: { gateway?: string; raw?: string };
}

function pickImageUrl(n: AlchemyNFT): string | null {
  // Prefer the canonical ipfs:// URI when one is available. We keep it raw
  // so the browser-side TextureLoader can rotate through three public
  // gateways (ipfs.io, cloudflare-ipfs, nftstorage) instead of being
  // stuck with whatever Alchemy resolved it to once and forever.
  const ipfs = [
    n.metadata?.image,
    n.rawMetadata?.image,
    n.media?.[0]?.raw,
    n.tokenUri?.raw,
  ];
  for (const c of ipfs) {
    if (typeof c === "string" && c.startsWith("ipfs://")) return c;
  }
  // Otherwise fall back to a stable HTTPS URL. Order matters: originalUrl
  // is usually the IPFS gateway view (rotatable on the client),
  // cachedUrl is fastest but flakier when Alchemy evicts a token, pngUrl
  // is a deterministic snapshot of the first GIF frame.
  const http = [
    n.image?.originalUrl,
    n.image?.cachedUrl,
    n.image?.pngUrl,
    n.image?.thumbnailUrl,
    n.media?.[0]?.gateway,
    n.media?.[0]?.thumbnail,
    n.metadata?.image,
    n.rawMetadata?.image,
  ];
  for (const c of http) {
    if (typeof c === "string" && c.length > 4) return c;
  }
  return null;
}

interface PullResult {
  holders: Record<string, number>;
  tokens: { token_id: number; owner: string | null; image_url: string | null }[];
}

async function pull(alchemyKey: string): Promise<PullResult> {
  const base = `https://${NETWORK}.g.alchemy.com/nft/v3/${alchemyKey}`;

  const holders: Record<string, number> = {};
  const tokenOwner: Record<number, string> = {};

  // 1) holders + tokenIds per holder
  let pageKey: string | undefined;
  do {
    const u = new URL(`${base}/getOwnersForContract`);
    u.searchParams.set("contractAddress", CONTRACT);
    u.searchParams.set("withTokenBalances", "true");
    if (pageKey) u.searchParams.set("pageKey", pageKey);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`Alchemy getOwnersForContract ${res.status}`);
    const data = (await res.json()) as { owners?: AlchemyOwner[]; pageKey?: string };
    for (const o of data.owners ?? []) {
      const w = String(o.ownerAddress ?? "").toLowerCase();
      if (!w) continue;
      const bals = o.tokenBalances ?? [];
      holders[w] = (holders[w] ?? 0) + (bals.length || 1);
      for (const b of bals) {
        const raw = String(b.tokenId ?? "");
        const id = parseInt(raw, raw.startsWith("0x") ? 16 : 10);
        if (!isNaN(id)) tokenOwner[id] = w;
      }
    }
    pageKey = data.pageKey;
  } while (pageKey);

  // 2) token art (image per tokenId)
  const tokens: PullResult["tokens"] = [];
  pageKey = undefined;
  do {
    const u = new URL(`${base}/getNFTsForContract`);
    u.searchParams.set("contractAddress", CONTRACT);
    u.searchParams.set("withMetadata", "true");
    u.searchParams.set("limit", "100");
    if (pageKey) u.searchParams.set("pageKey", pageKey);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`Alchemy getNFTsForContract ${res.status}`);
    const data = (await res.json()) as { nfts?: AlchemyNFT[]; pageKey?: string };
    for (const n of data.nfts ?? []) {
      const raw = String(n.tokenId ?? "");
      const id = parseInt(raw, raw.startsWith("0x") ? 16 : 10);
      if (isNaN(id)) continue;
      const url = pickImageUrl(n);
      tokens.push({ token_id: id, owner: tokenOwner[id] ?? null, image_url: url });
    }
    pageKey = data.pageKey;
  } while (pageKey);

  // 3) Per-owner fallback. getNFTsForContract sometimes returns null images
  //    (Alchemy spam-classifies the metadata, the IPFS gateway timed out
  //    server-side, etc.). For any holder we still don't have an image for,
  //    hit getNFTsForOwner directly so the facade in the game has a card.
  //    Concurrent batches keep us inside Vercel's 60s maxDuration even with
  //    1000+ holders.
  const holdersWithImage = new Set<string>();
  for (const t of tokens) {
    if (t.owner && t.image_url) holdersWithImage.add(t.owner);
  }
  const missing = Object.keys(holders).filter((w) => !holdersWithImage.has(w));
  const CONCURRENCY = 24;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const slice = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (wallet) => {
        try {
          const u = new URL(`${base}/getNFTsForOwner`);
          u.searchParams.set("owner", wallet);
          u.searchParams.append("contractAddresses[]", CONTRACT);
          u.searchParams.set("withMetadata", "true");
          u.searchParams.set("pageSize", "5");
          const res = await fetch(u, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { ownedNfts?: AlchemyNFT[] };
          for (const n of data.ownedNfts ?? []) {
            const raw = String(n.tokenId ?? "");
            const id = parseInt(raw, raw.startsWith("0x") ? 16 : 10);
            if (isNaN(id)) continue;
            const url = pickImageUrl(n);
            if (!url) continue;
            tokens.push({ token_id: id, owner: wallet, image_url: url });
            holdersWithImage.add(wallet);
            return;
          }
        } catch {
          /* swallow - the holder simply won't have an image this round */
        }
      }),
    );
  }

  return { holders, tokens };
}

async function refresh() {
  const alchemyKey = process.env.ALCHEMY_KEY ?? process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) throw new Error("ALCHEMY_KEY (or ALCHEMY_API_KEY) is not set");

  const admin = createAdminClient();
  const runAt = new Date().toISOString();

  const { holders, tokens } = await pull(alchemyKey);

  // ── Direct-RPC fallback ────────────────────────────────────────────────
  // Anything Alchemy didn't return an image for, fetch via the contract's
  // tokenURI directly + parse the IPFS metadata JSON ourselves. We also
  // PRESERVE any image_url already in city_tokens, so successive refreshes
  // don't undo a previously-resolved image. Net effect: every token in the
  // table ends up with an image as soon as it has resolved once.
  const { data: prevRows } = await admin
    .from("city_tokens")
    .select("token_id, image_url")
    .not("image_url", "is", null);
  const prevImage = new Map<number, string>();
  for (const r of prevRows ?? []) {
    if (r.image_url) prevImage.set(r.token_id as number, r.image_url as string);
  }
  // Keep existing images for tokens whose new pull came back empty.
  for (const t of tokens) {
    if (!t.image_url && prevImage.has(t.token_id)) {
      t.image_url = prevImage.get(t.token_id) ?? null;
    }
  }
  // Tokens we STILL don't have an image for: try the direct RPC path.
  const stillMissing = tokens.filter((t) => !t.image_url).map((t) => t.token_id);
  if (stillMissing.length > 0) {
    try {
      const direct = await fetchTokenImagesDirect(stillMissing);
      for (const t of tokens) {
        if (!t.image_url && direct.has(t.token_id)) {
          t.image_url = direct.get(t.token_id) ?? null;
        }
      }
    } catch (err) {
      console.warn("[refresh] direct-RPC fallback failed:", (err as Error).message);
    }
  }

  const holderRows = Object.entries(holders).map(([wallet, token_count]) => ({
    wallet,
    token_count,
    updated_at: runAt,
  }));

  // Upsert in chunks of 500 (Postgres / PostgREST sweet spot)
  for (let i = 0; i < holderRows.length; i += 500) {
    const { error } = await admin
      .from("city_holders")
      .upsert(holderRows.slice(i, i + 500), { onConflict: "wallet" });
    if (error) throw error;
  }
  // Drop wallets that no longer hold a Hoodlrz
  await admin.from("city_holders").delete().lt("updated_at", runAt);

  for (let i = 0; i < tokens.length; i += 500) {
    const { error } = await admin.from("city_tokens").upsert(
      tokens.slice(i, i + 500).map((t) => ({ ...t, updated_at: runAt })),
      { onConflict: "token_id" },
    );
    if (error) throw error;
  }

  const tokensWithImage = tokens.filter((t) => !!t.image_url).length;
  await admin.from("city_sync_state").upsert({
    id: true,
    last_run: runAt,
    holder_count: holderRows.length,
    token_count: tokens.length,
    ok: true,
    note: `${tokensWithImage}/${tokens.length} tokens have images`,
  });

  return { holders: holderRows.length, tokens: tokens.length, tokensWithImage, runAt };
}

function authorised(request: NextRequest): boolean {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the env
  // var is set. Manual calls (curl) just need to send the same header.
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function handle(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await refresh();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/city/refresh] failed:", message);
    try {
      await createAdminClient()
        .from("city_sync_state")
        .upsert({ id: true, last_run: new Date().toISOString(), ok: false, note: message });
    } catch {
      /* swallow secondary failure */
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Vercel Cron uses GET. Also handy to trigger from a browser when
// debugging (with the header set by an extension).
export async function GET(request: NextRequest) {
  return handle(request);
}
