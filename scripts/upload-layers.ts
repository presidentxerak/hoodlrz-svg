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

// Max data per SSTORE2 chunk (EIP-170 limit is 24576 bytes for runtime code,
// minus 1 byte for STOP opcode = 24575 usable). Use 24000 for safety.
const MAX_CHUNK_SIZE = 24000;

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

async function sendWithRetry(
  fn: () => Promise<ethers.TransactionResponse>,
  label: string,
  maxRetries = 3
): Promise<boolean> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const tx = await fn();
      await tx.wait();
      return true;
    } catch (err: unknown) {
      retries++;
      const msg = err instanceof Error ? err.message : String(err);
      if (retries < maxRetries && (msg.includes("429") || msg.includes("exceeded") || msg.includes("per second"))) {
        const wait = retries * 4;
        console.log(`    [WAIT] Rate limited on ${label}, waiting ${wait}s... (retry ${retries}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait * 1000));
      } else {
        console.error(`  [ERR] ${label} - ${msg.slice(0, 150)}`);
        return false;
      }
    }
  }
  return false;
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

      for (let i = 1; i <= cat.count; i++) {
        const filePath = join(catPath, `${cat.prefix}${i}.svg`);
        if (!existsSync(filePath)) continue;

        // Check if already uploaded
        try {
          const has = await layerStore.hasLayer(variant.id, cat.id, i);
          if (has) { totalSkipped++; continue; }
          await new Promise(r => setTimeout(r, 200));
        } catch { /* new contract, no layers yet */ }

        const inner = extractSvgInner(readFileSync(filePath, "utf-8"));
        const dataBytes = ethers.toUtf8Bytes(inner);

        if (dataBytes.length <= MAX_CHUNK_SIZE) {
          // Single chunk — use storeLayer
          const ok = await sendWithRetry(
            () => layerStore.storeLayer(variant.id, cat.id, i, dataBytes, { gasLimit: 8_000_000n }),
            `${cat.folder} #${i} (${dataBytes.length}B)`
          );
          if (ok) {
            totalUploaded++;
            console.log(`  [TX] ${cat.folder} #${i} - uploaded (${dataBytes.length}B)`);
          } else {
            totalFailed++;
          }
        } else {
          // Multi-chunk — split and use storeLayerChunk
          const numChunks = Math.ceil(dataBytes.length / MAX_CHUNK_SIZE);
          console.log(`  [CHUNKED] ${cat.folder} #${i} - ${dataBytes.length}B → ${numChunks} chunks`);

          let allOk = true;
          for (let c = 0; c < numChunks; c++) {
            const start = c * MAX_CHUNK_SIZE;
            const end = Math.min(start + MAX_CHUNK_SIZE, dataBytes.length);
            const chunk = dataBytes.slice(start, end);

            const ok = await sendWithRetry(
              () => layerStore.storeLayerChunk(variant.id, cat.id, i, c, chunk, { gasLimit: 8_000_000n }),
              `${cat.folder} #${i} chunk ${c}/${numChunks} (${chunk.length}B)`
            );
            if (!ok) { allOk = false; break; }
            console.log(`    chunk ${c + 1}/${numChunks} uploaded (${chunk.length}B)`);
            await new Promise(r => setTimeout(r, 1500));
          }

          if (allOk) {
            totalUploaded++;
            console.log(`  [TX] ${cat.folder} #${i} - all ${numChunks} chunks uploaded`);
          } else {
            totalFailed++;
          }
        }

        // Delay between layers to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  console.log(`\nDone: ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalFailed} failed`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
