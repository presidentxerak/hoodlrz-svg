import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  const nft = new ethers.Contract(
    "0x55831e7A5BD877b7f933dFeC69D3c7bC78d7f5D1",
    [
      "function getTraits(uint256) view returns (uint8[8])",
      "function tokenSeed(uint256) view returns (uint256)",
    ],
    wallet
  );

  const layerStore = new ethers.Contract(
    "0x24C95f7e77a297A8d76BFBd5f869F897c5CBc3d9",
    [
      "function hasLayer(uint8,uint8,uint8) view returns (bool)",
      "function getLayer(uint8,uint8,uint8) view returns (string)",
    ],
    wallet
  );

  const categoryNames = ["wall", "graffiti", "hoodie", "eyes", "mouth", "accessory", "foreground"];

  // Get token 1 seed and traits
  const seed = await nft.tokenSeed(1);
  console.log("Token 1 seed:", seed.toString());

  const traits = await nft.getTraits(seed);
  const variant = Number(traits[0]);
  console.log("Variant:", variant === 0 ? "light" : "dark");

  for (let i = 0; i < 7; i++) {
    const traitIndex = Number(traits[i + 1]);
    const catName = categoryNames[i];
    let status = "???";
    try {
      const has = await layerStore.hasLayer(variant, i, traitIndex);
      if (has) {
        try {
          const layer = await layerStore.getLayer(variant, i, traitIndex);
          status = `OK (${layer.length} chars)`;
        } catch (e: any) {
          status = `EXISTS but getLayer fails: ${e.message?.slice(0, 80)}`;
        }
      } else {
        status = "MISSING";
      }
    } catch (e: any) {
      status = `ERROR: ${e.message?.slice(0, 80)}`;
    }
    console.log(`  [${i}] ${catName} #${traitIndex} → ${status}`);
    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
