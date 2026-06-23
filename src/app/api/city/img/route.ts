// GET /api/city/img?u=<url>      - proxy any allowed image URL
// GET /api/city/img?token=<N>    - resolve token N to an image (live if needed)
// GET /api/city/img?owner=<0x..> - resolve first imageable token of this wallet
//
// Image proxy + on-demand resolver of last resort. Three reasons it exists:
//
// 1. The game tries the 6 public IPFS gateways directly from the browser
//    but corporate proxies / ISP filters / DNS hijacks sometimes block
//    every one. With this route the same lookup runs server-side from
//    Vercel where none of those filters apply.
// 2. Some Hoodlrz tokens have a null image_url in city_tokens because
//    the IPFS metadata fetch was slow during the last cron refresh.
//    ?token / ?owner mode does the tokenURI + metadata fetch live (and
//    writes the result back to the cache) so the player gets a real
//    image instead of a placeholder, even before the next cron runs.
// 3. Vercel's edge CDN caches the result for 7 days, so once a token is
//    resolved the global cost per subsequent view is ~one HEAD request.

import { NextRequest } from "next/server";
import { JsonRpcProvider, Contract } from "ethers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNFTsForOwner, fetchNFTMetadata } from "@/lib/hoodlrz/alchemy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CONTRACT =
  process.env.HOODLRZ_CONTRACT ?? "0xdde5f965f9d80da49c5cb2951d046156f26ebfa2";

const GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.4everland.io/ipfs/",
  "https://dweb.link/ipfs/",
];

const RPC_URLS = [
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
];

const ERC721_ABI = [
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
] as const;

const HOST_WHITELIST = [
  /(^|\.)ipfs\.io$/, /(^|\.)cloudflare-ipfs\.com$/, /(^|\.)nftstorage\.link$/,
  /(^|\.)gateway\.pinata\.cloud$/, /(^|\.)ipfs\.4everland\.io$/, /(^|\.)dweb\.link$/,
  /(^|\.)arweave\.net$/, /(^|\.)alchemyapi\.io$/, /(^|\.)alchemy\.com$/,
  /(^|\.)res\.cloudinary\.com$/, /(^|\.)opensea\.mypinata\.cloud$/,
  /(^|\.)nft-cdn\.alchemy\.com$/,
];

function isHostAllowed(host: string): boolean {
  return HOST_WHITELIST.some((r) => r.test(host.toLowerCase()));
}

function urlCandidates(raw: string): string[] {
  if (raw.startsWith("ipfs://")) {
    const path = raw.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "");
    return GATEWAYS.map((g) => g + path);
  }
  const m = raw.match(/\/ipfs\/(.+)$/);
  if (m && m[1]) return [raw, ...GATEWAYS.map((g) => g + m[1]).filter((u) => u !== raw)];
  return [raw];
}

async function tryFetch(u: string): Promise<Response | null> {
  try {
    const res = await fetch(u, {
      signal: AbortSignal.timeout(6000),
      cache: "force-cache",
      headers: { "User-Agent": "hoodlrz-svg/img-proxy" },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function fetchImageBytes(rawUrl: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  for (const u of urlCandidates(rawUrl)) {
    const res = await tryFetch(u);
    if (!res) continue;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "image/png";
    if (!ct.startsWith("image/") && buf.byteLength < 4096) continue;   // skip HTML 404 pages
    return { bytes: buf, contentType: ct };
  }
  return null;
}

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

async function fetchMetadataJson(uri: string): Promise<{ image?: string } | null> {
  if (uri.startsWith("data:")) {
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
  for (const candidate of urlCandidates(uri)) {
    try {
      const res = await fetch(candidate, { cache: "force-cache", signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      return JSON.parse(await res.text());
    } catch {
      /* try next */
    }
  }
  return null;
}

// Resolve a token id to its image URL: cache-first, then Alchemy live,
// then on-chain tokenURI + IPFS metadata as the slowest fallback. Writes
// the resolved URL back to city_tokens so the next call is instant.
async function resolveTokenImage(tokenId: number): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("city_tokens")
    .select("image_url")
    .eq("token_id", tokenId)
    .maybeSingle();
  if (data?.image_url) return data.image_url as string;

  // 1. Fast path: Alchemy
  const alch = await fetchNFTMetadata(tokenId);
  if (alch?.imageUrl) {
    await admin
      .from("city_tokens")
      .upsert(
        { token_id: tokenId, image_url: alch.imageUrl, updated_at: new Date().toISOString() },
        { onConflict: "token_id" },
      );
    return alch.imageUrl;
  }

  // 2. Slow path: tokenURI off the contract + IPFS metadata
  try {
    const provider = await getRpcProvider();
    const contract = new Contract(CONTRACT, ERC721_ABI, provider);
    const uri = (await contract.tokenURI(tokenId)) as string;
    if (!uri) return null;
    const meta = await fetchMetadataJson(uri);
    if (!meta?.image) return null;
    const image = String(meta.image);
    await admin
      .from("city_tokens")
      .upsert(
        { token_id: tokenId, image_url: image, updated_at: new Date().toISOString() },
        { onConflict: "token_id" },
      );
    return image;
  } catch {
    return null;
  }
}

// Find an imageable token for a wallet. Order of escalation:
//   1. Cached image_url on any of their cached tokens
//   2. Alchemy getNFTsForOwner (live) - finds tokens missing from the
//      cache + gives us their image URLs in one round-trip
//   3. Live tokenURI + IPFS metadata per token (slowest)
// Every path that succeeds also writes the result back so subsequent
// requests hit the cache.
async function resolveOwnerImage(wallet: string): Promise<string | null> {
  const lower = wallet.toLowerCase();
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("city_tokens")
    .select("token_id, image_url")
    .eq("owner", lower)
    .order("token_id", { ascending: true });

  // 1. Any cached row with an image
  for (const row of cached ?? []) {
    if (row.image_url) return row.image_url as string;
  }

  // 2. Live Alchemy - guarantees we see EVERY token the wallet owns
  //    (the bulk refresh sometimes misses some). Upsert results so
  //    /api/hoodlrz/by-owner sees them too.
  const live = await fetchNFTsForOwner(wallet);
  if (live.length > 0) {
    const rows = live.map((t) => ({
      token_id: t.tokenId,
      owner: lower,
      image_url: t.imageUrl,
      updated_at: new Date().toISOString(),
    }));
    await admin.from("city_tokens").upsert(rows, { onConflict: "token_id" });
    for (const t of live) {
      if (t.imageUrl) return t.imageUrl;
    }
  }

  // 3. Slow per-token live resolve on whatever ids we now have
  const allIds = new Set<number>();
  for (const r of cached ?? []) allIds.add(r.token_id as number);
  for (const t of live) allIds.add(t.tokenId);
  for (const id of Array.from(allIds)) {
    const url = await resolveTokenImage(id);
    if (url) return url;
  }
  return null;
}

function imageResponse(bytes: ArrayBuffer, contentType: string): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
      "CDN-Cache-Control": "public, max-age=604800",
      "Vercel-CDN-Cache-Control": "public, max-age=604800",
    },
  });
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  const token = req.nextUrl.searchParams.get("token");
  const owner = req.nextUrl.searchParams.get("owner");

  // ── ?token=N ────────────────────────────────────────────────────────────
  if (token) {
    const id = parseInt(token, 10);
    if (!Number.isFinite(id) || id < 0) return new Response("bad token", { status: 400 });
    const url = await resolveTokenImage(id);
    if (!url) return new Response("no image", { status: 404 });
    const got = await fetchImageBytes(url);
    if (!got) return new Response("upstream failed", { status: 502 });
    return imageResponse(got.bytes, got.contentType);
  }

  // ── ?owner=0x... ────────────────────────────────────────────────────────
  if (owner) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) return new Response("bad owner", { status: 400 });
    const url = await resolveOwnerImage(owner);
    if (!url) return new Response("no image", { status: 404 });
    const got = await fetchImageBytes(url);
    if (!got) return new Response("upstream failed", { status: 502 });
    return imageResponse(got.bytes, got.contentType);
  }

  // ── ?u=<url> ────────────────────────────────────────────────────────────
  if (!u) return new Response("missing ?u, ?token or ?owner", { status: 400 });
  if (!u.startsWith("ipfs://")) {
    try {
      const parsed = new URL(u);
      if (!/^https?:$/.test(parsed.protocol)) return new Response("only http(s)/ipfs", { status: 400 });
      if (!isHostAllowed(parsed.host)) return new Response("host not allowed", { status: 400 });
    } catch {
      return new Response("bad url", { status: 400 });
    }
  }
  const got = await fetchImageBytes(u);
  if (!got) return new Response("upstream failed", { status: 502 });
  return imageResponse(got.bytes, got.contentType);
}
