import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe";
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/server";
import { generateSeed, computeCanonicalHash } from "@/lib/pfp/hash";
import type { Json } from "@/types/database";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Platform fee: 10%
const PLATFORM_FEE_RATE = 0.1;

=======
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSeed, computeCanonicalHash } from "@/lib/pfp/hash";
import { generatePFP } from "@/lib/pfp/generator";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
      { error: `Webhook signature verification failed: ${message}` },
=======
      { error: "Webhook signature verification failed." },
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      { status: 400 }
    );
  }

<<<<<<< HEAD
  const supabase = createClient();

  // Log event to stripe_events table
  await supabase.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Json,
    processed: false,
  });
=======
  const supabase = createAdminClient();

  // Idempotency check: skip if already processed
  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("processed")
    .eq("stripe_event_id", event.id)
    .single();

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true, already_processed: true });
  }

  // Log event (upsert to handle re-deliveries)
  await supabase.from("stripe_events").upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: JSON.parse(JSON.stringify(event.data.object)),
    processed: false,
  }, { onConflict: "stripe_event_id" });
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

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
<<<<<<< HEAD

=======
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
<<<<<<< HEAD
        console.log(
          "[stripe/webhook] Payment intent succeeded:",
          paymentIntent.id
        );
=======
        console.log("[stripe/webhook] Payment intent succeeded:", paymentIntent.id);
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }

<<<<<<< HEAD
    // Mark event as processed
=======
    // Mark processed
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
<<<<<<< HEAD
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] Processing error:", message);

    // Log error against event
    await supabase
      .from("stripe_events")
      .update({ error: message })
      .eq("stripe_event_id", event.id);

=======
    console.error("[stripe/webhook] Processing error:", err);
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}

// ── Primary Sale Handler ──

async function handlePrimarySale(
<<<<<<< HEAD
  supabase: ReturnType<typeof createClient>,
=======
  supabase: ReturnType<typeof createAdminClient>,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { collectionId, accountId } = metadata;

<<<<<<< HEAD
  // Fetch collection
=======
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  const { data: collection, error: collError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (collError || !collection) {
    throw new Error(`Collection ${collectionId} not found.`);
  }

<<<<<<< HEAD
  // Generate PFP token
  const seed = generateSeed();
  const svgUrl = `/api/pfp/${seed}.svg`; // served by PFP render route
  const canonicalHash = await computeCanonicalHash(seed);
  const tokenNumber = collection.minted + 1;
=======
  // Re-check supply before minting (race condition guard)
  if (collection.minted_count >= collection.total_supply) {
    throw new Error(`Collection ${collectionId} is sold out.`);
  }

  // Generate PFP token
  const seed = generateSeed();
  const pfp = generatePFP(seed);
  const canonicalHash = await computeCanonicalHash(pfp.svg);
  const serialNumber = collection.minted_count + 1;

  // Atomic increment with sold-out guard — claim the serial number BEFORE inserting the token
  const { data: updatedCollection, error: updateError } = await supabase
    .from("collections")
    .update({ minted_count: serialNumber })
    .eq("id", collectionId)
    .lt("minted_count", collection.total_supply)
    .select("minted_count")
    .single();

  if (updateError || !updatedCollection) {
    throw new Error(`Collection ${collectionId} is sold out or update failed.`);
  }
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

  // Insert token
  const { data: token, error: tokenError } = await supabase
    .from("tokens")
    .insert({
      collection_id: collectionId,
      owner_id: accountId,
<<<<<<< HEAD
      token_number: tokenNumber,
      svg_url: svgUrl,
      metadata: { seed, hash: canonicalHash },
      traits: null, // traits resolved at render time from seed
=======
      serial_number: serialNumber,
      seed,
      traits_json: pfp.traits,
      canonical_hash: canonicalHash,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    })
    .select()
    .single();

  if (tokenError || !token) {
    throw new Error(`Failed to create token: ${tokenError?.message}`);
  }

  const amountCents = session.amount_total ?? collection.price_cents;
<<<<<<< HEAD
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
=======

  // Create order
  await supabase.from("orders").insert({
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

  // Create ownership event
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  await supabase.from("ownership_events").insert({
    token_id: token.id,
    from_account_id: null,
    to_account_id: accountId,
<<<<<<< HEAD
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
=======
    event_type: "collect",
  });

  // Award Hoodz (+1) and update account balance
  await supabase.from("rewards").insert({
    account_id: accountId,
    amount: 1,
    reason: "collect",
    reference_id: token.id,
  });
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
}

// ── Marketplace Purchase Handler ──

async function handleMarketplacePurchase(
<<<<<<< HEAD
  supabase: ReturnType<typeof createClient>,
=======
  supabase: ReturnType<typeof createAdminClient>,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { listingId, buyerAccountId } = metadata;

<<<<<<< HEAD
  // Fetch listing
=======
  // Re-check listing is still active (race condition guard)
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
<<<<<<< HEAD
    .eq("is_active", true)
=======
    .eq("status", "active")
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    .single();

  if (listingError || !listing) {
    throw new Error(`Active listing ${listingId} not found.`);
  }

<<<<<<< HEAD
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
=======
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
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  await supabase
    .from("tokens")
    .update({ owner_id: buyerAccountId, is_listed: false })
    .eq("id", listing.token_id);

<<<<<<< HEAD
  // Create ownership_event (purchase)
=======
  // Ownership event
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  await supabase.from("ownership_events").insert({
    token_id: listing.token_id,
    from_account_id: listing.seller_id,
    to_account_id: buyerAccountId,
    event_type: "purchase",
<<<<<<< HEAD
    price_cents: amountCents,
  });

  // Deactivate listing
  await supabase
    .from("listings")
    .update({ is_active: false })
    .eq("id", listingId);
=======
  });

  // Close listing
  await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId);

  // Credit the seller
  // WARNING: This read-then-write pattern has a race condition under concurrent
  // webhook processing. In production, replace with a Supabase RPC function that
  // performs an atomic UPDATE ... SET available_cents = available_cents + $1,
  // total_earned_cents = total_earned_cents + $1 WHERE account_id = $2,
  // or use a serializable transaction.
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
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
}
