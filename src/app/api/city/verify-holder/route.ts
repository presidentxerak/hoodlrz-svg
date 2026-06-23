// GET /api/city/verify-holder?wallet=0x...
//
// Authoritative check against the city_holders cache (populated by
// /api/city/refresh from Alchemy). The game's gate calls this when its
// in-memory copy of onchain.owners is empty or stale - so the gate keeps
// working even if the holders list hasn't yet propagated to the iframe.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json(
      { isHolder: false, error: "Invalid wallet format" },
      { status: 400 },
    );
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("city_holders")
      .select("wallet, token_count")
      .eq("wallet", raw.toLowerCase())
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { isHolder: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({
      isHolder: !!data,
      tokenCount: data?.token_count ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { isHolder: false, error: message },
      { status: 500 },
    );
  }
}
