// Live-fetch helpers for the Hoodlrz Street ERC-721 collection.
//
// The 30-min cron and the city_tokens cache are great for the common path,
// but some holders end up with incomplete cache entries (tokens whose
// metadata fetch timed out, tokens Alchemy spam-classified, tokens that
// moved between owners between two refreshes). When the game / wallet
// panel hits one of those gaps we fall back to Alchemy v3 live so the
// player always sees a real NFT instead of a placeholder.
//
// Used by:
//   /api/city/img?owner=...   and   ?token=...
//   /api/hoodlrz/by-owner

const CONTRACT =
  process.env.HOODLRZ_CONTRACT ?? "0xdde5f965f9d80da49c5cb2951d046156f26ebfa2";
const NETWORK = process.env.ALCHEMY_NETWORK ?? "eth-mainnet";

interface AlchemyImage {
  cachedUrl?: string;
  originalUrl?: string;
  pngUrl?: string;
  thumbnailUrl?: string;
}
interface AlchemyMedia {
  gateway?: string;
  raw?: string;
  thumbnail?: string;
}
interface AlchemyMeta {
  image?: string;
}
export interface AlchemyNFT {
  tokenId?: string;
  image?: AlchemyImage;
  media?: AlchemyMedia[];
  metadata?: AlchemyMeta;
  rawMetadata?: AlchemyMeta;
}

/** Best-effort image URL extraction. Prefers ipfs:// so the browser can
 *  rotate gateways, then falls through to Alchemy's resolved HTTPS URLs. */
export function pickImageUrl(n: AlchemyNFT): string | null {
  const ipfs = [n.metadata?.image, n.rawMetadata?.image, n.media?.[0]?.raw];
  for (const c of ipfs) {
    if (typeof c === "string" && c.startsWith("ipfs://")) return c;
  }
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

function getKey(): string | null {
  return process.env.ALCHEMY_KEY ?? process.env.ALCHEMY_API_KEY ?? null;
}

/** All NFTs owned by `wallet` in the Hoodlrz Street contract, paginated. */
export async function fetchNFTsForOwner(
  wallet: string,
): Promise<{ tokenId: number; imageUrl: string | null }[]> {
  const key = getKey();
  if (!key) return [];
  const out: { tokenId: number; imageUrl: string | null }[] = [];
  let pageKey: string | undefined;
  for (let page = 0; page < 10; page++) {
    try {
      const u = new URL(`https://${NETWORK}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
      u.searchParams.set("owner", wallet);
      u.searchParams.append("contractAddresses[]", CONTRACT);
      u.searchParams.set("withMetadata", "true");
      u.searchParams.set("pageSize", "100");
      if (pageKey) u.searchParams.set("pageKey", pageKey);
      const res = await fetch(u, { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!res.ok) break;
      const data = (await res.json()) as { ownedNfts?: AlchemyNFT[]; pageKey?: string };
      for (const n of data.ownedNfts ?? []) {
        const raw = String(n.tokenId ?? "");
        const id = parseInt(raw, raw.startsWith("0x") ? 16 : 10);
        if (!Number.isFinite(id)) continue;
        out.push({ tokenId: id, imageUrl: pickImageUrl(n) });
      }
      pageKey = data.pageKey;
      if (!pageKey) break;
    } catch {
      break;
    }
  }
  return out;
}

/** Single-token metadata fetch via Alchemy (much faster than RPC + IPFS). */
export async function fetchNFTMetadata(
  tokenId: number,
): Promise<{ imageUrl: string | null } | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const u = new URL(`https://${NETWORK}.g.alchemy.com/nft/v3/${key}/getNFTMetadata`);
    u.searchParams.set("contractAddress", CONTRACT);
    u.searchParams.set("tokenId", String(tokenId));
    u.searchParams.set("refreshCache", "false");
    const res = await fetch(u, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as AlchemyNFT;
    return { imageUrl: pickImageUrl(data) };
  } catch {
    return null;
  }
}
