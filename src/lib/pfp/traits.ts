// ── Trait Definitions for Hoodlrz PFP Generation ──
// Based on real SVG layer files in /public/layers/
// File counts verified from actual uploads.

export type RarityWeight = "common" | "uncommon" | "rare" | "legendary";

export interface TraitOption {
  name: string;
  file: string; // filename e.g. "eyes-1.svg"
  rarity: RarityWeight;
}

export interface TraitCategory {
  category: string;
  folder: string; // folder name e.g. "02-eyes"
  options: TraitOption[];
}

// Rarity weights used by the PRNG picker
export const RARITY_WEIGHTS: Record<RarityWeight, number> = {
  common: 40,
  uncommon: 25,
  rare: 10,
  legendary: 5,
};

// ── Variant (light / dark) ──
export type LayerVariant = "light" | "dark";

// Helper to generate trait options from file counts
function makeTraits(
  prefix: string,
  count: number,
  skip: number[] = []
): TraitOption[] {
  const result: TraitOption[] = [];
  for (let i = 1; i <= count; i++) {
    if (skip.includes(i)) continue;
    const pct = i / count;
    let rarity: RarityWeight;
    if (pct > 0.85) rarity = "legendary";
    else if (pct > 0.65) rarity = "rare";
    else if (pct > 0.35) rarity = "uncommon";
    else rarity = "common";
    result.push({
      name: `${prefix} ${i}`,
      file: `${prefix}-${i}.svg`,
      rarity,
    });
  }
  return result;
}

// ── Walls: wall-1 to wall-10 (both light & dark) ──
export const WALLS: TraitOption[] = makeTraits("wall", 10);

// ── Foregrounds: foreground-1 to foreground-11 (both light & dark) ──
export const FOREGROUNDS: TraitOption[] = makeTraits("foreground", 11);

// ── Eyes: eyes-1 to eyes-21 (both light & dark) ──
export const EYES: TraitOption[] = makeTraits("eyes", 21);

// ── Accessories: object-1 to object-17 (both light & dark) ──
export const ACCESSORIES: TraitOption[] = makeTraits("object", 17);

// ── Mouths ──
// Light: mouth-1 to mouth-20, MISSING mouth-11
// Both variants now have mouth-1 to mouth-20 (mouth-11.svg was added)
export const MOUTHS_LIGHT: TraitOption[] = makeTraits("mouth", 20);
export const MOUTHS_DARK: TraitOption[] = makeTraits("mouth", 20);

// Default mouths (union - used for rarity calc)
export const MOUTHS: TraitOption[] = makeTraits("mouth", 20);

// ── Hoodies: hoodie-1 to hoodie-12 (both light & dark) ──
export const HOODIES: TraitOption[] = makeTraits("hoodie", 12);

// ── Graffitis ──
// Light: graffiti-1 to graffiti-23
// Dark: graffiti-1 to graffiti-24, MISSING graffiti-23
export const GRAFFITIS_LIGHT: TraitOption[] = makeTraits("graffiti", 23);
export const GRAFFITIS_DARK: TraitOption[] = makeTraits("graffiti", 24, [23]);

// Default graffitis (used for rarity calc)
export const GRAFFITIS: TraitOption[] = makeTraits("graffiti", 23);

// ── All categories for iteration (order = layer stacking, back to front) ──
// wall → graffiti → hoodie → eyes → mouth → accessory → foreground
export const ALL_TRAIT_CATEGORIES: TraitCategory[] = [
  { category: "wall", folder: "07-walls", options: WALLS },
  { category: "graffiti", folder: "06-graffitis", options: GRAFFITIS },
  { category: "hoodie", folder: "05-hoodies", options: HOODIES },
  { category: "eyes", folder: "02-eyes", options: EYES },
  { category: "mouth", folder: "04-mouths", options: MOUTHS },
  { category: "accessory", folder: "03-accessories", options: ACCESSORIES },
  { category: "foreground", folder: "01-foregrounds", options: FOREGROUNDS },
];
