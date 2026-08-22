/**
 * Phase 1 - Verification de l'artefact gele.
 *
 * Quatre controles, tous bloquants avant de passer a la phase 2 :
 *   A. le moteur rend sans erreur avec un hash injecte via window.tokenData
 *   B. les traits sont exposes par l'hote HTML (ils ne l'etaient pas avant)
 *   C. les traits du moteur gele sont identiques a ceux de la source
 *   D. le mode preview donne des pixels STRICTEMENT identiques d'un run a
 *      l'autre - c'est la condition pour avoir un jeu de reference utilisable
 *
 * Usage : node scripts/kids/verify-frozen.mjs
 */

import { launchChromium } from './browser.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const FROZEN = resolve('kids/engine/frozen.html');
const SOURCE = resolve('kids/engine/source.html');
const OUTDIR = resolve('kids/build/reference');

const HASHES = [
  '0xAAAA1111', '0xBBBB2222', '0xCCCC3333', '0xD00D5555',
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
];

mkdirSync(OUTDIR, { recursive: true });

const frozenHtml = readFileSync(FROZEN, 'utf8');
let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  cond ? pass++ : fail++;
};

const browser = await launchChromium();

/** Charge le moteur gele avec un hash injecte comme le fera le contrat :
 *  substitution du marqueur, exactement ce que fait la concatenation
 *  PRE + hash + POST cote Solidity. */
async function loadInjected(hash, { preview = false, viewport = { width: 600, height: 600 } } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let doc = frozenHtml.replace('__HASH__', hash);
  if (preview) {
    // Le contrat ne met jamais preview:true ; c'est un drapeau d'outillage.
    doc = doc.replace('window.tokenData || {', 'window.tokenData || { preview: true, ');
  }
  await page.setContent(doc, { waitUntil: 'load' });
  await page.waitForTimeout(preview ? 2500 : 2000);
  return { page, errors };
}

console.log('\nA. Rendu avec hash injecte par le contrat');
for (const h of HASHES.slice(0, 3)) {
  const { page, errors } = await loadInjected(h);
  const st = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4 * 101) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { lit, hash: (window.HOODLRZ_TOKEN || {}).hash };
  });
  ok(`${h.slice(0, 10)} rend, hash lu depuis tokenData`,
     errors.length === 0 && st.lit > 100 && st.hash === h,
     `${st.lit} echantillons non noirs`);
  await page.close();
}

console.log('\nB. Traits exposes par l\'hote HTML');
{
  const { page } = await loadInjected(HASHES[0]);
  const f = await page.evaluate(() => window.HOODLRZ_FEATURES || null);
  const expected = ['Hat', 'Hat Color', 'Hood Color', 'Face', 'Hair', 'Backdrop', 'Palette', 'EQ Color', 'Expression'];
  ok('HOODLRZ_FEATURES present', !!f);
  ok('9 traits attendus', f && expected.every((k) => k in f), f ? Object.keys(f).length + ' cles' : '');
  if (f) console.log('        ' + JSON.stringify(f));
  await page.close();
}

console.log('\nC. Traits identiques entre source et moteur gele');
{
  const pSrc = await browser.newPage();
  await pSrc.goto('file://' + SOURCE);
  await pSrc.waitForTimeout(1200);

  const pFrz = await browser.newPage();
  await pFrz.setContent(frozenHtml.replace('__HASH__', '0x1'), { waitUntil: 'load' });
  await pFrz.waitForTimeout(1200);

  const extract = (page) => page.evaluate((hs) => {
    const E = window.HoodlrzEngine;
    const keep = (t) => ({
      hat: t.hatType, hatC: t.hatColor, hood: t.hoodColor, skull: t.skull,
      hair: t.hair, label: t.label, bg: t.bgStyle, tag: t.tagWord,
      bottom: t.bottomWord, mono: t.mono || null, expr: t.exprIndex,
      lineBase: t.lineBase, boilAmp: t.boilAmp,
    });
    return hs.map((h) => keep(E.createToken(h)));
  }, HASHES);

  const a = await extract(pSrc);
  const b = await extract(pFrz);
  ok('memes traits sur ' + HASHES.length + ' hashes', JSON.stringify(a) === JSON.stringify(b));
  await pSrc.close(); await pFrz.close();
}

console.log('\nD. Frame canonique reproductible au pixel');
for (const h of HASHES.slice(0, 3)) {
  const shots = [];
  for (let run = 0; run < 2; run++) {
    const { page, errors } = await loadInjected(h, { preview: true });
    const ready = await page.evaluate(() => window.__hoodlrzPreviewReady === true);
    const buf = await page.screenshot();
    shots.push(createHash('sha256').update(buf).digest('hex'));
    if (run === 0) {
      ok(`${h.slice(0, 10)} preview signale pret`, ready && errors.length === 0);
      await page.screenshot({ path: `${OUTDIR}/${h.slice(0, 10)}.png` });
    }
    await page.close();
  }
  ok(`${h.slice(0, 10)} pixels identiques sur 2 rendus`, shots[0] === shots[1], shots[0].slice(0, 16));
}

await browser.close();
console.log(`\n${pass} OK, ${fail} FAIL\n`);
process.exit(fail === 0 ? 0 : 1);
