-- ════════════════════════════════════════════════════════════
-- hOodlrz CITY cross-device progress
-- ════════════════════════════════════════════════════════════
-- One row per wallet, holding the latest snapshot of the player's
-- in-game progress (Hoodz, inventory, keys, souls, vault NFTs, journal,
-- weapon, etc.). Snapshot is opaque jsonb on purpose so we can evolve
-- the shape without a migration each time.
--
-- A player saves to localStorage on every state change (works without
-- a wallet). On wallet connect, the game GETs the server snapshot and
-- merges by savedAt timestamp; subsequent saves also POST here so the
-- player's progress follows them across devices.

create table if not exists public.city_progress (
  wallet     text primary key,
  snapshot   jsonb not null,
  updated_at timestamptz not null default now()
);

-- Public reads are allowed. The endpoint /api/city/progress signs reads
-- as anonymous and never exposes anything you couldn't recompute from
-- on-chain state anyway (Hoodz count is in-game currency, not a token).
alter table public.city_progress enable row level security;
drop policy if exists "read city_progress" on public.city_progress;
create policy "read city_progress" on public.city_progress for select using (true);
