/**
 * Calcule et controle les arguments de setPhases().
 *
 * Le contrat compare a block.timestamp, qui est en UTC. Les dates ont ete
 * donnees en heure de Paris ; le 11 septembre, Paris est en CEST, soit
 * UTC+2. Saisir 17:00 comme si c'etait de l'UTC ouvrirait le mint deux
 * heures trop tard - le genre d'erreur qui ne se voit que le jour J.
 *
 * Le script refuse de produire des valeurs incoherentes plutot que de
 * laisser le contrat les rejeter au moment de la transaction.
 *
 * Usage : node scripts/kids/phases.mjs
 */

import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('kids/config.json', 'utf8'));
const P = config.phases;

const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const fmtUTC = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
const fmtParis = (iso) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso));

const rows = [
  ['snapshot',  P.snapshotParis,      null],
  ['allowlist', P.allowlistStartParis, 'allowlistStart'],
  ['public',    P.publicStartParis,    'publicStart'],
  ['fin',       P.mintEndParis,        'mintEnd'],
];

console.log('\nPhases de mint Hoodlrz Kids\n');
console.log('  ' + 'etape'.padEnd(11) + 'Paris'.padEnd(26) + 'UTC'.padEnd(26) + 'timestamp');
console.log('  ' + '-'.repeat(74));
for (const [label, iso] of rows) {
  console.log('  ' + label.padEnd(11) + fmtParis(iso).padEnd(26) + fmtUTC(iso).padEnd(26) + ts(iso));
}

/* ---- Controles ---------------------------------------------------- */
const al = ts(P.allowlistStartParis);
const pub = ts(P.publicStartParis);
const end = ts(P.mintEndParis);
const snap = ts(P.snapshotParis);

const checks = [];
const check = (label, cond, hint = '') => checks.push({ label, cond, hint });

check('snapshot avant l allowlist', snap < al);
check('allowlist avant le public', al < pub);
check('public avant la fin', pub < end);
check('contrainte du contrat : alStart <= pubStart < mintEnd', al <= pub && pub < end);
check('dates dans le futur', al > Math.floor(Date.now() / 1000),
      'sinon le mint s ouvre des le setPhases');
check('annee coherente', new Date(P.mintEndParis).getFullYear() < 2030,
      'une fin lointaine bloque revealSeed() et laisse la collection en placeholder');

console.log('\nControles');
let bad = 0;
for (const c of checks) {
  console.log(`  ${c.cond ? 'OK  ' : 'FAIL'}  ${c.label}${!c.cond && c.hint ? '  <- ' + c.hint : ''}`);
  if (!c.cond) bad++;
}

/* ---- Fenetres ------------------------------------------------------ */
const h = (s) => (s / 3600).toFixed(1) + ' h';
console.log('\nFenetres');
console.log(`  snapshot -> allowlist   ${h(al - snap)}   (court = bon : pas le temps de gamer la liste)`);
console.log(`  allowlist                ${h(pub - al)}`);
console.log(`  public                   ${h(end - pub)}`);

if (pub - al < 6 * 3600) {
  console.log('\n  Note : la fenetre allowlist est courte. Avec ' +
              (config.snapshot.holderCount ?? '~117') +
              ' holders, une partie ne la verra pas passer.');
}

console.log('\nAppel a passer :');
console.log(`  setPhases(${al}, ${pub}, ${end})\n`);

process.exit(bad === 0 ? 0 : 1);
