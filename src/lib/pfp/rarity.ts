// ── Rarity Calculator for Hoodlrz PFP ──

import {
  ALL_TRAIT_CATEGORIES,
  type RarityWeight,
} from "./traits";

export type RarityTier = "Common" | "Uncommon" | "Rare" | "Legendary";

export interface RarityResult {
  score: number; // 0-100
  tier: RarityTier;
  breakdown: Record<string, RarityWeight>;
}

const RARITY_SCORE: Record<RarityWeight, number> = {
  common: 10,
  uncommon: 25,
  rare: 55,
  legendary: 100,
};

/**
 * Calculate the combined rarity of a set of traits.
 * Returns a score (0-100) and a tier label.
 */
export function calculateRarity(
  traits: Record<string, string>
): RarityResult {
  const breakdown: Record<string, RarityWeight> = {};
  let totalScore = 0;
  let traitCount = 0;

  for (const cat of ALL_TRAIT_CATEGORIES) {
    const traitName = traits[cat.category];
    if (!traitName) continue;

    const option = cat.options.find((o) => o.name === traitName);
    if (!option) continue;

    breakdown[cat.category] = option.rarity;
    totalScore += RARITY_SCORE[option.rarity];
    traitCount++;
  }

  const avgScore = traitCount > 0 ? totalScore / traitCount : 0;

  // Boost if multiple rare/legendary traits appear together
  const rareCount = Object.values(breakdown).filter(
    (r) => r === "rare" || r === "legendary"
  ).length;
  const bonus = rareCount >= 3 ? 15 : rareCount >= 2 ? 8 : 0;
  const finalScore = Math.min(100, Math.round(avgScore + bonus));

  let tier: RarityTier;
  if (finalScore >= 70) tier = "Legendary";
  else if (finalScore >= 45) tier = "Rare";
  else if (finalScore >= 25) tier = "Uncommon";
  else tier = "Common";

  return { score: finalScore, tier, breakdown };
}

/**
 * Get the color associated with a rarity tier (for UI display).
 */
export function rarityColor(tier: RarityTier): string {
  switch (tier) {
    case "Legendary":
      return "#f0c929";
    case "Rare":
      return "#e94560";
    case "Uncommon":
      return "#1b9c85";
    case "Common":
    default:
      return "#9ca3af";
  }
}
