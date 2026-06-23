// GET  /api/city/progress?wallet=0x...           - fetch the latest snapshot
// POST /api/city/progress { wallet, message,
//   signature, snapshot }                          - persist a snapshot
//
// Cross-device sync layer on top of the in-browser localStorage save.
// Walletless players still have their progress saved locally; the moment
// they connect a wallet the game does GET → merges by savedAt → POSTs
// the merged snapshot back, then keeps POSTing on subsequent saves.
//
// Auth model: POST requires a personal_sign of the wallet+timestamp
// message (24h validity). GET is unauthenticated - the snapshot only
// contains in-game stats (Hoodz, inventory, souls progress) so there's
// nothing sensitive to gate. Worst case: another player can window-shop
// your progress, not modify it.

import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "ethers";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MSG_PREFIX = "Hoodlrz CITY progress save";
const MSG_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours of signature validity
const MAX_SNAPSHOT_BYTES = 16 * 1024;     // 16 KB hard cap to keep abuse off

interface SnapshotRow {
  snapshot: unknown;
  updated_at: string;
}

interface ProgressBody {
  wallet?: string;
  message?: string;
  signature?: string;
  snapshot?: unknown;
}

export async function GET(request: NextRequest) {
  const wallet = (request.nextUrl.searchParams.get("wallet") || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ snapshot: null, error: "Invalid wallet" }, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("city_progress")
      .select("snapshot, updated_at")
      .eq("wallet", wallet.toLowerCase())
      .maybeSingle();
    if (error) {
      return NextResponse.json({ snapshot: null, error: error.message }, { status: 500 });
    }
    const row = data as SnapshotRow | null;
    return NextResponse.json({
      snapshot: row?.snapshot ?? null,
      updatedAt: row?.updated_at ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { snapshot: null, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as ProgressBody;
  const wallet = (body.wallet || "").trim();
  const message = body.message || "";
  const signature = body.signature || "";
  const snapshot = body.snapshot;

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ ok: false, error: "Invalid wallet" }, { status: 400 });
  }
  if (!message || !signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  }
  if (!message.startsWith(MSG_PREFIX)) {
    return NextResponse.json({ ok: false, error: "Bad message format" }, { status: 400 });
  }
  if (!message.includes(`Wallet: ${wallet.toLowerCase()}`)) {
    return NextResponse.json({ ok: false, error: "Wallet mismatch in message" }, { status: 400 });
  }
  const tsMatch = message.match(/Timestamp: (\d+)/);
  if (!tsMatch) return NextResponse.json({ ok: false, error: "Missing timestamp" }, { status: 400 });
  const ts = parseInt(tsMatch[1], 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MSG_TTL_MS) {
    return NextResponse.json({ ok: false, error: "Stale signature" }, { status: 400 });
  }
  let recovered: string;
  try { recovered = verifyMessage(message, signature); }
  catch { return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 }); }
  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Signature does not match wallet" }, { status: 400 });
  }
  if (snapshot == null || typeof snapshot !== "object") {
    return NextResponse.json({ ok: false, error: "Snapshot must be an object" }, { status: 400 });
  }
  let serialised: string;
  try { serialised = JSON.stringify(snapshot); }
  catch { return NextResponse.json({ ok: false, error: "Snapshot not serialisable" }, { status: 400 }); }
  if (serialised.length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ ok: false, error: "Snapshot too large" }, { status: 413 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("city_progress")
      .upsert(
        { wallet: wallet.toLowerCase(), snapshot, updated_at: new Date().toISOString() },
        { onConflict: "wallet" },
      );
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
