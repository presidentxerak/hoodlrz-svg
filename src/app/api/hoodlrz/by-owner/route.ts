// GET /api/hoodlrz/by-owner?wallet=0x...
//
// Returns the Hoodlrz Street (ERC-721) tokens owned by a wallet, read from
// the city_tokens cache (refreshed every 30 min by /api/city/refresh).
// The My Collection page calls this to render the holder's Street NFTs
// next to the full-on-chain ones.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HOODLRZ_STREET_ADDRESS } from "@/lib/web3/config";
import { fetchNFTsForOwner } from "@/lib/hoodlrz/alchemy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OwnedToken {
  tokenId: number;
  image: string;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json(
      { tokens: [], error: "Invalid wallet format" },
      { status: 400 },
    );
  }
  const lower = raw.toLowerCase();
  try {
    const admin = createAdminClient();

    // 1. What the cache knows
    const { data: cached, error } = await admin
      .from("city_tokens")
      .select("token_id")
      .eq("owner", lower)
      .order("token_id", { ascending: true });
    if (error) {
      return NextResponse.json(
        { tokens: [], error: error.message },
        { status: 500 },
      );
    }

    // 2. Cross-check with city_holders.token_count - if the cache has fewer
    //    tokens than the holder actually owns we hit Alchemy live for the
    //    full list, upsert the diff, and return the merged set. This keeps
    //    the wallet grid in sync even between cron refreshes (and patches
    //    over holders whose tokens were never enumerated correctly).
    const { data: holderRow } = await admin
      .from("city_holders")
      .select("token_count")
      .eq("wallet", lower)
      .maybeSingle();

    const ids = new Set<number>();
    for (const t of cached ?? []) ids.add(t.token_id as number);

    const expected = holderRow?.token_count ?? null;
    if (expected !== null && ids.size < expected) {
      const live = await fetchNFTsForOwner(lower);
      if (live.length > 0) {
        await admin.from("city_tokens").upsert(
          live.map((t) => ({
            token_id: t.tokenId,
            owner: lower,
            image_url: t.imageUrl,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "token_id" },
        );
        for (const t of live) ids.add(t.tokenId);
      }
    }

    // Route every image through /api/city/img?token=N. The proxy handles
    // cache, Alchemy live fallback, IPFS rotation and edge caching, so
    // every thumbnail either renders an image or 404s.
    const tokens: OwnedToken[] = Array.from(ids)
      .sort((a, b) => a - b)
      .map((tokenId) => ({
        tokenId,
        image: "/api/city/img?token=" + tokenId,
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
