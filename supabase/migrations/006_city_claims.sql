-- ════════════════════════════════════════════════════════════
-- hOodlrz CITY reward claims
-- ════════════════════════════════════════════════════════════
-- One row per wallet that has claimed a reserved Hoodlrz On-Chain
-- NFT by unlocking a soul or vault in the city game. Wallet is the
-- primary key, so a single wallet can only claim once - regardless
-- of how many souls/vaults it unlocks during the playthrough.

create table if not exists public.city_claims (
  wallet      text primary key,
  token_id    integer not null,
  tx_hash     text not null,
  reward_id   text,                                -- e.g. 'soul_genesis', 'vault_museum' (analytics only)
  claimed_at  timestamptz not null default now()
);
create index if not exists city_claims_token_idx on public.city_claims(token_id);

-- The endpoint reads + writes through the service role; public reads
-- are useful for the "Hall of fame" / explorer view on the site.
alter table public.city_claims enable row level security;
drop policy if exists "read city_claims" on public.city_claims;
create policy "read city_claims" on public.city_claims for select using (true);
