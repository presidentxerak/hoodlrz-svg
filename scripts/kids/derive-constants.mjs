/**
 * Phase 2 - Extraction des constantes du moteur vers Solidity.
 *
 * Deux problemes que ce script resout, et qui sont la principale source
 * d'erreur du portage :
 *
 * 1. LES SEUILS DE PROBABILITE
 *    Le moteur ecrit `rng() < 0.3`, ou rng() vaut raw / 2^32 avec raw un
 *    uint32. Solidity n'a pas de flottants. On ne peut PAS ecrire
 *    `raw < 0.3 * 2^32` a la main : 0.3 n'est pas representable en binaire,
 *    et l'arrondi decide du sort des tokens qui tombent sur la frontiere.
 *
 *    On determine donc le seuil entier exact par recherche dichotomique, en
 *    utilisant la comparaison JavaScript elle-meme comme oracle. Le seuil
 *    emis verifie, par construction : raw < SEUIL  <=>  raw/2^32 < 0.3
 *    dans le moteur d'origine.
 *
 * 2. LES TABLEAUX
 *    Recopier a la main dix tableaux de couleurs, c'est dix occasions de se
 *    tromper. On les lit dans le source et on les emet tels quels.
 *
 * Sortie : contracts/kids/HoodlrzKidsConstants.sol
 *
 * Usage : node scripts/kids/derive-constants.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'kids/engine/source.html';
const OUT = 'contracts/kids/HoodlrzKidsConstants.sol';
const src = readFileSync(SRC, 'utf8');

/* ------------------------------------------------------------------ *
 * 1. Seuils exacts.
 * ------------------------------------------------------------------ */
const TWO32 = 4294967296;

/** Plus grand entier raw tel que raw / 2^32 < p, en interrogeant JS. */
function thresholdFor(p) {
  let lo = -1, hi = TWO32;            // lo satisfait toujours, hi jamais
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid / TWO32 < p) lo = mid; else hi = mid;
  }
  // lo = dernier raw qui satisfait  =>  le test devient  raw < lo + 1
  return lo + 1;
}

// Toutes les probabilites litterales de createToken, dans l'ordre du source.
const PROBS = [0.3, 0.6, 0.78, 0.92, 0.26, 0.7, 0.22, 0.34, 0.28, 0.24, 0.5, 0.9, 0.55];
const thresholds = new Map();
for (const p of PROBS) {
  const t = thresholdFor(p);
  thresholds.set(p, t);
  // Verification croisee : les deux entiers de part et d'autre du seuil
  // doivent se comporter comme attendu dans le moteur d'origine.
  if (!((t - 1) / TWO32 < p) || (t / TWO32 < p)) {
    throw new Error(`Seuil incoherent pour p=${p}`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. Tableaux, lus dans le source.
 * ------------------------------------------------------------------ */
function readArray(name) {
  const re = new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`);
  const m = src.match(re);
  if (!m) throw new Error(`Tableau ${name} introuvable dans le source`);
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter((s) => s.length);
}

/** Tableaux passes en litteral directement dans pick(), reperes par leur
 *  premier element pour eviter toute ambiguite. */
function readInlineArray(marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`Litteral ${marker} introuvable`);
  const open = src.lastIndexOf('[', i);
  const close = src.indexOf(']', i);
  return src.slice(open + 1, close).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
}

const A = {
  FACE_COLORS:  readArray('FACE_COLORS'),
  HOOD_COLORS:  readArray('HOOD_COLORS'),
  HAT_COLORS:   readArray('HAT_COLORS'),
  HAT_TYPES:    readArray('HAT_TYPES'),
  LABELS:       readArray('LABELS'),
  HAIR_STYLES:  readArray('HAIR_STYLES'),
  NEON:         readArray('NEON'),
  QUOTE_COLORS: readArray('QUOTE_COLORS'),
  BOTTOM_WORDS: readArray('BOTTOM_WORDS'),
  PENDANTS:     readInlineArray("'$', 'coin', 'skull', 'key'"),
  BG_STYLES:    readInlineArray("'bricks', 'city', 'miami'"),
  TAG_WORDS:    readInlineArray("'HOODLRZ', 'BURN', 'MINT', 'FORK'"),
};

// EXPRESSIONS est un tableau d'objets : on ne veut que les noms, dans l'ordre.
A.EXPRESSIONS = [...src.matchAll(/\{\s*name:\s*'([A-Z]+)'/g)].map((m) => m[1]);

console.log('Tableaux extraits du source :');
for (const [k, v] of Object.entries(A)) {
  console.log(`  ${k.padEnd(13)} ${String(v.length).padStart(2)}  ${v.slice(0, 4).join(' ')}${v.length > 4 ? ' ...' : ''}`);
}
console.log('\nSeuils entiers exacts (raw < seuil) :');
for (const [p, t] of thresholds) console.log(`  p = ${String(p).padEnd(5)} ->  ${t}`);

/* ------------------------------------------------------------------ *
 * 3. Emission du Solidity.
 * ------------------------------------------------------------------ */
const solArray = (name, arr) =>
  `    function ${name}(uint256 i) internal pure returns (string memory) {\n` +
  `        string[${arr.length}] memory a = [\n` +
  arr.map((v) => `            ${JSON.stringify(v)}`).join(',\n') +
  `\n        ];\n        return a[i];\n    }\n`;

const sol = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title  HoodlrzKidsConstants
 * @notice Tableaux et seuils du moteur generatif Hoodlrz Kids.
 *
 * @dev    GENERE AUTOMATIQUEMENT par scripts/kids/derive-constants.mjs
 *         a partir de kids/engine/source.html. NE PAS EDITER A LA MAIN :
 *         toute divergence avec le moteur JS produit des attributs qui
 *         contredisent l'image affichee.
 *
 *         Les seuils SEUIL_* traduisent les comparaisons flottantes du
 *         moteur (\`rng() < 0.3\`) en comparaisons entieres exactes. Ils ont
 *         ete determines par dichotomie contre le comportement reel de
 *         JavaScript, pas calcules a la main : 0.3 n'etant pas representable
 *         en binaire, un arrondi approximatif changerait le trait des tokens
 *         situes sur la frontiere.
 */
library HoodlrzKidsConstants {
    /* ---------------------------------------------------------------- *
     *  Seuils de probabilite   (comparaison : raw < SEUIL)
     * ---------------------------------------------------------------- */
${[...thresholds].map(([p, t]) =>
  `    uint32 internal constant SEUIL_${String(p).replace('0.', 'P')} = ${t};`
).join('\n')}

    /* ---------------------------------------------------------------- *
     *  Longueurs des tableaux
     * ---------------------------------------------------------------- */
${Object.entries(A).map(([k, v]) =>
  `    uint256 internal constant N_${k} = ${v.length};`
).join('\n')}

    /* ---------------------------------------------------------------- *
     *  Tableaux
     * ---------------------------------------------------------------- */
${Object.entries(A).map(([k, v]) => solArray(k.toLowerCase(), v)).join('\n')}}
`;

writeFileSync(OUT, sol);
console.log(`\nEcrit -> ${OUT}  (${sol.length.toLocaleString('fr')} o)`);

/* Meme donnee en JSON : le test differentiel s'en sert pour resoudre les
 * index renvoyes par Solidity vers les valeurs affichees. Une seule source
 * de verite pour les deux cotes du test. */
const JSON_OUT = 'kids/build/constants.json';
writeFileSync(JSON_OUT, JSON.stringify({
  arrays: A,
  thresholds: Object.fromEntries([...thresholds]),
}, null, 2));
console.log(`Ecrit -> ${JSON_OUT}`);
