// ── Trait Definitions for Hoodlrz PFP Generation ──
<<<<<<< HEAD
=======
// Based on real SVG layer files in /public/layers/
// File counts verified from actual uploads.
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

export type RarityWeight = "common" | "uncommon" | "rare" | "legendary";

export interface TraitOption {
  name: string;
<<<<<<< HEAD
=======
  file: string; // filename e.g. "eyes-1.svg"
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  rarity: RarityWeight;
}

export interface TraitCategory {
  category: string;
<<<<<<< HEAD
=======
  folder: string; // folder name e.g. "02-eyes"
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  options: TraitOption[];
}

// Rarity weights used by the PRNG picker
export const RARITY_WEIGHTS: Record<RarityWeight, number> = {
  common: 40,
  uncommon: 25,
  rare: 10,
  legendary: 5,
};

<<<<<<< HEAD
// ── Background ──
export const BACKGROUNDS: TraitOption[] = [
  { name: "Void Black", rarity: "common" },
  { name: "Midnight Navy", rarity: "common" },
  { name: "Storm Gray", rarity: "common" },
  { name: "Snow White", rarity: "uncommon" },
  { name: "Blood Red", rarity: "uncommon" },
  { name: "Royal Purple", rarity: "uncommon" },
  { name: "Deep Teal", rarity: "rare" },
  { name: "Electric Blue", rarity: "rare" },
  { name: "Emerald Green", rarity: "rare" },
  { name: "Sunset Orange", rarity: "rare" },
  { name: "Liquid Gold", rarity: "legendary" },
  { name: "Holographic", rarity: "legendary" },
];

export const BACKGROUND_COLORS: Record<string, string> = {
  "Void Black": "#0a0a0a",
  "Midnight Navy": "#0d1b2a",
  "Storm Gray": "#2d3436",
  "Snow White": "#f0ece2",
  "Blood Red": "#6b0f1a",
  "Royal Purple": "#2d1b69",
  "Deep Teal": "#0d4f4f",
  "Electric Blue": "#0a2463",
  "Emerald Green": "#0b3d2e",
  "Sunset Orange": "#5c2018",
  "Liquid Gold": "#4a3728",
  "Holographic": "#1a1a2e",
};

// ── Head Shape ──
export const HEADS: TraitOption[] = [
  { name: "Circle", rarity: "common" },
  { name: "Square", rarity: "common" },
  { name: "Rounded Square", rarity: "common" },
  { name: "Diamond", rarity: "uncommon" },
  { name: "Hexagon", rarity: "uncommon" },
  { name: "Pentagon", rarity: "rare" },
  { name: "Octagon", rarity: "rare" },
  { name: "Triangle", rarity: "legendary" },
];

// ── Eyes ──
export const EYES: TraitOption[] = [
  { name: "Dots", rarity: "common" },
  { name: "Lines", rarity: "common" },
  { name: "Circles", rarity: "common" },
  { name: "Wide", rarity: "uncommon" },
  { name: "Closed", rarity: "uncommon" },
  { name: "X-Marks", rarity: "uncommon" },
  { name: "Triangles", rarity: "rare" },
  { name: "Diamonds", rarity: "rare" },
  { name: "Slits", rarity: "rare" },
  { name: "Cyber", rarity: "legendary" },
];

// ── Mouth ──
export const MOUTHS: TraitOption[] = [
  { name: "Line", rarity: "common" },
  { name: "Smile", rarity: "common" },
  { name: "Frown", rarity: "uncommon" },
  { name: "Open", rarity: "uncommon" },
  { name: "Teeth", rarity: "rare" },
  { name: "Tongue", rarity: "rare" },
  { name: "Mask", rarity: "rare" },
  { name: "None", rarity: "legendary" },
];

// ── Hood ──
export const HOODS: TraitOption[] = [
  { name: "Classic", rarity: "common" },
  { name: "Beanie", rarity: "common" },
  { name: "Cap", rarity: "common" },
  { name: "Ninja", rarity: "uncommon" },
  { name: "Bandana", rarity: "uncommon" },
  { name: "Cyber", rarity: "rare" },
  { name: "Crown", rarity: "rare" },
  { name: "Mohawk", rarity: "rare" },
  { name: "Horns", rarity: "legendary" },
  { name: "Halo", rarity: "legendary" },
];

export const HOOD_COLORS: string[] = [
  "#1a1a2e", // dark navy
  "#16213e", // indigo
  "#533483", // purple
  "#e94560", // hot pink
  "#0f3460", // deep blue
  "#2c3333", // charcoal
  "#d4a574", // tan
  "#c84b31", // burnt orange
  "#1b9c85", // teal
  "#f0c929", // gold
];

// ── Accessory ──
export const ACCESSORIES: TraitOption[] = [
  { name: "None", rarity: "common" },
  { name: "Chain", rarity: "uncommon" },
  { name: "Earring", rarity: "uncommon" },
  { name: "Glasses", rarity: "uncommon" },
  { name: "Scar", rarity: "rare" },
  { name: "Tattoo", rarity: "rare" },
  { name: "Piercing", rarity: "rare" },
  { name: "Bandaid", rarity: "legendary" },
];

// ── Pattern Overlay ──
export const PATTERNS: TraitOption[] = [
  { name: "None", rarity: "common" },
  { name: "Stripes", rarity: "uncommon" },
  { name: "Dots", rarity: "uncommon" },
  { name: "Grid", rarity: "rare" },
  { name: "Noise", rarity: "rare" },
  { name: "Gradient", rarity: "legendary" },
];

// ── Skin tone palette ──
export const SKIN_TONES: string[] = [
  "#f5d6ba", // light
  "#e8b88a", // medium light
  "#c98b5e", // medium
  "#8d5c3e", // medium dark
  "#5c3a21", // dark
  "#d4a574", // warm tan
  "#b07c52", // bronze
  "#9b7653", // caramel
];

// ── All categories for iteration ──
export const ALL_TRAIT_CATEGORIES: TraitCategory[] = [
  { category: "background", options: BACKGROUNDS },
  { category: "head", options: HEADS },
  { category: "eyes", options: EYES },
  { category: "mouth", options: MOUTHS },
  { category: "hood", options: HOODS },
  { category: "accessory", options: ACCESSORIES },
  { category: "pattern", options: PATTERNS },
=======
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
// Dark: mouth-1 to mouth-20, all present
// We use the intersection (skip mouth-11 to be safe across both variants)
export const MOUTHS_LIGHT: TraitOption[] = makeTraits("mouth", 20, [11]);
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
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
];
