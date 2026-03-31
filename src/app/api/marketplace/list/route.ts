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

<<<<<<< HEAD
=======
    if (!Number.isInteger(price) || price < 100 || price > 10000000) {
      return NextResponse.json(
        { error: "Price must be a whole number between $1.00 and $100,000." },
        { status: 400 }
      );
    }

    // Look up the account from the authenticated user
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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

<<<<<<< HEAD
    if (token.owner_id !== user.id) {
=======
    if (token.owner_id !== account.id) {
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
        seller_id: user.id,
        price_cents: price,
        is_active: true,
=======
        seller_id: account.id,
        price_cents: price,
        status: "active",
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
