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
<<<<<<< HEAD
    const { collectionSlug, accountId } = body as {
      collectionSlug?: string;
      accountId?: string;
    };

    if (!collectionSlug || !accountId) {
      return NextResponse.json(
        { error: "collectionSlug and accountId are required." },
=======
    const { collectionSlug } = body as {
      collectionSlug?: string;
    };

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug is required." },
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
        { status: 400 }
      );
    }

<<<<<<< HEAD
=======
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

    const accountId = account.id;

>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
    if (!collection.is_published) {
=======
    if (collection.drop_status !== "public") {
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      return NextResponse.json(
        { error: "This collection is not currently available." },
        { status: 403 }
      );
    }

<<<<<<< HEAD
    if (collection.drop_date && new Date(collection.drop_date) > new Date()) {
=======
    if (collection.public_start_at && new Date(collection.public_start_at) > new Date()) {
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      return NextResponse.json(
        { error: "This drop has not started yet." },
        { status: 403 }
      );
    }

<<<<<<< HEAD
    if (collection.minted >= collection.supply) {
=======
    if (collection.minted_count >= collection.total_supply) {
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
            currency: collection.currency,
            product_data: {
              name: collection.name,
              description: collection.description ?? undefined,
              images: collection.cover_image_url
                ? [collection.cover_image_url]
                : undefined,
=======
            currency: "usd",
            product_data: {
              name: collection.name,
              description: collection.description ?? undefined,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
      success_url: `${origin}/my-collection?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/drops/${collectionSlug}?checkout=cancelled`,
=======
      success_url: `${origin}/success?collection=${collectionSlug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/collection/${collectionSlug}`,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
