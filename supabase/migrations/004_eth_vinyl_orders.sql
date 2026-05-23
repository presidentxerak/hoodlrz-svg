-- ════════════════════════════════════════════════════════════
-- ETH payments for Genesis vinyls
-- ════════════════════════════════════════════════════════════
-- The card flow records shipping inside Stripe. ETH payments have
-- no such place, so we store the on-chain reference + shipping +
-- track selection directly on the order row.

alter table public.orders
  add column if not exists tx_hash text,
  add column if not exists chain_id integer,
  add column if not exists metadata jsonb;

-- One order per on-chain transaction (idempotency for the recorder).
create unique index if not exists uniq_orders_tx_hash
  on public.orders (tx_hash)
  where tx_hash is not null;

-- Allow 'eth' as a currency value (column is free-text today; no constraint to change).
comment on column public.orders.tx_hash is 'Ethereum transaction hash for ETH-settled orders.';
comment on column public.orders.chain_id is 'EVM chain id the payment settled on.';
comment on column public.orders.metadata is 'Free-form JSON: shipping address, track selection, payer wallet, etc.';
