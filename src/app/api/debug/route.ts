import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Check stripe_events
    const { data: events, error: eventsError } = await admin
      .from("stripe_events")
      .select("id, stripe_event_id, event_type, processed, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check tokens
    const { data: tokens, error: tokensError } = await admin
      .from("tokens")
      .select("id, collection_id, serial_number, seed, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check orders
    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id, account_id, collection_id, amount_cents, status, order_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check accounts
    const { data: accounts, error: accountsError } = await admin
      .from("accounts")
      .select("id, auth_id, email, pseudonym, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check collections
    const { data: collections } = await admin
      .from("collections")
      .select("id, slug, name, minted_count, total_supply, price_cents, drop_status");

    return NextResponse.json({
      stripe_events: { data: events, error: eventsError?.message },
      tokens: { data: tokens, error: tokensError?.message },
      orders: { data: orders, error: ordersError?.message },
      accounts: { data: accounts, error: accountsError?.message },
      collections: { data: collections },
      env_check: {
        has_stripe_secret: !!process.env.STRIPE_SECRET_KEY,
        has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
