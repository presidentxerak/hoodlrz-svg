// GET /api/hoodlrz/by-owner?wallet=0x...
//
// Returns the Hoodlrz Street (ERC-721) tokens owned by a wallet, read from
// the city_tokens cache (refreshed every 30 min by /api/city/refresh).
// The My Collection page calls this to render the holder's Street NFTs
// next to the full-on-chain ones.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HOODLRZ_STREET_ADDRESS } from "@/lib/web3/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OwnedToken {
  tokenId: number;
  image: string | null;
}

interface TokenRow {
  token_id: number;
  image_url: string | null;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json(
      { tokens: [], error: "Invalid wallet format" },
      { status: 400 },
    );
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("city_tokens")
      .select("token_id, image_url")
      .eq("owner", raw.toLowerCase())
      .order("token_id", { ascending: true });
    if (error) {
      return NextResponse.json(
        { tokens: [], error: error.message },
        { status: 500 },
      );
    }
    const tokens: OwnedToken[] = (data ?? []).map((t: TokenRow) => ({
      tokenId: t.token_id,
      image: t.image_url,
    }));
    return NextResponse.json({
      tokens,
      count: tokens.length,
      contract: HOODLRZ_STREET_ADDRESS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { tokens: [], error: message },
      { status: 500 },
    );
  }
}
