/**
 * Verifie que l'arbre de Merkle produit cote outillage est accepte par
 * MerkleProof d'OpenZeppelin, tel qu'utilise dans le contrat.
 *
 * Une allowlist dont les preuves sont refusees le jour du mint est une
 * panne totale et non rattrapable dans la fenetre d'une heure. On teste
 * donc contre le VRAI contrat, pas contre une reimplementation.
 *
 * Les tailles testees couvrent les cas ou l'implementation derape en
 * general : arbre a un seul element, niveaux impairs (remontee du
 * solitaire), et la taille reelle attendue pour Hoodlrz.
 *
 * Usage : node test/kids/merkle.test.mjs
 */

import { createChain, ACCOUNTS } from '../../scripts/kids/chain.mjs';
import { buildTree, proofFor, leafOf, verify } from '../../scripts/kids/merkle.mjs';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};

/** Adresses deterministes, pour que le test soit rejouable. */
const addrs = (n, prefix = 1) =>
  Array.from({ length: n }, (_, i) =>
    '0x' + (prefix * 1_000_000 + i).toString(16).padStart(40, '0'));

console.log('\nCompatibilite Merkle avec MerkleProof (OpenZeppelin)');

const chain = await createChain();
const engine = await chain.deploy('contracts/kids/HoodlrzKidsEngine.sol', 'HoodlrzKidsEngine');
const renderer = await chain.deploy(
  'contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer', [engine.address.toString()]);

console.log('\n1. Verification locale sur differentes tailles');
for (const n of [1, 2, 3, 5, 8, 117, 256, 999]) {
  const list = addrs(n, n);
  const tree = buildTree(list);
  const allValid = list.every((a) => verify(proofFor(tree, leafOf(a)), tree.root, leafOf(a)));
  ok(`${String(n).padStart(3)} adresses`, allValid, `racine ${tree.root.slice(0, 12)}...`);
}

console.log('\n2. Le contrat accepte-t-il ces preuves ?');
{
  // Arbre contenant les comptes de test plus un remplissage impair, pour
  // exercer la remontee du solitaire sur plusieurs niveaux.
  const list = [
    ACCOUNTS.ALICE.toString(),
    ACCOUNTS.BOB.toString(),
    ...addrs(114, 7),
  ];
  const tree = buildTree(list);
  ok('arbre de 116 adresses', tree.addresses.length === 116);

  const nft = await chain.deploy(
    'contracts/kids/HoodlrzKids.sol', 'HoodlrzKids',
    [renderer.address.toString(), ACCOUNTS.DEPLOYER.toString()]);

  await nft.call('setAllowlistRoot', [tree.root]);
  for (let i = 0; i < 3; i++) await nft.call('mintReserve', [ACCOUNTS.DEPLOYER.toString(), 100]);

  const T0 = Number(chain.now);
  await nft.call('setPhases', [T0 + 100, T0 + 4000, T0 + 8000]);
  chain.warpTo(T0 + 200);

  // Alice est dans l'arbre : sa preuve doit passer.
  const pAlice = proofFor(tree, leafOf(ACCOUNTS.ALICE.toString()));
  await nft.call('mintAllowlist', [3, pAlice], { from: ACCOUNTS.ALICE });
  ok('preuve acceptee par le contrat',
     (await nft.call('balanceOf', [ACCOUNTS.ALICE.toString()])) === 3n,
     `profondeur ${pAlice.length}`);

  // Bob aussi, avec SA preuve.
  const pBob = proofFor(tree, leafOf(ACCOUNTS.BOB.toString()));
  await nft.call('mintAllowlist', [2, pBob], { from: ACCOUNTS.BOB });
  ok('seconde preuve acceptee', (await nft.call('balanceOf', [ACCOUNTS.BOB.toString()])) === 2n);

  // Carol n'est pas dans l'arbre : aucune preuve ne doit marcher.
  ok('adresse hors arbre rejetee',
     (await nft.expectRevert('mintAllowlist', [1, pAlice], { from: ACCOUNTS.CAROL })) === 'BadProof');

  // Preuve tronquee : rejetee aussi.
  ok('preuve tronquee rejetee',
     (await nft.expectRevert('mintAllowlist', [1, pBob.slice(0, -1)], { from: ACCOUNTS.BOB })) === 'BadProof');

  // Preuve vide : rejetee.
  ok('preuve vide rejetee',
     (await nft.expectRevert('mintAllowlist', [1, []], { from: ACCOUNTS.BOB })) === 'BadProof');
}

console.log('\n3. Determinisme');
{
  const list = addrs(50, 3);
  const a = buildTree(list).root;
  const b = buildTree([...list].reverse()).root;
  const c = buildTree(list.map((x) => x.toUpperCase().replace('0X', '0x'))).root;
  ok('ordre d entree sans effet', a === b);
  ok('casse sans effet', a === c);
  const withDupes = buildTree([...list, list[0], list[1]]);
  ok('doublons ecartes', withDupes.root === a, `${withDupes.addresses.length} uniques`);
}

console.log(`\n${pass} OK, ${fail} FAIL\n`);
process.exit(fail === 0 ? 0 : 1);
