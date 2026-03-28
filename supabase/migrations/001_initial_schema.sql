-- Hoodlrz Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ACCOUNTS
-- ============================================
create table public.accounts (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  pseudonym text,
  rewards_balance integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users can read own account" on public.accounts
  for select using (auth.uid() = auth_id);

create policy "Users can update own account" on public.accounts
  for update using (auth.uid() = auth_id);

create policy "Admins can read all accounts" on public.accounts
  for select using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- COLLECTIONS
-- ============================================
create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  hero_media_url text,
  total_supply integer not null default 10000,
  minted_count integer not null default 0,
  price_cents integer not null default 999,
  whitelist_start_at timestamptz,
  public_start_at timestamptz,
  drop_status text not null default 'upcoming' check (drop_status in ('upcoming', 'whitelist', 'public', 'sold_out', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "Anyone can read collections" on public.collections
  for select using (true);

create policy "Admins can manage collections" on public.collections
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- TOKENS
-- ============================================
create table public.tokens (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id),
  serial_number integer not null,
  seed text unique not null,
  traits_json jsonb not null default '{}',
  canonical_hash text not null,
  owner_id uuid references public.accounts(id),
  is_listed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(collection_id, serial_number)
);

alter table public.tokens enable row level security;

create policy "Anyone can read tokens" on public.tokens
  for select using (true);

create policy "Admins can manage tokens" on public.tokens
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

create policy "Owners can update own tokens" on public.tokens
  for update using (
    owner_id in (select id from public.accounts where auth_id = auth.uid())
  );

-- ============================================
-- ORDERS
-- ============================================
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id),
  token_id uuid references public.tokens(id),
  collection_id uuid not null references public.collections(id),
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  order_type text not null default 'collect' check (order_type in ('collect', 'marketplace', 'reward')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can read own orders" on public.orders
  for select using (
    account_id in (select id from public.accounts where auth_id = auth.uid())
  );

create policy "Admins can read all orders" on public.orders
  for select using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- LISTINGS (Marketplace)
-- ============================================
create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  token_id uuid not null references public.tokens(id),
  seller_id uuid not null references public.accounts(id),
  price_cents integer not null,
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Anyone can read active listings" on public.listings
  for select using (status = 'active');

create policy "Sellers can manage own listings" on public.listings
  for all using (
    seller_id in (select id from public.accounts where auth_id = auth.uid())
  );

create policy "Admins can manage all listings" on public.listings
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- OWNERSHIP EVENTS
-- ============================================
create table public.ownership_events (
  id uuid primary key default uuid_generate_v4(),
  token_id uuid not null references public.tokens(id),
  from_account_id uuid references public.accounts(id),
  to_account_id uuid not null references public.accounts(id),
  event_type text not null check (event_type in ('collect', 'purchase', 'transfer', 'reward')),
  created_at timestamptz not null default now()
);

alter table public.ownership_events enable row level security;

create policy "Anyone can read ownership events" on public.ownership_events
  for select using (true);

-- ============================================
-- REWARDS (Hoodz)
-- ============================================
create table public.rewards (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references public.accounts(id),
  amount integer not null,
  reason text not null check (reason in ('collect', 'marketplace_purchase', 'referral', 'bonus', 'spent')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;

create policy "Users can read own rewards" on public.rewards
  for select using (
    account_id in (select id from public.accounts where auth_id = auth.uid())
  );

-- ============================================
-- WHITELIST
-- ============================================
create table public.whitelist (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  collection_id uuid not null references public.collections(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'used')),
  created_at timestamptz not null default now(),
  unique(email, collection_id)
);

alter table public.whitelist enable row level security;

create policy "Users can read own whitelist status" on public.whitelist
  for select using (
    email in (select email from public.accounts where auth_id = auth.uid())
  );

create policy "Admins can manage whitelist" on public.whitelist
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- SELLER BALANCES
-- ============================================
create table public.seller_balances (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid unique not null references public.accounts(id),
  available_cents integer not null default 0,
  pending_cents integer not null default 0,
  total_earned_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.seller_balances enable row level security;

create policy "Users can read own balance" on public.seller_balances
  for select using (
    account_id in (select id from public.accounts where auth_id = auth.uid())
  );

-- ============================================
-- GENESIS ACCESS
-- ============================================
create table public.genesis_access (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid unique not null references public.accounts(id),
  granted_at timestamptz not null default now(),
  reason text
);

alter table public.genesis_access enable row level security;

create policy "Users can read own genesis access" on public.genesis_access
  for select using (
    account_id in (select id from public.accounts where auth_id = auth.uid())
  );

create policy "Admins can manage genesis access" on public.genesis_access
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- ACCESS LINKS
-- ============================================
create table public.access_links (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  collection_id uuid references public.collections(id),
  max_uses integer default 1,
  use_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.access_links enable row level security;

create policy "Admins can manage access links" on public.access_links
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- STRIPE EVENTS
-- ============================================
create table public.stripe_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null default '{}',
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

create policy "Admins can read stripe events" on public.stripe_events
  for select using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- ============================================
-- INDEXES
-- ============================================
create index idx_tokens_collection on public.tokens(collection_id);
create index idx_tokens_owner on public.tokens(owner_id);
create index idx_tokens_seed on public.tokens(seed);
create index idx_orders_account on public.orders(account_id);
create index idx_orders_status on public.orders(status);
create index idx_listings_status on public.listings(status);
create index idx_listings_token on public.listings(token_id);
create index idx_rewards_account on public.rewards(account_id);
create index idx_whitelist_email on public.whitelist(email);
create index idx_ownership_events_token on public.ownership_events(token_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create account on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.accounts (auth_id, email, pseudonym)
  values (
    new.id,
    new.email,
    'Collector#' || substr(new.id::text, 1, 6)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Increment minted count
create or replace function public.increment_minted_count(collection_uuid uuid)
returns void as $$
begin
  update public.collections
  set minted_count = minted_count + 1,
      updated_at = now()
  where id = collection_uuid;
end;
$$ language plpgsql security definer;

-- Award Hoodz
create or replace function public.award_hoodz(account_uuid uuid, hoodz_amount integer, hoodz_reason text, ref_id uuid default null)
returns void as $$
begin
  insert into public.rewards (account_id, amount, reason, reference_id)
  values (account_uuid, hoodz_amount, hoodz_reason, ref_id);

  update public.accounts
  set rewards_balance = rewards_balance + hoodz_amount,
      updated_at = now()
  where id = account_uuid;
end;
$$ language plpgsql security definer;

-- Transfer token ownership
create or replace function public.transfer_token(
  token_uuid uuid,
  from_uuid uuid,
  to_uuid uuid,
  transfer_type text default 'transfer'
)
returns void as $$
begin
  -- Update token owner
  update public.tokens
  set owner_id = to_uuid,
      is_listed = false,
      updated_at = now()
  where id = token_uuid and owner_id = from_uuid;

  -- Record ownership event
  insert into public.ownership_events (token_id, from_account_id, to_account_id, event_type)
  values (token_uuid, from_uuid, to_uuid, transfer_type);

  -- Cancel any active listings
  update public.listings
  set status = 'cancelled',
      updated_at = now()
  where token_id = token_uuid and status = 'active';
end;
$$ language plpgsql security definer;

-- Seed initial collections
insert into public.collections (slug, name, description, total_supply, price_cents, drop_status, whitelist_start_at, public_start_at)
values
  ('hoodlrz', 'Hoodlrz', 'The original collection. 10,000 unique hooded identities.', 10000, 999, 'upcoming', now() + interval '7 days', now() + interval '14 days'),
  ('genesis', 'Genesis', '25 exclusive works reserved for top collectors.', 25, 0, 'upcoming', null, null);
