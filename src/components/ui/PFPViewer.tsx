"use client";

import { useMemo, useState, useCallback } from "react";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity, rarityColor } from "@/lib/pfp/rarity";

interface PFPViewerProps {
  seed: string;
  size?: number;
  className?: string;
  example?: boolean;
}

export default function PFPViewer({
  seed,
  className = "",
  example = false,
}: PFPViewerProps) {
  const [showTraits, setShowTraits] = useState(false);

  const { layers, traits, variant } = useMemo(() => generatePFP(seed), [seed]);

  const rarity = useMemo(() => calculateRarity(traits), [traits]);

  const toggle = useCallback(() => setShowTraits((p) => !p), []);

  const tierColor = rarityColor(rarity.tier);

  return (
    <div
      className={`relative overflow-hidden aspect-square w-full ${className}`}
      onMouseEnter={() => setShowTraits(true)}
      onMouseLeave={() => setShowTraits(false)}
      onClick={toggle}
    >
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
      </div>

      {/* Example banner */}
      {example && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap"
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "3px 0",
              width: "150%",
              left: "-25%",
              top: "50%",
              transform: "translateY(-50%) rotate(-35deg)",
              letterSpacing: "0.15em",
            }}
          >
            Example &bull; Not in drop
          </div>
        </div>
      )}

      {/* Trait badges overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-1.5 sm:p-2 transition-opacity duration-200"
        style={{
          opacity: showTraits ? 1 : 0,
          pointerEvents: showTraits ? "auto" : "none",
          background: "linear-gradient(transparent 40%, rgba(0,0,0,0.75) 100%)",
        }}
      >
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
        </div>
      </div>
    </div>
  );
}
