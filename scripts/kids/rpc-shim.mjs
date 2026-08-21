/**
 * Mini serveur JSON-RPC pose devant l'EVM locale.
 *
 * Sert UNIQUEMENT aux tests. Son interet : permettre de faire tourner
 * scripts/kids/verify-onchain.mjs, qui parle a une vraie chaine via
 * ethers, contre l'EVM en memoire. Sans ca, l'outil de verification
 * serait ecrit mais jamais execute - et un script de controle qu'on
 * decouvre casse le jour du deploiement ne sert a rien.
 *
 * Il n'implemente que les methodes dont un provider en lecture a besoin.
 * Toute autre methode renvoie une erreur explicite plutot qu'un silence.
 */

import { createServer } from 'node:http';
import { hexToBytes, bytesToHex, createAddressFromString } from '@ethereumjs/util';

/**
 * @param evm         instance @ethereumjs/evm
 * @param chainId     identifiant de chaine annonce
 * @param blockCtx    fabrique de contexte de bloc (meme que chain.mjs)
 */
export function startRpcShim(evm, { chainId = 4663, blockCtx, port = 0 } = {}) {
  const handlers = {
    eth_chainId: () => '0x' + chainId.toString(16),
    net_version: () => String(chainId),
    eth_blockNumber: () => '0x1',

    async eth_call([tx]) {
      const res = await evm.runCall({
        to: createAddressFromString(tx.to),
        data: hexToBytes(tx.data ?? '0x'),
        gasLimit: 900_000_000n,
        block: blockCtx(),
      });
      if (res.execResult.exceptionError) {
        // On renvoie la donnee de revert : ethers sait la decoder en
        // erreur custom, ce qui rend les diagnostics lisibles.
        const err = new Error('execution reverted');
        err.data = bytesToHex(res.execResult.returnValue);
        throw err;
      }
      return bytesToHex(res.execResult.returnValue);
    },

    async eth_getCode([address]) {
      const acc = await evm.stateManager.getAccount(createAddressFromString(address));
      if (!acc) return '0x';
      const code = await evm.stateManager.getCode(createAddressFromString(address));
      return bytesToHex(code);
    },
  };

  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      let payload;
      try { payload = JSON.parse(body); } catch { payload = null; }
      const one = async (msg) => {
        const h = handlers[msg.method];
        if (!h) {
          return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `methode non geree par le shim : ${msg.method}` } };
        }
        try {
          return { jsonrpc: '2.0', id: msg.id, result: await h(msg.params ?? []) };
        } catch (e) {
          return { jsonrpc: '2.0', id: msg.id, error: { code: 3, message: e.message, data: e.data } };
        }
      };
      const out = Array.isArray(payload) ? await Promise.all(payload.map(one)) : await one(payload ?? {});
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() });
    });
  });
}
