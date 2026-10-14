-- Doublure minimale de Supabase, pour faire tourner les migrations sur
-- un Postgres nu.
--
-- POURQUOI
-- Les migrations s'appuient sur ce que Supabase fournit d'office : le
-- schema `auth`, la fonction `auth.uid()`, les roles `anon` et
-- `authenticated`, et l'extension uuid-ossp. Sans eux, impossible de
-- verifier une migration autrement qu'en la lancant sur la vraie base -
-- c'est-a-dire en la decouvrant cassee en production.
--
-- Cette doublure ne REPRODUIT pas Supabase. Elle fournit juste de quoi
-- compiler : les politiques RLS sont creees et leur syntaxe verifiee,
-- mais leur comportement reel depend du moteur d'authentification et ne
-- se teste pas ici.

create extension if not exists "uuid-ossp";

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default uuid_generate_v4(),
  email text
);

-- Dans Supabase, auth.uid() lit l'identifiant du porteur du jeton. Ici
-- elle renvoie ce qu'on lui pose, ce qui suffit a creer les politiques.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;
