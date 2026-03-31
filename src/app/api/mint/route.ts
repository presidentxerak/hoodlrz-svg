import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Auth check with server client (reads cookies)
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { collectionSlug } = body as {
      collectionSlug?: string;
    };

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug is required." },
        { status: 400 }
      );
    }

    // Use admin client for DB operations (bypasses RLS)
    const admin = createAdminClient();

    // Look up the account from the authenticated user
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    let accountId: string;

    if (accountError || !account) {
      // Auto-create account if trigger didn't fire
      const { data: newAccount, error: createError } = await admin
        .from("accounts")
        .insert({
          auth_id: user.id,
          email: user.email ?? "",
          pseudonym: `Collector#${user.id.substring(0, 6)}`,
        })
        .select("id")
        .single();

      if (createError || !newAccount) {
        console.error("[mint] Failed to create account:", createError);
        return NextResponse.json(
          { error: "Failed to create account." },
          { status: 500 }
        );
      }

      accountId = newAccount.id;
    } else {
      accountId = account.id;
    }

    // Fetch collection by slug
    const { data: collection, error: collectionError } = await admin
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
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mint] Unexpected error:", message, err);
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}
