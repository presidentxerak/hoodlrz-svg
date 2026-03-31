import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSeed, computeCanonicalHash } from "@/lib/pfp/hash";
import { generatePFP } from "@/lib/pfp/generator";

// Force dynamic — never cache this route
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  // ── Step 1: Validate environment ──
  if (!WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    );
  }

  // ── Step 2: Read raw body and signature ──
  let body: string;
  try {
    body = await request.text();
  } catch (err) {
    console.error("[stripe/webhook] Failed to read request body:", err);
    return NextResponse.json(
      { error: "Failed to read request body." },
      { status: 400 }
    );
  }

  // Use request.headers directly instead of Next.js headers() — more reliable for webhooks
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[stripe/webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  // ── Step 3: Verify signature ──
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

  console.log(`[stripe/webhook] Received event: ${event.type} (${event.id})`);

  // ── Step 4: Initialize Supabase admin ──
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("[stripe/webhook] Failed to create Supabase admin client:", err);
    return NextResponse.json(
      { error: "Database connection failed." },
      { status: 500 }
    );
  }

  // ── Step 5: Idempotency check ──
  try {
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("processed")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent?.processed) {
      console.log(`[stripe/webhook] Event ${event.id} already processed, skipping.`);
      return NextResponse.json({ received: true, already_processed: true });
    }
  } catch (err) {
    // If the stripe_events table doesn't exist or query fails, log but continue
    console.warn("[stripe/webhook] Idempotency check failed (non-fatal):", err);
  }

  // ── Step 6: Log event ──
  try {
    await supabase.from("stripe_events").upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        payload: JSON.parse(JSON.stringify(event.data.object)),
        processed: false,
      },
      { onConflict: "stripe_event_id" }
    );
  } catch (err) {
    console.warn("[stripe/webhook] Failed to log event (non-fatal):", err);
  }

  // ── Step 7: Process event ──
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};

        console.log(`[stripe/webhook] Processing checkout session: ${session.id}, type: ${metadata.type}`);

        if (metadata.type === "primary_sale") {
          await handlePrimarySale(supabase, session, metadata);
        } else if (metadata.type === "marketplace_purchase") {
          await handleMarketplacePurchase(supabase, session, metadata);
        } else {
          console.log(`[stripe/webhook] Unknown metadata type: ${metadata.type}`);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[stripe/webhook] Payment intent succeeded:", paymentIntent.id);
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }

    // Mark processed
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    console.log(`[stripe/webhook] Event ${event.id} processed successfully.`);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    console.error(`[stripe/webhook] Processing error for event ${event.id}:`, message, stack);
    return NextResponse.json(
      { error: `Webhook processing failed: ${message}` },
      { status: 500 }
    );
  }
}

// ── Primary Sale Handler ──

async function handlePrimarySale(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { collectionId, accountId } = metadata;

  console.log(`[stripe/webhook] Primary sale: collection=${collectionId}, account=${accountId}`);

  if (!collectionId || !accountId) {
    throw new Error(`Missing metadata: collectionId=${collectionId}, accountId=${accountId}`);
  }

  const { data: collection, error: collError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (collError || !collection) {
    throw new Error(`Collection ${collectionId} not found: ${collError?.message}`);
  }

  // Re-check supply before minting (race condition guard)
  if (collection.minted_count >= collection.total_supply) {
    throw new Error(`Collection ${collectionId} is sold out.`);
  }

  // Generate PFP token
  const seed = generateSeed();
  const pfp = generatePFP(seed);
  const canonicalHash = await computeCanonicalHash(pfp.svg);
  const serialNumber = collection.minted_count + 1;

  console.log(`[stripe/webhook] Generated PFP: seed=${seed}, serial=${serialNumber}`);

  // Atomic increment with sold-out guard
  const { data: updatedCollection, error: updateError } = await supabase
    .from("collections")
    .update({ minted_count: serialNumber })
    .eq("id", collectionId)
    .lt("minted_count", collection.total_supply)
    .select("minted_count")
    .single();

  if (updateError || !updatedCollection) {
    throw new Error(`Collection ${collectionId} sold out or update failed: ${updateError?.message}`);
  }

  // Insert token
  const { data: token, error: tokenError } = await supabase
    .from("tokens")
    .insert({
      collection_id: collectionId,
      owner_id: accountId,
      serial_number: serialNumber,
      seed,
      traits_json: pfp.traits,
      canonical_hash: canonicalHash,
    })
    .select()
    .single();

  if (tokenError || !token) {
    throw new Error(`Failed to create token: ${tokenError?.message}`);
  }

  console.log(`[stripe/webhook] Token created: ${token.id}`);

  const amountCents = session.amount_total ?? collection.price_cents;

  // Create order
  const { error: orderError } = await supabase.from("orders").insert({
    account_id: accountId,
    collection_id: collectionId,
    token_id: token.id,
    amount_cents: amountCents,
    currency: "usd",
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    status: "completed",
    order_type: "collect",
  });

  if (orderError) {
    console.error("[stripe/webhook] Failed to create order:", orderError.message);
    // Don't throw — token was already created, order is secondary
  }

  // Create ownership event
  const { error: ownershipError } = await supabase.from("ownership_events").insert({
    token_id: token.id,
    from_account_id: null,
    to_account_id: accountId,
    event_type: "collect",
  });

  if (ownershipError) {
    console.error("[stripe/webhook] Failed to create ownership event:", ownershipError.message);
  }

  // Award Hoodz (+1)
  const { error: rewardError } = await supabase.from("rewards").insert({
    account_id: accountId,
    amount: 1,
    reason: "collect",
    reference_id: token.id,
  });

  if (rewardError) {
    console.error("[stripe/webhook] Failed to create reward:", rewardError.message);
  }

  console.log(`[stripe/webhook] Primary sale complete: token=${token.id}, serial=${serialNumber}`);
}

// ── Marketplace Purchase Handler ──

async function handleMarketplacePurchase(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { listingId, buyerAccountId } = metadata;

  console.log(`[stripe/webhook] Marketplace purchase: listing=${listingId}, buyer=${buyerAccountId}`);

  if (!listingId || !buyerAccountId) {
    throw new Error(`Missing metadata: listingId=${listingId}, buyerAccountId=${buyerAccountId}`);
  }

  // Re-check listing is still active (race condition guard)
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "active")
    .single();

  if (listingError || !listing) {
    throw new Error(`Active listing ${listingId} not found: ${listingError?.message}`);
  }

  const { data: token } = await supabase
    .from("tokens")
    .select("collection_id")
    .eq("id", listing.token_id)
    .single();

  if (!token) {
    throw new Error(`Token for listing ${listingId} not found.`);
  }

  const amountCents = session.amount_total ?? listing.price_cents;

  // Create order
  await supabase.from("orders").insert({
    account_id: buyerAccountId,
    collection_id: token.collection_id,
    token_id: listing.token_id,
    amount_cents: amountCents,
    currency: "usd",
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    status: "completed",
    order_type: "marketplace",
  });

  // Transfer ownership
  await supabase
    .from("tokens")
    .update({ owner_id: buyerAccountId, is_listed: false })
    .eq("id", listing.token_id);

  // Ownership event
  await supabase.from("ownership_events").insert({
    token_id: listing.token_id,
    from_account_id: listing.seller_id,
    to_account_id: buyerAccountId,
    event_type: "purchase",
  });

  // Close listing
  await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId);

  // Credit the seller
  const sellerPayoutCents = amountCents;
  const { data: existingBalance } = await supabase
    .from("seller_balances")
    .select("*")
    .eq("account_id", listing.seller_id)
    .single();

  if (existingBalance) {
    await supabase
      .from("seller_balances")
      .update({
        available_cents: existingBalance.available_cents + sellerPayoutCents,
        total_earned_cents: existingBalance.total_earned_cents + sellerPayoutCents,
      })
      .eq("account_id", listing.seller_id);
  } else {
    await supabase
      .from("seller_balances")
      .insert({
        account_id: listing.seller_id,
        available_cents: sellerPayoutCents,
        pending_cents: 0,
        total_earned_cents: sellerPayoutCents,
      });
  }

  // Award Hoodz to buyer
  await supabase.from("rewards").insert({
    account_id: buyerAccountId,
    amount: 1,
    reason: "marketplace_purchase",
    reference_id: listing.token_id,
  });

  console.log(`[stripe/webhook] Marketplace purchase complete: listing=${listingId}`);
}
