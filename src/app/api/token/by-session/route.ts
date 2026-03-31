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

  // Find the order by stripe_session_id
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("token_id, account_id")
    .eq("stripe_session_id", sessionId)
    .eq("status", "completed")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ found: false });
  }

  // Get the token
  const { data: token, error: tokenError } = await admin
    .from("tokens")
    .select("id, seed, serial_number, collection_id")
    .eq("id", order.token_id as string)
    .single();

  if (tokenError || !token) {
    return NextResponse.json({ found: false });
  }

  // Get the account pseudonym
  const { data: account } = await admin
    .from("accounts")
    .select("pseudonym")
    .eq("id", order.account_id)
    .single();

  return NextResponse.json({
    found: true,
    token: {
      id: token.id,
      seed: token.seed,
      serialNumber: token.serial_number,
      username: account?.pseudonym || "Collector",
    },
  });
}
