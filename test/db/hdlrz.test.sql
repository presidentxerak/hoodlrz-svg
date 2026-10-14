-- Ce que fait vraiment la repartition des Hdlrz.
--
-- Les fonctions de la migration 010 deplacent des soldes. Une erreur
-- d'arrondi ou un debit qui passe deux fois ne se voit pas a la lecture
-- du SQL, et se voit tres bien dans le solde des membres. Ce fichier les
-- exerce sur de vraies lignes et verifie quatre proprietes :
--
--  1. On ne mise pas plus que ce qu'on a.
--  2. Un marche sans adversaire rembourse tout le monde.
--  3. Les gagnants se partagent les DEUX reserves, et rien ne se cree.
--  4. Un marche ferme n'accepte plus de mise.
--
-- Lancement : npm run db:test (demande un Postgres jetable, voir
-- scripts/db/test.mjs). Pas de meta-commande psql ici : le fichier est
-- aussi joue par le client Node, qui ne les comprend pas.

begin;

-- Trois membres detenteurs, avec 1 000 Hdlrz chacun.
--
-- Les comptes ne sont pas inseres directement : la migration 001 pose un
-- declencheur sur auth.users qui les cree lui-meme. Les court-circuiter
-- testerait un schema qui n'existe pas.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@t.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@t.test'),
  ('33333333-3333-3333-3333-333333333333', 'c@t.test');

update public.accounts set pseudonym = 'alpha', is_holder = true, hdlrz = 1000
  where auth_id = '11111111-1111-1111-1111-111111111111';
update public.accounts set pseudonym = 'beta',  is_holder = true, hdlrz = 1000
  where auth_id = '22222222-2222-2222-2222-222222222222';
update public.accounts set pseudonym = 'gamma', is_holder = true, hdlrz = 1000
  where auth_id = '33333333-3333-3333-3333-333333333333';

create or replace function pg_temp.devenir(u text) returns void
language sql as $$ select set_config('request.jwt.claim.sub', u, true)::void $$;

create or replace function pg_temp.verifier(nom text, condition boolean) returns void
language plpgsql as $$
begin
  raise notice '  %  %', case when condition then 'ok   ' else 'ECHEC' end, nom;
end $$;

create or replace function pg_temp.solde(p text) returns integer
language sql as $$ select hdlrz from public.accounts where pseudonym = p $$;

insert into public.predictions (author_id, question, closes_at)
select id, 'ETH above 3000 on 31 October?', now() + interval '1 day'
  from public.accounts where pseudonym = 'alpha';

/* 1. Le solde borne la mise ------------------------------------------ */
select pg_temp.devenir('11111111-1111-1111-1111-111111111111');
do $$
declare refuse boolean := false;
begin
  begin
    perform public.hdlrz_stake((select id from public.predictions limit 1), true, 5000);
  exception when others then refuse := true;
  end;
  perform pg_temp.verifier('une mise superieure au solde est refusee', refuse);
  perform pg_temp.verifier('et le solde n a pas bouge', pg_temp.solde('alpha') = 1000);
end $$;

/* 2. Mises reelles ---------------------------------------------------- */
do $$
declare p uuid := (select id from public.predictions limit 1);
begin
  perform pg_temp.devenir('11111111-1111-1111-1111-111111111111');
  perform public.hdlrz_stake(p, true, 100);   -- alpha : Yes 100
  perform pg_temp.devenir('22222222-2222-2222-2222-222222222222');
  perform public.hdlrz_stake(p, true, 300);   -- beta  : Yes 300
  perform pg_temp.devenir('33333333-3333-3333-3333-333333333333');
  perform public.hdlrz_stake(p, false, 400);  -- gamma : No  400

  perform pg_temp.verifier('les soldes sont debites',
    pg_temp.solde('alpha') = 900 and pg_temp.solde('beta') = 700 and pg_temp.solde('gamma') = 600);
  perform pg_temp.verifier('les reserves suivent les mises',
    (select pool_yes = 400 and pool_no = 400 from public.predictions where id = p));
end $$;

/* 3. Resolution : Yes gagne ------------------------------------------- */
-- alpha a 100 sur 400 du camp Yes, soit un quart des 800 : 200.
-- beta  a 300 sur 400, soit trois quarts : 600.
-- gamma perd ses 400.
update public.accounts set is_admin = true where pseudonym = 'alpha';
do $$
declare p uuid := (select id from public.predictions limit 1);
begin
  perform pg_temp.devenir('11111111-1111-1111-1111-111111111111');
  perform public.hdlrz_resolve(p, true, 'Cloture CoinGecko au 31 octobre');

  perform pg_temp.verifier('alpha touche un quart des deux reserves', pg_temp.solde('alpha') = 1100);
  perform pg_temp.verifier('beta touche trois quarts', pg_temp.solde('beta') = 1300);
  perform pg_temp.verifier('gamma ne touche rien', pg_temp.solde('gamma') = 600);
  perform pg_temp.verifier('rien ne se cree ni ne disparait',
    pg_temp.solde('alpha') + pg_temp.solde('beta') + pg_temp.solde('gamma') = 3000);
  perform pg_temp.verifier('le marche est marque tranche',
    (select status = 'resolved' and outcome from public.predictions where id = p));
end $$;

/* 4. Un camp vide annule et rembourse ---------------------------------- */
insert into public.predictions (author_id, question, closes_at)
select id, 'Only one side will back this one', now() + interval '1 day'
  from public.accounts where pseudonym = 'alpha';

do $$
declare p uuid := (select id from public.predictions
                    where question like 'Only one side%' limit 1);
begin
  perform pg_temp.devenir('22222222-2222-2222-2222-222222222222');
  perform public.hdlrz_stake(p, true, 500);
  perform pg_temp.verifier('beta est debite', pg_temp.solde('beta') = 800);

  perform pg_temp.devenir('11111111-1111-1111-1111-111111111111');
  perform public.hdlrz_resolve(p, true, 'Personne en face');

  perform pg_temp.verifier('sans adversaire, la mise est rendue', pg_temp.solde('beta') = 1300);
  perform pg_temp.verifier('et le marche est annule',
    (select status = 'void' from public.predictions where id = p));
end $$;

/* 5. Un marche ferme n'accepte plus de mise ---------------------------- */
insert into public.predictions (author_id, question, closes_at)
select id, 'This one closed yesterday', now() - interval '1 hour'
  from public.accounts where pseudonym = 'alpha';

do $$
declare p uuid := (select id from public.predictions where question like 'This one closed%' limit 1);
  refuse boolean := false;
begin
  perform pg_temp.devenir('33333333-3333-3333-3333-333333333333');
  begin
    perform public.hdlrz_stake(p, true, 50);
  exception when others then refuse := true;
  end;
  perform pg_temp.verifier('un marche echu refuse les mises', refuse);
end $$;

/* 6. Le don quotidien ne se prend qu'une fois -------------------------- */
do $$
declare apres integer;
begin
  perform pg_temp.devenir('33333333-3333-3333-3333-333333333333');
  perform public.hdlrz_daily();
  apres := pg_temp.solde('gamma');
  perform public.hdlrz_daily();
  perform pg_temp.verifier('le don quotidien ne se prend pas deux fois',
    pg_temp.solde('gamma') = apres);
end $$;

/* 7. Le journal retrace chaque mouvement ------------------------------- */
do $$
begin
  perform pg_temp.verifier('le journal equilibre le solde de beta',
    (select coalesce(sum(delta), 0) from public.hdlrz_ledger
      where account_id = (select id from public.accounts where pseudonym = 'beta'))
    = pg_temp.solde('beta') - 1000);
end $$;

rollback;
