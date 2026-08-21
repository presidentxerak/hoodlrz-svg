/**
 * Arbre de Merkle compatible avec MerkleProof d'OpenZeppelin.
 *
 * Deux conventions imposees par la bibliotheque du contrat, et dont
 * depend la validite de chaque preuve :
 *
 *   1. PAIRES TRIEES. A chaque niveau, les deux enfants sont ordonnes
 *      avant d'etre haches. Le verificateur n'a donc pas besoin de savoir
 *      si un noeud etait a gauche ou a droite - une preuve est une simple
 *      liste de freres.
 *
 *   2. FEUILLE = keccak256(abi.encodePacked(address)). Le contrat calcule
 *      exactement cela sur msg.sender ; toute autre forme d'encodage
 *      produirait des preuves refusees.
 *
 * Un niveau de taille impaire fait remonter son dernier element tel quel.
 */

import { keccak256, solidityPacked, getBytes, concat } from 'ethers';

/** Feuille d'une adresse, dans la forme attendue par le contrat. */
export function leafOf(address) {
  return keccak256(solidityPacked(['address'], [address]));
}

/** Hache une paire en la triant d'abord, comme le fait OpenZeppelin. */
function hashPair(a, b) {
  const [x, y] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(concat([getBytes(x), getBytes(y)]));
}

/**
 * Construit l'arbre a partir d'une liste d'adresses.
 * Les feuilles sont triees pour que l'arbre soit deterministe : deux
 * executions sur le meme jeu d'adresses donnent la meme racine, quel que
 * soit l'ordre d'entree. C'est ce qui rend le snapshot verifiable par un
 * tiers.
 */
export function buildTree(addresses) {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const leaves = unique.map(leafOf).sort();

  const layers = [leaves];
  let level = leaves;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);        // remontee du solitaire
      else next.push(hashPair(level[i], level[i + 1]));
    }
    layers.push(next);
    level = next;
  }

  return { root: level[0] ?? null, layers, addresses: unique };
}

/** Preuve d'appartenance d'une feuille. */
export function proofFor(tree, leaf) {
  const proof = [];
  let idx = tree.layers[0].indexOf(leaf);
  if (idx < 0) throw new Error('Feuille absente de l arbre');
  for (let l = 0; l < tree.layers.length - 1; l++) {
    const level = tree.layers[l];
    const sibling = idx ^ 1;
    if (sibling < level.length) proof.push(level[sibling]);
    idx = idx >> 1;
  }
  return proof;
}

/** Verification locale, miroir de MerkleProof.verify. */
export function verify(proof, root, leaf) {
  let computed = leaf;
  for (const p of proof) computed = hashPair(computed, p);
  return computed === root;
}
