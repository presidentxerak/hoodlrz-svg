/**
 * Jeu de rendus de reference + rapport de rarete.
 *
 * A quoi ca sert, dans l'ordre d'importance :
 *
 *   1. APRES LE MINT. Une fois la graine revelee, on regenere les 8888
 *      pieces ici et on les compare a ce que renvoie la chaine. Tout
 *      ecart signale un probleme entre le moteur stocke on-chain et
 *      celui qu'on croit avoir deploye.
 *
 *   2. AVANT LE MINT. Le rapport de rarete donne la distribution reelle
 *      des traits, celle qu'attendront les collectionneurs. Mieux vaut
 *      la connaitre que la decouvrir.
 *
 *   3. Les planches-contact permettent de juger l'ensemble d'un coup
 *      d'oeil - une collection generative se regarde en grille, pas
 *      piece par piece.
 *
 * PERFORMANCE
 * Recharger la page pour chaque token prendrait des heures. On charge le
 * moteur UNE fois, puis on boucle en appelant createToken + paint dans
 * la meme page. Le rendu passe de ~3 s a quelques millisecondes par
 * piece.
 *
 * Usage :
 *   node scripts/kids/render-reference.mjs --rarity
 *   node scripts/kids/render-reference.mjs --sheets 4
 *   node scripts/kids/render-reference.mjs --tokens 0,7,42 --size 700
 *   node scripts/kids/render-reference.mjs --all          (8888 PNG, long)
 */

import { launchChromium } from './browser.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { solidityPackedKeccak256 } from 'ethers';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const OUT = 'kids/build/reference';
const SUPPLY = Number(val('--supply', '8888'));

/** Graine. Avant revelation on prend une graine de travail, clairement
 *  identifiee comme telle : les rendus produits ne sont PAS ceux de la
 *  collection finale, seulement un echantillon representatif. */
const SEED = val('--seed', null);
const seedBase = SEED ?? ('0x' + 'a7'.repeat(32));
const isReal = SEED !== null;

mkdirSync(OUT, { recursive: true });

const hashOf = (id) => solidityPackedKeccak256(['bytes32', 'uint256'], [seedBase, id]);

console.log('\nRendus de reference Hoodlrz Kids');
console.log(`  graine   ${seedBase.slice(0, 18)}…  ${isReal ? '(reelle)' : '(de travail - PAS la collection finale)'}`);
console.log(`  supply   ${SUPPLY.toLocaleString('fr')}\n`);

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
const frozen = readFileSync(resolve('kids/engine/frozen.html'), 'utf8');
await page.setContent(frozen.replace('__HASH__', '0x0'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__hoodlrzFontReady === true, { timeout: 15000 })
  .catch(() => console.log('  (police : delai depasse, on continue)'));
await page.waitForTimeout(500);

/* ------------------------------------------------------------------ *
 * Rapport de rarete
 * ------------------------------------------------------------------ */
if (has('--rarity') || args.length === 0) {
  console.log('Calcul de la rarete sur les ' + SUPPLY.toLocaleString('fr') + ' pieces…');
  const hashes = Array.from({ length: SUPPLY }, (_, i) => hashOf(i));

  const traits = await page.evaluate((hs) => {
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

  const FIELDS = Object.keys(traits[0]);
  const counts = {};
  for (const f of FIELDS) counts[f] = {};
  for (const t of traits) for (const f of FIELDS) counts[f][t[f]] = (counts[f][t[f]] || 0) + 1;

  // Score de rarete : produit inverse des frequences. Convention usuelle
  // sur les collections generatives - plus le score est haut, plus la
  // combinaison est inhabituelle.
  const scored = traits.map((t, id) => {
    let score = 0;
    for (const f of FIELDS) score += SUPPLY / counts[f][t[f]];
    return { id, score, traits: t };
  }).sort((a, b) => b.score - a.score);

  console.log('');
  for (const f of FIELDS) {
    const rows = Object.entries(counts[f]).sort((a, b) => a[1] - b[1]);
    console.log(`  ${f}`);
    for (const [v, n] of rows) {
      const pct = (n * 100 / SUPPLY).toFixed(2);
      const bar = '#'.repeat(Math.max(1, Math.round(n / SUPPLY * 40)));
      console.log(`    ${String(v).padEnd(14)} ${String(n).padStart(5)}  ${pct.padStart(5)} %  ${bar}`);
    }
    console.log('');
  }

  console.log('  Dix pieces les plus rares (par score cumule) :');
  for (const s of scored.slice(0, 10)) {
    console.log(`    #${String(s.id).padStart(4)}  score ${s.score.toFixed(1).padStart(7)}  ` +
                `${s.traits.Hat}/${s.traits.Face}/${s.traits.Expression}/${s.traits.Backdrop}`);
  }

  writeFileSync(`${OUT}/rarity.json`, JSON.stringify({
    seedBase, isReal, supply: SUPPLY, counts,
    ranking: scored.map((s) => ({ id: s.id, score: Number(s.score.toFixed(3)) })),
  }, null, 2));
  writeFileSync(`${OUT}/traits.json`, JSON.stringify(
    traits.map((t, id) => ({ id, hash: hashes[id], ...t }))));
  console.log(`\n  Ecrit -> ${OUT}/rarity.json et traits.json`);
}

/* ------------------------------------------------------------------ *
 * Rendus
 * ------------------------------------------------------------------ */

/** Peint un token dans un canvas hors-ecran et renvoie son PNG en base64. */
async function renderOne(id, size) {
  return page.evaluate(({ h, size }) => {
    const E = window.HoodlrzEngine;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d', { alpha: false });
    const token = E.createToken(h);
    // Meme instant canonique que le mode preview de l'artefact gele :
    // sans cela deux rendus du meme token differeraient.
    E.paint(ctx, size, size, token, { t: 3.0, beat: 0, nowMs: 3000, spectrum: new Array(32).fill(0) });
    return cv.toDataURL('image/png').split(',')[1];
  }, { h: hashOf(id), size });
}

if (has('--tokens')) {
  const ids = val('--tokens', '0').split(',').map(Number);
  const size = Number(val('--size', '700'));
  for (const id of ids) {
    const b64 = await renderOne(id, size);
    writeFileSync(`${OUT}/token-${String(id).padStart(4, '0')}.png`, Buffer.from(b64, 'base64'));
    console.log(`  rendu #${id}`);
  }
}

if (has('--sheets') || has('--all')) {
  const perSide = Number(val('--grid', '20'));
  const tile = Number(val('--tile', '120'));
  const perSheet = perSide * perSide;
  const maxSheets = has('--all') ? Math.ceil(SUPPLY / perSheet) : Number(val('--sheets', '1'));

  console.log(`\nPlanches-contact  ${perSide}x${perSide} tuiles de ${tile}px`);
  const t0 = Date.now();

  for (let s = 0; s < maxSheets; s++) {
    const start = s * perSheet;
    if (start >= SUPPLY) break;
    const count = Math.min(perSheet, SUPPLY - start);
    const hashes = Array.from({ length: count }, (_, i) => hashOf(start + i));

    // Toute la planche est peinte en une seule passe dans la page : un
    // aller-retour par tuile couterait bien plus cher que le rendu.
    const b64 = await page.evaluate(({ hs, perSide, tile }) => {
      const E = window.HoodlrzEngine;
      const S = perSide * tile;
      const sheet = document.createElement('canvas');
      sheet.width = S; sheet.height = S;
      const sctx = sheet.getContext('2d', { alpha: false });
      sctx.fillStyle = '#000'; sctx.fillRect(0, 0, S, S);

      const cell = document.createElement('canvas');
      cell.width = tile; cell.height = tile;
      const cctx = cell.getContext('2d', { alpha: false });

      hs.forEach((h, i) => {
        const token = E.createToken(h);
        E.paint(cctx, tile, tile, token, { t: 3.0, beat: 0, nowMs: 3000, spectrum: new Array(32).fill(0) });
        sctx.drawImage(cell, (i % perSide) * tile, Math.floor(i / perSide) * tile);
      });
      return sheet.toDataURL('image/png').split(',')[1];
    }, { hs: hashes, perSide, tile });

    const name = `${OUT}/sheet-${String(s).padStart(2, '0')}.png`;
    writeFileSync(name, Buffer.from(b64, 'base64'));
    console.log(`  planche ${s}  tokens ${start}-${start + count - 1}  ->  ${name}`);
  }
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

await browser.close();
if (!isReal) {
  console.log('\n  Rappel : graine de travail. Relancer avec --seed <seedBase reelle>');
  console.log('  apres revealSeed() pour produire le jeu de reference definitif.\n');
}
