/**
 * Rend une piece a partir du moteur STOCKE SUR LA CHAINE.
 *
 * Rien n'est lu localement : le HTML vient de engine.documentFor(hash),
 * donc des octets reellement graves dans le contrat. C'est la difference
 * avec l'apercu du site, qui sert le fichier local - ici on prouve que
 * ce qui est on-chain dessine.
 *
 * Ne revele rien de la collection : le hash est arbitraire, pas derive
 * de la graine. Celle-ci n'existe pas avant revealSeed(), et c'est
 * justement ce qui garantit que personne - createur compris - ne peut
 * choisir ses pieces.
 *
 * Usage :
 *   npm run kids:preview-chain -- --testnet
 *   npm run kids:preview-chain -- --testnet --hash 0xdeadbeef… --size 900
 *   npm run kids:preview-chain -- --testnet --count 6      (planche de 6)
 */

import './env.mjs';
import { JsonRpcProvider, Contract, keccak256, toUtf8Bytes } from 'ethers';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { launchChromium } from './browser.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d = null) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const CHAINS = {
  testnet: { id: 46630, alchemy: 'robinhood-testnet', rpc: 'https://rpc.testnet.chain.robinhood.com', envRpc: 'RH_TESTNET_RPC' },
  mainnet: { id: 4663, alchemy: 'robinhood-mainnet', rpc: 'https://rpc.mainnet.chain.robinhood.com', envRpc: 'RH_MAINNET_RPC' },
};

const which = has('--mainnet') ? 'mainnet' : 'testnet';
const CH = CHAINS[which];
const OUT = 'kids/build/preview-chain';
const SIZE = Number(val('--size', '800'));
const COUNT = Number(val('--count', '1'));

const cfg = JSON.parse(readFileSync('kids/config.json', 'utf8'));
const dep = cfg.deployments?.[CH.id];
if (!dep?.engine) {
  console.error(`\n  Aucun deploiement enregistre pour le chain ID ${CH.id}.` +
                `\n  Lancer d'abord : npm run kids:deploy -- --${which}\n`);
  process.exit(2);
}

const key = process.env.ALCHEMY_API_KEY;
const rpc = process.env[CH.envRpc] || (key ? `https://${CH.alchemy}.g.alchemy.com/v2/${key}` : CH.rpc);

const provider = new JsonRpcProvider(rpc, undefined, { staticNetwork: true });
const engine = new Contract(dep.engine, ['function documentFor(string) view returns (string)'], provider);

mkdirSync(OUT, { recursive: true });

/** Hashs a rendre. Arbitraires et affiches, pour qu'on voie bien qu'ils
 *  ne viennent pas de la collection. */
const hashes = val('--hash')
  ? [val('--hash')]
  : Array.from({ length: COUNT }, (_, i) => keccak256(toUtf8Bytes(`apercu-hors-collection-${i}`)));

console.log(`\nRendu depuis le moteur on-chain`);
console.log(`  chaine  ${CH.id}`);
console.log(`  moteur  ${dep.engine}`);
console.log(`  hashs   arbitraires, sans rapport avec la collection\n`);

const browser = await launchChromium();
const errs = [];
const seen = [];

for (const [i, h] of hashes.entries()) {
  // Un aller-retour par piece : le document fait 118 Ko, on ne le met pas
  // en cache - le but est justement d'eprouver la lecture depuis la chaine.
  const html = await engine.documentFor(h);

  // UNE PAGE NEUVE PAR PIECE. Reutiliser la meme et enchainer les
  // setContent renvoyait les traits du PREMIER hash pour tous les
  // suivants : le moteur ne se reinitialise pas comme on l'espere. Le
  // symptome etait quatre pieces identiques a partir de quatre hashs
  // differents - un bug d'outillage qui ressemblait a s'y meprendre a un
  // moteur casse.
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  page.on('pageerror', (e) => errs.push(e.message));

  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hoodlrzFontReady === true, { timeout: 20000 })
    .catch(() => console.log('  (police : delai depasse, on continue)'));
  await page.waitForTimeout(2500);

  const traits = await page.evaluate(() => window.HOODLRZ_FEATURES ?? null);
  const file = `${OUT}/onchain-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  await page.close();

  console.log(`  ${h.slice(0, 14)}…  ->  ${file}`);
  if (traits) {
    console.log(`    ${Object.entries(traits).map(([k, v]) => `${k}=${v}`).join('  ')}`);
    seen.push(JSON.stringify(traits));
  } else {
    console.log('    ATTENTION : HOODLRZ_FEATURES absent, les traits ne sont pas exposes');
  }
  writeFileSync(`${OUT}/onchain-${String(i).padStart(2, '0')}.html`, html);
}

await browser.close();

// Filet contre la panne qu'on vient de corriger. Des hashs distincts
// doivent donner des pieces distinctes ; si ce n'est pas le cas, le
// probleme est soit ici, soit - bien plus grave - dans le moteur.
if (seen.length > 1 && new Set(seen).size === 1) {
  console.error(`\n  ANOMALIE : ${seen.length} hashs distincts ont donne des traits IDENTIQUES.`);
  console.error(`  Soit l outil de rendu ne reinitialise pas le moteur entre deux pieces,`);
  console.error(`  soit la derivation des traits est cassee. Ne pas ignorer.\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Galerie vivante
 * ------------------------------------------------------------------ */
// Les planches-contact figent l'instant t = 3 s. Or ces pieces bougent :
// une collection generative animee ne se juge pas sur des captures. La
// galerie les fait tourner cote a cote, ce qui est la seule facon
// honnete de decider si l'ensemble tient.
const cards = hashes.map((h, i) => {
  const n = String(i).padStart(2, '0');
  const t = seen[i] ? JSON.parse(seen[i]) : null;
  const traits = t
    ? Object.entries(t).map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('')
    : '<span>traits non exposes</span>';
  return `<figure>
  <iframe src="onchain-${n}.html" loading="lazy" sandbox="allow-scripts"></iframe>
  <figcaption><code>${h.slice(0, 18)}…</code><div class="t">${traits}</div></figcaption>
</figure>`;
}).join('\n');

writeFileSync(`${OUT}/index.html`, `<!doctype html>
<meta charset="utf-8">
<title>Hoodlrz Kids — rendu on-chain</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:28px; background:#0a0a0a; color:#eee;
         font:14px/1.5 ui-sans-serif,system-ui,sans-serif }
  h1 { font-size:18px; letter-spacing:.14em; text-transform:uppercase; margin:0 0 4px }
  p.sub { color:#888; margin:0 0 24px; font-size:12px }
  .grid { display:grid; gap:22px; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)) }
  figure { margin:0 }
  iframe { width:100%; aspect-ratio:1; border:1px solid #262626; background:#000; display:block }
  figcaption { margin-top:8px }
  code { color:#666; font-size:11px }
  .t { display:flex; flex-wrap:wrap; gap:4px 10px; margin-top:6px; font-size:11px; color:#999 }
  .t b { color:#555; font-weight:500 }
</style>
<h1>Hoodlrz Kids</h1>
<p class="sub">
  Rendu par le moteur stocke sur la chaine ${CH.id} — contrat ${dep.engine}.<br>
  Hashs arbitraires, sans rapport avec la collection : la graine n'existe pas encore.
</p>
<div class="grid">
${cards}
</div>
`);

console.log(`\n  ${errs.length ? 'Erreurs de page : ' + errs.slice(0, 3).join(' | ') : 'Aucune erreur de rendu.'}`);
if (seen.length > 1) console.log(`  ${new Set(seen).size} jeux de traits distincts sur ${seen.length} pieces.`);
console.log(`\n  Galerie animee :  open ${OUT}/index.html`);
console.log(`  PNG et HTML individuels dans ${OUT}/\n`);
