import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe";
import { getVinylById } from "@/lib/genesis/vinyls";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collectionSlug, quantity: rawQuantity, vinylId, trackSelection } = body as {
      collectionSlug?: string;
      quantity?: number;
      vinylId?: string;
      trackSelection?: { sideA: string[]; sideB: string[] };
    };

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug is required." },
        { status: 400 }
      );
    }

    const isGenesisCheckout = !!vinylId;

    // ── Genesis vinyl validation ──
    if (vinylId) {
      const vinyl = getVinylById(vinylId);
      if (!vinyl) {
        return NextResponse.json(
          { error: "Invalid vinyl." },
          { status: 400 }
        );
      }

      if (
        !trackSelection ||
        !Array.isArray(trackSelection.sideA) ||
        !Array.isArray(trackSelection.sideB) ||
        trackSelection.sideA.length !== 2 ||
        trackSelection.sideB.length !== 2
      ) {
        return NextResponse.json(
          { error: "Please select 4 tracks (2 per side) for your vinyl." },
          { status: 400 }
        );
      }
    }

    // ── Auth: required for Hoodlrz, optional for Genesis ──
    // Genesis buyers pay via Stripe (email collected there), account created in webhook.
    // Hoodlrz buyers must be authenticated (wallet or email).
    let accountId: string | null = null;

    const admin = createAdminClient();

    if (!isGenesisCheckout) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const { data: account, error: accountError } = await admin
        .from("accounts")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (accountError || !account) {
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
    } else {
      // For Genesis, try to get auth user if logged in (optional)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: account } = await admin
            .from("accounts")
            .select("id")
            .eq("auth_id", user.id)
            .single();
          if (account) accountId = account.id;
        }
      } catch {
        // Not logged in — that's fine for Genesis
      }
    }

    // Validate quantity (1-10), force 1 for Genesis
    const quantity = vinylId
      ? 1
      : Math.min(10, Math.max(1, Math.floor(Number(rawQuantity) || 1)));

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

    // For Genesis: look up the per-vinyl Stripe Price (one Product per vinyl,
    // populated by `npm run seed:stripe`). The Hoodlrz primary sale path still
    // uses inline price_data — switch to a Stripe Price the same way if you
    // want the PFP drop in the catalog too.
    let genesisPriceId: string | null = null;
    if (isGenesisCheckout) {
      const { data: vinylRow, error: vinylErr } = await admin
        .from("genesis_vinyls")
        .select("stripe_price_id")
        .eq("id", vinylId!)
        .single();

      if (vinylErr || !vinylRow?.stripe_price_id) {
        console.error("[mint] Missing Stripe price for vinyl", vinylId, vinylErr);
        return NextResponse.json(
          {
            error:
              "Vinyl pricing is not configured yet. Please run `npm run seed:stripe` to populate the Stripe catalog.",
          },
          { status: 500 },
        );
      }
      genesisPriceId = vinylRow.stripe_price_id;
    }

    // Build metadata
    const metadata: Record<string, string> = {
      collectionSlug,
      collectionId: collection.id,
      quantity: String(quantity),
      type: "primary_sale",
    };

    // Include accountId if user is authenticated
    if (accountId) {
      metadata.accountId = accountId;
    }

    if (vinylId) {
      metadata.vinylId = vinylId;
    }

    // Include track selection in Stripe metadata for pressing management
    if (vinylId && trackSelection) {
      metadata.sideA_track1 = trackSelection.sideA[0];
      metadata.sideA_track2 = trackSelection.sideA[1];
      metadata.sideB_track1 = trackSelection.sideB[0];
      metadata.sideB_track2 = trackSelection.sideB[1];
    }

    // For Genesis, use the vinyl page as cancel URL
    const cancelUrl = vinylId
      ? `${origin}/genesis/${vinylId}`
      : `${origin}/collection/${collectionSlug}`;

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = isGenesisCheckout
      ? { price: genesisPriceId!, quantity: 1 }
      : {
          price_data: {
            currency: "eur",
            product_data: {
              name: collection.name,
              description: collection.description ?? undefined,
            },
            unit_amount: collection.price_cents,
          },
          quantity: 1,
        };

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      metadata,
      // For Genesis: collect email + shipping + phone natively in Stripe
      ...(isGenesisCheckout && {
        customer_email: undefined, // let Stripe ask for it
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
