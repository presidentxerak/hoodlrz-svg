// supabase/functions/refresh-holders/index.ts
// Cron target. Pulls all Hoodlrz holders + token art from Alchemy
// (server-side, paginated) and upserts them into the cache tables.
// The Alchemy key never reaches the browser.
//
// deploy:  supabase functions deploy refresh-holders --no-verify-jwt
// secrets: supabase secrets set ALCHEMY_KEY=xxxxx
//          (HOODLRZ_CONTRACT and ALCHEMY_NETWORK have sensible defaults below)
//
// To trigger once manually after deploy:
//   curl -X POST https://PROJECT_REF.supabase.co/functions/v1/refresh-holders \
//     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KEY = Deno.env.get("ALCHEMY_KEY")!;
const CONTRACT = Deno.env.get("HOODLRZ_CONTRACT") ?? "0xdde5f965f9d80da49c5cb2951d046156f26ebfa2";
const NETWORK = Deno.env.get("ALCHEMY_NETWORK") ?? "eth-mainnet";
const BASE = `https://${NETWORK}.g.alchemy.com/nft/v3/${KEY}`;

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function pull() {
  const holders: Record<string, number> = {};
  const tokenOwner: Record<number, string> = {};

  // 1) holders + which tokenIds each owns
  let pageKey: string | undefined;
  do {
    const u = new URL(`${BASE}/getOwnersForContract`);
    u.searchParams.set("contractAddress", CONTRACT);
    u.searchParams.set("withTokenBalances", "true");
    if (pageKey) u.searchParams.set("pageKey", pageKey);
    const r = await (await fetch(u)).json();
    for (const o of r.owners ?? []) {
      const w = String(o.ownerAddress ?? "").toLowerCase();
      if (!w) continue;
      const bals = o.tokenBalances ?? [];
      holders[w] = (holders[w] ?? 0) + (bals.length || 1);
      for (const b of bals) {
        const id = parseInt(b.tokenId, b.tokenId?.startsWith?.("0x") ? 16 : 10);
        if (!isNaN(id)) tokenOwner[id] = w;
      }
    }
    pageKey = r.pageKey;
  } while (pageKey);

  // 2) token art (image per tokenId)
  const tokens: { token_id: number; owner: string | null; image_url: string | null }[] = [];
  pageKey = undefined;
  do {
    const u = new URL(`${BASE}/getNFTsForContract`);
    u.searchParams.set("contractAddress", CONTRACT);
    u.searchParams.set("withMetadata", "true");
    u.searchParams.set("limit", "100");
    if (pageKey) u.searchParams.set("pageKey", pageKey);
    const r = await (await fetch(u)).json();
    for (const n of r.nfts ?? []) {
      const idRaw = String(n.tokenId ?? "");
      const id = parseInt(idRaw, idRaw.startsWith("0x") ? 16 : 10);
      if (isNaN(id)) continue;
      const url = n.image?.cachedUrl ?? n.image?.originalUrl ?? n.image?.pngUrl ?? null;
      tokens.push({ token_id: id, owner: tokenOwner[id] ?? null, image_url: url });
    }
    pageKey = r.pageKey;
  } while (pageKey);

  return { holders, tokens };
}

Deno.serve(async () => {
  const runAt = new Date().toISOString();
  try {
    if (!KEY) throw new Error("ALCHEMY_KEY secret is not set");
    const { holders, tokens } = await pull();
    const hRows = Object.entries(holders).map(([wallet, token_count]) => ({
      wallet,
      token_count,
      updated_at: runAt,
    }));

    // upsert in chunks, then purge stale rows (wallets that no longer hold)
    for (let i = 0; i < hRows.length; i += 500) {
      await sb.from("city_holders").upsert(hRows.slice(i, i + 500), { onConflict: "wallet" });
    }
    await sb.from("city_holders").delete().lt("updated_at", runAt);

    for (let i = 0; i < tokens.length; i += 500) {
      await sb.from("city_tokens").upsert(
        tokens.slice(i, i + 500).map((t) => ({ ...t, updated_at: runAt })),
        { onConflict: "token_id" },
      );
    }

    await sb.from("city_sync_state").upsert({
      id: true,
      last_run: runAt,
      holder_count: hRows.length,
      token_count: tokens.length,
      ok: true,
      note: "",
    });
    return Response.json({ ok: true, holders: hRows.length, tokens: tokens.length });
  } catch (e) {
    await sb.from("city_sync_state").upsert({
      id: true,
      last_run: runAt,
      ok: false,
      note: String(e),
    });
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
