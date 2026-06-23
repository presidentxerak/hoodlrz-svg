// GET /api/city/holders
//
// Serves the holder + NFT-art map consumed by the hOodlrz CITY game
// (public/game/hoodlrz-city.html). Reads from the city_holders +
// city_tokens cache tables (populated by the Supabase Edge Function
// `refresh-holders`).
//
// Response shape (matches the game's expectation):
//   {
//     owners: [string, string, ...],          // sorted by token_count desc
//     images: { [ownerIndex: string]: string } // one image per owner
//   }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cache the response for 30s in the serverless instance memory so a
// burst of game loads doesn't fan out to Supabase repeatedly.
const CACHE_TTL_MS = 30_000;
let cache: { at: number; payload: HoldersPayload } | null = null;

interface HoldersPayload {
  owners: string[];
  images: Record<string, string>;
  count: number;
  lastRun?: string;
}

interface HolderRow {
  wallet: string;
  token_count: number;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload);
  }

  try {
    const admin = createAdminClient();

    const [{ data: holdersData, error: hErr }, { data: stateData }] =
      await Promise.all([
        admin
          .from("city_holders")
          .select("wallet, token_count")
          .order("token_count", { ascending: false })
          .limit(2000),
        admin
          .from("city_sync_state")
          .select("last_run")
          .eq("id", true)
          .maybeSingle(),
      ]);

    if (hErr) throw hErr;

    const holders = (holdersData ?? []) as HolderRow[];

    // Sorted owners (largest first).
    const owners = holders.map((h) => h.wallet);

    // Every owner ALWAYS gets an image URL via /api/city/img?owner=<addr>.
    // The proxy resolves cache-first, falls back to live tokenURI + IPFS
    // metadata fetch, and the result is served from Vercel's edge CDN with
    // a 7-day immutable cache. This guarantees every holder tower in the
    // game ends up with a real NFT on its facade - even tokens whose
    // metadata wasn't reachable during the last refresh.
    const images: Record<string, string> = {};
    owners.forEach((wallet, i) => {
      images[String(i)] = "/api/city/img?owner=" + encodeURIComponent(wallet);
    });

    const payload: HoldersPayload = {
      owners,
      images,
      count: owners.length,
      lastRun: stateData?.last_run ?? undefined,
    };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/city/holders] error:", message);
    return NextResponse.json(
      { owners: [], images: {}, count: 0, error: message },
      { status: 500 },
    );
  }
}
