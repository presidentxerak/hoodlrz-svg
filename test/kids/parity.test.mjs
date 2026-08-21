/**
 * Phase 2 - Test differentiel JS <-> Solidity sur les 8888 tokens.
 *
 * C'est le test qui decide si la collection peut sortir. Le moteur JS et le
 * contrat calculent les memes traits par deux chemins totalement independants ;
 * si l'un des deux devie, un token affichera sur la marketplace des attributs
 * qui contredisent son image. Rien dans le code ne garantit la parite a priori :
 * elle se constate ici, ou pas.
 *
 * On ne compare PAS les index internes - plusieurs entrees de tableau ont la
 * meme valeur ('snapback' apparait deux fois, '#ffffff' cinq fois), donc un
 * index n'est pas recuperable depuis une valeur. On compare les traits
 * RESOLUS, c'est-a-dire exactement ce que verra un collectionneur.
 *
 * Usage : node test/kids/parity.test.mjs [nombre_de_tokens]
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { solidityPackedKeccak256, AbiCoder } from 'ethers';
import { compile, deploy } from '../../scripts/kids/evm.mjs';

const N = parseInt(process.argv[2] || '8888', 10);
const SEED_BASE = '0x' + 'a7'.repeat(32);   // graine arbitraire mais fixe
const BATCH = 400;                           // tokens par appel EVM
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const K = JSON.parse(readFileSync('kids/build/constants.json', 'utf8')).arrays;
const abi = AbiCoder.defaultAbiCoder();

console.log(`\nTest de parite sur ${N.toLocaleString('fr')} tokens`);
console.log(`  seedBase ${SEED_BASE.slice(0, 18)}...\n`);

/* ------------------------------------------------------------------ *
 * Hashes : exactement ce que calcule le contrat.
 *   keccak256(abi.encodePacked(bytes32 seedBase, uint256 tokenId))
 * rendu en hexadecimal minuscule prefixe 0x.
 * ------------------------------------------------------------------ */
const hashes = [];
for (let id = 0; id < N; id++) {
  hashes.push(solidityPackedKeccak256(['bytes32', 'uint256'], [SEED_BASE, id]));
}

/* ------------------------------------------------------------------ *
 * Cote Solidity.
 * ------------------------------------------------------------------ */
console.log('Compilation du contrat...');
const art = compile('contracts/kids/test/TraitsHarness.sol', 'TraitsHarness');
console.log(`  bytecode deploye : ${art.deployedSize.toLocaleString('fr')} o`);
const harness = await deploy(art.bytecode);

/** Decode un uint256 empaquete par TraitsHarness._pack vers les traits resolus. */
function unpack(p) {
  const at = (i) => Number((p >> BigInt(8 * i)) & 0xffn);
  // Ordre inverse de l'empaquetage : hoodWhite est le dernier decale.
  const hoodWhite = at(0) === 1;
  const eqColorIdx = at(1);
  const hoodColorIdx = at(2);
  const hatColorIdx = at(3);
  const accent = at(4);
  const mono = at(5) === 1;
  const skull = at(6) === 1;
  const expression = at(7);
  const backdrop = at(8);
  const hair = at(9);
  const hat = at(10);

  // Resolution des couleurs, miroir de HoodlrzKidsTraits.
  const hatColor = mono ? K.NEON[accent] : K.HAT_COLORS[hatColorIdx];
  const hoodColor = mono ? (hoodWhite ? '#ffffff' : K.NEON[accent]) : K.HOOD_COLORS[hoodColorIdx];
  const eqColor = mono ? K.NEON[accent] : K.NEON[eqColorIdx];

  return {
    Hat: K.HAT_TYPES[hat],
    'Hat Color': hatColor,
    'Hood Color': hoodColor,
    Face: skull ? 'Skull' : 'Classic',
    Hair: K.HAIR_STYLES[hair],
    Backdrop: K.BG_STYLES[backdrop],
    Palette: mono ? 'Mono' : 'Multi',
    'EQ Color': eqColor,
    Expression: K.EXPRESSIONS[expression],
  };
}

// Selecteur de probeRange(bytes32,uint256,uint256) calcule via keccak.
const selProbeRange = solidityPackedKeccak256(['string'], ['probeRange(bytes32,uint256,uint256)']).slice(0, 10);
const selHashOf = solidityPackedKeccak256(['string'], ['hashOf(bytes32,uint256)']).slice(0, 10);

console.log('Derivation cote EVM...');
const solTraits = [];
const t0 = Date.now();
for (let start = 0; start < N; start += BATCH) {
  const count = Math.min(BATCH, N - start);
  const data = selProbeRange + abi.encode(['bytes32', 'uint256', 'uint256'], [SEED_BASE, start, count]).slice(2);
  const ret = await harness.call(data);
  const [arr] = abi.decode(['uint256[]'], ret);
  for (const v of arr) solTraits.push(unpack(BigInt(v)));
  if (start % 2000 === 0 && start > 0) process.stdout.write(`  ${start}...\n`);
}
console.log(`  ${solTraits.length.toLocaleString('fr')} tokens en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

/* ------------------------------------------------------------------ *
 * Verification annexe : la chaine de hash produite par le contrat doit
 * etre identique a celle calculee ici. Toute la graine en depend.
 * ------------------------------------------------------------------ */
{
  let mismatch = 0;
  for (const id of [0, 1, 42, N - 1]) {
    const data = selHashOf + abi.encode(['bytes32', 'uint256'], [SEED_BASE, id]).slice(2);
    const [s] = abi.decode(['string'], await harness.call(data));
    if (s !== hashes[id]) { mismatch++; console.log(`  ecart token ${id}: ${s} != ${hashes[id]}`); }
  }
  console.log(`Chaine de hash : ${mismatch === 0 ? 'identique' : mismatch + ' ECART(S)'}`);
}

/* ------------------------------------------------------------------ *
 * Cote JavaScript : le moteur gele lui-meme.
 * ------------------------------------------------------------------ */
console.log('Derivation cote moteur JS...');
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
const frozen = readFileSync(resolve('kids/engine/frozen.html'), 'utf8');
await page.setContent(frozen.replace('__HASH__', '0x0'), { waitUntil: 'load' });
await page.waitForTimeout(1500);

const jsTraits = await page.evaluate((hs) => {
  const E = window.HoodlrzEngine;
  return hs.map((h) => {
    const t = E.createToken(h);
    return {
      Hat: t.hatType,
      'Hat Color': t.hatColor,
      'Hood Color': t.hoodColor,
      Face: t.skull ? 'Skull' : 'Classic',
      Hair: t.hair,
      Backdrop: t.bgStyle,
      Palette: t.mono ? 'Mono' : 'Multi',
      'EQ Color': t.eqColor,
      Expression: (E.EXPRESSIONS[t.exprIndex] || {}).name || '',
    };
  });
}, hashes);
await browser.close();
console.log(`  ${jsTraits.length.toLocaleString('fr')} tokens`);

/* ------------------------------------------------------------------ *
 * Comparaison.
 * ------------------------------------------------------------------ */
const FIELDS = ['Hat', 'Hat Color', 'Hood Color', 'Face', 'Hair', 'Backdrop', 'Palette', 'EQ Color', 'Expression'];
let matched = 0;
const failures = [];
const perField = Object.fromEntries(FIELDS.map((f) => [f, 0]));

for (let i = 0; i < N; i++) {
  const a = jsTraits[i], b = solTraits[i];
  const bad = FIELDS.filter((f) => a[f] !== b[f]);
  if (bad.length === 0) matched++;
  else {
    for (const f of bad) perField[f]++;
    if (failures.length < 5) failures.push({ id: i, hash: hashes[i], bad, js: a, sol: b });
  }
}

console.log('\n' + '='.repeat(58));
console.log(`  PARITE : ${matched.toLocaleString('fr')} / ${N.toLocaleString('fr')} tokens identiques`);
console.log('='.repeat(58));

if (matched !== N) {
  console.log('\nEcarts par trait :');
  for (const [f, n] of Object.entries(perField)) if (n) console.log(`  ${f.padEnd(12)} ${n}`);
  console.log('\nPremiers cas :');
  for (const f of failures) {
    console.log(`\n  token ${f.id}  ${f.hash.slice(0, 20)}...`);
    for (const k of f.bad) console.log(`    ${k.padEnd(12)} JS="${f.js[k]}"  SOL="${f.sol[k]}"`);
  }
}

/* Distribution, pour verifier au passage qu'aucun trait ne s'effondre. */
console.log('\nDistribution observee (cote Solidity) :');
for (const f of ['Hat', 'Face', 'Palette', 'Expression', 'Backdrop']) {
  const counts = {};
  for (const t of solTraits) counts[t[f]] = (counts[t[f]] || 0) + 1;
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${k} ${(v * 100 / N).toFixed(1)}%`).join('  ');
  console.log(`  ${f.padEnd(11)} ${top}`);
}

console.log('');
process.exit(matched === N ? 0 : 1);
