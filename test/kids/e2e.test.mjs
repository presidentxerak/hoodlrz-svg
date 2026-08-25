/**
 * Phase 4 - Parcours complet sur EVM locale.
 *
 * Deroule exactement la sequence de production : deployer, televerser le
 * moteur, sceller, minter la reserve, ouvrir l'allowlist puis le public,
 * reveler la graine, lire le tokenURI.
 *
 * Le controle final est le seul qui prouve vraiment quelque chose : on
 * extrait le HTML du tokenURI lu depuis la chaine, on le donne a un
 * navigateur, et on verifie qu'il DESSINE - et que les traits annonces
 * dans les metadonnees sont bien ceux de l'image.
 *
 * Usage : node test/kids/e2e.test.mjs
 */

import { launchChromium } from '../../scripts/kids/browser.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createChain, ACCOUNTS } from '../../scripts/kids/chain.mjs';
import { buildTree, proofFor, leafOf } from '../../scripts/kids/merkle.mjs';

const DAY = 86400;

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};
const section = (t) => console.log(`\n${t}`);

/* ================================================================== */
console.log('\nParcours complet Hoodlrz Gen Kids sur EVM locale');

const chain = await createChain();
const T0 = Number(chain.now);

section('1. Deploiement');
const engine = await chain.deploy('contracts/kids/HoodlrzKidsEngine.sol', 'HoodlrzKidsEngine');
ok('moteur deploye', !!engine.address, `${engine.deployedSize} o`);

const renderer = await chain.deploy(
  'contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer',
  [engine.address.toString()],
);
ok('renderer deploye', !!renderer.address, `${renderer.deployedSize} o`);

const nft = await chain.deploy(
  'contracts/kids/HoodlrzKids.sol', 'HoodlrzKids',
  [renderer.address.toString(), ACCOUNTS.DEPLOYER.toString()],
);
ok('NFT deploye', !!nft.address, `${nft.deployedSize} o`);
ok('parametres graves',
   (await nft.call('MAX_SUPPLY')) === 8888n &&
   (await nft.call('RESERVE')) === 300n &&
   (await nft.call('MAX_PER_WALLET')) === 10n &&
   (await nft.call('ROYALTY_BPS')) === 500n,
   '8888 / 300 / 10 / 5%');

section('2. Televersement du moteur');
const preChunks = JSON.parse(readFileSync('kids/build/engine-pre.json', 'utf8'));
const postChunks = JSON.parse(readFileSync('kids/build/engine-post.json', 'utf8'));
const manifest = JSON.parse(readFileSync('kids/build/engine-manifest.json', 'utf8'));

// Les morceaux sont deja en hexadecimal : ils partent tels quels en calldata,
// sans repasser par une chaine qui pourrait reinterpreter l'encodage.
let gasTotal = 0n;
for (const c of preChunks) {
  await engine.call('appendChunk', [true, c]);
  gasTotal += engine.lastGas;
}
for (const c of postChunks) {
  await engine.call('appendChunk', [false, c]);
  gasTotal += engine.lastGas;
}
const [nPre, nPost] = await engine.call('chunkCounts');
ok('chunks stockes', Number(nPre) === preChunks.length && Number(nPost) === postChunks.length,
   `${nPre} + ${nPost}`);
ok('total d octets correct', Number(await engine.call('totalBytes')) === manifest.storedBytes,
   `${Number(await engine.call('totalBytes')).toLocaleString('fr')} o`);
console.log(`        gas de stockage : ${(Number(gasTotal) / 1e6).toFixed(1)} M`);

const artifactSha = '0x' + readFileSync('kids/build/engine.sha256', 'utf8').split(' ')[0];
await engine.call('seal', [artifactSha]);
ok('moteur scelle', await engine.call('sealed_'));
ok('ajout refuse apres scellement',
   (await engine.expectRevert('appendChunk', [true, '0x2178'])) === 'AlreadySealed');

section('3. Reconstitution du document');
const HASH_TEST = '0x' + 'ab'.repeat(32);
const docOnChain = await engine.call('documentFor', [HASH_TEST]);
const frozen = readFileSync('kids/engine/frozen.html', 'utf8');
const expected = frozen.replace('__HASH__', HASH_TEST);
ok('document identique a l artefact gele', docOnChain === expected,
   `${docOnChain.length.toLocaleString('fr')} o`);
ok('SHA-256 de l artefact publie', (await engine.call('artifactHash')) === artifactSha);

section('4. Reserve createur');
ok('mint public refuse avant les phases',
   (await nft.expectRevert('mintPublic', [1], { from: ACCOUNTS.ALICE })) === 'MintClosed');
for (let i = 0; i < 3; i++) {
  await nft.call('mintReserve', [ACCOUNTS.DEPLOYER.toString(), 100]);
}
ok('300 reservees mintees', (await nft.call('reserveMinted')) === 300n);
ok('reserve plafonnee a 300',
   (await nft.expectRevert('mintReserve', [ACCOUNTS.DEPLOYER.toString(), 1])) === 'ReserveExhausted');

section('5. Phases de mint');
const AL = T0 + DAY, PUB = T0 + 2 * DAY, END = T0 + 9 * DAY;
await nft.call('setPhases', [AL, PUB, END]);

const allow = [ACCOUNTS.ALICE.toString(), ACCOUNTS.BOB.toString(), '0x' + 'cc'.repeat(20)];
const tree = buildTree(allow);
await nft.call('setAllowlistRoot', [tree.root]);

ok('allowlist refusee avant ouverture',
   (await nft.expectRevert('mintAllowlist', [1, proofFor(tree, leafOf(ACCOUNTS.ALICE.toString()))],
     { from: ACCOUNTS.ALICE })) === 'MintClosed');

chain.warpTo(AL + 60);
await nft.call('mintAllowlist', [5, proofFor(tree, leafOf(ACCOUNTS.ALICE.toString()))], { from: ACCOUNTS.ALICE });
ok('holder allowliste peut minter', (await nft.call('balanceOf', [ACCOUNTS.ALICE.toString()])) === 5n);

ok('preuve invalide rejetee',
   (await nft.expectRevert('mintAllowlist', [1, proofFor(tree, leafOf(ACCOUNTS.ALICE.toString()))],
     { from: ACCOUNTS.CAROL })) === 'BadProof',
   'carol hors allowlist, preuve d alice');

ok('public encore ferme pendant l allowlist',
   (await nft.expectRevert('mintPublic', [1], { from: ACCOUNTS.BOB })) === 'MintClosed');

chain.warpTo(PUB + 60);
await nft.call('mintPublic', [5], { from: ACCOUNTS.ALICE });
ok('plafond de 10 atteint cumulativement',
   (await nft.expectRevert('mintPublic', [1], { from: ACCOUNTS.ALICE })) === 'WalletCapReached',
   'alice : 5 AL + 5 public = 10');

await nft.call('mintPublic', [10], { from: ACCOUNTS.BOB });
ok('bob mint son quota', (await nft.call('balanceOf', [ACCOUNTS.BOB.toString()])) === 10n);
ok('total mint coherent', (await nft.call('totalMinted')) === 320n, '300 + 10 + 10');

section('6. Revelation de la graine');
ok('revelation refusee pendant le mint',
   ['revert', 'Error'].includes(await nft.expectRevert('revealSeed')),
   'require("Mint en cours")');
ok('tokenURI donne un placeholder avant revelation',
   (await nft.call('tokenURI', [0])).startsWith('data:application/json;base64,'));

chain.warpTo(END + 60);
await nft.call('revealSeed');
const seedBase = await nft.call('seedBase');
ok('graine figee', seedBase !== '0x' + '0'.repeat(64), seedBase.slice(0, 18) + '...');
ok('seconde revelation refusee', (await nft.expectRevert('revealSeed')) === 'SeedAlreadySet');

section('7. tokenURI complet');
const uri = await nft.call('tokenURI', [7]);
ok('data URI JSON', uri.startsWith('data:application/json;base64,'));
const meta = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
ok('nom du token', meta.name === 'Hoodlrz Gen Kid #7', meta.name);
ok('9 attributs', Array.isArray(meta.attributes) && meta.attributes.length === 9);
ok('image SVG on-chain', meta.image.startsWith('data:image/svg+xml;base64,'));
ok('animation HTML on-chain', meta.animation_url.startsWith('data:text/html;base64,'));

const html = Buffer.from(meta.animation_url.split(',')[1], 'base64').toString('utf8');
const tokenHash7 = await nft.call('tokenHash', [7]);
ok('HTML porte le hash du token', html.includes(tokenHash7));
ok('HTML identique a l artefact gele', html === frozen.replace('__HASH__', tokenHash7),
   `${html.length.toLocaleString('fr')} o`);

const svg = Buffer.from(meta.image.split(',')[1], 'base64').toString('utf8');
ok('SVG bien forme', svg.startsWith('<svg') && svg.endsWith('</svg>'), `${svg.length} o`);

console.log('\n        attributs lus depuis la chaine :');
for (const a of meta.attributes) console.log(`          ${a.trait_type.padEnd(12)} ${a.value}`);

section('8. Le HTML issu de la chaine dessine-t-il ?');
const browser = await launchChromium();
{
  const page = await browser.newPage({ viewport: { width: 500, height: 500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const res = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4 * 101) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { lit, features: window.HOODLRZ_FEATURES, hash: (window.HOODLRZ_TOKEN || {}).hash };
  });

  ok('rend sans erreur', errors.length === 0, errors[0] || '');
  ok('canvas non vide', res.lit > 100, `${res.lit} echantillons`);
  ok('moteur lit bien le hash injecte', res.hash === tokenHash7);

  // Le controle qui compte : les attributs on-chain decrivent-ils l'image ?
  const onchainAttrs = Object.fromEntries(meta.attributes.map((a) => [a.trait_type, a.value]));
  const engineAttrs = res.features;
  const diverging = Object.keys(onchainAttrs).filter((k) => onchainAttrs[k] !== engineAttrs[k]);
  ok('metadonnees == image', diverging.length === 0,
     diverging.length ? diverging.join(', ') : '9 traits concordants');

  await page.screenshot({ path: 'kids/build/e2e-token7.png' });
  await page.close();
}

section('9. Rendu de l affiche SVG');
{
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  await page.setContent(`<body style="margin:0">${svg}</body>`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => {
    const s = document.querySelector('svg');
    return s ? { w: s.getBoundingClientRect().width, kids: s.children.length } : null;
  });
  ok('affiche parsee par le navigateur', !!box && box.kids > 3, `${box?.kids} elements`);
  await page.screenshot({ path: 'kids/build/e2e-poster7.png' });
  await page.close();
}
await browser.close();

section('10. Royalties');
{
  const [receiver, amount] = await nft.call('royaltyInfo', [7, 10_000n]);
  ok('EIP-2981 a 5 %', amount === 500n, `${amount} sur 10000`);
  ok('beneficiaire correct', receiver.toLowerCase() === ACCOUNTS.DEPLOYER.toString().toLowerCase());
  ok('interface declaree', await nft.call('supportsInterface', ['0x2a55205a']));
}

console.log(`\n${'='.repeat(50)}`);
console.log(`  ${pass} OK, ${fail} FAIL`);
console.log('='.repeat(50) + '\n');
process.exit(fail === 0 ? 0 : 1);
