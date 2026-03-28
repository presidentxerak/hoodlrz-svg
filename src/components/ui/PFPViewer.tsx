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
  size = 400,
  className = "",
}: PFPViewerProps) {
  const [showTraits, setShowTraits] = useState(false);

  const { layers, traits, variant } = useMemo(() => generatePFP(seed), [seed]);

  const rarity = useMemo(() => calculateRarity(traits), [traits]);

  const toggle = useCallback(() => setShowTraits((p) => !p), []);

  const tierColor = rarityColor(rarity.tier);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size, maxWidth: "100%" }}
      onMouseEnter={() => setShowTraits(true)}
      onMouseLeave={() => setShowTraits(false)}
      onClick={toggle}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: variant === "dark" ? "#000" : "#fff" }}
      />

      {/* Layer stack — using <img> intentionally for SVG layer composition */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {layers.map((layer, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${layer.category}-${i}`}
          src={layer.path}
          alt={layer.name}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "contain" }}
          loading="lazy"
        />
      ))}

      {/* Rarity badge - always visible */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
        style={{
          backgroundColor: tierColor,
          color: rarity.tier === "Common" ? "#1a1a1a" : "#fff",
          fontSize: Math.max(10, size * 0.03),
        }}
      >
        {rarity.tier}
      </div>

      {/* Trait badges overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-2 transition-opacity duration-200"
        style={{
          opacity: showTraits ? 1 : 0,
          pointerEvents: showTraits ? "auto" : "none",
          background: "linear-gradient(transparent 40%, rgba(0,0,0,0.75) 100%)",
        }}
      >
        <div
          className="flex flex-wrap gap-1"
          style={{ fontSize: Math.max(9, size * 0.026) }}
        >
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
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: `1px solid ${badgeColor}44`,
                    color: "#e0e0e0",
                  }}
                >
                  <span
                    className="inline-block"
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
        </div>
      </div>
    </div>
  );
}
