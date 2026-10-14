-- La veille hebdomadaire : des liens, pas des articles.
--
-- CE QUI EST STOCKE, ET CE QUI NE L'EST PAS
-- Le titre, le resume que le flux publie lui-meme, l'editeur et l'URL.
-- Rien de plus. Pas de corps d'article : nous n'ecrivons pas, nous
-- selectionnons. Le lecteur clique et part lire chez l'editeur, qui
-- garde sa visite, sa publicite et son attribution.
--
-- C'est aussi ce qui rend la section defendable. Republier un texte
-- reecrit a partir du travail d'autrui est un plagiat, quelle que soit
-- la machine qui reecrit ; relayer un titre et un resume que l'editeur
-- publie POUR etre repris ne l'est pas.
--
-- L'ILLUSTRATION N'EST PAS STOCKEE. Elle est calculee a partir du titre,
-- de maniere deterministe : le meme lien redonne la meme image. La
-- garder en base ajouterait 26 Ko par ligne pour un resultat qu'on sait
-- reproduire en quelques millisecondes.

create table if not exists public.news_links (
  id         uuid primary key default uuid_generate_v4(),
  -- Unique : le meme article revient dans plusieurs flux, et revient
  -- d'une semaine a l'autre. Sans cette contrainte, la page se remplit
  -- de doublons.
  url        text not null unique,
  title      text not null check (char_length(title) between 8 and 300),
  summary    text not null default '',
  publisher  text not null,
  category   text not null default 'crypto'
               check (category in ('crypto', 'nft', 'memecoin')),
  accent     text not null default '#ff36c8',
  -- La date de l'editeur, pas celle de la collecte : c'est elle qui
  -- classe un lien comme recent ou non.
  published_at timestamptz not null,
  collected_at timestamptz not null default now(),
  week       text not null
);

create index if not exists news_links_recent_idx
  on public.news_links (published_at desc);

create index if not exists news_links_category_idx
  on public.news_links (category, published_at desc);

-- Le journal des executions : sans lui, un cron qui echoue en silence
-- passe inapercu jusqu'a ce que quelqu'un remarque qu'il n'y a plus rien
-- de neuf depuis un mois.
create table if not exists public.news_runs (
  id         bigserial primary key,
  week       text not null,
  ok         boolean not null,
  detail     text,
  created_at timestamptz not null default now()
);

alter table public.news_links enable row level security;
alter table public.news_runs  enable row level security;

-- Les liens sont lisibles par tout le monde, connecte ou non : c'est la
-- seule section du reseau qui a vocation a etre partagee au-dehors et a
-- faire venir des gens jusqu'a la porte.
drop policy if exists "les liens sont publics" on public.news_links;
create policy "les liens sont publics" on public.news_links
  for select using (true);

drop policy if exists "les executions sont pour les admins" on public.news_runs;
create policy "les executions sont pour les admins" on public.news_runs
  for select using (
    exists (select 1 from public.accounts
            where auth_id = auth.uid() and is_admin = true)
  );
