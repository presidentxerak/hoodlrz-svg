/**
 * Diagnostic de l'installation Hoodlrz Gen Kids.
 *
 * Repond a une seule question : "ou j'en suis, et qu'est-ce que je fais
 * maintenant ?" Chaque controle qui echoue affiche la commande exacte
 * qui le corrige.
 *
 * Ne modifie rien et n'affiche JAMAIS de secret : la cle privee est
 * seulement signalee presente ou absente, jamais sa valeur.
 *
 * Usage : npm run kids:doctor
 */

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { Wallet } from 'ethers';

const C = {
  ok: '\x1b[32m', bad: '\x1b[31m', warn: '\x1b[33m',
  dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m',
};
const steps = [];
const add = (n, label, state, detail, fix) => steps.push({ n, label, state, detail, fix });

const sh = (cmd) => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return null; }
};

/* 1 ── Bon dossier ------------------------------------------------- */
let inProject = false;
try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  inProject = pkg.name === 'hoodlrz-app';
  add(1, 'Dossier du projet', inProject ? 'ok' : 'bad',
      inProject ? process.cwd() : `package.json trouve mais ce n'est pas hoodlrz-app (${pkg.name})`,
      inProject ? null : 'cd vers le dossier hoodlrz-svg');
} catch {
  add(1, 'Dossier du projet', 'bad', 'aucun package.json ici : ' + process.cwd(),
      'cd vers le dossier hoodlrz-svg');
}

if (!inProject) { render(); process.exit(1); }

/* 2 ── Node -------------------------------------------------------- */
{
  const major = Number(process.version.slice(1).split('.')[0]);
  add(2, 'Node.js', major >= 20 ? 'ok' : 'bad', process.version,
      major >= 20 ? null : 'installer Node 20 ou plus recent');
}

/* 3 ── Dependances ------------------------------------------------- */
{
  const has = existsSync('node_modules') && existsSync('node_modules/ethers');
  add(3, 'Dependances installees', has ? 'ok' : 'bad',
      has ? 'node_modules present' : 'node_modules absent ou incomplet',
      has ? null : 'npm install');
}

/* 4 ── Branche git ------------------------------------------------- */
{
  const branch = sh('git branch --show-current');
  const expected = 'claude/update-pfp-collection-details-7hvhM';
  const behind = sh(`git rev-list --count HEAD..origin/${branch} 2>/dev/null`);
  const good = branch === expected;
  add(4, 'Branche git', good ? (behind && behind !== '0' ? 'warn' : 'ok') : 'warn',
      good
        ? (behind && behind !== '0' ? `${branch} (${behind} commit(s) de retard)` : branch)
        : `${branch ?? 'inconnue'} au lieu de ${expected}`,
      // kids:update plutot que git pull : npm 11 reecrit package-lock.json
      // a chaque install, ce qui fait echouer la fusion suivante. La
      // commande jette d'abord ce fichier genere.
      good
        ? (behind && behind !== '0' ? 'npm run kids:update' : null)
        : `git checkout ${expected} && npm run kids:update`);
}

/* 5 ── Moteur gele ------------------------------------------------- */
{
  const p = 'kids/engine/frozen.html';
  if (!existsSync(p)) {
    add(5, 'Moteur gele', 'bad', 'absent', 'npm run kids:freeze');
  } else {
    const sha = createHash('sha256').update(readFileSync(p)).digest('hex');
    const declared = existsSync('kids/build/engine.sha256')
      ? readFileSync('kids/build/engine.sha256', 'utf8').split(' ')[0] : null;
    const match = declared === sha;
    add(5, 'Moteur gele', match ? 'ok' : 'bad',
        match ? `${sha.slice(0, 16)}… · ${(readFileSync(p).length / 1024).toFixed(1)} Ko`
              : 'empreinte differente de celle enregistree',
        match ? null : 'npm run kids:freeze');
  }
}

/* 6 ── Adresses ---------------------------------------------------- */
let addressesOk = false;
{
  const cfg = JSON.parse(readFileSync('kids/config.json', 'utf8'));
  const roles = ['deployer', 'reserveReceiver', 'royaltyReceiver'];
  const filled = roles.filter((r) => /^0x[0-9a-fA-F]{40}$/.test(cfg.addresses?.[r] ?? ''));
  addressesOk = filled.length === roles.length;
  // Les trois roles sont affiches, pas seulement le deployeur. Un
  // controle qui dit "OK" sans montrer sur quoi il porte oblige a le
  // croire sur parole - or c'est precisement ici qu'on veut relire, et
  // ce sont des adresses publiques.
  add(6, 'Adresses de deploiement', addressesOk ? 'ok' : 'bad',
      addressesOk
        ? roles.map((r) => `${r.padEnd(16)} ${cfg.addresses[r]}`).join('\n           ')
        : `${filled.length}/3 renseignees — manque ${roles.filter((r) => !filled.includes(r)).join(', ')}`,
      addressesOk ? null : 'npm run kids:addresses -- 0xTonAdresse');
}

/* 7 ── Destinataires coherents entre config et env ------------------ */
{
  // deploy.ts lit RESERVE_RECEIVER et ROYALTY_RECEIVER dans .env.local,
  // pas dans kids/config.json. Une divergence entre les deux ne se voit
  // nulle part et ne se rattrape pas : la reserve et les royalties
  // partent sur le mauvais wallet, definitivement.
  const cfg = JSON.parse(readFileSync('kids/config.json', 'utf8'));
  const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const envOf = (k) => (env.match(new RegExp(`^${k}\\s*=\\s*(\\S*)$`, 'm'))?.[1] ?? '').trim();

  const pairs = [
    ['reserveReceiver', 'RESERVE_RECEIVER'],
    ['royaltyReceiver', 'ROYALTY_RECEIVER'],
  ];
  const set = pairs.filter(([, e]) => /^0x[0-9a-fA-F]{40}$/.test(envOf(e)));
  const clash = set.filter(([c, e]) => envOf(e).toLowerCase() !== (cfg.addresses?.[c] ?? '').toLowerCase());

  if (!env) {
    add(7, 'Destinataires reserve et royalties', 'warn', '.env.local absent',
        'rien a comparer pour l instant');
  } else if (!set.length) {
    add(7, 'Destinataires reserve et royalties', 'bad',
        'RESERVE_RECEIVER et ROYALTY_RECEIVER encore a l exemple',
        'npm run kids:sync-env');
  } else if (clash.length) {
    add(7, 'Destinataires reserve et royalties', 'bad',
        clash.map(([c, e]) => `${e} = ${envOf(e)}  mais config.${c} = ${cfg.addresses?.[c] || '(vide)'}`).join('\n           '),
        'npm run kids:sync-env   (kids/config.json fait foi)');
  } else {
    // Meme raison qu'au controle 6 : on montre la valeur sur laquelle
    // porte le OK. "Identiques" ne dit pas identiques a quoi, et c'est
    // justement la question qu'on se pose en lisant cette ligne.
    add(7, 'Destinataires reserve et royalties', 'ok',
        pairs.map(([, e]) => `${e.padEnd(16)} ${envOf(e)}`).join('\n           ')
        + '\n           identiques a kids/config.json');
  }
}

/* 8 ── Cle privee --------------------------------------------------- */
{
  // On ne lit QUE la presence de la ligne. La valeur n'est jamais
  // affichee, jamais journalisee.
  if (!existsSync('.env.local')) {
    add(8, 'Cle du deployeur', 'bad', '.env.local absent',
        'cp .env.local.example .env.local  puis renseigner DEPLOYER_PRIVATE_KEY');
  } else {
    const env = readFileSync('.env.local', 'utf8');
    const m = env.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(.*)$/m);
    const v = (m?.[1] ?? '').trim();
    const isPlaceholder = !v || v.includes('...') || /^0x0+$/.test(v);
    const looksValid = /^0x[0-9a-fA-F]{64}$/.test(v);
    // MetaMask exporte les cles SANS le prefixe 0x. C'est le premier
    // echec que rencontre quiconque suit la procedure, et un simple
    // "format inattendu : 64 caracteres" n'aide personne a le voir.
    const missingPrefix = /^[0-9a-fA-F]{64}$/.test(v);

    // Une cle bien formee peut tres bien etre celle d'un AUTRE wallet.
    // Le deploiement reussirait quand meme, mais les trois contrats
    // appartiendraient a une adresse que kids/config.json ne declare
    // pas - et Ownable ne se transfere qu'a chaud, en esperant s'en
    // apercevoir a temps. On derive donc l'adresse depuis la cle et on
    // compare. Le calcul est local, la cle ne sort pas de la machine et
    // n'est jamais affichee ; l'adresse derivee, elle, est publique.
    let derived = null;
    if (looksValid) {
      try { derived = new Wallet(v).address; } catch { /* cle invalide malgre le format */ }
    }
    const cfgDeployer = JSON.parse(readFileSync('kids/config.json', 'utf8')).addresses?.deployer ?? '';
    const sameWallet = derived && cfgDeployer &&
                       derived.toLowerCase() === cfgDeployer.toLowerCase();

    const good = looksValid && sameWallet;
    add(8, 'Cle du deployeur', good ? 'ok' : 'bad',
        good ? `celle de ${derived} (valeur non affichee)`
          : derived ? `cette cle est celle de ${derived},\n           `
                      + `or kids/config.json declare ${cfgDeployer || '(vide)'}`
          : looksValid ? 'cle illisible malgre un format correct'
          : missingPrefix ? 'il manque le 0x devant (MetaMask exporte sans)'
          : isPlaceholder ? 'ligne encore a l exemple'
          : `format inattendu : ${v.length} caracteres au lieu de 66`,
        good ? null
          : derived ? 'soit exporter la cle du bon wallet, soit npm run kids:addresses -- ' + derived
          : missingPrefix ? 'ajouter 0x juste apres le = dans .env.local'
          : 'renseigner DEPLOYER_PRIVATE_KEY dans .env.local');
  }
}

/* 9 ── .env.local bien ignore par git ------------------------------ */
{
  const tracked = sh('git ls-files .env.local');
  const safe = !tracked;
  add(9, 'Cle protegee de git', safe ? 'ok' : 'bad',
      safe ? '.env.local non suivi par git'
           : 'ATTENTION : .env.local est suivi par git',
      safe ? null : 'git rm --cached .env.local  puis changer la cle : elle est compromise');
}

/* 10 ── Chaine ----------------------------------------------------- */
// Valeurs confirmees le 22/08/2026 sur docs.robinhood.com/chain.
// Plutot que de les redire, on interroge le RPC : un endpoint qui repond
// le bon chain ID est la seule preuve qui vaille, et elle attrape aussi
// bien une URL perimee qu'un service en panne le jour du deploiement.
const RH = {
  testnet: { id: 46630, rpc: 'https://rpc.testnet.chain.robinhood.com' },
  mainnet: { id: 4663, rpc: 'https://rpc.mainnet.chain.robinhood.com' },
};

{
  const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const custom = env.match(/^RH_TESTNET_RPC\s*=\s*(\S+)$/m)?.[1] ?? '';
  const url = custom || RH.testnet.rpc;

  let detail, state, fix = null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      signal: AbortSignal.timeout(8000),
    });
    // Un proxy ou un portail captif repond en texte, pas en JSON.
    // Tenter de le deserialiser donnerait un message sur une accolade
    // manquante, qui n'a rien a voir avec la cause.
    const body = await r.text();
    let seen = NaN;
    try { seen = parseInt(JSON.parse(body).result, 16); }
    catch { throw new Error(`reponse non JSON : ${body.slice(0, 40).replace(/\s+/g, ' ')}`); }

    if (seen === RH.testnet.id) {
      state = 'ok';
      detail = `testnet joignable, chain ID ${seen} confirme\n           ${url}`;
    } else {
      state = 'bad';
      detail = `ce RPC repond chain ID ${seen}, or le testnet Robinhood est ${RH.testnet.id}`;
      fix = 'corriger RH_TESTNET_RPC dans .env.local';
    }
  } catch (e) {
    // Injoignable n'est pas fatal tant qu'on ne deploie pas : le reseau
    // du poste peut filtrer, l'endpoint public peut limiter le debit.
    state = 'warn';
    detail = `${url}\n           injoignable pour l instant (${String(e.message).slice(0, 60)})`;
    fix = 'sans consequence tant qu on ne deploie pas ; a revoir avant le testnet';
  }
  add(10, 'Robinhood Chain testnet', state, detail, fix);
}

render();

const blocking = steps.filter((s) => s.state === 'bad');
process.exit(blocking.length ? 1 : 0);

/* ------------------------------------------------------------------ */
function render() {
  const icon = { ok: `${C.ok}OK  ${C.off}`, bad: `${C.bad}A FAIRE${C.off}`, warn: `${C.warn}NOTE${C.off}` };
  console.log(`\n${C.bold}Diagnostic Hoodlrz Gen Kids${C.off}\n`);
  for (const s of steps) {
    const pad = s.state === 'ok' ? '    ' : s.state === 'warn' ? '  ' : '';
    console.log(`  ${icon[s.state]}${pad} ${s.n}. ${s.label}`);
    if (s.detail) console.log(`           ${C.dim}${s.detail}${C.off}`);
    if (s.fix) console.log(`           ${C.bold}->${C.off} ${s.fix}`);
  }

  const bad = steps.filter((s) => s.state === 'bad');
  console.log('');
  if (!bad.length) {
    console.log(`  ${C.ok}Tout est en place.${C.off} Prochaine etape : npm run kids:test\n`);
  } else {
    console.log(`  ${bad.length} point(s) a regler. Commence par le premier :\n`);
    console.log(`    ${C.bold}${bad[0].fix}${C.off}\n`);
  }
}
