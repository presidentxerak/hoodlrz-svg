import { readFileSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: ".env.local" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const LAYER_STORE_ADDRESS = process.env.LAYER_STORE_ADDRESS || "";
const NETWORK = process.argv[2] || "sepolia";

const RPC_URLS: Record<string, string> = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

const VARIANTS = [
  { id: 0, folder: "01-layers-light" },
  { id: 1, folder: "02-layers-dark" },
];

const CATEGORIES = [
  { id: 0, folder: "07-walls", prefix: "wall-", count: 10 },
  { id: 1, folder: "06-graffitis", prefix: "graffiti-", count: 24 },
  { id: 2, folder: "05-hoodies", prefix: "hoodie-", count: 12 },
  { id: 3, folder: "02-eyes", prefix: "eyes-", count: 21 },
  { id: 4, folder: "04-mouths", prefix: "mouth-", count: 20 },
  { id: 5, folder: "03-accessories", prefix: "object-", count: 17 },
  { id: 6, folder: "01-foregrounds", prefix: "foreground-", count: 11 },
];

function extractSvgInner(svgContent: string): string {
  let inner = svgContent.replace(/<\?xml[^?]*\?>\s*/g, "");
  inner = inner.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.trim();
}

async function main() {
  if (!LAYER_STORE_ADDRESS) {
    console.error("Set LAYER_STORE_ADDRESS env var.");
    process.exit(1);
  }
  if (!DEPLOYER_PRIVATE_KEY || !ALCHEMY_API_KEY) {
    console.error("Missing DEPLOYER_PRIVATE_KEY or ALCHEMY_API_KEY in .env.local");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  console.log("Uploading layers with:", deployer.address);
  console.log("LayerStore:", LAYER_STORE_ADDRESS);

  const artifact = JSON.parse(
    readFileSync(resolve(__dirname, "../artifacts/contracts/HoodlrzLayerStore.sol/HoodlrzLayerStore.json"), "utf-8")
  );
  const layerStore = new ethers.Contract(LAYER_STORE_ADDRESS, artifact.abi, deployer);

  const layersRoot = resolve(__dirname, "../public/layers");
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const variant of VARIANTS) {
    const variantPath = join(layersRoot, variant.folder);
    console.log(`\n=== Variant: ${variant.folder} (${variant.id}) ===`);

    for (const cat of CATEGORIES) {
      const catPath = join(variantPath, cat.folder);
      if (!existsSync(catPath)) {
        console.log(`  [SKIP] ${cat.folder} - not found`);
        continue;
      }

      const batchV: number[] = [];
      const batchC: number[] = [];
      const batchI: number[] = [];
      const batchD: Uint8Array[] = [];

      for (let i = 1; i <= cat.count; i++) {
        const filePath = join(catPath, `${cat.prefix}${i}.svg`);
        if (!existsSync(filePath)) continue;

        try {
          const has = await layerStore.hasLayer(variant.id, cat.id, i);
          if (has) { totalSkipped++; continue; }
          await new Promise(r => setTimeout(r, 200));
        } catch { /* new contract, no layers yet */ }

        const inner = extractSvgInner(readFileSync(filePath, "utf-8"));
        batchV.push(variant.id);
        batchC.push(cat.id);
        batchI.push(i);
        batchD.push(ethers.toUtf8Bytes(inner));
      }

      if (batchD.length === 0) {
        console.log(`  [OK] ${cat.folder} - done`);
        continue;
      }

      const BATCH_SIZE = 1;
      for (let b = 0; b < batchD.length; b += BATCH_SIZE) {
        const end = Math.min(b + BATCH_SIZE, batchD.length);
        const indices = batchI.slice(b, end);
        let retries = 0;
        while (retries < 3) {
          try {
            const tx = await layerStore.storeLayerBatch(
              batchV.slice(b, end),
              batchC.slice(b, end),
              indices,
              batchD.slice(b, end),
              { gasLimit: 8_000_000n }
            );
            await tx.wait();
            totalUploaded += end - b;
            console.log(`  [TX] ${cat.folder} [${indices.join(",")}] - uploaded`);
            break;
          } catch (err: unknown) {
            retries++;
            const msg = err instanceof Error ? err.message : String(err);
            if (retries < 3 && (msg.includes("429") || msg.includes("exceeded") || msg.includes("per second"))) {
              const wait = retries * 3;
              console.log(`  [WAIT] Rate limited, waiting ${wait}s... (retry ${retries}/3)`);
              await new Promise(r => setTimeout(r, wait * 1000));
            } else {
              totalFailed += end - b;
              console.error(`  [ERR] ${cat.folder} [${indices.join(",")}] - ${msg.slice(0, 120)}`);
              break;
            }
          }
        }
        // Delay between batches to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  console.log(`\nDone: ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalFailed} failed`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
