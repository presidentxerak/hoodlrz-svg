/**
 * Verification d'un deploiement Hoodlrz Kids, depuis la chaine.
 *
 * A lancer DEUX fois, a deux moments qui n'ont pas le meme enjeu :
 *
 *   1. Apres le televersement, AVANT `seal()`.
 *      Le scellement est irreversible. C'est le dernier instant ou une
 *      erreur de televersement se rattrape encore. Le script relit les
 *      morceaux depuis la chaine, reconstitue le document et compare son
 *      SHA-256 a l'artefact local : si un octet manque, il le dit ici
 *      plutot que trop tard.
 *
 *   2. Apres le mint et `revealSeed()`, avant d'annoncer la collection.
 *      Le script lit un tokenURI reel, en extrait le HTML, le fait
 *      rendre par un navigateur, et compare les traits obtenus a ceux
 *      annonces dans les metadonnees. C'est le seul controle qui prouve
 *      que ce que voit un collectionneur correspond a ce qu'affirme le
 *      contrat.
 *
 * Le script ne modifie rien : il ne fait que des appels en lecture.
 *
 * Usage :
 *   node scripts/kids/verify-onchain.mjs \
 *     --rpc <url> --engine 0x... [--nft 0x...] [--token 0]
 */

import { JsonRpcProvider, Contract } from 'ethers';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const val = (f, d = null) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const RPC = val('--rpc');
const ENGINE = val('--engine');
const NFT = val('--nft');
const TOKEN = Number(val('--token', '0'));
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

if (!RPC || !ENGINE) {
  console.error('Usage : --rpc <url> --engine <adresse> [--nft <adresse>] [--token <id>]');
  process.exit(2);
}

const ENGINE_ABI = [
  'function pre() view returns (bytes)',
  'function post() view returns (bytes)',
  'function documentFor(string) view returns (string)',
  'function totalBytes() view returns (uint256)',
  'function artifactHash() view returns (bytes32)',
  'function sealed_() view returns (bool)',
  'function chunkCounts() view returns (uint256,uint256)',
];
const NFT_ABI = [
  'function MAX_SUPPLY() view returns (uint256)',
  'function RESERVE() view returns (uint256)',
  'function MAX_PER_WALLET() view returns (uint256)',
  'function ROYALTY_BPS() view returns (uint96)',
  'function totalMinted() view returns (uint256)',
  'function reserveMinted() view returns (uint256)',
  'function seedBase() view returns (bytes32)',
  'function allowlistRoot() view returns (bytes32)',
  'function allowlistStart() view returns (uint64)',
  'function publicStart() view returns (uint64)',
  'function mintEnd() view returns (uint64)',
  'function rendererLocked() view returns (bool)',
  'function tokenURI(uint256) view returns (string)',
  'function tokenHash(uint256) view returns (bytes32)',
  'function royaltyInfo(uint256,uint256) view returns (address,uint256)',
];

let pass = 0, fail = 0, warn = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};
const note = (label, detail = '') => {
  console.log(`  --    ${label}${detail ? '   ' + detail : ''}`);
  warn++;
};
const section = (t) => console.log(`\n${t}`);

const provider = new JsonRpcProvider(RPC, undefined, { staticNetwork: true });
const engine = new Contract(ENGINE, ENGINE_ABI, provider);

console.log(`\nVerification Hoodlrz Kids`);
console.log(`  rpc     ${RPC}`);
console.log(`  moteur  ${ENGINE}`);
if (NFT) console.log(`  nft     ${NFT}`);

/* ------------------------------------------------------------------ *
 * 1. Le moteur stocke est-il exactement l'artefact local ?
 * ------------------------------------------------------------------ */
section('1. Moteur on-chain');

const local = readFileSync('kids/engine/frozen.html');
const localSha = createHash('sha256').update(local).digest('hex');
const marker = Buffer.from('__HASH__');
const mIdx = local.indexOf(marker);
const localStored = Buffer.concat([local.subarray(0, mIdx), local.subarray(mIdx + marker.length)]);

const [nPre, nPost] = await engine.chunkCounts();
const onChainBytes = Number(await engine.totalBytes());
ok('morceaux presents', Number(nPre) > 0 && Number(nPost) > 0, `${nPre} + ${nPost}`);
ok('nombre d octets attendu', onChainBytes === localStored.length,
   `${onChainBytes.toLocaleString('fr')} vs ${localStored.length.toLocaleString('fr')} en local`);

// Relecture complete et comparaison octet a octet. C'est le controle
// qui doit passer AVANT seal().
const pre = Buffer.from((await engine.pre()).slice(2), 'hex');
const post = Buffer.from((await engine.post()).slice(2), 'hex');
const rebuilt = Buffer.concat([pre, post]);
ok('contenu identique a l artefact local', rebuilt.equals(localStored));

// Et le document complet, avec un hash de sonde, doit redonner le
// fichier gele au SHA-256 pres.
const probe = '0x' + 'ab'.repeat(32);
const doc = await engine.documentFor(probe);
const expected = local.toString('utf8').replace('__HASH__', probe);
ok('document reconstitue conforme', doc === expected, `${doc.length.toLocaleString('fr')} caracteres`);

const declaredSha = await engine.artifactHash();
const isSealed = await engine.sealed_();
if (isSealed) {
  ok('SHA-256 publie == artefact local', declaredSha.slice(2) === localSha, declaredSha.slice(0, 18) + '...');
  ok('moteur scelle', true);
} else {
  note('moteur PAS ENCORE SCELLE', 'c est le moment de verifier, puis seal()');
  console.log(`        sha256 local a declarer : 0x${localSha}`);
}

/* ------------------------------------------------------------------ *
 * 2. Parametres du contrat NFT
 * ------------------------------------------------------------------ */
if (NFT) {
  const nft = new Contract(NFT, NFT_ABI, provider);
  const config = JSON.parse(readFileSync('kids/config.json', 'utf8'));
  const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);

  section('2. Parametres');
  ok('supply', Number(await nft.MAX_SUPPLY()) === config.collection.maxSupply, String(config.collection.maxSupply));
  ok('reserve', Number(await nft.RESERVE()) === config.collection.reserve, String(config.collection.reserve));
  ok('plafond par wallet', Number(await nft.MAX_PER_WALLET()) === config.collection.maxPerWallet, String(config.collection.maxPerWallet));
  ok('royalties', Number(await nft.ROYALTY_BPS()) === config.collection.royaltyBps,
     `${config.collection.royaltyBps / 100} %`);

  const [, amount] = await nft.royaltyInfo(0, 10_000n);
  ok('royaltyInfo coherent', Number(amount) === config.collection.royaltyBps, `${amount} sur 10000`);

  section('3. Etat du mint');
  const reserveMinted = Number(await nft.reserveMinted());
  const totalMinted = Number(await nft.totalMinted());
  const alStart = Number(await nft.allowlistStart());
  const pubStart = Number(await nft.publicStart());
  const mintEnd = Number(await nft.mintEnd());

  // Une etape pas encore faite n'est pas une erreur : elle le devient
  // quand l'etat est incoherent. La reserve doit etre complete des lors
  // que les phases sont programmees - le contrat bloque les mints sinon,
  // et un mint qui s'ouvre sur un revert est une panne publique.
  if (alStart === 0 && reserveMinted < config.collection.reserve) {
    note('reserve pas encore mintee', `${reserveMinted} / ${config.collection.reserve}`);
  } else {
    ok('reserve mintee en entier', reserveMinted === config.collection.reserve,
       `${reserveMinted} / ${config.collection.reserve}`);
  }
  console.log(`  --    total minte   ${totalMinted.toLocaleString('fr')} / ${config.collection.maxSupply.toLocaleString('fr')}`);

  if (alStart === 0) {
    note('phases non programmees', 'setPhases() reste a passer');
  } else {
    ok('allowlistStart conforme a la config', alStart === ts(config.phases.allowlistStartParis),
       new Date(alStart * 1000).toISOString());
    ok('publicStart conforme', pubStart === ts(config.phases.publicStartParis));
    ok('mintEnd conforme', mintEnd === ts(config.phases.mintEndParis));
  }

  const root = await nft.allowlistRoot();
  const ZERO32 = '0x' + '0'.repeat(64);
  if (root === ZERO32) {
    note('racine d allowlist non posee', 'setAllowlistRoot() reste a passer');
  } else if (config.snapshot.merkleRoot) {
    ok('racine == snapshot publie', root === config.snapshot.merkleRoot, root.slice(0, 18) + '...');
  } else {
    note('racine posee mais aucun snapshot local pour comparer', root.slice(0, 18) + '...');
  }

  // Idem : le verrou du renderer est le dernier geste, apres validation
  // du rendu. Tant que le mint n'a pas commence, ne pas l'avoir pose est
  // normal. Une fois le mint ouvert, c'est une faille : le renderer
  // pourrait encore etre remplace sous les pieds des collectionneurs.
  const rendererLocked = await nft.rendererLocked();
  const seedBase = await nft.seedBase();
  if (alStart === 0) {
    note('renderer pas encore verrouille', 'lockRenderer() apres validation du rendu');
  } else {
    ok('renderer verrouille', rendererLocked,
       rendererLocked ? '' : 'le mint est ouvert : lockRenderer() est urgent');
  }

  /* ---------------------------------------------------------------- *
   * 4. Un token reel : metadonnees et image concordent-elles ?
   * ---------------------------------------------------------------- */
  section('4. Token reel');
  if (seedBase === ZERO32) {
    note('graine non revelee', 'revealSeed() a passer apres la fin du mint');
  } else if (totalMinted === 0) {
    note('aucun token minte', 'rien a verifier');
  } else {
    const uri = await nft.tokenURI(TOKEN);
    ok('tokenURI en data URI', uri.startsWith('data:application/json;base64,'));
    const meta = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
    ok('nom du token', meta.name === `Hoodlrz Kid #${TOKEN}`, meta.name);
    ok('9 attributs', Array.isArray(meta.attributes) && meta.attributes.length === 9);
    ok('image SVG on-chain', String(meta.image).startsWith('data:image/svg+xml;base64,'));
    ok('animation HTML on-chain', String(meta.animation_url).startsWith('data:text/html;base64,'));

    const html = Buffer.from(meta.animation_url.split(',')[1], 'base64').toString('utf8');
    const th = await nft.tokenHash(TOKEN);
    ok('HTML identique a l artefact, hash injecte',
       html === local.toString('utf8').replace('__HASH__', th));

    // Le controle decisif : rendre le HTML et comparer les traits.
    const { chromium } = await import(CHROME
      ? '/opt/node22/lib/node_modules/playwright/index.mjs'
      : 'playwright');
    const browser = await chromium.launch({ executablePath: CHROME });
    const page = await browser.newPage({ viewport: { width: 500, height: 500 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const seen = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 101) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
      return { lit, features: window.HOODLRZ_FEATURES, hash: (window.HOODLRZ_TOKEN || {}).hash };
    });
    await browser.close();

    ok('le moteur rend sans erreur', errs.length === 0, errs[0] ?? '');
    ok('canvas non vide', seen.lit > 100, `${seen.lit} echantillons`);
    ok('hash lu par le moteur', seen.hash === th);

    const declared = Object.fromEntries(meta.attributes.map((a) => [a.trait_type, a.value]));
    const diverging = Object.keys(declared).filter((k) => declared[k] !== seen.features?.[k]);
    ok('metadonnees == image', diverging.length === 0,
       diverging.length ? diverging.join(', ') : '9 traits concordants');
    if (diverging.length) {
      for (const k of diverging) {
        console.log(`        ${k.padEnd(12)} contrat="${declared[k]}"  moteur="${seen.features?.[k]}"`);
      }
    }
  }
}

console.log(`\n${'='.repeat(52)}`);
console.log(`  ${pass} OK, ${fail} FAIL${warn ? `, ${warn} en attente` : ''}`);
console.log('='.repeat(52) + '\n');
process.exit(fail === 0 ? 0 : 1);
