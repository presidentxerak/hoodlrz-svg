// POST /api/city/refresh-public
//
// Player-facing manual refresh button. Same effect as the cron-triggered
// /api/city/refresh, but with no auth + a 60-second global throttle so a
// spammy click can't burn through the Alchemy quota.
//
// Returns:
//   200 { ok: true, holders, tokens, tokensWithImage, runAt }
//   429 { ok: false, throttled: true, retryAfter, lastRun }
//   500 if CRON_SECRET isn't configured (the route delegates to /api/city/refresh
//        which requires that secret)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_INTERVAL_MS = 60_000;

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  // ── Throttle: read city_sync_state.last_run ────────────────────────────
  const { data: state } = await admin
    .from("city_sync_state")
    .select("last_run")
    .eq("id", true)
    .maybeSingle();
  const lastRunMs = state?.last_run ? new Date(state.last_run).getTime() : 0;
  const since = Date.now() - lastRunMs;
  if (since < MIN_INTERVAL_MS) {
    const retryAfter = Math.ceil((MIN_INTERVAL_MS - since) / 1000);
    return NextResponse.json(
      {
        ok: false,
        throttled: true,
        retryAfter,
        lastRun: state?.last_run,
        message: "Already refreshed less than a minute ago — try again in " + retryAfter + "s",
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // ── Delegate to the cron route with the server-side secret ─────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on the server" },
      { status: 500 },
    );
  }
  const internal = new URL("/api/city/refresh", request.url);
  try {
    const res = await fetch(internal.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({ ok: false, error: "Bad upstream JSON" }));
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
