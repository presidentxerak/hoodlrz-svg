-- Les articles hebdomadaires.
--
-- Un travail programme collecte des sources publiques une fois par
-- semaine, les reecrit, et publie. L'illustration est calculee a partir
-- du titre et stockee avec l'article : une image generee a l'affichage
-- changerait a chaque visite et ne pourrait pas etre mise en cache.
--
-- LES SOURCES SONT CONSERVEES ET AFFICHEES. Un article reecrit a partir
-- du travail d'autrui sans dire d'ou il vient est un plagiat, quelle que
-- soit la machine qui l'a reecrit. La colonne `sources` n'est donc pas
-- optionnelle au sens editorial, meme si la base l'accepte vide.

create table if not exists public.news_articles (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  title       text not null check (char_length(title) between 8 and 200),
  summary     text not null check (char_length(summary) between 20 and 400),
  body        text not null,
  category    text not null default 'crypto'
                check (category in ('crypto', 'nft', 'memecoin')),
  -- [{ title, url, publisher }]. Affichees au bas de l'article.
  sources     jsonb not null default '[]'::jsonb,
  -- SVG genere a partir du titre, deterministe.
  illustration text not null,
  accent      text not null default '#ff36c8',
  -- Semaine ISO de publication, « 2026-W42 ». Unique avec la categorie :
  -- deux executions du cron la meme semaine ne doivent pas publier deux
  -- fois le meme sujet.
  week        text not null,
  published_at timestamptz not null default now()
);

create unique index if not exists news_week_category_idx
  on public.news_articles (week, category);

create index if not exists news_published_idx
  on public.news_articles (published_at desc);

-- Le journal des executions : sans lui, un cron qui echoue en silence
-- passe inapercu jusqu'a ce que quelqu'un remarque qu'il n'y a plus
-- d'article depuis un mois.
create table if not exists public.news_runs (
  id         bigserial primary key,
  week       text not null,
  ok         boolean not null,
  detail     text,
  created_at timestamptz not null default now()
);

alter table public.news_articles enable row level security;
alter table public.news_runs     enable row level security;

-- Les articles sont lisibles par tout le monde, connecte ou non : c'est
-- la seule section du reseau qui a vocation a etre partagee au-dehors et
-- a faire venir des gens.
drop policy if exists "les articles sont publics" on public.news_articles;
create policy "les articles sont publics" on public.news_articles
  for select using (true);

drop policy if exists "les executions sont pour les admins" on public.news_runs;
create policy "les executions sont pour les admins" on public.news_runs
  for select using (
    exists (select 1 from public.accounts
            where auth_id = auth.uid() and is_admin = true)
  );
