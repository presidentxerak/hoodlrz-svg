-- Hdlrz, le feed et les predictions.
--
-- TROIS CHOSES LIEES
-- Le feed porte des posts. Certains posts posent une question binaire -
-- « ETH au-dessus de 3 000 $ au 31 octobre ? » - sur laquelle les
-- membres prennent position avec des Hdlrz. Le reste du feed est du
-- texte ordinaire.
--
-- POURQUOI LE FEED N'EST PAS CHIFFRE
-- Contrairement aux groupes, un post du feed s'adresse a tout le reseau.
-- Le chiffrer pour quelques milliers de membres n'apporterait rien -
-- n'importe lequel d'entre eux peut recopier le contenu - et empecherait
-- la recherche, le classement et la moderation. La frontiere est donc
-- nette et assumee : ce qui est prive est chiffre, ce qui est public ne
-- l'est pas, et rien n'est entre les deux.
--
-- POURQUOI LES HDLRZ NE SONT PAS UN JETON
-- Ce sont des points internes. Ils ne sont ni transferables entre
-- membres, ni echangeables, ni emis sur une chaine : c'est ce qui les
-- garde hors du champ d'un instrument financier, et ce qui permet d'en
-- distribuer tous les jours sans consequence.

-- ── Le solde et son journal ──────────────────────────────────────────
-- Le solde vit sur le compte pour etre lu d'un seul coup ; le journal
-- garde la trace de chaque mouvement. Les deux sont ecrits ensemble par
-- les fonctions ci-dessous : un solde sans journal serait invérifiable,
-- un journal sans solde demanderait une somme a chaque affichage.
alter table public.accounts
  add column if not exists hdlrz           integer not null default 0,
  add column if not exists hdlrz_claimed_on date;

comment on column public.accounts.hdlrz is
  'Points internes. Ni transferables entre membres, ni echangeables, ni on-chain.';

create table if not exists public.hdlrz_ledger (
  id         bigserial primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  delta      integer not null,
  reason     text not null check (reason in
               ('welcome', 'daily', 'stake', 'payout', 'refund', 'admin')),
  ref        uuid,
  created_at timestamptz not null default now()
);

create index if not exists hdlrz_ledger_account_idx
  on public.hdlrz_ledger (account_id, created_at desc);

-- ── Le feed ──────────────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null references public.accounts(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  -- Un post peut porter une prediction ; la question vit alors dans la
  -- table des predictions et le corps sert de commentaire.
  prediction_id uuid,
  created_at    timestamptz not null default now()
);

create index if not exists posts_recent_idx on public.posts (created_at desc);

-- ── Les predictions ──────────────────────────────────────────────────
create table if not exists public.predictions (
  id         uuid primary key default uuid_generate_v4(),
  author_id  uuid not null references public.accounts(id) on delete cascade,
  question   text not null check (char_length(question) between 8 and 240),
  category   text not null default 'crypto'
               check (category in ('crypto', 'nft', 'memecoin')),
  -- La fermeture precede la resolution : on ne prend plus position quand
  -- le resultat commence a etre connaissable.
  closes_at  timestamptz not null,
  status     text not null default 'open'
               check (status in ('open', 'closed', 'resolved', 'void')),
  -- true = Yes l'emporte, false = No, null = pas encore tranche.
  outcome    boolean,
  -- Ce sur quoi la resolution s'appuie, en clair, pour que personne
  -- n'ait a croire l'auteur sur parole.
  resolution_note text,
  resolved_at timestamptz,
  -- Totaux mis a jour par la fonction de mise : les recalculer a chaque
  -- affichage du feed couterait une agregation par carte.
  pool_yes   integer not null default 0,
  pool_no    integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists predictions_open_idx
  on public.predictions (status, closes_at);

alter table public.posts
  drop constraint if exists posts_prediction_fk;
alter table public.posts
  add constraint posts_prediction_fk
  foreign key (prediction_id) references public.predictions(id) on delete set null;

create table if not exists public.prediction_stakes (
  id            uuid primary key default uuid_generate_v4(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  side          boolean not null,
  amount        integer not null check (amount > 0),
  -- Ce qui a ete verse a la resolution. Null tant que rien n'est tranche.
  paid          integer,
  created_at    timestamptz not null default now()
);

create index if not exists prediction_stakes_pred_idx
  on public.prediction_stakes (prediction_id);
create index if not exists prediction_stakes_account_idx
  on public.prediction_stakes (account_id, created_at desc);

-- ── Les mouvements de Hdlrz, en une seule transaction ────────────────
-- POURQUOI DES FONCTIONS ET PAS DU CODE APPLICATIF
-- Debiter un solde puis inserer une mise depuis deux requetes separees
-- laisse une fenetre : deux onglets qui misent en meme temps lisent le
-- meme solde et depensent deux fois. Une fonction s'execute d'un bloc,
-- et le UPDATE conditionnel ne passe que si le solde est reellement
-- suffisant au moment de l'ecriture.

create or replace function public.hdlrz_daily()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cpte  public.accounts;
  gain  constant integer := 100;
begin
  select * into cpte from public.accounts where auth_id = auth.uid();
  if not found or not cpte.is_holder then
    raise exception 'Reserve aux detenteurs';
  end if;
  -- La date, pas un intervalle de 24 h : « une fois par jour » doit se
  -- comprendre sans calcul, et ne pas glisser d'une minute chaque jour.
  if cpte.hdlrz_claimed_on = current_date then
    return cpte.hdlrz;
  end if;

  update public.accounts
     set hdlrz = hdlrz + gain,
         hdlrz_claimed_on = current_date
   where id = cpte.id
   returning hdlrz into cpte.hdlrz;

  insert into public.hdlrz_ledger (account_id, delta, reason)
  values (cpte.id, gain, 'daily');

  return cpte.hdlrz;
end;
$$;

create or replace function public.hdlrz_stake(pred uuid, cote boolean, montant integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cpte    public.accounts;
  p       public.predictions;
  restant integer;
begin
  if montant is null or montant < 10 then
    raise exception 'Mise minimale : 10 Hdlrz';
  end if;

  select * into cpte from public.accounts where auth_id = auth.uid();
  if not found or not cpte.is_holder then
    raise exception 'Reserve aux detenteurs';
  end if;

  select * into p from public.predictions where id = pred for update;
  if not found then
    raise exception 'Prediction introuvable';
  end if;
  if p.status <> 'open' or p.closes_at <= now() then
    raise exception 'Prediction fermee';
  end if;

  -- Le debit et sa condition dans la MEME instruction : si le solde est
  -- insuffisant, aucune ligne n'est touchee et rien n'est mise.
  update public.accounts
     set hdlrz = hdlrz - montant
   where id = cpte.id and hdlrz >= montant
   returning hdlrz into restant;

  if restant is null then
    raise exception 'Solde insuffisant';
  end if;

  insert into public.prediction_stakes (prediction_id, account_id, side, amount)
  values (pred, cpte.id, cote, montant);

  insert into public.hdlrz_ledger (account_id, delta, reason, ref)
  values (cpte.id, -montant, 'stake', pred);

  update public.predictions
     set pool_yes = pool_yes + case when cote then montant else 0 end,
         pool_no  = pool_no  + case when cote then 0 else montant end
   where id = pred;

  return restant;
end;
$$;

-- ── La resolution ────────────────────────────────────────────────────
-- Repartition parimutuelle : les gagnants se partagent la totalite des
-- deux reserves, au prorata de leur mise. Pas de teneur de marche, donc
-- pas de cote a garantir et aucun risque pour la maison - ce qui est le
-- seul modele tenable quand la monnaie est distribuee gratuitement.
--
-- Un camp vide annule le marche et rembourse : sans adversaire, il n'y a
-- pas de pari, seulement un depot.
create or replace function public.hdlrz_resolve(pred uuid, resultat boolean, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.predictions;
  admin    boolean;
  total    integer;
  gagnant  integer;
  s        record;
  du       integer;
begin
  select is_admin into admin from public.accounts where auth_id = auth.uid();
  if not coalesce(admin, false) then
    raise exception 'Reserve aux administrateurs';
  end if;

  select * into p from public.predictions where id = pred for update;
  if not found then raise exception 'Prediction introuvable'; end if;
  if p.status = 'resolved' or p.status = 'void' then
    raise exception 'Deja tranchee';
  end if;

  total   := p.pool_yes + p.pool_no;
  gagnant := case when resultat then p.pool_yes else p.pool_no end;

  if gagnant = 0 or total = gagnant then
    -- Personne du bon cote, ou personne en face : on rembourse tout.
    for s in select * from public.prediction_stakes where prediction_id = pred loop
      update public.accounts set hdlrz = hdlrz + s.amount where id = s.account_id;
      insert into public.hdlrz_ledger (account_id, delta, reason, ref)
      values (s.account_id, s.amount, 'refund', pred);
      update public.prediction_stakes set paid = s.amount where id = s.id;
    end loop;
    update public.predictions
       set status = 'void', resolution_note = note, resolved_at = now()
     where id = pred;
    return;
  end if;

  for s in select * from public.prediction_stakes
            where prediction_id = pred and side = resultat loop
    -- Division entiere : le reste reste dans la reserve plutot que de
    -- creer des Hdlrz a partir d'un arrondi.
    du := (s.amount::bigint * total / gagnant)::integer;
    update public.accounts set hdlrz = hdlrz + du where id = s.account_id;
    insert into public.hdlrz_ledger (account_id, delta, reason, ref)
    values (s.account_id, du, 'payout', pred);
    update public.prediction_stakes set paid = du where id = s.id;
  end loop;

  update public.predictions
     set status = 'resolved', outcome = resultat,
         resolution_note = note, resolved_at = now()
   where id = pred;
end;
$$;

-- ── Politiques ───────────────────────────────────────────────────────
alter table public.posts             enable row level security;
alter table public.predictions       enable row level security;
alter table public.prediction_stakes enable row level security;
alter table public.hdlrz_ledger      enable row level security;

create or replace function public.est_detenteur()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.accounts
                 where auth_id = auth.uid() and is_holder = true);
$$;

drop policy if exists "detenteurs lisent le feed" on public.posts;
create policy "detenteurs lisent le feed" on public.posts
  for select using (public.est_detenteur());

drop policy if exists "detenteurs postent" on public.posts;
create policy "detenteurs postent" on public.posts
  for insert with check (
    author_id in (select id from public.accounts where auth_id = auth.uid())
  );

drop policy if exists "auteur supprime son post" on public.posts;
create policy "auteur supprime son post" on public.posts
  for delete using (
    author_id in (select id from public.accounts where auth_id = auth.uid())
  );

drop policy if exists "detenteurs lisent les predictions" on public.predictions;
create policy "detenteurs lisent les predictions" on public.predictions
  for select using (public.est_detenteur());

drop policy if exists "detenteurs ouvrent une prediction" on public.predictions;
create policy "detenteurs ouvrent une prediction" on public.predictions
  for insert with check (
    author_id in (select id from public.accounts where auth_id = auth.uid())
  );

-- Les mises sont lisibles par tous les detenteurs : un marche dont on ne
-- voit pas les positions ne vaut rien. Elles ne sont jamais ecrites
-- directement - seule hdlrz_stake en insere, ce qui garantit que chaque
-- mise a un debit en face.
drop policy if exists "detenteurs voient les mises" on public.prediction_stakes;
create policy "detenteurs voient les mises" on public.prediction_stakes
  for select using (public.est_detenteur());

drop policy if exists "chacun lit son journal" on public.hdlrz_ledger;
create policy "chacun lit son journal" on public.hdlrz_ledger
  for select using (
    account_id in (select id from public.accounts where auth_id = auth.uid())
  );
