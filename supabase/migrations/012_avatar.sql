-- La photo de profil : une piece que le membre detient.
--
-- POURQUOI CES TROIS COLONNES ET PAS UNE URL
-- Stocker une simple URL laisserait n'importe qui mettre n'importe quelle
-- image - celle d'une collection qu'il ne detient pas, ou pire une image
-- hebergee ailleurs qui changerait apres validation. On garde donc ce qui
-- permet de VERIFIER : le contrat et le numero de piece. L'URL est
-- recalculee a l'affichage a partir de ces deux-la.
--
-- La verification elle-meme se fait sur la chaine, au moment de poser
-- l'avatar : avatar_checked_at dit quand. Un membre qui vend ensuite sa
-- piece garde son avatar jusqu'a la prochaine verification, ce qui est
-- sans consequence - c'est une image, pas un droit.

alter table public.accounts
  add column if not exists avatar_contract   text,
  add column if not exists avatar_token_id   integer,
  add column if not exists avatar_image      text,
  add column if not exists avatar_checked_at timestamptz;

comment on column public.accounts.avatar_contract is
  'Contrat de la piece choisie comme avatar. Avec avatar_token_id, c''est ce qui permet de reverifier la detention.';
comment on column public.accounts.avatar_image is
  'URL de l''image, recalculee a partir du contrat et du numero. Jamais fournie par le membre.';

-- L'annuaire expose l'avatar : les autres membres doivent voir la photo
-- a cote des messages. Il n'expose toujours NI l'adresse du wallet, NI
-- les avoirs, NI le courriel - une vue choisit ses colonnes, une
-- politique RLS ne le peut pas.
-- `drop` puis `create`, et non `create or replace` : Postgres refuse de
-- retirer OU d'ajouter une colonne a une vue existante par remplacement.
-- Une migration ulterieure qui enrichit l'annuaire casserait alors le
-- rejeu de celle-ci.
drop view if exists public.member_directory;
create view public.member_directory as
  select id, pseudonym, e2e_public_key, avatar_image
  from public.accounts
  where is_holder = true
    and pseudonym is not null
    and e2e_public_key is not null;

revoke all on public.member_directory from anon;
grant select on public.member_directory to authenticated;
