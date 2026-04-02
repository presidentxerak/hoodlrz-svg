import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Upload all SVG layer data to the HoodlrzLayerStore contract.
 *
 * Category mapping (matches contract):
 *   0 = wall       (07-walls)
 *   1 = graffiti    (06-graffitis)
 *   2 = hoodie      (05-hoodies)
 *   3 = eyes        (02-eyes)
 *   4 = mouth       (04-mouths)
 *   5 = accessory   (03-accessories)
 *   6 = foreground  (01-foregrounds)
 */

const LAYER_STORE_ADDRESS = process.env.LAYER_STORE_ADDRESS || "";

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

function loadArtifact(name: string) {
  const artifactPath = resolve(
    __dirname,
    `../artifacts/contracts/${name}.sol/${name}.json`
  );
  return JSON.parse(readFileSync(artifactPath, "utf-8"));
}

async function main() {
  if (!LAYER_STORE_ADDRESS) {
    console.error(
      "Set LAYER_STORE_ADDRESS env var to the deployed LayerStore address."
    );
    process.exit(1);
  }

  const provider = new ethers.BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner();
  console.log("Uploading layers with:", deployer.address);

  const artifact = loadArtifact("HoodlrzLayerStore");
  const layerStore = new ethers.Contract(
    LAYER_STORE_ADDRESS,
    artifact.abi,
    deployer
  );

  const layersRoot = path.resolve(__dirname, "../public/layers");
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const variant of VARIANTS) {
    const variantPath = path.join(layersRoot, variant.folder);
    console.log(`\n=== Variant: ${variant.folder} (${variant.id}) ===`);

    for (const cat of CATEGORIES) {
      const catPath = path.join(variantPath, cat.folder);
      if (!fs.existsSync(catPath)) {
        console.log(`  [SKIP] ${cat.folder} - directory not found`);
        continue;
      }

      const batchVariants: number[] = [];
      const batchCategories: number[] = [];
      const batchIndices: number[] = [];
      const batchDatas: Uint8Array[] = [];

      for (let i = 1; i <= cat.count; i++) {
        const filename = `${cat.prefix}${i}.svg`;
        const filePath = path.join(catPath, filename);

        if (!fs.existsSync(filePath)) continue;

        try {
          const hasLayer = await layerStore.hasLayer(variant.id, cat.id, i);
          if (hasLayer) {
            totalSkipped++;
            continue;
          }
        } catch {
          // hasLayer might fail if contract is new, continue
        }

        const svgContent = fs.readFileSync(filePath, "utf-8");
        const innerSvg = extractSvgInner(svgContent);

        batchVariants.push(variant.id);
        batchCategories.push(cat.id);
        batchIndices.push(i);
        batchDatas.push(ethers.toUtf8Bytes(innerSvg));
      }

      if (batchDatas.length === 0) {
        console.log(`  [OK] ${cat.folder} - all layers already uploaded`);
        continue;
      }

      // Upload in batches of 5 to avoid gas limit
      const BATCH_SIZE = 5;
      for (let b = 0; b < batchDatas.length; b += BATCH_SIZE) {
        const end = Math.min(b + BATCH_SIZE, batchDatas.length);
        const v = batchVariants.slice(b, end);
        const c = batchCategories.slice(b, end);
        const idx = batchIndices.slice(b, end);
        const d = batchDatas.slice(b, end);

        try {
          const tx = await layerStore.storeLayerBatch(v, c, idx, d, {
            gasLimit: 30_000_000n,
          });
          await tx.wait();
          totalUploaded += end - b;
          console.log(
            `  [TX] ${cat.folder} indices ${idx.join(",")} - uploaded`
          );
        } catch (err: unknown) {
          totalFailed += end - b;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `  [ERR] ${cat.folder} indices ${idx.join(",")} - ${msg.slice(0, 100)}`
          );
        }
      }
    }
  }

  console.log("\n======================================");
  console.log(
    `  Upload complete: ${totalUploaded} new, ${totalSkipped} skipped, ${totalFailed} failed`
  );
  console.log("======================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
