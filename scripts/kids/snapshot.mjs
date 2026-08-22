/**
 * Snapshot des holders Hoodlrz et construction de l'allowlist.
 *
 * A lancer le 11 septembre 2026 a 16 h (Paris), sans l'avoir annonce :
 * un snapshot connu a l'avance provoque des achats de derniere minute qui
 * diluent les vrais holders.
 *
 * REPRODUCTIBILITE
 * Le snapshot est pris a un NUMERO DE BLOC precis, pas "maintenant".
 * Le bloc, la liste complete des adresses et la racine sont publies
 * ensemble : n'importe qui peut alors relancer ce script et retrouver la
 * meme racine. Une allowlist qu'on ne peut pas verifier n'a aucune valeur
 * pour ceux qui n'en font pas partie.
 *
 * SOURCES, par ordre de preference :
 *   --alchemy   lecture directe de la chaine a un bloc donne (fait foi)
 *   --api       l'API du site, qui lit le cache Supabase
 *   --file      une liste JSON, pour rejouer un snapshot deja pris
 *
 * Usage :
 *   node scripts/kids/snapshot.mjs --alchemy [--block 23400000]
 *   node scripts/kids/snapshot.mjs --api [--url https://hoodlrz.com]
 *   node scripts/kids/snapshot.mjs --file kids/build/holders-raw.json
 */

import { need } from './env.mjs';   // charge .env.local avant tout le reste
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildTree, proofFor, leafOf, verify } from './merkle.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d = null) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const CONFIG = 'kids/config.json';
const OUTDIR = 'kids/build/snapshot';
const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const CONTRACT = config.snapshot.contract;

mkdirSync(OUTDIR, { recursive: true });

/* ------------------------------------------------------------------ *
 * Collecte des holders.
 * ------------------------------------------------------------------ */

async function fromAlchemy() {
  const key = need('ALCHEMY_API_KEY',
    'Cle gratuite sur dashboard.alchemy.com, a coller dans .env.local.');
  const chain = config.snapshot.chain;
  const base = `https://${chain}.g.alchemy.com/nft/v3/${key}`;

  // Bloc de reference : celui demande, sinon le dernier connu au moment
  // de l'appel. On le fige AVANT de paginer, pour que la pagination ne
  // traverse pas une frontiere de bloc.
  let block = val('--block');
  if (!block) {
    const r = await fetch(`https://${chain}.g.alchemy.com/v2/${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
    });
    // Alchemy repond en HTML sur une cle inconnue. Tenter de le parser en
    // JSON donne une erreur de deserialisation qui n'apprend rien.
    if (!r.ok) {
      throw new Error(
        `Alchemy a refuse la requete (HTTP ${r.status}).\n` +
        (r.status === 401 || r.status === 403
          ? "La cle ALCHEMY_API_KEY est invalide ou n'a pas acces au reseau " +
            `${chain}.\n  Verifie-la sur dashboard.alchemy.com.`
          : 'Reessayer dans un instant, ou verifier le reseau.')
      );
    }
    const j = await r.json();
    if (!j.result) throw new Error('Alchemy n a pas renvoye de numero de bloc : ' + JSON.stringify(j).slice(0, 200));
    block = parseInt(j.result, 16);
  }
  block = Number(block);

  const owners = [];
  let pageKey = null;
  do {
    const u = new URL(`${base}/getOwnersForContract`);
    u.searchParams.set('contractAddress', CONTRACT);
    u.searchParams.set('block', String(block));
    if (pageKey) u.searchParams.set('pageKey', pageKey);
    const r = await fetch(u, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`Alchemy ${r.status} : ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    owners.push(...(j.owners || []));
    pageKey = j.pageKey || null;
    process.stdout.write(`  ${owners.length} adresses...\r`);
  } while (pageKey);

  return { owners, block, source: 'alchemy' };
}

async function fromApi() {
  const base = val('--url', 'https://hoodlrz.com');
  const r = await fetch(`${base}/api/city/holders`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j.owners)) throw new Error('Reponse inattendue : pas de champ owners');
  // Le cache Supabase ne porte pas de numero de bloc : le snapshot n'est
  // alors pas reproductible par un tiers. Acceptable pour un essai, pas
  // pour la production.
  return { owners: j.owners, block: null, source: `api:${base}` };
}

function fromFile() {
  const path = val('--file') || args[args.indexOf('--file') + 1];
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const owners = Array.isArray(j) ? j : j.owners;
  if (!Array.isArray(owners)) throw new Error('Fichier sans liste d adresses');
  return { owners, block: j.block ?? null, source: `file:${path}` };
}

/* ------------------------------------------------------------------ *
 * Execution.
 * ------------------------------------------------------------------ */

const mode = has('--alchemy') ? 'alchemy' : has('--api') ? 'api' : has('--file') ? 'file' : null;
if (!mode) {
  console.error('Choisir une source : --alchemy | --api | --file <chemin>');
  process.exit(2);
}

console.log(`\nSnapshot Hoodlrz  (${mode})`);
console.log(`  contrat ${CONTRACT}\n`);

// Une trace de pile ne dit rien a qui lance ce script le jour du
// snapshot. Les erreurs previsibles - cle absente, cle refusee, reseau -
// sortent en une phrase et un code d'erreur, pas en vingt lignes de
// chemins internes a Node.
const { owners, block, source } = await (
  mode === 'alchemy' ? fromAlchemy() : mode === 'api' ? fromApi() : Promise.resolve(fromFile())
).catch((e) => {
  console.error('\n  ECHEC\n  ' + String(e.message).split('\n').join('\n  ') + '\n');
  process.exit(1);
});

// Filtre defensif : adresses valides, hors adresse nulle. Un burn address
// dans l'allowlist serait un slot perdu.
const ZERO = '0x0000000000000000000000000000000000000000';
const clean = [...new Set(
  owners
    .map((a) => String(a).toLowerCase().trim())
    .filter((a) => /^0x[0-9a-f]{40}$/.test(a) && a !== ZERO)
)].sort();

const dropped = owners.length - clean.length;
console.log(`\n  ${owners.length} adresses recues`);
if (dropped > 0) console.log(`  ${dropped} ecartees (doublons, adresse nulle, format)`);
console.log(`  ${clean.length} holders retenus`);

const tree = buildTree(clean);
console.log(`  racine  ${tree.root}`);

/* Preuves, une par adresse. C'est ce fichier que servira la page de mint :
 * le navigateur n'a pas a reconstruire l'arbre, il lit sa preuve. */
const proofs = {};
for (const addr of clean) {
  const p = proofFor(tree, leafOf(addr));
  if (!verify(p, tree.root, leafOf(addr))) {
    throw new Error(`Preuve invalide pour ${addr} - arret`);
  }
  proofs[addr] = p;
}
console.log(`  ${Object.keys(proofs).length} preuves generees et verifiees`);

const takenAt = new Date().toISOString();
const meta = {
  takenAt,
  source,
  contract: CONTRACT,
  chain: config.snapshot.chain,
  blockNumber: block,
  holderCount: clean.length,
  merkleRoot: tree.root,
  maxPerWallet: config.collection.maxPerWallet,
  capaciteAllowlist: clean.length * config.collection.maxPerWallet,
};

writeFileSync(`${OUTDIR}/holders.json`, JSON.stringify({ ...meta, holders: clean }, null, 2));
writeFileSync(`${OUTDIR}/proofs.json`, JSON.stringify({ merkleRoot: tree.root, proofs }, null, 2));
writeFileSync(`${OUTDIR}/meta.json`, JSON.stringify(meta, null, 2));

/* Publication. L'allowlist est servie en statique par le site : la page de
 * mint y lit la preuve du wallet connecte, et n'importe qui peut
 * telecharger la liste complete pour recalculer la racine. Une allowlist
 * qu'on ne peut pas verifier ne vaut rien pour ceux qui n'en font pas
 * partie. */
mkdirSync('public/kids', { recursive: true });
writeFileSync('public/kids/allowlist.json', JSON.stringify({ ...meta, proofs }));
writeFileSync('public/kids/holders.json', JSON.stringify({ ...meta, holders: clean }, null, 2));

// Report dans la config, pour que la racine vive au meme endroit que le
// reste. Les essais (--file, --dry) n'y touchent pas : une racine de
// fixture qui traine dans la config est exactement le genre de detail qui
// finit deploye en production.
const writeConfig = !has('--dry') && mode !== 'file';
if (writeConfig) {
  config.snapshot = { ...config.snapshot, takenAt, blockNumber: block, holderCount: clean.length, merkleRoot: tree.root };
  writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
}

console.log(`\n  capacite allowlist : ${meta.capaciteAllowlist.toLocaleString('fr')} pieces ` +
            `(${clean.length} x ${config.collection.maxPerWallet}) sur 8 588 au public`);
if (!block) {
  console.log('\n  ATTENTION : pas de numero de bloc, snapshot non reproductible.');
  console.log('  Pour la production, utiliser --alchemy.');
}
console.log(`\nEcrit -> ${OUTDIR}/`);
console.log(writeConfig
  ? `Racine reportee dans ${CONFIG}\n`
  : `Config NON modifiee (essai : --file ou --dry)\n`);
console.log('Prochaine etape : setAllowlistRoot(' + tree.root + ')\n');
