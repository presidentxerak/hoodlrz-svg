"use client";

import { useMemo, useState, useCallback } from "react";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity, rarityColor } from "@/lib/pfp/rarity";

interface PFPViewerProps {
  seed: string;
  size?: number;
  className?: string;
}

export default function PFPViewer({
  seed,
<<<<<<< HEAD
  size = 400,
=======
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  className = "",
}: PFPViewerProps) {
  const [showTraits, setShowTraits] = useState(false);

<<<<<<< HEAD
  const { svg, traits } = useMemo(() => generatePFP(seed), [seed]);
=======
  const { layers, traits, variant } = useMemo(() => generatePFP(seed), [seed]);
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

  const rarity = useMemo(() => calculateRarity(traits), [traits]);

  const toggle = useCallback(() => setShowTraits((p) => !p), []);

  const tierColor = rarityColor(rarity.tier);

  return (
    <div
<<<<<<< HEAD
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{ width: size, height: size, maxWidth: "100%" }}
=======
      className={`relative overflow-hidden aspect-square w-full ${className}`}
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      onMouseEnter={() => setShowTraits(true)}
      onMouseLeave={() => setShowTraits(false)}
      onClick={toggle}
    >
<<<<<<< HEAD
      {/* SVG artwork */}
      <div
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Rarity badge - always visible */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold"
        style={{
          backgroundColor: tierColor,
          color: rarity.tier === "Common" ? "#1a1a1a" : "#fff",
          fontSize: Math.max(10, size * 0.03),
        }}
      >
        {rarity.tier} ({rarity.score})
=======
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: variant === "dark" ? "#000" : "#fff" }}
      />

      {/* Layer stack */}
      {layers.map((layer, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${layer.category}-${i}`}
          src={layer.path}
          alt={layer.name}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover" }}
          loading="lazy"
        />
      ))}

      {/* Rarity badge */}
      <div
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 py-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: tierColor,
          color: rarity.tier === "Common" ? "#1a1a1a" : "#fff",
        }}
      >
        {rarity.tier}
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      </div>

      {/* Trait badges overlay */}
      <div
<<<<<<< HEAD
        className="absolute inset-0 flex flex-col justify-end p-2 transition-opacity duration-200"
=======
        className="absolute inset-0 flex flex-col justify-end p-1.5 sm:p-2 transition-opacity duration-200"
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
        style={{
          opacity: showTraits ? 1 : 0,
          pointerEvents: showTraits ? "auto" : "none",
          background: "linear-gradient(transparent 40%, rgba(0,0,0,0.75) 100%)",
        }}
      >
<<<<<<< HEAD
        <div
          className="flex flex-wrap gap-1"
          style={{ fontSize: Math.max(9, size * 0.026) }}
        >
          {Object.entries(traits).map(([category, value]) => {
            const traitRarity = rarity.breakdown[category];
            const badgeColor = traitRarity
              ? rarityColor(
                  traitRarity === "legendary"
                    ? "Legendary"
                    : traitRarity === "rare"
                      ? "Rare"
                      : traitRarity === "uncommon"
                        ? "Uncommon"
                        : "Common"
                )
              : "#666";

            return (
              <span
                key={category}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(0,0,0,0.6)",
                  border: `1px solid ${badgeColor}44`,
                  color: "#e0e0e0",
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: Math.max(5, size * 0.015),
                    height: Math.max(5, size * 0.015),
                    backgroundColor: badgeColor,
                  }}
                />
                <span className="opacity-60 capitalize">{category}:</span>{" "}
                {value}
              </span>
            );
          })}
=======
        <div className="flex flex-wrap gap-0.5 sm:gap-1 text-[8px] sm:text-[10px]">
          {Object.entries(traits)
            .filter(([key]) => key !== "variant")
            .map(([category, value]) => {
              const traitRarity = rarity.breakdown[category];
              const badgeColor = traitRarity
                ? rarityColor(
                    traitRarity === "legendary"
                      ? "Legendary"
                      : traitRarity === "rare"
                        ? "Rare"
                        : traitRarity === "uncommon"
                          ? "Uncommon"
                          : "Common"
                  )
                : "#666";

              return (
                <span
                  key={category}
                  className="inline-flex items-center gap-0.5 px-1 py-0.5"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: `1px solid ${badgeColor}44`,
                    color: "#e0e0e0",
                  }}
                >
                  <span
                    className="inline-block w-1 h-1 sm:w-1.5 sm:h-1.5"
                    style={{ backgroundColor: badgeColor }}
                  />
                  <span className="opacity-60 capitalize">{category}:</span>{" "}
                  {value}
                </span>
              );
            })}
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
        </div>
      </div>
    </div>
  );
}
