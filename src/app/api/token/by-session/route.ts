import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find ALL orders for this stripe session (multi-quantity support)
  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("token_id, account_id")
    .eq("stripe_session_id", sessionId)
    .eq("status", "completed");

  if (orderError || !orders || orders.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Get all token IDs
  const tokenIds = orders
    .map((o) => o.token_id)
    .filter((id): id is string => id !== null);

  if (tokenIds.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Fetch all tokens
  const { data: tokens, error: tokenError } = await admin
    .from("tokens")
    .select("id, seed, serial_number, collection_id")
    .in("id", tokenIds)
    .order("serial_number", { ascending: true });

  if (tokenError || !tokens || tokens.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Get account pseudonym
  const { data: account } = await admin
    .from("accounts")
    .select("pseudonym")
    .eq("id", orders[0].account_id)
    .single();

  const username = account?.pseudonym || "Collector";

  return NextResponse.json({
    found: true,
    totalMinted: tokens.length,
    tokens: tokens.map((t) => ({
      id: t.id,
      seed: t.seed,
      serialNumber: t.serial_number,
      username,
    })),
  });
}
