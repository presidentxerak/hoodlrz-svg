import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSeed, computeCanonicalHash } from "@/lib/pfp/hash";
import { generatePFP } from "@/lib/pfp/generator";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

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

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed." },
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

  const { data: collection, error: collError } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (collError || !collection) {
    throw new Error(`Collection ${collectionId} not found.`);
  }

  // Re-check supply before minting (race condition guard)
  if (collection.minted_count >= collection.total_supply) {
    throw new Error(`Collection ${collectionId} is sold out.`);
  }

  // Generate PFP token
  const seed = generateSeed();
  const canonicalHash = await computeCanonicalHash(seed);
  const serialNumber = collection.minted_count + 1;
  const pfp = generatePFP(seed);

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

  const amountCents = session.amount_total ?? collection.price_cents;

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
  await supabase.from("ownership_events").insert({
    token_id: token.id,
    from_account_id: null,
    to_account_id: accountId,
    event_type: "collect",
  });

  // Update minted count atomically
  await supabase
    .from("collections")
    .update({ minted_count: collection.minted_count + 1 })
    .eq("id", collectionId);

  // Award Hoodz (+1) and update account balance
  await supabase.from("rewards").insert({
    account_id: accountId,
    amount: 1,
    reason: "collect",
    reference_id: token.id,
  });
}

// ── Marketplace Purchase Handler ──

async function handleMarketplacePurchase(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { listingId, buyerAccountId } = metadata;

  // Re-check listing is still active (race condition guard)
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "active")
    .single();

  if (listingError || !listing) {
    throw new Error(`Active listing ${listingId} not found.`);
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
}
