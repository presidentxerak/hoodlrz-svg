import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract } from "ethers";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";
import { HOODLRZ_NFT_ADDRESS, CURRENT_CHAIN } from "@/lib/web3/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!HOODLRZ_NFT_ADDRESS) {
    return NextResponse.json({ tokens: [], totalSupply: 0 });
  }

  try {
    const provider = new JsonRpcProvider(CURRENT_CHAIN.rpcUrl);
    const contract = new Contract(HOODLRZ_NFT_ADDRESS, HOODLRZ_NFT_ABI, provider);

    const supply = Number(await contract.totalSupply());

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
          } catch {
            return null;
          }
        })
      );

      for (const r of results) {
        if (r) tokens.push(r);
      }
    }

    return NextResponse.json({ tokens, totalSupply: supply });
  } catch (err) {
    console.error("[api/gallery] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tokens from blockchain" },
      { status: 500 }
    );
  }
}
