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
const ACTION = process.argv.includes("off") ? false : true;

const RPC_URLS: Record<string, string> = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

const NFT_ADDRESS = "0x3468802ffcE5Aa75793cA555eb485A4eCD67449e";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  const nftArtifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzOnChain.sol/HoodlrzOnChain.json"), "utf-8")
  );
  const nft = new ethers.Contract(NFT_ADDRESS, nftArtifact.abi, deployer);

  console.log(`Network: ${NETWORK}`);
  console.log(`NFT: ${NFT_ADDRESS}`);
  console.log(`Action: toggleMint(${ACTION})\n`);

  const tx = await nft.toggleMint(ACTION, { gasLimit: 100_000n });
  console.log(`TX: ${tx.hash}`);
  await tx.wait();
  console.log(`Mint is now ${ACTION ? "ACTIVE" : "DISABLED"}`);
}

main().catch(console.error);
