import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { address } = (await request.json()) as { address?: string };

    if (!address || typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid Ethereum address." }, { status: 400 });
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const message = `Welcome to Hoodlrz!\n\nSign this message to verify ownership of your wallet.\n\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}`;

    // Store nonce server-side with 5-minute expiry
    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Clean up expired nonces for this address, then insert new one
    await admin.from("wallet_nonces").delete().lt("expires_at", new Date().toISOString());
    await admin.from("wallet_nonces").insert({
      nonce,
      address: address.toLowerCase(),
      expires_at: expiresAt,
    });

    return NextResponse.json({ nonce, message });
  } catch (err) {
    console.error("[auth/wallet/nonce] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
