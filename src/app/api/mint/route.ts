import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe";
import { getVinylById } from "@/lib/genesis/vinyls";

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
    const { collectionSlug, quantity: rawQuantity, vinylId } = body as {
      collectionSlug?: string;
      quantity?: number;
      vinylId?: string;
    };

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug is required." },
        { status: 400 }
      );
    }

    // ── Genesis vinyl validation ──
    if (vinylId) {
      // Validate vinylId exists
      const vinyl = getVinylById(vinylId);
      if (!vinyl) {
        return NextResponse.json(
          { error: "Invalid vinyl." },
          { status: 400 }
        );
      }
    }

    // Validate quantity (1-10), force 1 for Genesis
    const quantity = vinylId
      ? 1
      : Math.min(10, Math.max(1, Math.floor(Number(rawQuantity) || 1)));

    // Use admin client for DB operations (bypasses RLS)
    const admin = createAdminClient();

    // ── Prevent double sale of Genesis vinyls ──
    if (vinylId) {
      const { data: existingToken } = await admin
        .from("tokens")
        .select("id")
        .eq("seed", vinylId)
        .single();

      if (existingToken) {
        return NextResponse.json(
          { error: "This vinyl has already been collected." },
          { status: 409 }
        );
      }
    }

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

    const remaining = collection.total_supply - collection.minted_count;
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "This collection is sold out." },
        { status: 409 }
      );
    }

    // Cap quantity to remaining supply
    const finalQuantity = Math.min(quantity, remaining);

    // ── Per-collector limit: 100 PFPs max per collection ──
    const MAX_PER_COLLECTOR = 100;

    const { count: ownedCount, error: countError } = await admin
      .from("tokens")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", accountId)
      .eq("collection_id", collection.id);

    if (countError) {
      console.error("[mint] Failed to count owned tokens:", countError);
      return NextResponse.json(
        { error: "Failed to verify collection limit." },
        { status: 500 }
      );
    }

    const owned = ownedCount ?? 0;
    if (owned >= MAX_PER_COLLECTOR) {
      return NextResponse.json(
        { error: `You've reached the maximum of ${MAX_PER_COLLECTOR} collectibles for this collection.` },
        { status: 409 }
      );
    }

    // Cap to what's left in the collector's allowance
    const allowance = MAX_PER_COLLECTOR - owned;
    const cappedQuantity = Math.min(finalQuantity, allowance);

    // Create Stripe checkout session
    const origin = new URL(request.url).origin;

    // Build metadata — include vinylId and shipping for Genesis
    const metadata: Record<string, string> = {
      collectionSlug,
      collectionId: collection.id,
      accountId,
      quantity: String(cappedQuantity),
      type: "primary_sale",
    };

    if (vinylId) {
      metadata.vinylId = vinylId;
    }

    // For Genesis, use the vinyl page as cancel URL
    const cancelUrl = vinylId
      ? `${origin}/genesis/${vinylId}`
      : `${origin}/collection/${collectionSlug}`;

    // For Genesis (physical vinyl), collect shipping address natively in Stripe
    const isGenesisCheckout = !!vinylId;

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isGenesisCheckout
                ? `Genesis — ${getVinylById(vinylId!)?.edition} #${String(getVinylById(vinylId!)?.number).padStart(2, "0")}`
                : collection.name,
              description: isGenesisCheckout
                ? "Physical vinyl artwork + digital collectible. Shipped worldwide."
                : (collection.description ?? undefined),
            },
            unit_amount: collection.price_cents,
          },
          quantity: cappedQuantity,
        },
      ],
      metadata,
      ...(isGenesisCheckout && {
        shipping_address_collection: {
          allowed_countries: [
            "US", "CA", "GB", "FR", "DE", "ES", "IT", "NL", "BE", "CH",
            "AT", "AU", "JP", "KR", "SE", "NO", "DK", "FI", "PT", "IE",
            "LU", "MC", "MX", "BR", "AR", "CL", "CO", "NZ", "SG", "HK",
          ],
        },
        phone_number_collection: { enabled: true },
      }),
      success_url: `${origin}/success?collection=${collectionSlug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mint] Unexpected error:", message, err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
