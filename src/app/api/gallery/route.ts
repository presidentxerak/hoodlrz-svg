import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract } from "ethers";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID, CURRENT_CHAIN } from "@/lib/web3/config";

export const dynamic = "force-dynamic";

async function getProvider(): Promise<JsonRpcProvider> {
  const urls = [CURRENT_CHAIN.rpcUrl, ...CURRENT_CHAIN.rpcFallbacks];

  for (const url of urls) {
    try {
      const provider = new JsonRpcProvider(url);
      // Quick test to ensure connection works
      await provider.getBlockNumber();
      console.log(`[api/gallery] Connected to RPC: ${url}`);
      return provider;
    } catch (err) {
      console.warn(`[api/gallery] RPC failed: ${url}`, (err as Error).message);
    }
  }

  throw new Error(`All RPCs failed for chain ${HOODLRZ_CHAIN_ID}`);
}

export async function GET() {
  console.log("[api/gallery] Request received. NFT_ADDRESS:", HOODLRZ_NFT_ADDRESS, "CHAIN_ID:", HOODLRZ_CHAIN_ID);

  if (!HOODLRZ_NFT_ADDRESS) {
    console.error("[api/gallery] NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS is not set");
    return NextResponse.json(
      { tokens: [], totalSupply: 0, debug: "Contract address not configured" }
    );
  }

  try {
    const provider = await getProvider();
    const contract = new Contract(HOODLRZ_NFT_ADDRESS, HOODLRZ_NFT_ABI, provider);

    const supply = Number(await contract.totalSupply());
    console.log(`[api/gallery] totalSupply: ${supply}`);

    if (supply === 0) {
      return NextResponse.json({ tokens: [], totalSupply: 0 });
    }

    // Fetch all token data in parallel batches
    const BATCH = 20;
    const tokens: Array<{ tokenId: number; seed: string; owner: string }> = [];

    for (let start = 1; start <= supply; start += BATCH) {
      const end = Math.min(start + BATCH - 1, supply);
      const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      const results = await Promise.all(
        batch.map(async (tokenId) => {
          try {
            const [seedBig, owner] = await Promise.all([
              contract.tokenSeed(tokenId) as Promise<bigint>,
              contract.ownerOf(tokenId) as Promise<string>,
            ]);
            return { tokenId, seed: seedBig.toString(), owner };
          } catch (err) {
            console.warn(`[api/gallery] Failed to fetch token ${tokenId}:`, (err as Error).message);
            return null;
          }
        })
      );

      for (const r of results) {
        if (r) tokens.push(r);
      }
    }

    console.log(`[api/gallery] Returning ${tokens.length} tokens`);
    return NextResponse.json({ tokens, totalSupply: supply });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[api/gallery] Error:", message);
    return NextResponse.json(
      { error: message, tokens: [], totalSupply: 0 },
      { status: 500 }
    );
  }
}
