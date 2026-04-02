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
const NETWORK = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "sepolia";

const RPC_URLS: Record<string, string> = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

function loadArtifact(name: string) {
  const p = resolve(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

async function main() {
  if (!DEPLOYER_PRIVATE_KEY) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  if (!ALCHEMY_API_KEY) throw new Error("Missing ALCHEMY_API_KEY");

  const rpcUrl = RPC_URLS[NETWORK];
  if (!rpcUrl) throw new Error(`Unknown network: ${NETWORK}`);

  console.log(`Network: ${NETWORK}`);
  console.log(`RPC: ${rpcUrl.replace(ALCHEMY_API_KEY, "***")}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy LayerStore
  console.log("\n1/3 - Deploying HoodlrzLayerStore...");
  const lsArt = loadArtifact("HoodlrzLayerStore");
  const ls = await new ethers.ContractFactory(lsArt.abi, lsArt.bytecode, deployer).deploy();
  await ls.waitForDeployment();
  const lsAddr = await ls.getAddress();
  console.log("   LayerStore:", lsAddr);

  // 2. Deploy NFT
  const mintPrice = ethers.parseEther("0.007");
  const royaltyReceiver = deployer.address;
  console.log("\n2/3 - Deploying HoodlrzOnChain (0.007 ETH, 10% royalties)...");
  const nftArt = loadArtifact("HoodlrzOnChain");
  const nft = await new ethers.ContractFactory(nftArt.abi, nftArt.bytecode, deployer)
    .deploy(mintPrice, ethers.ZeroAddress, royaltyReceiver);
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("   HoodlrzOnChain:", nftAddr);

  // 3. Deploy Renderer
  console.log("\n3/3 - Deploying HoodlrzRenderer...");
  const rArt = loadArtifact("HoodlrzRenderer");
  const renderer = await new ethers.ContractFactory(rArt.abi, rArt.bytecode, deployer)
    .deploy(nftAddr, lsAddr);
  await renderer.waitForDeployment();
  const rendererAddr = await renderer.getAddress();
  console.log("   HoodlrzRenderer:", rendererAddr);

  // 4. Wire renderer
  console.log("\nWiring renderer to NFT...");
  const nftContract = new ethers.Contract(nftAddr, nftArt.abi, deployer);
  const tx = await nftContract.setRenderer(rendererAddr);
  await tx.wait();
  console.log("   Done.");

  console.log("\n======================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("======================================");
  console.log("  LayerStore:  ", lsAddr);
  console.log("  NFT:         ", nftAddr);
  console.log("  Renderer:    ", rendererAddr);
  console.log("  Mint Price:   0.007 ETH");
  console.log("  Royalties:    10% to", royaltyReceiver);
  console.log("======================================");
  console.log("\nNext steps:");
  console.log(`  1. LAYER_STORE_ADDRESS=${lsAddr} npx tsx scripts/upload-layers.ts ${NETWORK}`);
  console.log("  2. Lock layer store");
  console.log("  3. Toggle mint: call nft.toggleMint(true)");
  console.log("\nAdd to Vercel:");
  console.log(`  NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS=${nftAddr}`);
  console.log(`  NEXT_PUBLIC_HOODLRZ_CHAIN_ID=${NETWORK === "mainnet" ? "1" : "11155111"}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
