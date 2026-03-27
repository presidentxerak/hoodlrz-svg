"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import TraitPill from "./TraitPill";
import { generatePFP } from "@/lib/pfp/generator";
import { downloadPNG } from "@/lib/pfp/export";
import { calculateRarity, rarityColor } from "@/lib/pfp/rarity";
import type { RarityTier } from "@/lib/pfp/rarity";
import type { RarityWeight } from "@/lib/pfp/traits";

type Stage = 1 | 2 | 3 | 4 | 5;

interface RevealOverlayProps {
  isOpen: boolean;
  seed: string;
  username: string;
  serialNumber: number;
  onClose: () => void;
  collectionSlug: string;
  onCollectAgain?: () => void;
}

const TIER_BADGE_VARIANT: Record<RarityTier, string> = {
  Common: "border-[var(--border)] text-muted bg-[var(--surface)]",
  Uncommon: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  Rare: "border-violet-500/40 text-violet-400 bg-violet-500/10",
  Legendary: "border-amber-400/50 text-amber-400 bg-amber-500/10",
};

export default function RevealOverlay({
  isOpen,
  seed,
  username,
  serialNumber,
  onClose,
  collectionSlug,
  onCollectAgain,
}: RevealOverlayProps) {
  const [stage, setStage] = useState<Stage>(1);
  const [copied, setCopied] = useState(false);

  // Generate PFP data from seed
  const pfpData = useMemo(() => {
    if (!seed) return null;
    try {
      const { svg, traits } = generatePFP(seed);
      const rarity = calculateRarity(traits);
      return { svg, traits, rarity };
    } catch {
      return null;
    }
  }, [seed]);

  // Stage progression with timeouts
  useEffect(() => {
    if (!isOpen) {
      setStage(1);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setStage(2), 500));
    timers.push(setTimeout(() => setStage(3), 2000));
    timers.push(setTimeout(() => setStage(4), 2500));
    timers.push(setTimeout(() => setStage(5), 3800));

    return () => timers.forEach(clearTimeout);
  }, [isOpen, seed]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/${collectionSlug}/${serialNumber}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [collectionSlug, serialNumber]);

  const handleDownload = useCallback(() => {
    if (!pfpData) return;
    downloadPNG(seed, `hoodlrz-${serialNumber}`);
  }, [pfpData, seed, serialNumber]);

  const serial = `#${String(serialNumber).padStart(4, "0")}`;
  const traitEntries = pfpData
    ? Object.entries(pfpData.traits).filter(
        ([, val]) => val && val !== "None"
      )
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="reveal-container relative w-full max-w-lg mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        {/* ── Stage 1: Black pulse ── */}
        <div
          className="absolute inset-0 bg-black transition-opacity duration-500"
          style={{ opacity: stage >= 2 ? 0 : 1, pointerEvents: "none" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle, #1a1a1a 0%, #000 70%)",
              animation: "reveal-pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── Stage 2-3: PFP with scan reveal ── */}
        {pfpData && (
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex-shrink-0">
            {/* PFP artwork */}
            <div
              className="reveal-artwork relative w-full h-full"
              style={{
                clipPath:
                  stage >= 3
                    ? "inset(0 0 0 0)"
                    : stage >= 2
                      ? undefined
                      : "inset(100% 0 0 0)",
                transition: stage >= 3 ? "clip-path 0.5s ease-out" : undefined,
                animation:
                  stage === 2
                    ? "reveal-scan-clip 1.5s ease-in-out forwards"
                    : undefined,
                transform: stage >= 3 ? "scale(1.02)" : "scale(1)",
                transitionProperty: "transform, clip-path",
                transitionDuration: "0.5s",
              }}
              dangerouslySetInnerHTML={{ __html: pfpData.svg }}
            />

            {/* Scan line */}
            {stage === 2 && (
              <div
                className="absolute left-0 right-0 h-1 pointer-events-none z-10"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(229,62,62,0.8), rgba(213,63,140,0.6), transparent)",
                  boxShadow:
                    "0 0 20px rgba(229,62,62,0.5), 0 0 40px rgba(213,63,140,0.3)",
                  animation: "reveal-scan-line 1.5s ease-in-out forwards",
                }}
              />
            )}

            {/* Glitch overlay (stage 2 only) */}
            {stage === 2 && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  mixBlendMode: "screen",
                  animation: "glitch 0.3s ease-in-out 0.5s 2",
                  opacity: 0.3,
                }}
                dangerouslySetInnerHTML={{ __html: pfpData.svg }}
              />
            )}

            {/* Glow ring (stage 3+) */}
            {stage >= 3 && (
              <div
                className="absolute -inset-3 pointer-events-none z-0"
                style={{
                  boxShadow: `0 0 30px ${rarityColor(pfpData.rarity.tier)}40, 0 0 60px ${rarityColor(pfpData.rarity.tier)}20`,
                  animation: "reveal-glow 2s ease-in-out infinite",
                  opacity: 0,
                  animationFillMode: "forwards",
                  animationDelay: "0.1s",
                }}
              />
            )}
          </div>
        )}

        {/* ── Stage 4: Identity moment ── */}
        {stage >= 4 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            {/* Username */}
            <p
              className="text-white/60 text-sm tracking-widest uppercase opacity-0"
              style={{
                animation: "reveal-text-in 0.6s ease-out forwards",
              }}
            >
              Collected by{" "}
              <span className="text-white font-bold">{username}</span>
            </p>

            {/* Serial number */}
            <p
              className="text-2xl font-bold text-white tracking-wider font-hoodlrz opacity-0"
              style={{
                animation: "reveal-text-in 0.6s ease-out 0.15s forwards",
              }}
            >
              {serial}
            </p>

            {/* Rarity badge */}
            {pfpData && (
              <span
                className={[
                  "inline-flex items-center gap-2 border px-3 py-1.5",
                  "text-xs font-bold uppercase tracking-widest",
                  "opacity-0",
                  TIER_BADGE_VARIANT[pfpData.rarity.tier],
                ].join(" ")}
                style={{
                  animation: "reveal-text-in 0.6s ease-out 0.3s forwards",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: rarityColor(pfpData.rarity.tier),
                  }}
                />
                {pfpData.rarity.tier}
                <span className="text-[10px] font-normal opacity-60">
                  {pfpData.rarity.score}/100
                </span>
              </span>
            )}

            {/* Trait pills */}
            {pfpData && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-sm">
                {traitEntries.map(([cat, val], i) => (
                  <TraitPill
                    key={cat}
                    category={cat}
                    value={val}
                    rarity={
                      (pfpData.rarity.breakdown[cat] as RarityWeight) ||
                      "common"
                    }
                    delay={450 + i * 100}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Stage 5: Actions ── */}
        {stage >= 5 && (
          <div
            className="mt-8 flex flex-wrap justify-center gap-3 opacity-0"
            style={{
              animation: "reveal-text-in 0.5s ease-out forwards",
            }}
          >
            <a
              href="/my-collection"
              className="reveal-action-btn border border-white/20 text-white hover:bg-white/10"
            >
              View Collection
            </a>

            {onCollectAgain && (
              <button
                onClick={onCollectAgain}
                className="reveal-action-btn text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #E53E3E 0%, #D53F8C 100%)",
                }}
              >
                Collect Again
              </button>
            )}

            <button
              onClick={handleShare}
              className="reveal-action-btn border border-white/20 text-white hover:bg-white/10"
            >
              {copied ? "Copied!" : "Share"}
            </button>

            <button
              onClick={handleDownload}
              className="reveal-action-btn border border-white/20 text-white hover:bg-white/10"
            >
              Download
            </button>
          </div>
        )}

        {/* Close button */}
        {stage >= 4 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-2xl leading-none opacity-0"
            style={{
              animation: "reveal-text-in 0.4s ease-out 0.5s forwards",
            }}
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>
    </Modal>
  );
}
