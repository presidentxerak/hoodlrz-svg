/**
 * Fait tourner scripts/kids/verify-onchain.mjs pour de vrai.
 *
 * Le verificateur parle a une chaine via ethers. On lui en fournit une :
 * l'EVM locale, exposee par un mini serveur JSON-RPC. Il execute donc
 * exactement le meme code que le jour du deploiement, sur un
 * deploiement complet.
 *
 * Deux passages, qui correspondent aux deux moments d'usage reels :
 *   - avant seal() et avant le mint : le script doit signaler ce qui
 *     reste a faire sans crier a l'erreur
 *   - apres seal(), mint et finishReveal() : tout doit etre vert
 *
 * On verifie aussi qu'il DETECTE une anomalie : un moteur incomplet ne
 * doit pas passer. Un controleur qui ne sait rien refuser ne controle rien.
 *
 * Usage : node test/kids/verify-onchain.test.mjs
 */

import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createChain, ACCOUNTS } from '../../scripts/kids/chain.mjs';
import { startRpcShim } from '../../scripts/kids/rpc-shim.mjs';
import { buildTree, proofFor, leafOf } from '../../scripts/kids/merkle.mjs';

const run = promisify(execFile);
let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};

/** Lance le verificateur et renvoie { code, out }. */
async function verify(rpc, engine, nft, token = 0) {
  const argv = ['scripts/kids/verify-onchain.mjs', '--rpc', rpc, '--engine', engine];
  if (nft) argv.push('--nft', nft, '--token', String(token));
  try {
    const { stdout } = await run('node', argv, { maxBuffer: 32 * 1024 * 1024 });
    return { code: 0, out: stdout };
  } catch (e) {
    return { code: e.code ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

console.log('\nVerificateur on-chain, execute contre l EVM locale');

const chain = await createChain();
const shim = await startRpcShim(chain.evm, { chainId: 4663, blockCtx: chain.blockCtx });

const engine = await chain.deploy('contracts/kids/HoodlrzKidsEngine.sol', 'HoodlrzKidsEngine');
const renderer = await chain.deploy(
  'contracts/kids/HoodlrzKidsRenderer.sol', 'HoodlrzKidsRenderer', [engine.address.toString()]);
const nft = await chain.deploy(
  'contracts/kids/HoodlrzKids.sol', 'HoodlrzKids',
  [renderer.address.toString(), ACCOUNTS.DEPLOYER.toString()]);

const ENG = engine.address.toString();
const NFT = nft.address.toString();

/* ------------------------------------------------------------------ *
 * A. Moteur incomplet : le verificateur doit refuser.
 * ------------------------------------------------------------------ */
console.log('\nA. Detection d un moteur incomplet');
{
  const preChunks = JSON.parse(readFileSync('kids/build/engine-pre.json', 'utf8'));
  const postChunks = JSON.parse(readFileSync('kids/build/engine-post.json', 'utf8'));
  await engine.call('appendChunk', [true, preChunks[0]]);
  // On omet volontairement le dernier morceau.
  for (const c of postChunks.slice(0, -1)) await engine.call('appendChunk', [false, c]);

  const r = await verify(shim.url, ENG, null);
  ok('sortie en erreur', r.code !== 0);
  ok('signale le mauvais nombre d octets', /nombre d octets attendu/.test(r.out) && /FAIL/.test(r.out));
  ok('signale le contenu different', /contenu identique a l artefact local/.test(r.out));

  // On complete.
  await engine.call('appendChunk', [false, postChunks[postChunks.length - 1]]);
}

/* ------------------------------------------------------------------ *
 * B. Moteur complet, pas encore scelle ni minte.
 * ------------------------------------------------------------------ */
console.log('\nB. Avant seal(), avant le mint');
{
  const r = await verify(shim.url, ENG, NFT);
  ok('sortie sans erreur', r.code === 0, `code ${r.code}`);
  ok('contenu conforme', /OK.*contenu identique a l artefact local/.test(r.out));
  ok('document reconstitue conforme', /OK.*document reconstitue conforme/.test(r.out));
  ok('signale le moteur non scelle', /PAS ENCORE SCELLE/.test(r.out));
  ok('donne le sha a declarer', /sha256 local a declarer : 0x[0-9a-f]{64}/.test(r.out));
  ok('signale les phases non programmees', /phases non programmees/.test(r.out));
  ok('reserve non mintee traitee comme en attente', /--.*reserve pas encore mintee/.test(r.out));
  ok('renderer non verrouille traite comme en attente', /--.*renderer pas encore verrouille/.test(r.out));
  ok('signale la racine absente', /racine d allowlist non posee/.test(r.out));
  ok('signale la graine non revelee', /graine non revelee/.test(r.out));
}

/* ------------------------------------------------------------------ *
 * C. Deploiement complet : tout doit etre vert.
 * ------------------------------------------------------------------ */
console.log('\nC. Apres seal(), mint et finishReveal()');
{
  const config = JSON.parse(readFileSync('kids/config.json', 'utf8'));
  const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);

  const sha = '0x' + readFileSync('kids/build/engine.sha256', 'utf8').split(' ')[0];
  await engine.call('seal', [sha]);

  for (let i = 0; i < 3; i++) await nft.call('mintReserve', [ACCOUNTS.DEPLOYER.toString(), 100]);

  // Phases reelles issues de la config, pour que le verificateur les
  // compare a la meme source que le jour J.
  const AL = ts(config.phases.allowlistStartParis);
  const PUB = ts(config.phases.publicStartParis);
  const END = ts(config.phases.mintEndParis);
  await nft.call('setPhases', [AL, PUB, END]);

  const tree = buildTree([ACCOUNTS.ALICE.toString(), ACCOUNTS.BOB.toString()]);
  await nft.call('setAllowlistRoot', [tree.root]);
  await nft.call('lockRenderer');

  chain.warpTo(AL + 60);
  await nft.call('mintAllowlist', [4, proofFor(tree, leafOf(ACCOUNTS.ALICE.toString()))], { from: ACCOUNTS.ALICE });
  chain.warpTo(END + 60);
  await nft.call('startReveal');
  chain.mineBlocks(Number(await nft.call('REVEAL_DELAY')) + 1);
  await nft.call('finishReveal');

  const r = await verify(shim.url, ENG, NFT, 12);
  ok('sortie sans erreur', r.code === 0, `code ${r.code}`);
  ok('sha publie == artefact local', /OK.*SHA-256 publie == artefact local/.test(r.out));
  ok('moteur scelle', /OK.*moteur scelle/.test(r.out));
  ok('parametres conformes', /OK.*supply/.test(r.out) && /OK.*plafond par wallet/.test(r.out));
  ok('phases conformes a la config', /OK.*allowlistStart conforme a la config/.test(r.out));
  ok('renderer verrouille', /OK.*renderer verrouille/.test(r.out));
  ok('le moteur rend sans erreur', /OK.*le moteur rend sans erreur/.test(r.out));
  ok('metadonnees == image', /OK.*metadonnees == image.*9 traits concordants/.test(r.out));
  // On regarde les lignes de controle, pas le resume final : celui-ci
  // contient toujours le mot FAIL, meme pour en annoncer zero.
  const controlLines = r.out.split('\n').filter((l) => /^ {2}(OK|FAIL)/.test(l));
  ok('aucune ligne en echec', !controlLines.some((l) => l.startsWith('  FAIL')),
     `${controlLines.length} controles`);

  // La racine locale est celle du snapshot de test, pas celle publiee :
  // le verificateur doit le dire plutot que de valider a l'aveugle.
  ok('signale l absence de snapshot local comparable',
     /racine posee mais aucun snapshot local/.test(r.out) || /racine == snapshot publie/.test(r.out));
}

shim.close();
console.log(`\n${pass} OK, ${fail} FAIL\n`);
process.exit(fail === 0 ? 0 : 1);
