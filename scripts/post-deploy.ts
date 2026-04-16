import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: ".env.local" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const NETWORK = process.argv.includes("mainnet") ? "mainnet" : "sepolia";

const RPC_URLS: Record<string, string> = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

// ── CONFIGURE THESE ──
const LAYER_STORE_ADDRESS = process.env.LAYER_STORE_ADDRESS || "0x5B29dEC22Aa3348c0E463307c91E04082755F641";
const NFT_ADDRESS = process.env.NFT_ADDRESS || "0xD8138513217881E4FaD00d5dC6f2d883B616ef72";
const PROMO_WALLET = "0x88d8c9239688E15a35c6eD59e7c2852A8b9390C9";
const RESERVE_TOTAL = 200;
const BATCH_SIZE = 50; // stay under block gas limit

async function main() {
  if (!DEPLOYER_PRIVATE_KEY || !ALCHEMY_API_KEY) {
    console.error("Missing DEPLOYER_PRIVATE_KEY or ALCHEMY_API_KEY in .env.local");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  console.log(`Network: ${NETWORK}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH\n`);

  // Load ABIs
  const layerStoreArtifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzLayerStore.sol/HoodlrzLayerStore.json"), "utf-8")
  );
  const nftArtifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzOnChain.sol/HoodlrzOnChain.json"), "utf-8")
  );

  const layerStore = new ethers.Contract(LAYER_STORE_ADDRESS, layerStoreArtifact.abi, deployer);
  const nft = new ethers.Contract(NFT_ADDRESS, nftArtifact.abi, deployer);

  // ── Step 1: Lock LayerStore ──
  console.log("=== Step 1: Lock LayerStore ===");
  try {
    const locked = await layerStore.locked();
    if (locked) {
      console.log("  Already locked. Skipping.\n");
    } else {
      const tx = await layerStore.lock({ gasLimit: 100_000n });
      console.log(`  TX: ${tx.hash}`);
      await tx.wait();
      console.log("  LayerStore locked permanently.\n");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Failed to lock: ${msg}\n`);
  }

  // ── Step 2: Reserve Mint 200 NFTs ──
  console.log(`=== Step 2: Reserve ${RESERVE_TOTAL} NFTs to ${PROMO_WALLET} ===`);
  const currentSupply = Number(await nft.totalSupply());
  console.log(`  Current supply: ${currentSupply}`);

  if (currentSupply >= RESERVE_TOTAL) {
    console.log(`  Already minted ${currentSupply} tokens. Skipping reserve.\n`);
  } else {
    const remaining = RESERVE_TOTAL - currentSupply;
    const batches = Math.ceil(remaining / BATCH_SIZE);
    console.log(`  Minting ${remaining} tokens in ${batches} batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < batches; i++) {
      const qty = Math.min(BATCH_SIZE, remaining - i * BATCH_SIZE);
      const label = `  Batch ${i + 1}/${batches} (${qty} tokens)`;
      console.log(`${label}...`);

      try {
        const tx = await nft.reserveMint(PROMO_WALLET, qty, { gasLimit: 15_000_000n });
        console.log(`    TX: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`    Done. Gas used: ${receipt?.gasUsed.toString()}\n`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    FAILED: ${msg}\n`);
        break;
      }
    }
  }

  // ── Summary ──
  const finalSupply = Number(await nft.totalSupply());
  const balance = ethers.formatEther(await provider.getBalance(deployer.address));
  console.log("======================================");
  console.log("  DONE");
  console.log("======================================");
  console.log(`  LayerStore: ${LAYER_STORE_ADDRESS} (locked)`);
  console.log(`  NFT:        ${NFT_ADDRESS}`);
  console.log(`  Supply:     ${finalSupply} / 2,999`);
  console.log(`  Promo:      ${RESERVE_TOTAL} NFTs → ${PROMO_WALLET}`);
  console.log(`  Remaining:  ${balance} ETH`);
  console.log("======================================");
  console.log("\nNext steps:");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Update Vercel env vars:");
  console.log(`     NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS=${NFT_ADDRESS}`);
  console.log("     NEXT_PUBLIC_HOODLRZ_CHAIN_ID=1");
  console.log("  3. Call nft.toggleMint(true) to open public mint");
}

main().catch(console.error);
