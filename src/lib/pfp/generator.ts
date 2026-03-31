// ── SVG PFP Generator for Hoodlrz ──
// Composes real SVG layer files into a single PFP.
// Deterministic: same seed ALWAYS produces the same combination.

import { seedToNumber } from "./hash";
import {
  WALLS,
  FOREGROUNDS,
  EYES,
  MOUTHS_LIGHT,
  MOUTHS_DARK,
  HOODIES,
  ACCESSORIES,
  GRAFFITIS_LIGHT,
  GRAFFITIS_DARK,
  RARITY_WEIGHTS,
  type TraitOption,
  type LayerVariant,
} from "./traits";

// ── Result type ──

export interface PFPResult {
  /** Composite SVG string (uses <image> references to layer files) */
  svg: string;
  /** Layer paths in stacking order for rendering */
  layers: LayerInfo[];
  /** Trait names map */
  traits: Record<string, string>;
  /** JSON string of traits */
  traitsJson: string;
  /** light or dark variant */
  variant: LayerVariant;
}

export interface LayerInfo {
  category: string;
  name: string;
  file: string;
  path: string; // full public path e.g. "/layers/02-layers-dark/02-eyes/eyes-1.svg"
}

/** @deprecated Use PFPResult instead */
export type GeneratedPFP = PFPResult;

// ── Mulberry32 PRNG ──

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function pickTrait(options: TraitOption[], rand: () => number): TraitOption {
  const totalWeight = options.reduce(
    (sum, o) => sum + RARITY_WEIGHTS[o.rarity],
    0
  );
  let r = rand() * totalWeight;
  for (const option of options) {
    r -= RARITY_WEIGHTS[option.rarity];
    if (r <= 0) return option;
  }
  return options[options.length - 1];
}

/**
 * Build the public path to a layer SVG file.
 */
function layerPath(
  variant: LayerVariant,
  folder: string,
  file: string
): string {
  const variantFolder = variant === "light" ? "01-layers-light" : "02-layers-dark";
  return `/layers/${variantFolder}/${folder}/${file}`;
}

// ════════════════════════════════════════
// Main generator
// ════════════════════════════════════════

/**
 * Generate a PFP composition from a seed string.
 * Returns the list of layers and a composite SVG.
 * Deterministic: same seed always produces the same output.
 */
export function generatePFP(seed: string): PFPResult {
  const rand = mulberry32(seedToNumber(seed));

  // Pick variant (light or dark)
  const variant: LayerVariant = rand() > 0.5 ? "dark" : "light";

  // Use variant-specific trait lists (file availability differs between light/dark)
  const mouths = variant === "light" ? MOUTHS_LIGHT : MOUTHS_DARK;
  const graffitis = variant === "light" ? GRAFFITIS_LIGHT : GRAFFITIS_DARK;

  // Pick one trait from each category
  const wall = pickTrait(WALLS, rand);
  const graffiti = pickTrait(graffitis, rand);
  const hoodie = pickTrait(HOODIES, rand);
  const eyes = pickTrait(EYES, rand);
  const mouth = pickTrait(mouths, rand);
  const accessory = pickTrait(ACCESSORIES, rand);
  const foreground = pickTrait(FOREGROUNDS, rand);

  const traits: Record<string, string> = {
    variant,
    wall: wall.name,
    graffiti: graffiti.name,
    hoodie: hoodie.name,
    eyes: eyes.name,
    mouth: mouth.name,
    accessory: accessory.name,
    foreground: foreground.name,
  };

  // Build layers in stacking order (back to front)
  // 1. Wall (brick background)
  // 2. Graffiti (on the wall, behind character)
  // 3. Hoodie (the character body)
  // 4. Eyes (on the face)
  // 5. Mouth (on the face)
  // 6. Accessories (headphones etc, on top of character)
  // 7. Foreground (decorative overlay, topmost)
  const layerDefs: { category: string; trait: TraitOption; folder: string }[] = [
    { category: "wall", trait: wall, folder: "07-walls" },
    { category: "graffiti", trait: graffiti, folder: "06-graffitis" },
    { category: "hoodie", trait: hoodie, folder: "05-hoodies" },
    { category: "eyes", trait: eyes, folder: "02-eyes" },
    { category: "mouth", trait: mouth, folder: "04-mouths" },
    { category: "accessory", trait: accessory, folder: "03-accessories" },
    { category: "foreground", trait: foreground, folder: "01-foregrounds" },
  ];

  const layers: LayerInfo[] = [];

  for (const def of layerDefs) {
    if (!def.trait.file) continue;
    const path = layerPath(variant, def.folder, def.trait.file);
    layers.push({
      category: def.category,
      name: def.trait.name,
      file: def.trait.file,
      path,
    });
  }

  // Build composite SVG using <image> references
  // Native layer size is 600x600
  const size = 600;
  const imageElements = layers
    .map(
      (l) =>
        `  <image href="${l.path}" x="0" y="0" width="${size}" height="${size}" />`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${variant === "dark" ? "#000000" : "#ffffff"}" />
${imageElements}
</svg>`;

  return {
    svg,
    layers,
    traits,
    traitsJson: JSON.stringify(traits, null, 2),
    variant,
  };
}
