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

// Existing LayerStore (already locked with 229 layers)
const LAYER_STORE_ADDRESS = "0x5B29dEC22Aa3348c0E463307c91E04082755F641";
const PROMO_WALLET = "0x88d8c9239688E15a35c6eD59e7c2852A8b9390C9";
const RESERVE_TOTAL = 200;
const BATCH_SIZE = 50;

async function main() {
  if (!DEPLOYER_PRIVATE_KEY || !ALCHEMY_API_KEY) {
    console.error("Missing DEPLOYER_PRIVATE_KEY or ALCHEMY_API_KEY in .env.local");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  console.log(`Network: ${NETWORK}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH`);
  console.log(`LayerStore (existing): ${LAYER_STORE_ADDRESS}\n`);

  // Load artifacts
  const nftArtifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzOnChain.sol/HoodlrzOnChain.json"), "utf-8")
  );
  const rendererArtifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzRenderer.sol/HoodlrzRenderer.json"), "utf-8")
  );

  // ── Step 1: Deploy new HoodlrzOnChain (with reserveMint) ──
  console.log("=== Step 1: Deploy HoodlrzOnChain (v2 with reserveMint) ===");
  const mintPrice = ethers.parseEther("0.007");
  const nftFactory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, deployer);
  const nft = await nftFactory.deploy(mintPrice, ethers.ZeroAddress, deployer.address, { gasLimit: 8_000_000n });
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log(`  NFT: ${nftAddr}\n`);

  // ── Step 2: Deploy new Renderer (pointing to existing LayerStore + new NFT) ──
  console.log("=== Step 2: Deploy HoodlrzRenderer ===");
  const rendererFactory = new ethers.ContractFactory(rendererArtifact.abi, rendererArtifact.bytecode, deployer);
  const renderer = await rendererFactory.deploy(nftAddr, LAYER_STORE_ADDRESS, { gasLimit: 8_000_000n });
  await renderer.waitForDeployment();
  const rendererAddr = await renderer.getAddress();
  console.log(`  Renderer: ${rendererAddr}\n`);

  // ── Step 3: Wire renderer to NFT ──
  console.log("=== Step 3: Set renderer on NFT ===");
  const nftContract = new ethers.Contract(nftAddr, nftArtifact.abi, deployer);
  const tx = await nftContract.setRenderer(rendererAddr, { gasLimit: 100_000n });
  await tx.wait();
  console.log("  Done.\n");

  // ── Step 4: Reserve 200 NFTs ──
  console.log(`=== Step 4: Reserve ${RESERVE_TOTAL} NFTs to ${PROMO_WALLET} ===`);
  const batches = Math.ceil(RESERVE_TOTAL / BATCH_SIZE);
  console.log(`  Minting ${RESERVE_TOTAL} tokens in ${batches} batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < batches; i++) {
    const qty = Math.min(BATCH_SIZE, RESERVE_TOTAL - i * BATCH_SIZE);
    console.log(`  Batch ${i + 1}/${batches} (${qty} tokens)...`);
    try {
      const mintTx = await nftContract.reserveMint(PROMO_WALLET, qty, { gasLimit: 15_000_000n });
      console.log(`    TX: ${mintTx.hash}`);
      const receipt = await mintTx.wait();
      console.log(`    Done. Gas used: ${receipt?.gasUsed.toString()}\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    FAILED: ${msg}\n`);
      break;
    }
  }

  // ── Summary ──
  const finalSupply = Number(await nftContract.totalSupply());
  const balance = ethers.formatEther(await provider.getBalance(deployer.address));

  console.log("======================================");
  console.log("  DEPLOYMENT COMPLETE (v2)");
  console.log("======================================");
  console.log(`  LayerStore:  ${LAYER_STORE_ADDRESS} (existing, locked)`);
  console.log(`  NFT:         ${nftAddr}`);
  console.log(`  Renderer:    ${rendererAddr}`);
  console.log(`  Supply:      ${finalSupply} / 2,999`);
  console.log(`  Reserved:    ${RESERVE_TOTAL} NFTs → ${PROMO_WALLET}`);
  console.log(`  Mint Price:  0.007 ETH`);
  console.log(`  Royalties:   10% to ${deployer.address}`);
  console.log(`  Remaining:   ${balance} ETH`);
  console.log("======================================");
  console.log("\nUpdate Vercel:");
  console.log(`  NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS=${nftAddr}`);
  console.log("  NEXT_PUBLIC_HOODLRZ_CHAIN_ID=1");
  console.log("\nNext: call nft.toggleMint(true) to open public mint");
}

main().catch(console.error);
