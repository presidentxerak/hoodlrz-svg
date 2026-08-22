/**
 * Recopie les destinataires de kids/config.json vers .env.local.
 *
 * deploy.ts lit RESERVE_RECEIVER et ROYALTY_RECEIVER dans .env.local,
 * alors que tout le reste du projet lit kids/config.json. Saisir les
 * memes adresses aux deux endroits est une invitation a la divergence -
 * et une divergence ici envoie la reserve ou les royalties sur le
 * mauvais wallet, sans que rien ne le signale.
 *
 * D'ou ce script : une seule source, kids/config.json, et .env.local
 * qui en decoule.
 *
 * Ne lit ni n'ecrit jamais DEPLOYER_PRIVATE_KEY. La cle reste la seule
 * valeur du fichier qui se saisit a la main, et elle ne bouge pas d'ici.
 *
 * Usage : npm run kids:sync-env
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CONFIG = 'kids/config.json';
const ENV = '.env.local';

if (!existsSync(ENV)) {
  console.error(`
  ${ENV} n'existe pas encore.

    cp .env.local.example .env.local

  puis relance cette commande.
`);
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
const pairs = [
  ['RESERVE_RECEIVER', 'reserveReceiver'],
  ['ROYALTY_RECEIVER', 'royaltyReceiver'],
];

const missing = pairs.filter(([, k]) => !/^0x[0-9a-fA-F]{40}$/.test(cfg.addresses?.[k] ?? ''));
if (missing.length) {
  console.error(`
  ${CONFIG} n'a pas encore ${missing.map(([, k]) => k).join(' ni ')}.

    npm run kids:addresses -- --reserve 0x... --royalties 0x...

  puis relance cette commande.
`);
  process.exit(1);
}

let env = readFileSync(ENV, 'utf8');
const changed = [];

for (const [envKey, cfgKey] of pairs) {
  const want = cfg.addresses[cfgKey];
  const line = new RegExp(`^${envKey}\\s*=.*$`, 'm');
  const before = env.match(line)?.[0]?.split('=').slice(1).join('=').trim() ?? null;

  if (before === want) continue;

  // Une ligne absente est ajoutee plutot qu'ignoree : un .env.local
  // ecrit a la main peut tres bien ne pas l'avoir.
  env = line.test(env)
    ? env.replace(line, `${envKey}=${want}`)
    : env.trimEnd() + `\n${envKey}=${want}\n`;

  changed.push([envKey, before, want]);
}

if (!changed.length) {
  console.log(`\n  ${ENV} etait deja aligne sur ${CONFIG}. Rien a faire.\n`);
  process.exit(0);
}

writeFileSync(ENV, env);

console.log(`\n  ${ENV} aligne sur ${CONFIG}\n`);
for (const [k, before, after] of changed) {
  console.log(`    ${k}`);
  console.log(`      avant  ${before || '(absent)'}`);
  console.log(`      apres  ${after}`);
}
console.log(`
  DEPLOYER_PRIVATE_KEY n'a pas ete touche.

  Verification : npm run kids:doctor
`);
