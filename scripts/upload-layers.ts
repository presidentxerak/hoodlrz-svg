import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Upload all SVG layer data to the HoodlrzLayerStore contract.
 *
 * Layer structure:
 *   public/layers/01-layers-light/  (variant 0)
 *   public/layers/02-layers-dark/   (variant 1)
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
  { id: 0, folder: "07-walls",       prefix: "wall-",       count: 10 },
  { id: 1, folder: "06-graffitis",   prefix: "graffiti-",   count: 24 }, // varies by variant
  { id: 2, folder: "05-hoodies",     prefix: "hoodie-",     count: 12 },
  { id: 3, folder: "02-eyes",        prefix: "eyes-",       count: 21 },
  { id: 4, folder: "04-mouths",      prefix: "mouth-",      count: 20 }, // varies by variant
  { id: 5, folder: "03-accessories", prefix: "object-",     count: 17 },
  { id: 6, folder: "01-foregrounds", prefix: "foreground-", count: 11 },
];

/**
 * Extract the inner content of an SVG file (everything between <svg> and </svg>).
 * Strips the outer <svg> tag so the renderer can wrap it.
 */
function extractSvgInner(svgContent: string): string {
  // Remove XML declaration if present
  let inner = svgContent.replace(/<\?xml[^?]*\?>\s*/g, "");
  // Remove outer <svg ...> and </svg>
  inner = inner.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.trim();
}

async function main() {
  if (!LAYER_STORE_ADDRESS) {
    console.error("Set LAYER_STORE_ADDRESS env var to the deployed LayerStore address.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Uploading layers with:", deployer.address);

  const layerStore = await ethers.getContractAt("HoodlrzLayerStore", LAYER_STORE_ADDRESS);

  const layersRoot = path.resolve(__dirname, "../public/layers");
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const variant of VARIANTS) {
    const variantPath = path.join(layersRoot, variant.folder);
    console.log(`\n═══ Variant: ${variant.folder} (${variant.id}) ═══`);

    for (const cat of CATEGORIES) {
      const catPath = path.join(variantPath, cat.folder);
      if (!fs.existsSync(catPath)) {
        console.log(`  [SKIP] ${cat.folder} — directory not found`);
        continue;
      }

      // Batch: collect all layers for this category
      const batchVariants: number[] = [];
      const batchCategories: number[] = [];
      const batchIndices: number[] = [];
      const batchDatas: string[] = [];

      for (let i = 1; i <= cat.count; i++) {
        const filename = `${cat.prefix}${i}.svg`;
        const filePath = path.join(catPath, filename);

        if (!fs.existsSync(filePath)) continue;

        // Check if already uploaded
        const hasLayer = await layerStore.hasLayer(variant.id, cat.id, i);
        if (hasLayer) {
          totalSkipped++;
          continue;
        }

        const svgContent = fs.readFileSync(filePath, "utf-8");
        const innerSvg = extractSvgInner(svgContent);

        batchVariants.push(variant.id);
        batchCategories.push(cat.id);
        batchIndices.push(i);
        batchDatas.push(innerSvg);
      }

      if (batchDatas.length === 0) {
        console.log(`  [OK] ${cat.folder} — all layers already uploaded`);
        continue;
      }

      // Upload in batches of 5 to avoid gas limit
      const BATCH_SIZE = 5;
      for (let b = 0; b < batchDatas.length; b += BATCH_SIZE) {
        const end = Math.min(b + BATCH_SIZE, batchDatas.length);
        const v = batchVariants.slice(b, end);
        const c = batchCategories.slice(b, end);
        const idx = batchIndices.slice(b, end);
        const d = batchDatas.slice(b, end).map((s) => ethers.toUtf8Bytes(s));

        try {
          const tx = await layerStore.storeLayerBatch(v, c, idx, d, {
            gasLimit: 30_000_000n,
          });
          await tx.wait();
          totalUploaded += end - b;
          console.log(`  [TX] ${cat.folder} indices ${idx.join(",")} — uploaded`);
        } catch (err: unknown) {
          totalFailed += end - b;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  [ERR] ${cat.folder} indices ${idx.join(",")} — ${msg.slice(0, 100)}`);
        }
      }
    }
  }

  console.log("\n══════════════════════════════════════");
  console.log(`  Upload complete: ${totalUploaded} new, ${totalSkipped} skipped, ${totalFailed} failed`);
  console.log("══════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
