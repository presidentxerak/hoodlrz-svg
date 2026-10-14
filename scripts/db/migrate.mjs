/**
 * Applique les migrations SQL a la base Supabase.
 *
 * POURQUOI UN APPLICATEUR PLUTOT QUE DU COPIER-COLLER
 * Quatre fichiers colles a la main dans l'editeur SQL, c'est quatre
 * occasions d'en sauter un, de les passer dans le desordre, ou de
 * rejouer celui d'hier. Et rien ne garde la trace de ce qui est deja
 * passe : la fois suivante, on ne sait plus.
 *
 * Ce script tient cette trace dans une table, applique ce qui manque
 * dans l'ordre des noms de fichier, et s'arrete au premier echec.
 *
 * CHAQUE MIGRATION EST DANS SA PROPRE TRANSACTION. Une seule transaction
 * pour les quatre semblerait plus sur : en realite, un echec sur la
 * quatrieme annulerait trois migrations deja valides, et on repartirait
 * de zero a chaque tentative. Fichier par fichier, ce qui passe reste
 * passe.
 *
 * CE SCRIPT NE RECOIT JAMAIS DE CLE EN ARGUMENT. L'URL de connexion vit
 * dans .env.local : une chaine passee en argument se retrouve dans
 * l'historique du terminal et dans la liste des processus, visible par
 * tout autre utilisateur de la machine.
 *
 * Usage :
 *   npm run db:migrate                     applique ce qui manque
 *   npm run db:migrate -- --etat           dit ou on en est, n'ecrit rien
 *   npm run db:migrate -- --print          affiche le SQL, sans connexion
 *   npm run db:migrate -- --print --depuis 008 > migrations.sql
 *   npm run db:migrate -- --baseline 007   marque 001 a 007 comme deja passees
 */

import '../kids/env.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const DOSSIER = 'supabase/migrations';

/** Les fichiers, tries par nom : c'est le numero qui donne l'ordre. */
function migrations() {
  return readdirSync(DOSSIER)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nom) => ({ nom, sql: readFileSync(join(DOSSIER, nom), 'utf8') }));
}

/**
 * L'URL de connexion directe a Postgres.
 *
 * Supabase la donne dans Settings > Database > Connection string > URI.
 * Elle n'est PAS la cle anon ni la cle service_role : celles-ci parlent
 * a l'API REST, qui ne sait pas creer une table.
 */
function url() {
  const u = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (u) return u;
  console.error(`
  SUPABASE_DB_URL manque dans .env.local.

  Ou la trouver : tableau de bord Supabase > Settings > Database >
  Connection string > URI. Prendre la version « Session pooler » si le
  reseau bloque le port 5432.

  Ce n'est ni la cle anon ni la cle service_role : celles-ci parlent a
  l'API REST, qui ne sait pas creer une table.

  Puis dans .env.local, en une ligne :
    SUPABASE_DB_URL=postgresql://postgres.<ref>:<mot-de-passe>@<hote>:5432/postgres
`);
  process.exit(2);
}

const toutes = migrations();
if (!toutes.length) {
  console.error(`\n  Aucun fichier .sql dans ${DOSSIER}.\n`);
  process.exit(2);
}

/**
 * --print n'a PAS besoin de la base.
 *
 * C'est tout son interet : on s'en sert quand on ne peut pas joindre
 * Postgres - port 5432 ferme par le reseau, pas de chaine de connexion
 * sous la main - et qu'on veut coller le SQL dans l'editeur de Supabase.
 * Exiger une connexion pour imprimer un fichier qui est deja sur le
 * disque serait absurde.
 *
 * --depuis NNN limite aux migrations a partir de ce numero. Sans lui, on
 * imprimerait aussi les sept premieres, deja passees a la main.
 */
if (has('--print')) {
  const seuil = Number(val('--depuis') ?? 0);
  const choisies = toutes.filter((m) => Number(m.nom.slice(0, 3)) >= seuil);

  if (!choisies.length) {
    console.error(`\n  Aucune migration a partir de ${seuil}.\n`);
    process.exit(2);
  }

  // Tout part sur la sortie standard, y compris l'en-tete : la sortie
  // est faite pour etre redirigee vers un fichier ou collee telle quelle,
  // et un commentaire SQL ne gene pas.
  console.log(`-- Hoodlrz — ${choisies.length} migration(s)`);
  console.log(`-- A coller dans Supabase : SQL Editor > New query.`);
  console.log(`-- Les executer DANS CET ORDRE, une par une.\n`);
  for (const m of choisies) {
    console.log(`-- ${'='.repeat(66)}`);
    console.log(`-- ${m.nom}`);
    console.log(`-- ${'='.repeat(66)}`);
    console.log(m.sql.trimEnd());
    console.log('');
  }
  process.exit(0);
}

const chaine = url();

/**
 * TLS, sauf en local.
 *
 * Supabase impose le chiffrement, et son certificat n'est pas dans le
 * magasin par defaut de Node : on chiffre sans valider la chaine, ce qui
 * protege de l'ecoute mais pas d'un intercepteur actif. C'est le reglage
 * que le client officiel utilise lui aussi, et c'est acceptable pour une
 * migration lancee depuis un poste de travail.
 *
 * Un Postgres local, lui, n'a souvent pas de TLS du tout : exiger le
 * chiffrement sur une connexion qui ne quitte pas la machine ferait
 * echouer les essais pour rien.
 */
const local = /localhost|127\.0\.0\.1|^postgres(ql)?:\/\/[^@]*@\//.test(chaine) ||
  chaine.includes("host=/");

const client = new pg.Client({
  connectionString: chaine,
  ssl: local ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (e) {
  console.error(`\n  Connexion impossible : ${e.message}`);
  console.error(`  Verifier SUPABASE_DB_URL, et essayer l'URL « Session pooler »`);
  console.error(`  si le port 5432 est bloque par le reseau.\n`);
  process.exit(1);
}

// La table de suivi. Elle se cree avec le meme droit que le reste, et
// porte le hachage du fichier : une migration modifiee apres coup est
// signalee plutot que silencieusement consideree comme a jour.
await client.query(`
  create table if not exists public.schema_migrations (
    nom        text primary key,
    sha256     text not null,
    applied_at timestamptz not null default now()
  );
`);

const { rows } = await client.query('select nom, sha256 from public.schema_migrations');
const deja = new Map(rows.map((r) => [r.nom, r.sha256]));

const { createHash } = await import('node:crypto');
const empreinte = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const restantes = [];
const modifiees = [];
for (const m of toutes) {
  const h = empreinte(m.sql);
  if (!deja.has(m.nom)) restantes.push({ ...m, sha: h });
  else if (deja.get(m.nom) !== h) modifiees.push(m.nom);
}

console.log(`\nMigrations — ${toutes.length} fichiers, ${deja.size} deja appliquees\n`);

/* ── Le repere de depart ─────────────────────────────────────────────
 * La base existe depuis bien avant ce script : les premieres migrations
 * ont ete passees a la main. Rien ne les distingue d'une migration
 * jamais appliquee, et les rejouer sur une base deja peuplee echoue au
 * mieux, abime au pire.
 *
 * On refuse donc de lancer a l'aveugle sur une base qui a deja des
 * tables et pas de suivi. --baseline inscrit les premieres migrations
 * comme passees SANS les executer, ce qui aligne le suivi sur la
 * realite une fois pour toutes. */
const repere = val('--baseline');
if (repere) {
  const jusqua = toutes.filter((m) => m.nom.localeCompare(repere) <= 0 || m.nom.startsWith(repere));
  if (!jusqua.length) {
    console.error(`  Aucune migration ne correspond a « ${repere} ».\n`);
    await client.end();
    process.exit(2);
  }
  for (const m of jusqua) {
    await client.query(
      `insert into public.schema_migrations (nom, sha256) values ($1, $2)
       on conflict (nom) do nothing`,
      [m.nom, empreinte(m.sql)],
    );
  }
  console.log(`  Marquees comme deja passees, sans les executer :`);
  for (const m of jusqua) console.log(`    ${m.nom}`);
  console.log(`\n  Relancer sans --baseline pour appliquer la suite.\n`);
  await client.end();
  process.exit(0);
}

if (deja.size === 0 && restantes.length) {
  const { rows: tables } = await client.query(
    `select to_regclass('public.accounts') is not null as existe`,
  );
  if (tables[0]?.existe) {
    console.log(`  La base contient deja des tables, mais aucun suivi de migration.`);
    console.log(`  Les premieres migrations ont donc ete passees a la main, et les`);
    console.log(`  rejouer abimerait des donnees.\n`);
    console.log(`  Poser le repere d'abord, puis relancer :`);
    console.log(`    npm run db:migrate -- --baseline 007`);
    console.log(`    npm run db:migrate\n`);
    await client.end();
    process.exit(2);
  }
}

if (modifiees.length) {
  console.log(`  Modifiees APRES avoir ete appliquees, donc non rejouees :`);
  for (const n of modifiees) console.log(`    ${n}`);
  console.log(`  Si le changement compte, ecrire une nouvelle migration.\n`);
}

if (!restantes.length) {
  console.log(`  Rien a appliquer. La base est a jour.\n`);
  await client.end();
  process.exit(0);
}

console.log(`  A appliquer :`);
for (const m of restantes) console.log(`    ${m.nom}`);
console.log('');

if (has('--etat')) {
  await client.end();
  process.exit(0);
}

let passees = 0;
for (const m of restantes) {
  process.stdout.write(`  ${m.nom} … `);
  try {
    await client.query('begin');
    await client.query(m.sql);
    await client.query('insert into public.schema_migrations (nom, sha256) values ($1, $2)', [
      m.nom,
      m.sha,
    ]);
    await client.query('commit');
    passees++;
    console.log('ok');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.log('ECHEC');
    console.error(`\n  ${e.message}`);
    if (e.position) {
      // Le numero de ligne vaut mieux qu'un decalage en caracteres quand
      // il s'agit d'aller corriger le fichier.
      const ligne = m.sql.slice(0, Number(e.position)).split('\n').length;
      console.error(`  ${DOSSIER}/${m.nom}:${ligne}`);
    }
    console.error(`\n  Cette migration a ete annulee en entier. Les ${passees} precedentes`);
    console.error(`  restent appliquees : corriger le fichier et relancer.\n`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(`\n  ${passees} migration(s) appliquee(s). La base est a jour.\n`);
