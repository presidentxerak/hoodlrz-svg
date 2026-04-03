import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { address } = (await request.json()) as { address?: string };

    if (!address || typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid Ethereum address." }, { status: 400 });
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const message = `Welcome to Hoodlrz!\n\nSign this message to verify ownership of your wallet.\n\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}`;

    return NextResponse.json({ nonce, message });
  } catch (err) {
    console.error("[auth/wallet/nonce] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
