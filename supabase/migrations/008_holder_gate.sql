-- La porte des detenteurs.
--
-- Le verdict « ce wallet detient une PFP » est lu sur la chaine, puis
-- inscrit ici pour que le middleware puisse le relire sans deux appels
-- RPC a chaque navigation. holder_checked_at dit quand, ce qui permet de
-- rafraichir sans tout recalculer en permanence.
--
-- wallet_address est stockee en minuscules et indexee : c'est la cle
-- naturelle d'un compte wallet, et la retrouver par un LIKE sur le
-- courriel de synthese serait a la fois lent et fragile.

alter table public.accounts
  add column if not exists wallet_address   text,
  add column if not exists is_holder        boolean not null default false,
  add column if not exists holder_checked_at timestamptz,
  -- Nombre de pieces par contrat, au moment de la verification.
  -- Affiche sur le profil ; sert aussi a expliquer un refus.
  add column if not exists holdings         jsonb not null default '{}'::jsonb;

create unique index if not exists accounts_wallet_address_idx
  on public.accounts (wallet_address)
  where wallet_address is not null;

-- Le pseudonyme devient l'identite publique : il doit etre unique, sinon
-- deux membres peuvent se faire passer l'un pour l'autre dans un groupe.
create unique index if not exists accounts_pseudonym_idx
  on public.accounts (lower(pseudonym))
  where pseudonym is not null;

comment on column public.accounts.wallet_address is
  'Adresse EVM en minuscules. Jamais exposee aux autres membres : le reseau est anonyme, c''est le pseudonyme qui circule.';
comment on column public.accounts.is_holder is
  'Verdict de la derniere lecture de chaine. Rafraichi a la connexion et par /api/auth/holder.';
