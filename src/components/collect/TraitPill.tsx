"use client";

import type { RarityWeight } from "@/lib/pfp/traits";

interface TraitPillProps {
  category: string;
  value: string;
  rarity: RarityWeight;
  /** Delay in ms before the pill animates in */
  delay?: number;
}

const RARITY_STYLES: Record<RarityWeight, string> = {
  common: "border-[var(--border)] text-muted bg-[var(--surface)]",
  uncommon: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  rare: "border-violet-500/40 text-violet-400 bg-violet-500/10",
  legendary: "border-amber-400/50 text-amber-400 bg-amber-500/10",
};

export default function TraitPill({
  category,
  value,
  rarity,
  delay = 0,
}: TraitPillProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 border px-2.5 py-1",
        "text-[10px] font-bold uppercase tracking-widest leading-none",
        "opacity-0",
        RARITY_STYLES[rarity],
      ].join(" ")}
      style={{
        animation: `trait-pill-in 0.4s ease-out ${delay}ms forwards`,
      }}
    >
      <span className="text-muted">{category}</span>
      <span className="text-[8px] text-muted/50">|</span>
      <span>{value}</span>
    </span>
  );
}
