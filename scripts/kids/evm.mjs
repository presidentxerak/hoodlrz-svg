/**
 * Petit harnais EVM local : compile du Solidity et l'execute en memoire.
 *
 * Hardhat telecharge son compilateur depuis binaries.soliditylang.org, que le
 * proxy de cet environnement bloque. On passe donc par le paquet npm `solc`
 * (compilateur embarque, pas de reseau) et par @ethereumjs/evm pour
 * l'execution. Meme compilateur, meme semantique EVM : les resultats sont
 * ceux qu'on obtiendrait sur une chaine reelle.
 */

import solcModule from 'solc';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createEVM } from '@ethereumjs/evm';
import { Address, hexToBytes, bytesToHex } from '@ethereumjs/util';

const solc = solcModule;

/**
 * Resout un chemin d'import Solidity vers un fichier reel.
 * Relatif -> par rapport au fichier importateur ; sinon -> node_modules.
 */
function resolveImport(importPath, fromDir) {
  const target = importPath.startsWith('.')
    ? resolve(fromDir, importPath)
    : resolve('node_modules', importPath);
  return existsSync(target) ? target : null;
}

/**
 * Compile un fichier Solidity et retourne { abi, bytecode } du contrat nomme.
 * Reglages alignes sur hardhat.config.ts pour que le bytecode teste ici soit
 * exactement celui qui sera deploye.
 */
export function compile(entryFile, contractName) {
  const entry = resolve(entryFile);

  // On indexe les sources par chemin ABSOLU et on reecrit chaque import vers
  // ce meme chemin absolu. solc n'a alors plus rien a resoudre lui-meme, ce
  // qui evite les ambiguites entre chemins relatifs et node_modules.
  const sources = {};
  const walk = (absPath) => {
    if (sources[absPath]) return;
    let content = readFileSync(absPath, 'utf8');
    const dir = dirname(absPath);
    const rewrites = [];
    for (const m of content.matchAll(/import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g)) {
      const target = resolveImport(m[1], dir);
      if (target) rewrites.push([m[1], target]);
    }
    for (const [from, to] of rewrites) {
      content = content.split(`"${from}"`).join(`"${to}"`).split(`'${from}'`).join(`'${to}'`);
    }
    sources[absPath] = { content };
    for (const [, to] of rewrites) walk(to);
  };
  walk(entry);

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: 'cancun',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
    },
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input)));

  const errors = (out.errors || []).filter((e) => e.severity === 'error');
  if (errors.length) {
    throw new Error('Compilation echouee :\n' + errors.map((e) => e.formattedMessage).join('\n'));
  }
  const warnings = (out.errors || []).filter((e) => e.severity === 'warning');

  for (const file of Object.keys(out.contracts || {})) {
    const c = out.contracts[file][contractName];
    if (c) {
      return {
        abi: c.abi,
        bytecode: '0x' + c.evm.bytecode.object,
        deployedSize: c.evm.deployedBytecode.object.length / 2,
        warnings: warnings.map((w) => w.formattedMessage),
      };
    }
  }
  throw new Error(`Contrat ${contractName} introuvable dans la sortie`);
}

/** Deploie du bytecode dans un EVM neuf et retourne un objet appelable. */
export async function deploy(bytecode) {
  const evm = await createEVM();
  const res = await evm.runCall({
    data: hexToBytes(bytecode),
    gasLimit: 200_000_000n,
  });
  if (res.execResult.exceptionError) {
    throw new Error('Deploiement echoue : ' + res.execResult.exceptionError.error);
  }
  const addr = res.createdAddress;
  if (!addr) throw new Error('Pas d adresse creee');

  return {
    address: addr,
    /** Appelle une fonction encodee (calldata hex) et retourne le retour hex. */
    async call(calldataHex, gasLimit = 500_000_000n) {
      const r = await evm.runCall({
        to: addr,
        data: hexToBytes(calldataHex),
        gasLimit,
      });
      if (r.execResult.exceptionError) {
        throw new Error('Appel echoue : ' + r.execResult.exceptionError.error);
      }
      return bytesToHex(r.execResult.returnValue);
    },
  };
}

export { Address };
