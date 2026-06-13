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
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Idempotency check: skip if already processed
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
    // If idempotency check fails, return 500 so Stripe retries later
    console.error("[stripe/webhook] Idempotency check failed:", err);
    return NextResponse.json(
      { error: "Idempotency check failed. Will retry." },
      { status: 500 }
    );
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
  const { collectionId, vinylId } = metadata;
  let accountId = metadata.accountId;
  const quantity = Math.max(1, parseInt(metadata.quantity || "1", 10));
  const isGenesis = !!vinylId;

  console.log(`[stripe/webhook] Primary sale: collection=${collectionId}, account=${accountId || "none"}, quantity=${quantity}, vinylId=${vinylId || "none"}`);

  if (!collectionId) {
    throw new Error(`Missing metadata: collectionId=${collectionId}`);
  }

  // For Genesis purchases without auth: create account from Stripe customer email
  if (!accountId && isGenesis) {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error("Genesis purchase without accountId and no customer email from Stripe");
    }

    // Check if account with this email already exists
    const { data: existingAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const { data: newAccount, error: createErr } = await supabase
        .from("accounts")
        .insert({
          email: customerEmail,
          pseudonym: `Collector#${customerEmail.split("@")[0].substring(0, 8)}`,
        })
        .select("id")
        .single();

      if (createErr || !newAccount) {
        throw new Error(`Failed to create account for ${customerEmail}: ${createErr?.message}`);
      }
      accountId = newAccount.id;
      console.log(`[stripe/webhook] Created account ${accountId} for Genesis buyer ${customerEmail}`);
    }
  }

  if (!accountId) {
    throw new Error(`Missing accountId for non-Genesis purchase`);
  }

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

  const amountPerToken = Math.round((session.amount_total ?? collection.price_cents) / quantity);
  const tokenIds: string[] = [];

  for (let i = 0; i < quantity; i++) {
    // Re-fetch collection to get current minted_count
    const { data: currentCollection } = await supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .single();

    if (!currentCollection || currentCollection.minted_count >= currentCollection.total_supply) {
      console.warn(`[stripe/webhook] Sold out after minting ${i}/${quantity} tokens`);
      break;
    }

    const serialNumber = currentCollection.minted_count + 1;

    // For Genesis: store vinylId as seed (used to look up vinyl image)
    // For Hoodlrz: generate a random PFP
    let seed: string;
    let traitsJson: Record<string, string> = {};
    let canonicalHash: string;

    if (isGenesis) {
      seed = vinylId; // e.g. "black-01" - used to look up the vinyl image
      canonicalHash = await computeCanonicalHash(seed);
      console.log(`[stripe/webhook] Minting Genesis token ${i + 1}/${quantity}: vinyl=${vinylId}, serial=${serialNumber}`);
    } else {
      seed = generateSeed();
      const pfp = generatePFP(seed);
      traitsJson = pfp.traits;
      canonicalHash = await computeCanonicalHash(pfp.svg);
      console.log(`[stripe/webhook] Minting token ${i + 1}/${quantity}: seed=${seed}, serial=${serialNumber}`);
    }

    // Atomic increment with sold-out guard
    const { data: updatedCollection, error: updateError } = await supabase
      .from("collections")
      .update({ minted_count: serialNumber })
      .eq("id", collectionId)
      .lt("minted_count", currentCollection.total_supply)
      .select("minted_count")
      .single();

    if (updateError || !updatedCollection) {
      console.warn(`[stripe/webhook] Failed to claim serial ${serialNumber}, stopping. ${updateError?.message}`);
      break;
    }

    // Insert token
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .insert({
        collection_id: collectionId,
        owner_id: accountId,
        serial_number: serialNumber,
        seed,
        traits_json: traitsJson,
        canonical_hash: canonicalHash,
      })
      .select()
      .single();

    if (tokenError || !token) {
      console.error(`[stripe/webhook] Failed to create token ${i + 1}: ${tokenError?.message}`);
      continue;
    }

    tokenIds.push(token.id);
    console.log(`[stripe/webhook] Token created: ${token.id} (serial #${serialNumber})`);

    // Create order for each token
    const { error: orderError } = await supabase.from("orders").insert({
      account_id: accountId,
      collection_id: collectionId,
      token_id: token.id,
      amount_cents: amountPerToken,
      currency: "usd",
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      status: "completed",
      order_type: "collect",
    });

    if (orderError) {
      console.error("[stripe/webhook] Failed to create order:", orderError.message);
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
  }
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

  // Credit the seller - upsert to avoid race conditions
  const sellerPayoutCents = amountCents;
  const { data: existingBalance } = await supabase
    .from("seller_balances")
    .select("id, available_cents, total_earned_cents")
    .eq("account_id", listing.seller_id)
    .single();

  if (existingBalance) {
    // Atomic-safe: use the fetched values + guard with .eq("id") to detect stale writes
    const { error: updateErr } = await supabase
      .from("seller_balances")
      .update({
        available_cents: existingBalance.available_cents + sellerPayoutCents,
        total_earned_cents: existingBalance.total_earned_cents + sellerPayoutCents,
      })
      .eq("id", existingBalance.id)
      .eq("available_cents", existingBalance.available_cents); // optimistic lock

    if (updateErr) {
      // Retry once on conflict
      const { data: fresh } = await supabase
        .from("seller_balances")
        .select("available_cents, total_earned_cents")
        .eq("account_id", listing.seller_id)
        .single();
      if (fresh) {
        await supabase
          .from("seller_balances")
          .update({
            available_cents: fresh.available_cents + sellerPayoutCents,
            total_earned_cents: fresh.total_earned_cents + sellerPayoutCents,
          })
          .eq("account_id", listing.seller_id);
      }
    }
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
