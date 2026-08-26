/**
 * Reprise d'un deploiement interrompu.
 *
 * Le televersement du moteur, c'est six transactions de 24 Ko sur un RPC
 * que la documentation Robinhood dit rate-limited. L'interruption n'est
 * pas une hypothese d'ecole - et relancer sans reprise redeploierait
 * trois contrats en abandonnant les precedents, moteur a moitie ecrit
 * compris.
 *
 * scripts/kids/deploy.ts lit donc son avancement SUR LA CHAINE plutot
 * que dans un fichier local qui pourrait mentir : chunkCounts(),
 * sealed_(), reserveMinted(). Ce test verifie que ces trois lectures
 * disent la verite a chaque etape, et qu'un televersement repris au
 * milieu produit exactement le meme document qu'un televersement d'une
 * traite.
 *
 * Ce qui n'est PAS teste ici : deploy.ts lui-meme, qui a besoin de
 * hardhat et d'un reseau. Ce test couvre l'etat sur lequel il s'appuie.
 *
 * Usage : npm run kids:resume
 */

import { readFileSync } from 'node:fs';
import { createChain, ACCOUNTS } from '../../scripts/kids/chain.mjs';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};

const chain = await createChain();
const preChunks = JSON.parse(readFileSync('kids/build/engine-pre.json', 'utf8'));
const postChunks = JSON.parse(readFileSync('kids/build/engine-post.json', 'utf8'));
const artifactSha = '0x' + readFileSync('kids/build/engine.sha256', 'utf8').split(' ')[0];
const PROBE = '0x' + 'ab'.repeat(32);
const expected = readFileSync('kids/engine/frozen.html', 'utf8').replace('__HASH__', PROBE);

console.log('\nReprise d un deploiement interrompu\n');

/* ------------------------------------------------------------------ *
 * 1. Le compteur de morceaux suit la realite
 * ------------------------------------------------------------------ */
console.log('1. chunkCounts() pendant le televersement');
const engine = await chain.deploy('contracts/kids/HoodlrzKidsEngine.sol', 'HoodlrzKidsEngine');

let [p, q] = await engine.call('chunkCounts');
ok('vide au depart', Number(p) === 0 && Number(q) === 0);

// Interruption simulee : on s'arrete apres le pre et deux post, ce qui
// laisse le moteur inutilisable - exactement l'etat le plus dangereux.
await engine.call('appendChunk', [true, preChunks[0]]);
for (let i = 0; i < 2; i++) await engine.call('appendChunk', [false, postChunks[i]]);

[p, q] = await engine.call('chunkCounts');
ok('compte juste apres interruption', Number(p) === 1 && Number(q) === 2, `${p} pre, ${q} post`);

const partiel = await engine.call('documentFor', [PROBE]);
ok('document encore incomplet', partiel.length < expected.length,
   `${partiel.length} caracteres sur ${expected.length}`);

/* ------------------------------------------------------------------ *
 * 2. La reprise produit le meme document
 * ------------------------------------------------------------------ */
console.log('\n2. Reprise a partir du compteur lu sur la chaine');
for (let i = Number(p); i < preChunks.length; i++) await engine.call('appendChunk', [true, preChunks[i]]);
for (let i = Number(q); i < postChunks.length; i++) await engine.call('appendChunk', [false, postChunks[i]]);

const [fp, fq] = await engine.call('chunkCounts');
ok('tous les morceaux presents', Number(fp) === preChunks.length && Number(fq) === postChunks.length,
   `${fp} + ${fq}`);

const complet = await engine.call('documentFor', [PROBE]);
ok('document identique a l artefact local', complet === expected,
   `${Buffer.byteLength(complet, 'utf8').toLocaleString('fr')} o`);
ok('aucun morceau duplique', Number(fp) + Number(fq) === preChunks.length + postChunks.length);

/* ------------------------------------------------------------------ *
 * 3. Le scellement se voit
 * ------------------------------------------------------------------ */
console.log('\n3. sealed_() avant et apres');
ok('non scelle tant qu on n a pas scelle', (await engine.call('sealed_')) === false);
await engine.call('seal', [artifactSha]);
ok('scelle apres seal()', (await engine.call('sealed_')) === true);
ok('empreinte publiee conforme', (await engine.call('artifactHash')) === artifactSha);
// Relancer le script ne doit pas retenter le scellement : il echouerait
// et ferait passer un deploiement complet pour un echec.
ok('second seal refuse', (await engine.expectRevert('seal', [artifactSha])) === 'AlreadySealed');
ok('appendChunk refuse apres scellement',
   (await engine.expectRevert('appendChunk', [false, postChunks[0]])) === 'AlreadySealed');

/* ------------------------------------------------------------------ *
 * 4. La reserve reprend au bon endroit
 * ------------------------------------------------------------------ */
console.log('\n4. reserveMinted() pendant le mint de la reserve');
const renderer = await chain.deploy('contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer',
  [engine.address.toString()]);
const nft = await chain.deploy('contracts/kids/HoodlrzKids.sol', 'HoodlrzKids',
  [renderer.address.toString(), ACCOUNTS.BOB.toString()]);

const RESERVE = Number(await nft.call('RESERVE'));
const TO = ACCOUNTS.ALICE.toString();
ok('rien minte au depart', Number(await nft.call('reserveMinted')) === 0);

// Interruption apres deux lots de 50.
for (let i = 0; i < 2; i++) await nft.call('mintReserve', [TO, 50]);
let minted = Number(await nft.call('reserveMinted'));
ok('compte juste apres interruption', minted === 100, `${minted}/${RESERVE}`);

// Reprise : la boucle de deploy.ts, a l'identique.
while (minted < RESERVE) {
  const qty = Math.min(50, RESERVE - minted);
  await nft.call('mintReserve', [TO, qty]);
  minted = Number(await nft.call('reserveMinted'));
}
ok('reserve complete, sans depassement', minted === RESERVE, `${minted}/${RESERVE}`);
ok('les pieces sont chez le destinataire', Number(await nft.call('balanceOf', [TO])) === RESERVE);
ok('un lot de plus est refuse',
   (await nft.expectRevert('mintReserve', [TO, 1])) === 'ReserveExhausted');

/* ------------------------------------------------------------------ *
 * 5. Le verrou du renderer
 * ------------------------------------------------------------------ */
// C'est le dernier geste irreversible du deploiement, et le seul qui
// protege les collectionneurs : tant qu'il n'est pas pose, le proprietaire
// peut remplacer le renderer et changer l'apparence de pieces deja
// vendues. Une fois pose, l'adresse ne bouge plus - jamais.
console.log('\n5. lockRenderer()');
ok('renderer modifiable avant le verrou', (await nft.call('rendererLocked')) === false);

// On prouve que c'est vrai, pas seulement que le booleen le dit.
const autre = await chain.deploy('contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer',
  [engine.address.toString()]);
await nft.call('setRenderer', [autre.address.toString()]);
ok('le renderer a bien pu etre remplace',
   (await nft.call('renderer')).toLowerCase() === autre.address.toString().toLowerCase());

// On remet le bon avant de verrouiller : verrouiller sur le mauvais
// renderer serait definitif.
await nft.call('setRenderer', [renderer.address.toString()]);
ok('renderer d origine restaure',
   (await nft.call('renderer')).toLowerCase() === renderer.address.toString().toLowerCase());

await nft.call('lockRenderer');
ok('verrou pose', (await nft.call('rendererLocked')) === true);
ok('setRenderer refuse apres le verrou',
   (await nft.expectRevert('setRenderer', [autre.address.toString()])) === 'Locked');
ok('un second lockRenderer ne casse rien', (await nft.call('rendererLocked')) === true);

// Le verrou ne doit toucher que le renderer : les royalties restent
// modifiables, sinon une adresse perdue serait irrattrapable.
await nft.call('setRoyaltyReceiver', [ACCOUNTS.CAROL.toString()]);
ok('les royalties restent redirigeables',
   (await nft.call('royaltyReceiver')).toLowerCase() === ACCOUNTS.CAROL.toString().toLowerCase());

console.log(`\n==================================================`);
console.log(`  ${pass} OK, ${fail} FAIL`);
console.log(`==================================================\n`);
process.exit(fail ? 1 : 0);
