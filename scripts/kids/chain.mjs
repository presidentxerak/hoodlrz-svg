/**
 * Mini-chaine locale : un EVM partage ou plusieurs contrats coexistent et
 * s'appellent entre eux, avec controle du msg.sender et du block.timestamp.
 *
 * Necessaire parce que le renderer lit le moteur, et que le NFT lit le
 * renderer : les tester isolement ne prouverait rien. On veut le chemin
 * complet, celui qu'empruntera une marketplace.
 */

import { createEVM } from '@ethereumjs/evm';
import { hexToBytes, bytesToHex, createAddressFromString, createZeroAddress } from '@ethereumjs/util';
import { Interface } from 'ethers';
import { compile } from './evm.mjs';

const DEPLOYER = createAddressFromString('0x' + '11'.repeat(20));
const ALICE = createAddressFromString('0x' + 'a1'.repeat(20));
const BOB = createAddressFromString('0x' + 'b0'.repeat(20));
const CAROL = createAddressFromString('0x' + 'ca'.repeat(20));   // hors allowlist

export const ACCOUNTS = { DEPLOYER, ALICE, BOB, CAROL };

export async function createChain() {
  const evm = await createEVM();
  let timestamp = 1_700_000_000n;

  /** Contexte de bloc injecte a chaque appel : c'est ce qui rend
   *  block.timestamp pilotable, donc les phases de mint testables. */
  const blockCtx = () => ({
    header: {
      number: 1n,
      cliqueSigner: () => createZeroAddress(),
      coinbase: createZeroAddress(),
      timestamp,
      difficulty: 0n,
      prevRandao: new Uint8Array(32),
      gasLimit: 30_000_000n,
      baseFeePerGas: 0n,
      getBlobGasPrice: () => 0n,
    },
  });

  return {
    /** EVM et contexte de bloc, exposes pour que le shim JSON-RPC puisse
     *  presenter cette chaine a un client ethers (voir rpc-shim.mjs). */
    evm,
    blockCtx,

    get now() { return timestamp; },
    /** Avance l'horloge de la chaine. */
    warpTo(t) { timestamp = BigInt(t); },
    warpBy(dt) { timestamp += BigInt(dt); },

    /** Compile, deploie, et retourne un objet contrat typé par son ABI. */
    async deploy(file, name, args = [], from = DEPLOYER) {
      const art = compile(file, name);
      const iface = new Interface(art.abi);
      const encodedArgs = args.length
        ? iface.encodeDeploy(args).slice(2)
        : '';
      const res = await evm.runCall({
        caller: from,
        origin: from,
        data: hexToBytes(art.bytecode + encodedArgs),
        gasLimit: 500_000_000n,
        block: blockCtx(),
      });
      if (res.execResult.exceptionError) {
        throw new Error(`Deploiement ${name} echoue : ${res.execResult.exceptionError.error}`);
      }
      const address = res.createdAddress;
      return this.at(address, art.abi, name, art.deployedSize);
    },

    /** Enveloppe un contrat deja deploye. */
    at(address, abi, name = 'Contract', size = 0) {
      const iface = new Interface(abi);
      const self = {
        address,
        name,
        deployedSize: size,
        abi,

        /** Appel en lecture ou en ecriture. Retourne les valeurs decodees. */
        async call(fn, args = [], { from = DEPLOYER, gasLimit = 900_000_000n } = {}) {
          const data = iface.encodeFunctionData(fn, args);
          const res = await evm.runCall({
            caller: from,
            origin: from,
            to: address,
            data: hexToBytes(data),
            gasLimit,
            block: blockCtx(),
          });
          if (res.execResult.exceptionError) {
            const err = new Error(`${name}.${fn} : ${res.execResult.exceptionError.error}`);
            err.revertData = bytesToHex(res.execResult.returnValue);
            err.reverted = true;
            // Tente de decoder une erreur custom ou une chaine Error(string).
            try { err.decoded = iface.parseError(err.revertData)?.name; } catch (_) {}
            throw err;
          }
          // Le gas du dernier appel est memorise plutot qu'expose par une
          // fonction dediee : mesurer via un second runCall reexecuterait
          // l'appel et dupliquerait ses effets de bord.
          self.lastGas = res.execResult.executionGasUsed;
          const out = iface.decodeFunctionResult(fn, bytesToHex(res.execResult.returnValue));
          return out.length === 1 ? out[0] : out;
        },

        /** Attend qu'un appel echoue ; retourne le nom de l'erreur custom. */
        async expectRevert(fn, args = [], opts = {}) {
          try {
            await self.call(fn, args, opts);
            return null;               // n'a PAS reverte
          } catch (e) {
            if (!e.reverted) throw e;
            return e.decoded || 'revert';
          }
        },

        /** Gas du dernier appel effectue. */
        lastGas: 0n,
      };
      return self;
    },
  };
}
