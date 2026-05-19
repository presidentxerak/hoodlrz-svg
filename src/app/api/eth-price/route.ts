import { NextResponse } from "next/server";

// 60s cache to avoid hammering CoinGecko + tolerate brief outages.
export const revalidate = 60;

interface CachedRate {
  usdPerEth: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data: { ethereum?: { usd?: number } } = await res.json();
  const usd = data.ethereum?.usd;
  if (typeof usd !== "number" || usd <= 0) {
    throw new Error("Unexpected CoinGecko payload");
  }
  return usd;
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      usdPerEth: cache.usdPerEth,
      fetchedAt: cache.fetchedAt,
      cached: true,
    });
  }

  try {
    const usdPerEth = await fetchFromCoinGecko();
    cache = { usdPerEth, fetchedAt: Date.now() };
    return NextResponse.json({ usdPerEth, fetchedAt: cache.fetchedAt, cached: false });
  } catch (err) {
    console.error("[api/eth-price] Fetch failed:", (err as Error).message);
    if (cache) {
      // Stale but better than nothing
      return NextResponse.json({
        usdPerEth: cache.usdPerEth,
        fetchedAt: cache.fetchedAt,
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json(
      { error: "Unable to fetch ETH price", usdPerEth: null },
      { status: 503 },
    );
  }
}
