-- Wallet nonces for SIWE (Sign-In With Ethereum) authentication
-- Single-use nonces prevent replay attacks

CREATE TABLE IF NOT EXISTS public.wallet_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups by address
CREATE INDEX idx_wallet_nonces_address ON public.wallet_nonces (address);

-- Index for cleanup of expired nonces
CREATE INDEX idx_wallet_nonces_expires ON public.wallet_nonces (expires_at);

-- Allow service role full access (used by admin client)
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

-- No public access — only service role (admin client) can read/write
CREATE POLICY "Service role only" ON public.wallet_nonces
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Auto-cleanup: delete nonces older than 1 hour
-- Run manually or via cron: DELETE FROM wallet_nonces WHERE expires_at < now() - interval '1 hour';
