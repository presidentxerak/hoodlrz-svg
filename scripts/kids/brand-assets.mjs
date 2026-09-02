/**
 * Visuels de marque pour OpenSea et la promotion.
 *
 * Tout est dessine par le MOTEUR de la collection, pas illustre a cote :
 * la banniere d'une collection generative doit etre faite de ce qu'elle
 * vend, sinon elle promet autre chose que ce qu'on recevra.
 *
 * Les pieces sont tirees de hashs FIGES, ecrits ici. Deux consequences
 * voulues : les visuels sont reproductibles a l'identique, et ils ne
 * revelent rien de la collection - ces hashs ne sont pas derives de la
 * graine, qui n'existera qu'apres revealSeed().
 *
 * Formats produits (specifications OpenSea) :
 *   icon      1000x1000  photo de profil, affichee en cercle
 *   banner    1400x400   banniere de collection
 *   featured   600x400   vignette de mise en avant
 *   social    1200x1200  post carre
 *   header    1500x500   banniere X / Twitter
 *
 * Usage : npm run kids:brand
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { launchChromium } from './browser.mjs';

const OUT = 'kids/brand';
mkdirSync(OUT, { recursive: true });

const frozen = readFileSync('kids/engine/frozen.html', 'utf8');
const fontB64 = readFileSync('public/fonts/hoodlrz-font.ttf').toString('base64');

/**
 * Hashs choisis a la main parmi des tirages du moteur, pour leur lisibilite
 * en petit et la variete des chapeaux, visages et fonds. Figes : ces
 * visuels doivent etre reproductibles.
 */
const HASHES = [
  '0x2b0565f54830c4ff9d1c17e5eddc1a3b8cd77e3b3a97dcbe1c1cbfa2a0d21a37',
  '0xcec6b439f1f05cabf1d5e3f0e0bbb6ba53c9f30c1a4b5ee3fd0bb8a1e2f00c11',
  '0xe588e6f2a42be2b1c86a0eb1f2b1c2e3f4a5b6c7d8e9f00112233445566778899',
  '0x0c79f13992e3ad3b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f00112233445566',
  '0x7de70466bd62aa11223344556677889900aabbccddeeff00112233445566778a',
  '0x6939bd4f8db4cc00112233445566778899aabbccddeeff00112233445566778b',
];

const browser = await launchChromium();

/** Rend une piece a la taille demandee et renvoie son PNG en base64. */
async function piece(hash, size) {
  // Une page neuve par piece : reutiliser la meme renvoie les traits du
  // premier hash pour tous les suivants.
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(frozen.replace('__HASH__', hash), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hoodlrzFontReady === true, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(2600);
  const b64 = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c.toDataURL('image/png').split(',')[1];
  });
  const traits = await page.evaluate(() => window.HOODLRZ_FEATURES ?? null);
  await page.close();
  return { b64, traits };
}

console.log('\nVisuels de marque Hoodlrz Gen Kids\n');
console.log('Rendu des pieces…');
const tiles = [];
for (const h of HASHES) {
  const { b64, traits } = await piece(h, 900);
  tiles.push(b64);
  console.log(`  ${h.slice(0, 12)}…  ${traits ? `${traits.Hat}/${traits.Face}/${traits.Backdrop}` : '?'}`);
}

/**
 * Compose une image dans une page hors-ecran.
 *
 * Le montage se fait en HTML plutot qu'en canvas pur : la typographie de
 * marque est une police TTF, et la laisser au navigateur evite de
 * reimplementer le rendu de texte.
 */
async function compose(name, width, height, html) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  @font-face {
    font-family: "hoodlrz";
    src: url("data:font/ttf;base64,${fontB64}") format("truetype");
  }
  * { margin:0; padding:0; box-sizing:border-box }
  html, body { width:${width}px; height:${height}px; overflow:hidden; background:#000 }
  body { position:relative; font-family:"hoodlrz", sans-serif; color:#fff }
  .tiles { position:absolute; inset:0; display:flex }
  /* Chaque tuile est une fenetre sur la piece, pas la piece entiere : le
     moteur ecrit une punchline en haut du cadre, et cinq punchlines
     alignees sous un titre font une banniere illisible. On agrandit et on
     remonte l'image pour sortir cette bande du champ et centrer le
     visage. */
  /* Descendant et non enfant direct : la tuile carree imbrique les
     pieces dans des rangees, et viser le seul enfant direct les laissait
     echapper - une seule piece couvrait alors tout le cadre. */
  .tiles span { flex:1; min-width:0; height:100%; overflow:hidden; display:block; position:relative }
  .tiles > div { flex:1; min-height:0; display:flex; overflow:hidden }
  .tiles img { position:absolute; left:50%; top:50%; width:auto; height:100%;
               min-width:100%; object-fit:cover }
  .veil { position:absolute; inset:0; background:rgba(0,0,0,.42) }
  .scrim { position:absolute; inset:0 }
  .mid { position:absolute; inset:0; display:flex; flex-direction:column;
         align-items:center; justify-content:center; text-align:center }
  .sub { font-family:ui-sans-serif,system-ui,sans-serif; letter-spacing:.24em;
         text-transform:uppercase; color:rgba(255,255,255,.72) }
  .chip { font-family:ui-sans-serif,system-ui,sans-serif; text-transform:uppercase;
          letter-spacing:.18em; color:#c6f24e; border:1px solid rgba(198,242,78,.45);
          background:rgba(198,242,78,.12) }
</style>
${html}`, { waitUntil: 'load' });
  // Laisser la police se charger : sans ca le titre sort en police
  // systeme, ce qui se voit immediatement.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  await page.close();
  const px = await sizeOf(file);
  console.log(`  ${name.padEnd(10)} ${String(width).padStart(4)}x${String(height).padEnd(4)}  ${px}`);
  return file;
}

async function sizeOf(file) {
  const b = readFileSync(file);
  return `${(b.length / 1024).toFixed(0)} Ko`;
}

/**
 * Une tuile.
 * @param i      index du hash
 * @param scale  agrandissement, pour couvrir apres decalage
 * @param y      decalage vertical en % ; negatif = remonte l'image, ce qui
 *               fait sortir la punchline par le haut
 */
const img = (i, scale = 1.28, y = -7) =>
  `<span><img style="transform:translate(-50%,-50%) scale(${scale}) translateY(${y}%)"
     src="data:image/png;base64,${tiles[i]}"></span>`;
/**
 * Bande sombre horizontale derriere le bloc de texte.
 *
 * Une ombre elliptique assombrissait le centre de chaque visage tout en
 * laissant le sous-titre courir sur les yeux et les bouches. Une bande
 * fait l'inverse : elle degage la ligne de texte sur toute la largeur et
 * garde les chapeaux et les epaules en clair, la ou se lit la variete de
 * la collection.
 *
 * @param haut  debut de la bande, en % de la hauteur
 * @param bas   fin de la bande
 * @param a     opacite au coeur de la bande
 */
const band = (haut, bas, a) =>
  `<div class="scrim" style="background:linear-gradient(to bottom,` +
  ` rgba(0,0,0,0) 0%, rgba(0,0,0,${a}) ${haut}%, rgba(0,0,0,${a}) ${bas}%,` +
  ` rgba(0,0,0,0) 100%)"></div>`;

console.log('\nComposition…');

/* ---- Icone de profil : une seule piece, plein cadre ---------------- */
// Affichee en cercle et souvent en 32 px dans les listes. Deux
// contraintes en decoulent : le visage doit occuper le centre du cadre,
// puisque les coins seront rognes par le cercle, et la punchline doit
// sortir du champ - un mot coupe en deux par le cercle fait sale, et le
// texte qui survit devient illisible a cette taille.
await compose('icon', 1000, 1000, `
<div class="tiles">${img(3, 1.5, -9)}</div>`);

/* ---- Banniere de collection ---------------------------------------- */
await compose('banner', 1400, 400, `
<div class="tiles">${img(0)}${img(1)}${img(2)}${img(4)}${img(5)}</div>
<div class="veil" style="background:rgba(0,0,0,.30)"></div>
${band(26, 76, .84)}
<div class="mid">
  <div style="font-size:74px; letter-spacing:.06em; line-height:1">HOODLRZ GEN KIDS</div>
  <div class="sub" style="font-size:15px; margin-top:14px">3,333 pieces · fully on-chain · free mint</div>
  <div class="chip" style="font-size:12px; margin-top:16px; padding:6px 14px">Robinhood Chain</div>
</div>`);

/* ---- Vignette de mise en avant -------------------------------------- */
await compose('featured', 600, 400, `
<div class="tiles">${img(1)}${img(3)}</div>
<div class="veil" style="background:rgba(0,0,0,.30)"></div>
${band(22, 80, .86)}
<div class="mid">
  <div style="font-size:44px; letter-spacing:.05em; line-height:1.05">HOODLRZ<br>GEN KIDS</div>
  <div class="sub" style="font-size:11px; margin-top:12px">3,333 · free mint</div>
</div>`);

/* ---- Post carre ----------------------------------------------------- */
await compose('social', 1200, 1200, `
<div class="tiles" style="flex-direction:column">
  <div style="flex:1; display:flex">${img(0)}${img(2)}</div>
  <div style="flex:1; display:flex">${img(4)}${img(5)}</div>
</div>
<div class="veil" style="background:rgba(0,0,0,.30)"></div>
${band(28, 74, .84)}
<div class="mid">
  <div style="font-size:92px; letter-spacing:.05em; line-height:1.02">HOODLRZ<br>GEN KIDS</div>
  <div class="sub" style="font-size:17px; margin-top:22px">The engine lives on-chain</div>
  <div class="chip" style="font-size:13px; margin-top:22px; padding:8px 18px">3,333 · free mint · Robinhood Chain</div>
</div>`);

/* ---- Banniere X / Twitter ------------------------------------------- */
await compose('header', 1500, 500, `
<div class="tiles">${img(5)}${img(0)}${img(3)}${img(1)}${img(2)}</div>
<div class="veil" style="background:rgba(0,0,0,.30)"></div>
${band(28, 74, .84)}
<div class="mid">
  <div style="font-size:88px; letter-spacing:.06em; line-height:1">HOODLRZ GEN KIDS</div>
  <div class="sub" style="font-size:16px; margin-top:16px">3,333 generative pieces · the renderer lives in the contract</div>
</div>`);

await browser.close();

console.log(`
  Ecrit dans ${OUT}/

  OpenSea      icon.png     photo de profil    1000x1000
               banner.png   banniere           1400x400
               featured.png mise en avant       600x400
  Promo        social.png   post carre         1200x1200
               header.png   banniere X         1500x500

  Toutes les pieces viennent du moteur, a partir de hashs figes : ces
  visuels sont reproductibles et ne revelent rien de la collection.
`);
