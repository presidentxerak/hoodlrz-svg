import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { tokenId, price } = body as {
      tokenId?: string;
      price?: number;
    };

    if (!tokenId || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { error: "tokenId and a positive price (in cents) are required." },
        { status: 400 }
      );
    }

    // Fetch token and verify ownership
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", tokenId)
      .single();

    if (tokenError || !token) {
      return NextResponse.json(
        { error: "Token not found." },
        { status: 404 }
      );
    }

    if (token.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this token." },
        { status: 403 }
      );
    }

    if (token.is_listed) {
      return NextResponse.json(
        { error: "Token is already listed." },
        { status: 409 }
      );
    }

    // Create listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        token_id: tokenId,
        seller_id: user.id,
        price_cents: price,
        is_active: true,
      })
      .select()
      .single();

    if (listingError || !listing) {
      console.error("[marketplace/list] Insert error:", listingError?.message);
      return NextResponse.json(
        { error: "Failed to create listing." },
        { status: 500 }
      );
    }

    // Update token listing status
    await supabase
      .from("tokens")
      .update({ is_listed: true })
      .eq("id", tokenId);

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("[marketplace/list] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
