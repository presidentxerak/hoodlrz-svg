-- ════════════════════════════════════════════════════════════
-- Genesis vinyls: per-vinyl Stripe Product/Price catalog
-- ════════════════════════════════════════════════════════════
-- Each Genesis vinyl is a 1-of-1 collectible with its own
-- Stripe Product + Price. The mint API looks up the
-- stripe_price_id at checkout time and passes it to Stripe
-- (instead of inline price_data), so each sale appears in the
-- Stripe Catalog and inherits any tax / reporting config
-- attached to that product.
--
-- The seed script `npm run seed:stripe` is responsible for
-- creating the Stripe objects and populating the two columns.

create table public.genesis_vinyls (
  id text primary key,
  edition text not null check (edition in ('Black', 'White', 'Craft')),
  number int not null,
  name text not null,
  image text not null,
  stripe_product_id text,
  stripe_price_id text,
  sold boolean not null default false,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition, number)
);

create index idx_genesis_vinyls_edition on public.genesis_vinyls (edition);
create index idx_genesis_vinyls_sold on public.genesis_vinyls (sold);

alter table public.genesis_vinyls enable row level security;

create policy "Anyone can read genesis vinyls" on public.genesis_vinyls
  for select using (true);

create policy "Admins can manage genesis vinyls" on public.genesis_vinyls
  for all using (
    exists (select 1 from public.accounts where auth_id = auth.uid() and is_admin = true)
  );

-- Seed the 25 vinyls. Stripe IDs are populated by `seed-stripe-vinyls.ts`.
insert into public.genesis_vinyls (id, edition, number, name, image)
select
  lower(edition) || '-' || lpad(number::text, 2, '0') as id,
  edition,
  number,
  edition || ' Edition #' || lpad(number::text, 2, '0') as name,
  '/images/genesis/' || lower(edition) || '/' || lpad(number::text, 2, '0') || '-' || lower(edition) || '.png' as image
from (
  select 'Black' as edition, generate_series(1, 10) as number
  union all
  select 'White' as edition, generate_series(1, 5) as number
  union all
  select 'Craft' as edition, generate_series(1, 10) as number
) as v;

-- Make sure the genesis collection's price matches the per-vinyl Stripe Price (€500.00)
-- and that it is flagged 'public' so the mint API will accept Stripe checkouts.
-- (price_cents stays in the table for historical/reporting use; the mint API now
-- uses the stripe_price_id from genesis_vinyls instead.)
update public.collections
set price_cents = 50000,
    drop_status = 'public',
    updated_at  = now()
where slug = 'genesis';
