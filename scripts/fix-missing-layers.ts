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
const LAYER_STORE_ADDRESS = process.env.LAYER_STORE_ADDRESS || "0x3468802ffcE5Aa75793cA555eb485A4eCD67449e";
const NETWORK = process.argv[2] || "sepolia";

const RPC_URLS: Record<string, string> = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

function extractSvgInner(svgContent: string): string {
  let inner = svgContent.replace(/<\?xml[^?]*\?>\s*/g, "");
  inner = inner.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.trim();
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const artifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzLayerStore.sol/HoodlrzLayerStore.json"), "utf-8")
  );
  const layerStore = new ethers.Contract(LAYER_STORE_ADDRESS, artifact.abi, deployer);

  const missing = [
    { variant: 0, category: 4, index: 11, path: "01-layers-light/04-mouths/mouth-11.svg" },
    { variant: 1, category: 1, index: 23, path: "02-layers-dark/06-graffitis/graffiti-23.svg" },
  ];

  for (const m of missing) {
    const filePath = resolve(__dirname, `../public/layers/${m.path}`);
    const inner = extractSvgInner(readFileSync(filePath, "utf-8"));
    const dataBytes = ethers.toUtf8Bytes(inner);
    console.log(`Uploading ${m.path} (${dataBytes.length}B)...`);

    const tx = await layerStore.storeLayer(m.variant, m.category, m.index, dataBytes, { gasLimit: 8_000_000n });
    await tx.wait();
    console.log(`  Done! TX: ${tx.hash}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\nAll missing layers uploaded!");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
