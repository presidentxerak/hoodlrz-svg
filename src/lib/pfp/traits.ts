// ── Trait Definitions for Hoodlrz PFP Generation ──
// Based on real SVG layer files in /public/layers/

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

// ── Walls (background) ──
export const WALLS: TraitOption[] = [
  { name: "Brick Classic", file: "wall-1.svg", rarity: "common" },
  { name: "Brick Worn", file: "wall-2.svg", rarity: "common" },
  { name: "Brick Stack", file: "wall-3.svg", rarity: "common" },
  { name: "Brick Mixed", file: "wall-4.svg", rarity: "common" },
  { name: "Cracked", file: "wall-5.svg", rarity: "uncommon" },
  { name: "Decay", file: "wall-6.svg", rarity: "uncommon" },
  { name: "Scatter", file: "wall-7.svg", rarity: "rare" },
  { name: "Fragment", file: "wall-8.svg", rarity: "rare" },
  { name: "Dots", file: "wall-9.svg", rarity: "rare" },
  { name: "Glitch", file: "wall-10.svg", rarity: "legendary" },
];

// ── Foregrounds ──
export const FOREGROUNDS: TraitOption[] = [
  { name: "Tag", file: "foreground-1.svg", rarity: "common" },
  { name: "Lines", file: "foreground-2.svg", rarity: "common" },
  { name: "Skyline", file: "foreground-3.svg", rarity: "common" },
  { name: "Wave", file: "foreground-4.svg", rarity: "uncommon" },
  { name: "Spark", file: "foreground-5.svg", rarity: "uncommon" },
  { name: "Minimal", file: "foreground-6.svg", rarity: "uncommon" },
  { name: "KID", file: "foreground-7.svg", rarity: "rare" },
  { name: "Blush", file: "foreground-8.svg", rarity: "rare" },
  { name: "Pink Tag", file: "foreground-9.svg", rarity: "rare" },
  { name: "Fire", file: "foreground-10.svg", rarity: "legendary" },
  { name: "Scatter", file: "foreground-11.svg", rarity: "legendary" },
];

// ── Eyes ──
export const EYES: TraitOption[] = [
  { name: "Round", file: "eyes-1.svg", rarity: "common" },
  { name: "Sharp", file: "eyes-2.svg", rarity: "common" },
  { name: "X Eyes", file: "eyes-3.svg", rarity: "common" },
  { name: "Drop", file: "eyes-4.svg", rarity: "common" },
  { name: "Dot Dot", file: "eyes-5.svg", rarity: "common" },
  { name: "Wide", file: "eyes-6.svg", rarity: "uncommon" },
  { name: "Oval", file: "eyes-7.svg", rarity: "uncommon" },
  { name: "Split", file: "eyes-8.svg", rarity: "uncommon" },
  { name: "Lash", file: "eyes-9.svg", rarity: "uncommon" },
  { name: "Plus", file: "eyes-10.svg", rarity: "uncommon" },
  { name: "Infinity", file: "eyes-11.svg", rarity: "rare" },
  { name: "Glitch", file: "eyes-12.svg", rarity: "rare" },
  { name: "Arrow", file: "eyes-13.svg", rarity: "rare" },
  { name: "Dash", file: "eyes-14.svg", rarity: "rare" },
  { name: "Swirl", file: "eyes-15.svg", rarity: "rare" },
  { name: "Double", file: "eyes-16.svg", rarity: "rare" },
  { name: "Squint", file: "eyes-17.svg", rarity: "rare" },
  { name: "Flame", file: "eyes-18.svg", rarity: "legendary" },
  { name: "Slash", file: "eyes-19.svg", rarity: "legendary" },
  { name: "Star", file: "eyes-20.svg", rarity: "legendary" },
  { name: "Visor", file: "eyes-21.svg", rarity: "legendary" },
];

// ── Accessories ──
export const ACCESSORIES: TraitOption[] = [
  { name: "Headphones", file: "object-1.svg", rarity: "common" },
  { name: "Monitor", file: "object-2.svg", rarity: "common" },
  { name: "Cap Green", file: "object-3.svg", rarity: "common" },
  { name: "Cap Dark", file: "object-4.svg", rarity: "common" },
  { name: "Earbuds", file: "object-5.svg", rarity: "uncommon" },
  { name: "Headband", file: "object-6.svg", rarity: "uncommon" },
  { name: "DJ Set", file: "object-7.svg", rarity: "uncommon" },
  { name: "Crown", file: "object-8.svg", rarity: "uncommon" },
  { name: "Visor Green", file: "object-9.svg", rarity: "rare" },
  { name: "Headset", file: "object-10.svg", rarity: "rare" },
  { name: "Bandana Red", file: "object-11.svg", rarity: "rare" },
  { name: "Bandana Blue", file: "object-12.svg", rarity: "rare" },
  { name: "Cap Pink", file: "object-13.svg", rarity: "rare" },
  { name: "Cap Green Alt", file: "object-14.svg", rarity: "rare" },
  { name: "Beanie", file: "object-15.svg", rarity: "legendary" },
  { name: "Goggles", file: "object-16.svg", rarity: "legendary" },
  { name: "Shades", file: "object-17.svg", rarity: "legendary" },
];

// ── Mouths ──
export const MOUTHS: TraitOption[] = [
  { name: "Smirk", file: "mouth-1.svg", rarity: "common" },
  { name: "Grin", file: "mouth-2.svg", rarity: "common" },
  { name: "Wide", file: "mouth-3.svg", rarity: "common" },
  { name: "Dot", file: "mouth-4.svg", rarity: "common" },
  { name: "Circle", file: "mouth-5.svg", rarity: "common" },
  { name: "Curve", file: "mouth-6.svg", rarity: "uncommon" },
  { name: "Frown", file: "mouth-7.svg", rarity: "uncommon" },
  { name: "Tongue", file: "mouth-8.svg", rarity: "uncommon" },
  { name: "Wave", file: "mouth-9.svg", rarity: "uncommon" },
  { name: "Flat", file: "mouth-10.svg", rarity: "uncommon" },
  { name: "Dash", file: "mouth-11.svg", rarity: "rare" },
  { name: "Corner", file: "mouth-12.svg", rarity: "rare" },
  { name: "Bracket", file: "mouth-13.svg", rarity: "rare" },
  { name: "Heart", file: "mouth-14.svg", rarity: "rare" },
  { name: "Drool", file: "mouth-15.svg", rarity: "rare" },
  { name: "Fangs", file: "mouth-16.svg", rarity: "legendary" },
  { name: "Line", file: "mouth-17.svg", rarity: "legendary" },
  { name: "Stitch", file: "mouth-18.svg", rarity: "legendary" },
  { name: "Tilde", file: "mouth-19.svg", rarity: "legendary" },
  { name: "Cross", file: "mouth-20.svg", rarity: "legendary" },
];

// ── Hoodies ──
// Count unknown from screenshots, assuming similar range
export const HOODIES: TraitOption[] = [
  { name: "Classic Black", file: "hoodie-1.svg", rarity: "common" },
  { name: "Classic Gray", file: "hoodie-2.svg", rarity: "common" },
  { name: "Classic White", file: "hoodie-3.svg", rarity: "common" },
  { name: "Street Red", file: "hoodie-4.svg", rarity: "common" },
  { name: "Street Blue", file: "hoodie-5.svg", rarity: "uncommon" },
  { name: "Street Green", file: "hoodie-6.svg", rarity: "uncommon" },
  { name: "Urban Purple", file: "hoodie-7.svg", rarity: "uncommon" },
  { name: "Urban Orange", file: "hoodie-8.svg", rarity: "rare" },
  { name: "Urban Pink", file: "hoodie-9.svg", rarity: "rare" },
  { name: "Gold", file: "hoodie-10.svg", rarity: "legendary" },
];

// ── Graffitis ──
export const GRAFFITIS: TraitOption[] = [
  { name: "Tag 1", file: "graffiti-1.svg", rarity: "common" },
  { name: "Tag 2", file: "graffiti-2.svg", rarity: "common" },
  { name: "Tag 3", file: "graffiti-3.svg", rarity: "uncommon" },
  { name: "Tag 4", file: "graffiti-4.svg", rarity: "uncommon" },
  { name: "Tag 5", file: "graffiti-5.svg", rarity: "rare" },
  { name: "Tag 6", file: "graffiti-6.svg", rarity: "rare" },
  { name: "Tag 7", file: "graffiti-7.svg", rarity: "legendary" },
  { name: "Tag 8", file: "graffiti-8.svg", rarity: "legendary" },
  { name: "None", file: "", rarity: "common" },
];

// ── All categories for iteration (order = layer stacking, back to front) ──
// Order: foregrounds, eyes, accessories, mouths, hoodies, graffitis, walls
export const ALL_TRAIT_CATEGORIES: TraitCategory[] = [
  { category: "foreground", folder: "01-foregrounds", options: FOREGROUNDS },
  { category: "eyes", folder: "02-eyes", options: EYES },
  { category: "accessory", folder: "03-accessories", options: ACCESSORIES },
  { category: "mouth", folder: "04-mouths", options: MOUTHS },
  { category: "hoodie", folder: "05-hoodies", options: HOODIES },
  { category: "graffiti", folder: "06-graffitis", options: GRAFFITIS },
  { category: "wall", folder: "07-walls", options: WALLS },
];
