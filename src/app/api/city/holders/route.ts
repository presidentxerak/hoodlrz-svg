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

interface TokenRow {
  token_id: number;
  owner: string | null;
  image_url: string | null;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload);
  }

  try {
    const admin = createAdminClient();

    const [{ data: holdersData, error: hErr }, { data: tokensData, error: tErr }, { data: stateData }] =
      await Promise.all([
        admin
          .from("city_holders")
          .select("wallet, token_count")
          .order("token_count", { ascending: false })
          .limit(2000),
        admin
          .from("city_tokens")
          .select("token_id, owner, image_url")
          .limit(5000),
        admin
          .from("city_sync_state")
          .select("last_run")
          .eq("id", true)
          .maybeSingle(),
      ]);

    if (hErr) throw hErr;
    if (tErr) throw tErr;

    const holders = (holdersData ?? []) as HolderRow[];
    const tokens = (tokensData ?? []) as TokenRow[];

    // Sorted owners (largest first).
    const owners = holders.map((h) => h.wallet);

    // Map owner wallet -> one image URL (first token we see for them).
    const ownerImage: Record<string, string> = {};
    for (const t of tokens) {
      if (!t.owner || !t.image_url) continue;
      if (!ownerImage[t.owner]) ownerImage[t.owner] = t.image_url;
    }

    // The game wants images keyed by *ownerIndex* (position in `owners`),
    // not by wallet. Build that map.
    const images: Record<string, string> = {};
    owners.forEach((wallet, i) => {
      const img = ownerImage[wallet];
      if (img) images[String(i)] = img;
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
