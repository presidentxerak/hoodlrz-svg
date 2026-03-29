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
    const { collectionSlug, accountId } = body as {
      collectionSlug?: string;
      accountId?: string;
    };

    if (!collectionSlug || !accountId) {
      return NextResponse.json(
        { error: "collectionSlug and accountId are required." },
        { status: 400 }
      );
    }

    // Fetch collection by slug
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("*")
      .eq("slug", collectionSlug)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: "Collection not found." },
        { status: 404 }
      );
    }

    // Validate drop is live
    if (collection.drop_status !== "public") {
      return NextResponse.json(
        { error: "This collection is not currently available." },
        { status: 403 }
      );
    }

    if (collection.public_start_at && new Date(collection.public_start_at) > new Date()) {
      return NextResponse.json(
        { error: "This drop has not started yet." },
        { status: 403 }
      );
    }

    if (collection.minted_count >= collection.total_supply) {
      return NextResponse.json(
        { error: "This collection is sold out." },
        { status: 409 }
      );
    }

    // Create Stripe checkout session
    const origin = new URL(request.url).origin;

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: collection.name,
              description: collection.description ?? undefined,
            },
            unit_amount: collection.price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        collectionSlug,
        collectionId: collection.id,
        accountId,
        type: "primary_sale",
      },
      success_url: `${origin}/success?collection=${collectionSlug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/collection/${collectionSlug}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[collect] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
