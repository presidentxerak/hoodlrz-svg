// GET /api/city/verify-holder?wallet=0x...
//
// Authoritative check that a wallet holds at least one Hoodlrz NFT.
// Order of escalation:
//   1. city_holders cache (refreshed every 30 min by /api/city/refresh)
//   2. live Alchemy getNFTsForOwner (when the cache is cold or stale)
// We deliberately don't trust the client-side wallet list - the gate must
// be enforced server-side so a player can't bypass it by faking the
// onchain.owners array in the browser.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNFTsForOwner } from "@/lib/hoodlrz/alchemy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json(
      { isHolder: false, error: "Invalid wallet format" },
      { status: 400 },
    );
  }
  const lower = raw.toLowerCase();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("city_holders")
      .select("wallet, token_count")
      .eq("wallet", lower)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { isHolder: false, error: error.message },
        { status: 500 },
      );
    }
    if (data) {
      return NextResponse.json({
        isHolder: true,
        tokenCount: data.token_count ?? 0,
        source: "cache",
      });
    }

    // Cache miss - try Alchemy live. Catches the case where a brand-new
    // holder bought between two cron refreshes.
    const live = await fetchNFTsForOwner(lower);
    if (live.length > 0) {
      // Promote to the cache so subsequent calls are instant.
      await admin
        .from("city_holders")
        .upsert(
          { wallet: lower, token_count: live.length, updated_at: new Date().toISOString() },
          { onConflict: "wallet" },
        );
      return NextResponse.json({
        isHolder: true,
        tokenCount: live.length,
        source: "alchemy",
      });
    }

    return NextResponse.json({ isHolder: false, tokenCount: 0, source: "alchemy" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { isHolder: false, error: message },
      { status: 500 },
    );
  }
}
