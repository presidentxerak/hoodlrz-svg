-- ════════════════════════════════════════════════════════════
-- hOodlrz CITY cache tables
-- ════════════════════════════════════════════════════════════
-- The /city FPS game asks for the live Hoodlrz holders + their NFT
-- art. We cache both server-side (Alchemy is hit only by the cron),
-- so the browser never sees the Alchemy key and the game can build
-- the city instantly.
--
-- Tables are prefixed with `city_` to avoid clashing with the
-- existing public.tokens table used by the mint flow.

create table if not exists public.city_holders (
  wallet      text primary key,
  token_count integer not null default 1,
  updated_at  timestamptz not null default now()
);

create table if not exists public.city_tokens (
  token_id   integer primary key,
  owner      text,
  image_url  text,
  updated_at timestamptz not null default now()
);
create index if not exists city_tokens_owner_idx on public.city_tokens(owner);

create table if not exists public.city_sync_state (
  id           boolean primary key default true,
  last_run     timestamptz,
  holder_count integer,
  token_count  integer,
  ok           boolean,
  note         text,
  constraint city_sync_state_one_row check (id)
);
insert into public.city_sync_state (id) values (true) on conflict do nothing;

-- Public reads are allowed (the game fetches anon via the Next.js
-- /api/city/holders route, which itself reads through the service
-- role). Only the service role can write.
alter table public.city_holders enable row level security;
alter table public.city_tokens  enable row level security;
alter table public.city_sync_state enable row level security;

-- Idempotent policy creation (CREATE POLICY itself has no IF NOT EXISTS).
drop policy if exists "read city_holders"    on public.city_holders;
drop policy if exists "read city_tokens"     on public.city_tokens;
drop policy if exists "read city_sync_state" on public.city_sync_state;

create policy "read city_holders"
  on public.city_holders for select using (true);
create policy "read city_tokens"
  on public.city_tokens  for select using (true);
create policy "read city_sync_state"
  on public.city_sync_state for select using (true);

-- ════════════════════════════════════════════════════════════
-- OPTIONAL CRON: refresh from Alchemy every 30 min
-- ════════════════════════════════════════════════════════════
-- Uncomment after deploying the `refresh-holders` Edge Function
-- and storing your service-role key in Vault.

-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select vault.create_secret('PASTE_SERVICE_ROLE_KEY', 'service_role_key');
--
-- select cron.schedule(
--   'refresh-hoodlrz-city',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/refresh-holders',
--     headers := jsonb_build_object(
--       'Content-Type','application/json',
--       'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key')
--     )
--   );
--   $$
-- );
-- to stop:  select cron.unschedule('refresh-hoodlrz-city');
