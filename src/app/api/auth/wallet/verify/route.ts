import { NextRequest, NextResponse } from "next/server";
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

    // Verify signature using ethers
    const { verifyMessage } = await import("ethers");
    const expectedMessage = `Welcome to Hoodlrz!\n\nSign this message to verify ownership of your wallet.\n\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}`;

    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(expectedMessage, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "Signature does not match address." }, { status: 400 });
    }

    // Use wallet address as a pseudo-email for Supabase auth
    const walletEmail = `${address.toLowerCase()}@wallet.hoodlrz.com`;
    const walletPassword = `wallet_${address.toLowerCase()}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8) || "secret"}`;

    const admin = createAdminClient();

    // Try to find existing user by email
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === walletEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: { wallet_address: address.toLowerCase(), auth_method: "wallet" },
      });

      if (createError || !newUser?.user) {
        console.error("[auth/wallet/verify] Create user error:", createError);
        return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      }

      userId = newUser.user.id;

      // Create account record with wallet-based pseudonym
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      await admin.from("accounts").upsert({
        auth_id: userId,
        email: walletEmail,
        pseudonym: shortAddr,
      }, { onConflict: "auth_id" });
    }

    // Sign in the user by creating a session
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

    return NextResponse.json({ success: true, address: address.toLowerCase() });
  } catch (err) {
    console.error("[auth/wallet/verify] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
