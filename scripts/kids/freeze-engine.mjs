/**
 * Phase 1 - Gel du moteur Hoodlrz Kids.
 *
 * Prend kids/engine/source.html (le prototype d'exposition) et produit
 * kids/engine/frozen.html : l'artefact destine a partir on-chain et a ne
 * plus jamais bouger.
 *
 * Quatre transformations, toutes reproductibles :
 *
 *   1. INJECTION DU HASH
 *      On insere en tete de <head> un script porteur d'un marqueur __HASH__.
 *      Le contrat ne fait AUCUNE recherche/remplacement de chaine (couteux en
 *      gas) : le blob est stocke coupe en deux au niveau du marqueur, et le
 *      tokenURI se reconstitue par simple concatenation PRE + hash + POST.
 *
 *   2. TRAITS EXPOSES
 *      L'hote HTML ne renseignait pas HOODLRZ_FEATURES (seul l'hote p5 le
 *      faisait). Sans traits, pas d'onglet Properties ni de filtres de rarete
 *      sur les marketplaces.
 *
 *   3. FRAME CANONIQUE
 *      La piece est animee : deux captures different au pixel. Le mode preview
 *      peint UNE frame a un instant fixe, spectre audio a zero, puis s'arrete.
 *      Rendu reproductible, indispensable pour le jeu de reference.
 *
 *   4. AUDIO SOUS GESTE UTILISATEUR
 *      Deja le cas dans la source (audio.start() au tap). On verrouille en
 *      s'assurant qu'aucun chemin ne demarre l'audio sans interaction : les
 *      iframes de marketplace bloquent l'autoplay et lever une exception
 *      non capturee casserait le rendu.
 *
 * Usage : node scripts/kids/freeze-engine.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC = 'kids/engine/source.html';
const OUT = 'kids/engine/frozen.html';

/** Marqueur remplace par le hash reel. Doit etre unique dans tout le fichier. */
const HASH_MARKER = '__HASH__';

/** Instant, en secondes, de la frame canonique. Choisi apres le demarrage du
 *  boil pour que le trait ait sa vibration caracteristique, mais assez tot
 *  pour rester dans la premiere boucle d'animation. */
const PREVIEW_T = 3.0;

let html = readFileSync(SRC, 'utf8');
const before = html.length;

/* ------------------------------------------------------------------ *
 * 1. Point d'injection du hash, en tout premier dans <head>.
 * ------------------------------------------------------------------ */
if (html.includes(HASH_MARKER)) {
  throw new Error(`Le marqueur ${HASH_MARKER} est deja present dans la source`);
}
const headOpen = '<head>';
const headIdx = html.indexOf(headOpen);
if (headIdx < 0) throw new Error('<head> introuvable');

const injection =
  '\n<script id="hoodlrz-token">/* Renseigne par le contrat. Le tokenURI est' +
  ' reconstitue par concatenation autour du hash, sans remplacement de chaine. */\n' +
  `window.tokenData = window.tokenData || { hash: "${HASH_MARKER}" };\n</script>`;

html = html.slice(0, headIdx + headOpen.length) + injection + html.slice(headIdx + headOpen.length);

/* ------------------------------------------------------------------ *
 * 2-4. Reecriture complete du script hote.
 *      On remplace le bloc existant plutot que de le rustiner : l'hote fait
 *      dix lignes et doit etre lisible par quiconque auditera l'artefact.
 * ------------------------------------------------------------------ */
const HOST_START = "<script>\n(function () {\n  'use strict';\n  var Eng = window.HoodlrzEngine, Aud = window.HoodlrzAudio;";
const hostIdx = html.indexOf(HOST_START);
if (hostIdx < 0) throw new Error('Script hote introuvable - la source a change');
const hostEnd = html.indexOf('</script>', hostIdx);
if (hostEnd < 0) throw new Error('Fin du script hote introuvable');

const NEW_HOST = `<script>
(function () {
  'use strict';
  var Eng = window.HoodlrzEngine, Aud = window.HoodlrzAudio;

  /* --- Source du hash, par ordre de priorite ---------------------------
     1. window.tokenData.hash   : injecte par le contrat (cas nominal)
     2. ?hash= / ?seed=         : tests locaux et jeu de reference
     3. aleatoire               : ouverture du fichier a la main
     Le marqueur non substitue est traite comme absent, ce qui permet
     d'ouvrir l'artefact gele directement sans passer par la chaine.        */
  var qs = new URLSearchParams(location.search);
  function randomHash(){ var s='0x'; for (var i=0;i<40;i++) s+='0123456789abcdef'[(Math.random()*16)|0]; return s; }
  function resolveHash(){
    try {
      var td = window.tokenData;
      if (td && typeof td.hash === 'string' && td.hash && td.hash.indexOf('__') !== 0) return td.hash;
    } catch (e) {}
    return qs.get('hash') || qs.get('seed') || randomHash();
  }

  var HASH  = resolveHash();
  var token = Eng.createToken(HASH);
  var audio = new Aud(HASH);

  /* --- Traits exposes ---------------------------------------------------
     Meme forme que l'hote p5, pour que les deux chemins de rendu decrivent
     la meme piece. Sert aussi de reference au portage Solidity : c'est
     cette structure que le contrat doit reproduire a l'identique.          */
  window.HOODLRZ_FEATURES = {
    'Hat':        token.hatType,
    'Hat Color':  token.hatColor,
    'Hood Color': token.hoodColor,
    'Face':       token.skull ? 'Skull' : 'Classic',
    'Hair':       token.hair,
    'Backdrop':   token.bgStyle,
    'Palette':    token.mono ? 'Mono' : 'Multi',
    'EQ Color':   token.eqColor,
    'Expression': (Eng.EXPRESSIONS[token.exprIndex] || {}).name || ''
  };
  window.HOODLRZ_TOKEN = token;   // audit / debug

  var cv  = document.getElementById('c');
  var ctx = cv.getContext('2d', { alpha: false });
  var W = 0, H = 0, t0 = performance.now();

  /* DPR gere ici : backing = css*dpr, contexte NON scale (moteur en px physiques). */
  function resize(){
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    var cw = window.innerWidth, ch = window.innerHeight;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    W = cv.width; H = cv.height;
  }
  window.addEventListener('resize', resize); resize();

  /* --- Frame canonique --------------------------------------------------
     La piece est animee : sans instant fixe, deux captures du meme token
     different. Le mode preview peint une seule frame a t = ${PREVIEW_T}s,
     spectre a zero, sans jamais toucher au moteur audio.                   */
  var PREVIEW = qs.get('preview') === '1' ||
                (function(){ try { return !!(window.tokenData && window.tokenData.preview); } catch(e){ return false; } })();
  var SILENT = new Array(32).fill(0);

  function paintCanonical(){
    Eng.paint(ctx, W, H, token, { t: ${PREVIEW_T}, beat: 0, nowMs: ${PREVIEW_T} * 1000, spectrum: SILENT });
    window.__hoodlrzPreviewReady = true;   // signal de capture pour l'outillage
  }

  /* --- Interaction ------------------------------------------------------
     L'audio ne demarre QUE sur geste utilisateur : les iframes de
     marketplace bloquent l'autoplay, et une exception non capturee ici
     casserait la boucle de rendu.                                          */
  function tap(e){
    e.preventDefault();
    try { audio.start(); } catch (err) {}
    Eng.advance(token, performance.now());
    try { audio.blip(); } catch (err) {}
  }
  if (!PREVIEW) {
    cv.addEventListener('pointerdown', tap, { passive: false });
    window.addEventListener('keydown', function (e){
      if (e.key === 'm' || e.key === 'M') { try { audio.setMuted(!audio.muted); } catch (err) {} }
    });
  }

  __whenFontReady(function(){
    if (PREVIEW) { paintCanonical(); return; }
    (function frame(){
      var now = performance.now(), t = (now - t0) / 1000;
      var spec;
      try { spec = audio.getSpectrum(32); } catch (err) { spec = SILENT; }
      Eng.paint(ctx, W, H, token, { t: t, beat: audio.beat, nowMs: now, spectrum: spec });
      requestAnimationFrame(frame);
    })();
  });
})();`;

html = html.slice(0, hostIdx) + NEW_HOST + html.slice(hostEnd);

/* ------------------------------------------------------------------ *
 * Sortie + empreintes.
 * ------------------------------------------------------------------ */
writeFileSync(OUT, html);

/* Tout ce qui suit raisonne en OCTETS, pas en caracteres.
 *
 * Le fichier contient des caracteres non-ASCII (des `e` accentues) qui pesent
 * deux octets en UTF-8. Decouper la chaine JavaScript donnerait des morceaux
 * dont la taille reelle depasse celle annoncee - et, avec des caracteres hors
 * du plan multilingue de base, pourrait couper une paire de substitution en
 * deux et corrompre le fichier. La chaine ne stocke que des octets : on
 * travaille donc directement en octets. */
const buf = Buffer.from(html, 'utf8');
const sha = createHash('sha256').update(buf).digest('hex');

const markerBuf = Buffer.from(HASH_MARKER, 'utf8');
const markerAt = buf.indexOf(markerBuf);
if (markerAt < 0) throw new Error('Marqueur perdu pendant la transformation');
if (buf.indexOf(markerBuf, markerAt + 1) !== -1) throw new Error('Marqueur present plusieurs fois');

const pre = buf.subarray(0, markerAt);
const post = buf.subarray(markerAt + markerBuf.length);

/* Decoupage en chunks SSTORE2.
 *
 * Robinhood Chain autorise 96 Ko de bytecode, mais on coupe a 24 Ko :
 * c'est la limite EIP-170 d'Ethereum et de toutes les autres EVM. Le meme
 * bytecode se redeploie alors a l'identique partout, ce qui est exactement
 * ce que le plan de repli exige. Le cout total en gas est inchange (on paie
 * a l'octet), on ajoute seulement quelques transactions de deploiement.  */
const CHUNK_MAX = 24_000;   // marge sous les 24 576 o d'EIP-170

/** Decoupe un Buffer en morceaux d'au plus `size` OCTETS. */
function chunk(b, size) {
  const out = [];
  for (let i = 0; i < b.length; i += size) out.push(b.subarray(i, i + size));
  return out;
}

const preChunks = chunk(pre, CHUNK_MAX);
const postChunks = chunk(post, CHUNK_MAX);

// Les morceaux sont serialises en hexadecimal : c'est ce que le contrat
// attend en calldata, et cela evite tout aller-retour par une chaine
// susceptible de reinterpreter l'encodage.
const toHex = (b) => '0x' + b.toString('hex');

const storedBytes = pre.length + post.length;
const manifest = {
  sha256: sha,
  frozenBytes: buf.length,        // artefact complet, marqueur compris
  storedBytes,                    // ce qui part on-chain, hors hash injecte
  markerBytes: markerBuf.length,
  marker: HASH_MARKER,
  previewT: PREVIEW_T,
  chunkMax: CHUNK_MAX,
  pre: preChunks.map((c) => c.length),
  post: postChunks.map((c) => c.length),
};

/* Copie servie par le site pour l'apercu de la page de mint. C'est le
 * MEME fichier que celui stocke on-chain : le visiteur voit ce qu'il
 * recevra, pas une maquette. Le marqueur reste en place - l'hote sait
 * le reconnaitre comme non substitue et retombe sur ?hash=. */
mkdirSync('public/kids', { recursive: true });
writeFileSync('public/kids/engine.html', buf);

writeFileSync('kids/build/engine-pre.json', JSON.stringify(preChunks.map(toHex)));
writeFileSync('kids/build/engine-post.json', JSON.stringify(postChunks.map(toHex)));
writeFileSync('kids/build/engine-manifest.json', JSON.stringify(manifest, null, 2));
writeFileSync('kids/build/engine.sha256', sha + '  frozen.html\n');

const KB = (n) => (n / 1024).toFixed(1) + ' Ko';
const biggest = Math.max(...preChunks.map((c) => c.length), ...postChunks.map((c) => c.length));

console.log('Moteur gele -> ' + OUT);
console.log('  source        ' + before.toLocaleString('fr') + ' caracteres');
console.log('  gele          ' + buf.length.toLocaleString('fr') + ' o   (' + KB(buf.length) + ')');
console.log('  dont non-ASCII ' + (buf.length - html.length) + ' o de surcout UTF-8');
console.log('  sha256        ' + sha);
console.log('');
console.log('  stocke        ' + storedBytes.toLocaleString('fr') + ' o  (marqueur exclu)');
console.log('  chunks PRE    ' + preChunks.length + '  (' + preChunks.map((c) => c.length).join(', ') + ' o)');
console.log('  chunks POST   ' + postChunks.length + '  (' + postChunks.map((c) => c.length).join(' + ') + ' o)');
console.log('  plus gros     ' + biggest.toLocaleString('fr') + ' o  ' +
            (biggest < 24576 ? 'OK sous EIP-170' : 'DEPASSE EIP-170'));
console.log('  gas stockage  ~' + ((storedBytes * 200) / 1e6).toFixed(1) + ' M  (200 gas/o)');
