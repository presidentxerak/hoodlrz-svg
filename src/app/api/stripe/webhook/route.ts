import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { generateSeed, computeCanonicalHash } from "@/lib/pfp/hash";
import type { Json } from "@/types/database";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Platform fee: 10%
const PLATFORM_FEE_RATE = 0.1;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeServer().webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Log event to stripe_events table
  await supabase.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Json,
    processed: false,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};

        if (metadata.type === "primary_sale") {
          await handlePrimarySale(supabase, session, metadata);
        } else if (metadata.type === "marketplace_purchase") {
          await handleMarketplacePurchase(supabase, session, metadata);
        }

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          "[stripe/webhook] Payment intent succeeded:",
          paymentIntent.id
        );
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }

    // Mark event as processed
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] Processing error:", message);

    // Log error against event
    await supabase
      .from("stripe_events")
      .update({ error: message })
      .eq("stripe_event_id", event.id);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}

// ── Primary Sale Handler ──

async function handlePrimarySale(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { collectionId, accountId } = metadata;

  // Fetch collection
  const { data: collection, error: collError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (collError || !collection) {
    throw new Error(`Collection ${collectionId} not found.`);
  }

  // Generate PFP token
  const seed = generateSeed();
  const svgUrl = `/api/pfp/${seed}.svg`; // served by PFP render route
  const canonicalHash = await computeCanonicalHash(seed);
  const tokenNumber = collection.minted + 1;

  // Insert token
  const { data: token, error: tokenError } = await supabase
    .from("tokens")
    .insert({
      collection_id: collectionId,
      owner_id: accountId,
      token_number: tokenNumber,
      svg_url: svgUrl,
      metadata: { seed, hash: canonicalHash },
      traits: null, // traits resolved at render time from seed
    })
    .select()
    .single();

  if (tokenError || !token) {
    throw new Error(`Failed to create token: ${tokenError?.message}`);
  }

  const amountCents = session.amount_total ?? collection.price_cents;
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);
  const sellerPayoutCents = amountCents - platformFeeCents;

  // Create order record
  const { error: orderError } = await supabase.from("orders").insert({
    buyer_id: accountId,
    collection_id: collectionId,
    token_id: token.id,
    stripe_payment_intent_id: session.payment_intent as string,
    stripe_checkout_session_id: session.id,
    amount_cents: amountCents,
    currency: collection.currency,
    platform_fee_cents: platformFeeCents,
    seller_payout_cents: sellerPayoutCents,
    status: "completed",
  });

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  // Create ownership_event (mint)
  await supabase.from("ownership_events").insert({
    token_id: token.id,
    from_account_id: null,
    to_account_id: accountId,
    event_type: "mint",
    price_cents: amountCents,
  });

  // Update collection minted count
  await supabase
    .from("collections")
    .update({ minted: tokenNumber })
    .eq("id", collectionId);

  // Award Hoodz reward (+1 for collecting)
  await supabase.from("rewards").insert({
    account_id: accountId,
    type: "collect",
    points: 1,
    description: `Collected ${collection.name} #${tokenNumber}`,
    metadata: { token_id: token.id, collection_id: collectionId },
  });

  // Check if user has 10+ Hoodz points -> award free collectible
  const { data: rewards } = await supabase
    .from("rewards")
    .select("points")
    .eq("account_id", accountId);

  if (rewards) {
    const totalPoints = rewards.reduce((sum, r) => sum + r.points, 0);

    if (totalPoints >= 10 && totalPoints - 1 < 10) {
      // Just crossed the 10-point threshold
      await supabase.from("rewards").insert({
        account_id: accountId,
        type: "promo",
        points: 0,
        description: "Unlocked free collectible at 10 Hoodz!",
        metadata: { milestone: 10, eligible_for_free_collectible: true },
      });
    }
  }
}

// ── Marketplace Purchase Handler ──

async function handleMarketplacePurchase(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { listingId, buyerAccountId } = metadata;

  // Fetch listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("is_active", true)
    .single();

  if (listingError || !listing) {
    throw new Error(`Active listing ${listingId} not found.`);
  }

  // Fetch associated token to get collection_id
  const { data: token, error: tokenError } = await supabase
    .from("tokens")
    .select("*")
    .eq("id", listing.token_id)
    .single();

  if (tokenError || !token) {
    throw new Error(`Token ${listing.token_id} not found for listing.`);
  }

  const amountCents = session.amount_total ?? listing.price_cents;
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);
  const sellerPayoutCents = amountCents - platformFeeCents;

  // Create order record
  await supabase.from("orders").insert({
    buyer_id: buyerAccountId,
    collection_id: token.collection_id,
    token_id: listing.token_id,
    stripe_payment_intent_id: session.payment_intent as string,
    stripe_checkout_session_id: session.id,
    amount_cents: amountCents,
    currency: listing.currency,
    platform_fee_cents: platformFeeCents,
    seller_payout_cents: sellerPayoutCents,
    status: "completed",
  });

  // Transfer token ownership
  await supabase
    .from("tokens")
    .update({ owner_id: buyerAccountId, is_listed: false })
    .eq("id", listing.token_id);

  // Create ownership_event (purchase)
  await supabase.from("ownership_events").insert({
    token_id: listing.token_id,
    from_account_id: listing.seller_id,
    to_account_id: buyerAccountId,
    event_type: "purchase",
    price_cents: amountCents,
  });

  // Deactivate listing
  await supabase
    .from("listings")
    .update({ is_active: false })
    .eq("id", listingId);
}
