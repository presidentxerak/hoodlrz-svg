import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { address, signature, nonce } = (await request.json()) as {
      address?: string;
      signature?: string;
      nonce?: string;
    };

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 400 });
    }

    const admin = createAdminClient();
    const addrLower = address.toLowerCase();

    // ── 1. Validate nonce (server-side, single-use) ──
    const { data: nonceRecord } = await admin
      .from("wallet_nonces")
      .select("*")
      .eq("nonce", nonce)
      .eq("address", addrLower)
      .is("used_at", null)
      .single();

    if (!nonceRecord) {
      return NextResponse.json({ error: "Invalid or expired nonce." }, { status: 400 });
    }

    if (new Date(nonceRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "Nonce expired. Please try again." }, { status: 400 });
    }

    // Mark nonce as used immediately (prevents replay)
    await admin.from("wallet_nonces").update({ used_at: new Date().toISOString() }).eq("nonce", nonce);

    // ── 2. Verify signature ──
    const { verifyMessage } = await import("ethers");
    const expectedMessage = `Welcome to Hoodlrz!\n\nSign this message to verify ownership of your wallet.\n\nWallet: ${addrLower}\nNonce: ${nonce}`;

    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(expectedMessage, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    if (recoveredAddress.toLowerCase() !== addrLower) {
      return NextResponse.json({ error: "Signature does not match address." }, { status: 400 });
    }

    // ── 3. Find or create user (1 wallet = 1 account) ──
    const walletEmail = `${addrLower}@wallet.hoodlrz.com`;
    // Generate a strong random password (not derived from secrets)
    const walletPassword = crypto.randomBytes(32).toString("hex");

    // Look up existing account by wallet email (direct DB query, scalable)
    const { data: existingAccount } = await admin
      .from("accounts")
      .select("auth_id")
      .eq("email", walletEmail)
      .single();

    let userId: string;

    if (existingAccount?.auth_id) {
      userId = existingAccount.auth_id;
      // Update password for this session (random each time = no predictable password)
      await admin.auth.admin.updateUserById(userId, { password: walletPassword });
    } else {
      // Create new user with random password
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: { wallet_address: addrLower, auth_method: "wallet" },
      });

      if (createError || !newUser?.user) {
        console.error("[auth/wallet/verify] Create user error:", createError);
        return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      }

      userId = newUser.user.id;

      // Create account record
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      await admin.from("accounts").upsert({
        auth_id: userId,
        email: walletEmail,
        pseudonym: shortAddr,
      }, { onConflict: "auth_id" });
    }

    // ── 4. Create session ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const cookieStore = cookies();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // May fail in certain contexts
          }
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: walletEmail,
      password: walletPassword,
    });

    if (signInError) {
      console.error("[auth/wallet/verify] Sign in error:", signInError.message);
      return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
    }

    return NextResponse.json({ success: true, address: addrLower });
  } catch (err) {
    console.error("[auth/wallet/verify] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
