// ── Trait Definitions for Hoodlrz PFP Generation ──

export type RarityWeight = "common" | "uncommon" | "rare" | "legendary";

export interface TraitOption {
  name: string;
  rarity: RarityWeight;
}

export interface TraitCategory {
  category: string;
  options: TraitOption[];
}

// Rarity weights used by the PRNG picker
export const RARITY_WEIGHTS: Record<RarityWeight, number> = {
  common: 40,
  uncommon: 25,
  rare: 10,
  legendary: 5,
};

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
];
