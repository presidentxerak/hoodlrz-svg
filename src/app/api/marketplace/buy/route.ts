import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeServer } from "@/lib/stripe";

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
    const { listingId } = body as { listingId?: string };

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 }
      );
    }

    // Look up the account from the authenticated user
    const { data: buyerAccount, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (accountError || !buyerAccount) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    // Fetch active listing with token details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "active")
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Active listing not found." },
        { status: 404 }
      );
    }

    // Cannot buy your own listing
    if (listing.seller_id === buyerAccount.id) {
      return NextResponse.json(
        { error: "You cannot purchase your own listing." },
        { status: 400 }
      );
    }

    // Fetch token for display info
    const { data: token } = await supabase
      .from("tokens")
      .select("*, collections(*)")
      .eq("id", listing.token_id)
      .single();

    const origin = new URL(request.url).origin;
    const collectionName =
      token && typeof token.collections === "object" && token.collections !== null
        ? (token.collections as Record<string, unknown>).name as string
        : "Hoodlrz Collectible";

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${collectionName} #${token?.serial_number ?? ""}`,
              description: "Secondary market purchase",
            },
            unit_amount: listing.price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "marketplace_purchase",
        listingId: listing.id,
        tokenId: listing.token_id,
        sellerAccountId: listing.seller_id,
        buyerAccountId: buyerAccount.id,
      },
      success_url: `${origin}/my-collection?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/collections?checkout=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[marketplace/buy] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
