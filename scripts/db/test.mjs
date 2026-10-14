/**
 * Joue les migrations et leurs tests sur une base jetable.
 *
 * POURQUOI CE SCRIPT EXISTE
 * Les fonctions de la migration 010 deplacent des soldes. Une erreur
 * d'arrondi, un debit qui passe deux fois, un camp vide mal traite : rien
 * de tout cela ne se voit a la lecture du SQL, et tout se voit dans le
 * solde des membres. La seule facon honnete de le verifier est de le
 * faire tourner.
 *
 * La base est creee, remplie, testee et detruite. Il ne faut donc JAMAIS
 * le pointer vers la base de production : la variable est volontairement
 * differente de celle des migrations, et le script refuse une URL qui
 * ressemble a Supabase.
 *
 * Usage :
 *   TEST_DB_URL=postgresql://postgres@localhost:5432/postgres npm run db:test
 */

import '../kids/env.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const BASE = `hoodlrz_test_${Date.now()}`;
const url = process.env.TEST_DB_URL;

if (!url) {
  console.error(`
  TEST_DB_URL manque.

  Ce test cree et detruit une base : il lui faut un Postgres jetable,
  pas celui de production. Sur un Mac avec Homebrew :

    brew install postgresql@16 && brew services start postgresql@16
    TEST_DB_URL=postgresql://$(whoami)@localhost:5432/postgres npm run db:test
`);
  process.exit(2);
}

// Garde-fou : ce script fait DROP DATABASE. Une URL Supabase ici serait
// une catastrophe silencieuse.
if (/supabase\.(co|com)|pooler\./i.test(url)) {
  console.error(`\n  TEST_DB_URL pointe vers Supabase. Refuse : ce script detruit la base.\n`);
  process.exit(2);
}

const local = /localhost|127\.0\.0\.1/.test(url) || url.includes('host=/');
const connexion = (db) => ({
  connectionString: url.replace(/\/[^/?]*(\?|$)/, `/${db}$1`),
  ssl: local ? false : { rejectUnauthorized: false },
});

const admin = new pg.Client(connexion('postgres'));
await admin.connect();
await admin.query(`create database ${BASE}`);
await admin.end();

const db = new pg.Client(connexion(BASE));
await db.connect();

let echecs = 0;
// Les `raise notice` des tests arrivent ici : c'est ainsi que chaque
// verification se signale, ligne par ligne, au lieu d'un verdict global
// qui ne dirait pas laquelle a lache.
db.on('notice', (n) => {
  const m = n.message ?? '';
  if (m.includes('ECHEC')) echecs++;
  if (/\b(ok|ECHEC)\b/.test(m)) console.log(m);
});

const fichiers = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort();

try {
  console.log(`\nBase jetable ${BASE}\n`);

  await db.query(readFileSync('test/db/supabase-shim.sql', 'utf8'));
  for (const f of fichiers) {
    await db.query(readFileSync(join('supabase/migrations', f), 'utf8'));
  }
  console.log(`  ${fichiers.length} migrations appliquees\n`);

  // Rejouees une seconde fois : une migration qui ne supporte pas d'etre
  // relancee bloque toute reprise apres un echec en milieu de serie.
  //
  // Seules celles du reseau prive sont concernees. Les sept premieres
  // datent de la boutique et ont ete ecrites pour un passage unique ;
  // les rejouer ne prouverait rien et echouerait sur « accounts existe
  // deja », ce qui est leur comportement normal.
  const rejouables = fichiers.filter((f) => Number(f.slice(0, 3)) >= 8);
  for (const f of rejouables) {
    await db.query(readFileSync(join('supabase/migrations', f), 'utf8'));
  }
  console.log(`  dont ${rejouables.length} rejouees sans erreur\n`);

  console.log(`Hdlrz et predictions\n`);
  await db.query(readFileSync('test/db/hdlrz.test.sql', 'utf8'));
} catch (e) {
  console.error(`\n  ECHEC : ${e.message}\n`);
  echecs++;
} finally {
  await db.end();
  const nettoyage = new pg.Client(connexion('postgres'));
  await nettoyage.connect();
  await nettoyage.query(`drop database if exists ${BASE}`);
  await nettoyage.end();
}

console.log(echecs === 0 ? '\nTout passe.\n' : `\n${echecs} echec(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
