/**
 * Renseigne les adresses de deploiement dans kids/config.json.
 *
 * Evite d'editer le JSON a la main, et surtout evite les deux erreurs
 * qui coutent cher :
 *
 *   - COLLER UNE CLE PRIVEE au lieu d'une adresse. Une cle fait 64
 *     caracteres, une adresse 40. kids/config.json est versionne et
 *     public : une cle qui y atterrit part sur GitHub, et le wallet est
 *     a considerer comme perdu. Le script refuse net.
 *
 *   - REUTILISER LE WALLET DU TRESOR de la CITY. Il sert deja au
 *     free-mint du jeu et sa cle vit sur le serveur. Lui confier en plus
 *     la propriete des contrats Kids, c'est faire d'une compromission
 *     serveur une compromission de la collection.
 *
 * Usage :
 *   node scripts/kids/set-addresses.mjs 0xTonAdresse
 *      -> la meme adresse pour les trois roles
 *
 *   node scripts/kids/set-addresses.mjs --deployer 0x... --reserve 0x... --royalties 0x...
 *      -> un role a la fois
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { getAddress } from 'ethers';

const CONFIG = 'kids/config.json';

/** Wallet du tresor CITY : ne doit pas etre reutilise ici. */
const TREASURY = '0xd7a7ba63e48895febc008f5ed6e27abcae4f55f8';
const ZERO = '0x0000000000000000000000000000000000000000';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

/** Valide et normalise une adresse, ou explique pourquoi elle est refusee. */
function checkAddress(raw, role) {
  const v = String(raw).trim();

  const hex = v.startsWith('0x') ? v.slice(2) : v;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      `${role} : ce sont 64 caracteres, donc une CLE PRIVEE, pas une adresse.\n` +
      `         Ne la colle nulle part ici : kids/config.json est public.\n` +
      `         Une cle privee va uniquement dans .env.local, ligne DEPLOYER_PRIVATE_KEY.\n` +
      `         Si cette cle a deja ete partagee quelque part, considere le wallet\n` +
      `         comme compromis et genere-en un autre.`
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) {
    throw new Error(
      `${role} : "${v.slice(0, 24)}${v.length > 24 ? '…' : ''}" n'est pas une adresse.\n` +
      `         Attendu : 0x suivi de 40 caracteres hexadecimaux (${hex.length} recus).`
    );
  }
  if (v.toLowerCase() === ZERO) {
    throw new Error(`${role} : adresse nulle. Les pieces envoyees la seraient perdues.`);
  }

  // getAddress verifie la somme de controle quand la casse est mixte,
  // ce qui rattrape les fautes de frappe sur une adresse copiee a la main.
  let checksummed;
  try {
    checksummed = getAddress(v);
  } catch {
    throw new Error(
      `${role} : somme de controle invalide.\n` +
      `         L'adresse a probablement ete recopiee avec une faute. Copie-la\n` +
      `         depuis ton wallet plutot que de la retaper.`
    );
  }
  return checksummed;
}

/* ------------------------------------------------------------------ */

const single = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
const wanted = {
  deployer: flag('--deployer') ?? single,
  reserveReceiver: flag('--reserve') ?? single,
  royaltyReceiver: flag('--royalties') ?? single,
};

if (!wanted.deployer && !wanted.reserveReceiver && !wanted.royaltyReceiver) {
  console.error(`
Usage :
  node scripts/kids/set-addresses.mjs 0xTonAdresse
  node scripts/kids/set-addresses.mjs --deployer 0x... --reserve 0x... --royalties 0x...

Rappel : une ADRESSE fait 40 caracteres apres 0x et va ici.
         Une CLE PRIVEE fait 64 caracteres et va dans .env.local.
`);
  process.exit(2);
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const resolved = {};
const warnings = [];

try {
  for (const [role, raw] of Object.entries(wanted)) {
    if (!raw) continue;
    const addr = checkAddress(raw, role);
    resolved[role] = addr;
    if (addr.toLowerCase() === TREASURY) {
      warnings.push(
        `${role} utilise le wallet du tresor CITY.\n` +
        `    Sa cle vit deja sur le serveur pour le free-mint du jeu. Lui confier\n` +
        `    en plus la propriete des contrats Kids fait d'une compromission\n` +
        `    serveur une compromission de la collection. Un role, un wallet.`
      );
    }
  }
} catch (e) {
  console.error('\n  REFUSE\n  ' + e.message + '\n');
  process.exit(1);
}

config.addresses = { ...config.addresses, ...resolved };
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');

console.log('\nAdresses enregistrees dans ' + CONFIG + '\n');
for (const [role, addr] of Object.entries(config.addresses)) {
  if (role.startsWith('_')) continue;
  console.log(`  ${role.padEnd(16)} ${addr || '(vide)'}`);
}

if (warnings.length) {
  console.log('\n  ATTENTION');
  for (const w of warnings) console.log('    ' + w);
}

const missing = ['deployer', 'reserveReceiver', 'royaltyReceiver'].filter((k) => !config.addresses[k]);
if (missing.length) {
  console.log(`\n  Il manque encore : ${missing.join(', ')}`);
} else {
  console.log(`
  Les trois adresses sont posees. Reste la cle privee du deployeur,
  qui va dans .env.local et nulle part ailleurs :

    cp .env.local.example .env.local
    puis renseigner DEPLOYER_PRIVATE_KEY

  .env.local est ignore par git, il ne partira jamais sur GitHub.
`);
}
