import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get account
  const { data: account } = await admin
    .from("accounts")
    .select("id, pseudonym, rewards_balance, email")
    .eq("auth_id", user.id)
    .single();

  if (!account) {
    return NextResponse.json({ tokens: [], account: null });
  }

  // Get all tokens owned by this account (join with collections for slug)
  const { data: tokens, error: tokensError } = await admin
    .from("tokens")
    .select("id, seed, serial_number, collection_id, is_listed, created_at, collections(slug)")
    .eq("owner_id", account.id)
    .order("created_at", { ascending: false });

  if (tokensError) {
    return NextResponse.json({ error: "Failed to fetch tokens." }, { status: 500 });
  }

  // Flatten the collection slug into each token
  const enrichedTokens = (tokens || []).map((t) => {
    const col = t.collections as unknown as { slug: string } | null;
    return {
      id: t.id,
      seed: t.seed,
      serial_number: t.serial_number,
      collection_id: t.collection_id,
      collection_slug: col?.slug ?? null,
      is_listed: t.is_listed,
      created_at: t.created_at,
    };
  });

  return NextResponse.json({
    tokens: enrichedTokens,
    account: {
      id: account.id,
      pseudonym: account.pseudonym,
      rewardsBalance: account.rewards_balance,
      email: account.email,
    },
  });
}
