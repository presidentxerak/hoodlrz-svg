import { NextResponse } from "next/server";

// 60s cache to avoid hammering CoinGecko + tolerate brief outages.
export const revalidate = 60;

interface CachedRate {
  usdPerEth: number;
  eurPerEth: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchFromCoinGecko(): Promise<{ usd: number; eur: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data: { ethereum?: { usd?: number; eur?: number } } = await res.json();
  const usd = data.ethereum?.usd;
  const eur = data.ethereum?.eur;
  if (typeof usd !== "number" || usd <= 0 || typeof eur !== "number" || eur <= 0) {
    throw new Error("Unexpected CoinGecko payload");
  }
  return { usd, eur };
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      usdPerEth: cache.usdPerEth,
      eurPerEth: cache.eurPerEth,
      fetchedAt: cache.fetchedAt,
      cached: true,
    });
  }

  try {
    const { usd, eur } = await fetchFromCoinGecko();
    cache = { usdPerEth: usd, eurPerEth: eur, fetchedAt: Date.now() };
    return NextResponse.json({
      usdPerEth: usd,
      eurPerEth: eur,
      fetchedAt: cache.fetchedAt,
      cached: false,
    });
  } catch (err) {
    console.error("[api/eth-price] Fetch failed:", (err as Error).message);
    if (cache) {
      return NextResponse.json({
        usdPerEth: cache.usdPerEth,
        eurPerEth: cache.eurPerEth,
        fetchedAt: cache.fetchedAt,
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json(
      { error: "Unable to fetch ETH price", usdPerEth: null, eurPerEth: null },
      { status: 503 },
    );
  }
}
