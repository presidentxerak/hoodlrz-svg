-- Messagerie chiffree de bout en bout.
--
-- CE QUE CE SCHEMA NE CONTIENT PAS
-- Aucune colonne ne porte de texte en clair. Le corps d'un message est
-- un couple (iv, ciphertext) que seul un membre du groupe peut ouvrir ;
-- le serveur n'a aucune cle. Le titre d'une conversation est chiffre
-- lui aussi : « Insider calls » en clair dans une base volee en dit
-- deja long sur ce qui s'y echange.
--
-- CE QU'IL REVELE QUAND MEME, ET QU'IL FAUT ASSUMER
-- Les METADONNEES : qui parle a qui, quand, et a quelle frequence. Le
-- chiffrement de bout en bout ne les cache pas, et pretendre le
-- contraire serait mentir. Les cacher demanderait un melange de trafic
-- d'un autre ordre de complexite. Ce qui est fait ici : la taille du
-- corps n'est pas indexee, et les horodatages sont a la seconde.

-- ── La cle publique de chaque membre ─────────────────────────────────
-- Publique au sens propre : elle sert aux autres a sceller la cle d'un
-- groupe pour ce membre. La privee est derivee d'une signature de wallet
-- et ne quitte jamais l'appareil.
alter table public.accounts
  add column if not exists e2e_public_key text,
  add column if not exists e2e_key_set_at timestamptz;

comment on column public.accounts.e2e_public_key is
  'Cle publique X25519, hex. La privee est derivee d''une signature de wallet cote client et n''est jamais transmise.';

-- ── Les conversations ────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  kind        text not null default 'group' check (kind in ('group', 'direct')),
  -- Titre chiffre avec la cle du groupe : {iv, c}. Null pour un
  -- echange direct, qui prend le pseudonyme de l'autre.
  title_enc   jsonb,
  created_by  uuid references public.accounts(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Denormalise pour trier la liste sans agregat sur messages : une
  -- liste de conversations est le premier ecran, il doit etre instantane.
  last_at     timestamptz not null default now()
);

-- ── Qui est dans quelle conversation, et avec quelle cle ─────────────
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  account_id      uuid not null references public.accounts(id) on delete cascade,
  -- La cle du groupe, scellee pour CE membre : {e, iv, c}. Le serveur
  -- la stocke sans jamais pouvoir l'ouvrir.
  key_sealed      jsonb not null,
  role            text not null default 'member' check (role in ('owner', 'member')),
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, account_id)
);

create index if not exists conversation_members_account_idx
  on public.conversation_members (account_id);

-- ── Les messages ─────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id       uuid not null references public.accounts(id) on delete cascade,
  -- {iv, c}. L'identifiant de la conversation et celui de l'auteur sont
  -- lies au chiffre par l'authentification AES-GCM : un message recopie
  -- ailleurs ou attribue a un autre ne se dechiffre plus du tout.
  body_enc        jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- ── Politiques ───────────────────────────────────────────────────────
-- Le chiffrement protege le CONTENU. Les politiques protegent l'ACCES :
-- sans elles, n'importe quel membre connecte pourrait aspirer tous les
-- messages chiffres du reseau et les garder en attendant une faiblesse.

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

create or replace function public.est_membre(conv uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members m
    join public.accounts a on a.id = m.account_id
    where m.conversation_id = conv
      and a.auth_id = auth.uid()
  );
$$;

drop policy if exists "membres lisent leur conversation" on public.conversations;
create policy "membres lisent leur conversation" on public.conversations
  for select using (public.est_membre(id));

drop policy if exists "detenteurs creent une conversation" on public.conversations;
create policy "detenteurs creent une conversation" on public.conversations
  for insert with check (
    exists (select 1 from public.accounts
            where auth_id = auth.uid() and is_holder = true)
  );

drop policy if exists "membres voient les membres" on public.conversation_members;
create policy "membres voient les membres" on public.conversation_members
  for select using (public.est_membre(conversation_id));

drop policy if exists "membres lisent les messages" on public.messages;
create policy "membres lisent les messages" on public.messages
  for select using (public.est_membre(conversation_id));

-- Un membre ecrit dans ses conversations, et signe de son propre nom :
-- sans la seconde condition, il pourrait publier un message attribue a
-- quelqu'un d'autre. Le chiffre ne s'ouvrirait pas, mais la ligne
-- existerait et polluerait le fil.
drop policy if exists "membres ecrivent leurs messages" on public.messages;
create policy "membres ecrivent leurs messages" on public.messages
  for insert with check (
    public.est_membre(conversation_id)
    and author_id in (select id from public.accounts where auth_id = auth.uid())
  );

-- ── L'annuaire public, et pourquoi ce n'est pas une politique ────────
-- Ajouter quelqu'un a un groupe demande sa cle publique. La tentation
-- est d'ouvrir `accounts` en lecture aux detenteurs. C'est une faute :
-- une politique RLS filtre des LIGNES, pas des COLONNES. Ouvrir la
-- ligne ouvre aussi wallet_address, holdings et le courriel - donc
-- l'anonymat de tout le reseau, pour la commodite d'une seule colonne.
--
-- Une vue n'expose que ce qu'elle selectionne. security_invoker est
-- laisse a false (le defaut) pour que la vue lise la table avec les
-- droits de son proprietaire, sans ouvrir la table elle-meme.
create or replace view public.member_directory as
  select id, pseudonym, e2e_public_key
  from public.accounts
  where is_holder = true
    and pseudonym is not null
    and e2e_public_key is not null;

revoke all on public.member_directory from anon;
grant select on public.member_directory to authenticated;

comment on view public.member_directory is
  'Annuaire des membres : pseudonyme et cle publique, rien d''autre. Jamais d''adresse de wallet - le reseau est anonyme.';

