/**
 * Revelation quand la collection part entierement.
 *
 * La fenetre de mint court jusqu'en 2036. Attendre sa fermeture pour
 * appeler revealSeed() laisserait la collection en placeholder dix ans
 * apres que la derniere piece a trouve preneur. Le contrat accepte donc
 * une seconde porte : plus rien a minter.
 *
 * Ce test la franchit pour de vrai - 8 888 pieces mintees dans l'EVM,
 * puis revelation AVANT mintEnd. Une lecture du code ne prouverait pas
 * que le compteur atteint exactement MAX_SUPPLY par les chemins
 * reellement empruntes (reserve, allowlist, public, plafond par wallet).
 *
 * Usage : npm run kids:soldout
 */

import { createChain, ACCOUNTS } from '../../scripts/kids/chain.mjs';
import { createAddressFromString } from '@ethereumjs/util';

const DAY = 86400;
let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};

const t0 = Date.now();
const chain = await createChain();
const T0 = Number(chain.now);

console.log('\nRevelation par epuisement de la supply\n');
console.log('1. Deploiement');
const engine = await chain.deploy('contracts/kids/HoodlrzKidsEngine.sol', 'HoodlrzKidsEngine');
const renderer = await chain.deploy(
  'contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer', [engine.address.toString()]);
const nft = await chain.deploy(
  'contracts/kids/HoodlrzKids.sol', 'HoodlrzKids',
  [renderer.address.toString(), ACCOUNTS.DEPLOYER.toString()]);

const MAX = Number(await nft.call('MAX_SUPPLY'));
const RESERVE = Number(await nft.call('RESERVE'));
const PER_WALLET = Number(await nft.call('MAX_PER_WALLET'));
ok('parametres lus depuis la chaine', MAX === 8888 && RESERVE === 300 && PER_WALLET === 10,
   `${MAX} / ${RESERVE} / ${PER_WALLET}`);

// Fenetre volontairement lointaine : c'est le cas reel (2036), et c'est
// ce qui rend le test interessant. Si la revelation passe, ce n'est pas
// parce que le temps a fait son oeuvre.
const AL = T0 + DAY, PUB = T0 + 2 * DAY, END = T0 + 3650 * DAY;
await nft.call('setPhases', [AL, PUB, END]);

console.log('\n2. Reserve createur');
for (let i = 0; i < RESERVE / PER_WALLET; i++) {
  // mintReserve n'est pas soumis au plafond par wallet, mais on decoupe
  // quand meme : c'est ce que fera le script de deploiement, une grosse
  // transaction unique risquant le depassement de gas sur la vraie chaine.
  await nft.call('mintReserve', [ACCOUNTS.DEPLOYER.toString(), PER_WALLET]);
}
ok('reserve mintee', Number(await nft.call('totalMinted')) === RESERVE);

console.log('\n3. Mint public jusqu a epuisement');
chain.warpTo(PUB + 60);

const publicSupply = MAX - RESERVE;
const wallets = Math.ceil(publicSupply / PER_WALLET);
// Un wallet different par lot : c'est le plafond de 10 qui impose ce
// nombre, et le verifier ici confirme au passage qu'il tient sur
// l'integralite de la collection.
for (let i = 0; i < wallets; i++) {
  const addr = createAddressFromString('0x' + (i + 1).toString(16).padStart(40, '0'));
  const left = publicSupply - i * PER_WALLET;
  await nft.call('mintPublic', [Math.min(PER_WALLET, left)], { from: addr });
  if ((i + 1) % 200 === 0) console.log(`     ${(i + 1) * PER_WALLET} / ${publicSupply}…`);
}

const minted = Number(await nft.call('totalMinted'));
ok('supply atteinte', minted === MAX, `${minted} / ${MAX}`);
ok('il a fallu au moins 859 wallets', wallets >= 859, `${wallets} wallets`);
ok('un mint de plus est refuse',
   (await nft.expectRevert('mintPublic', [1], { from: ACCOUNTS.CAROL })) === 'SupplyExhausted');

console.log('\n4. Revelation avant la fin de fenetre');
ok('on est bien avant mintEnd', Number(chain.now) < END,
   `${((END - Number(chain.now)) / 86400 / 365).toFixed(1)} ans restants`);

await nft.call('revealSeed');
const seedBase = await nft.call('seedBase');
ok('graine posee', /^0x[0-9a-f]{64}$/.test(seedBase) && !/^0x0+$/.test(seedBase),
   seedBase.slice(0, 18) + '…');
ok('seconde revelation refusee', (await nft.expectRevert('revealSeed')) === 'SeedAlreadySet');

console.log('\n5. Les metadonnees sortent du placeholder');
const uri = await nft.call('tokenURI', [7]);
const meta = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
ok('attributs presents', Array.isArray(meta.attributes) && meta.attributes.length === 9,
   `${meta.attributes?.length ?? 0} attributs`);
ok('animation_url presente', typeof meta.animation_url === 'string' &&
   meta.animation_url.startsWith('data:text/html;base64,'));

console.log(`\n==================================================`);
console.log(`  ${pass} OK, ${fail} FAIL   (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
console.log(`==================================================\n`);
process.exit(fail ? 1 : 0);
