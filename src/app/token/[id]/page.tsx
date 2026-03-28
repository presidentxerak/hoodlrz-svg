"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";
import { generatePFP, type PFPResult } from "@/lib/pfp/generator";
import {
  calculateRarity,
  rarityColor,
  type RarityResult,
  type RarityTier,
} from "@/lib/pfp/rarity";
import type { RarityWeight } from "@/lib/pfp/traits";

/* ── Helpers ── */

function parseSeedFromId(id: string): { collectionSlug: string; tokenNumber: number; seed: string } {
  // id format: "hoodlrz-3" or "genesis-12"
  const lastDash = id.lastIndexOf("-");
  const collectionSlug = id.substring(0, lastDash);
  const tokenNumber = parseInt(id.substring(lastDash + 1), 10);
  const seed = `${collectionSlug}-token-${String(tokenNumber).padStart(4, "0")}`;
  return { collectionSlug, tokenNumber, seed };
}

function traitRarityBadgeVariant(
  rarity: RarityWeight
): "default" | "success" | "rare" | "legendary" {
  switch (rarity) {
    case "legendary":
      return "legendary";
    case "rare":
      return "rare";
    case "uncommon":
      return "success";
    default:
      return "default";
  }
}

function tierBadgeVariant(
  tier: RarityTier
): "default" | "success" | "rare" | "legendary" {
  switch (tier) {
    case "Legendary":
      return "legendary";
    case "Rare":
      return "rare";
    case "Uncommon":
      return "success";
    default:
      return "default";
  }
}

/* ── Sample ownership history — TODO: replace with Supabase query ── */
const SAMPLE_HISTORY = [
  { event: "Minted", by: "Hoodlrz", date: "2026-03-20", price: null },
  { event: "Collected", by: "phantom_42", date: "2026-03-21", price: "$49" },
];

export default function TokenDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { collectionSlug, tokenNumber, seed } = useMemo(
    () => parseSeedFromId(id),
    [id]
  );

  const pfp: PFPResult = useMemo(() => generatePFP(seed), [seed]);
  const rarity: RarityResult = useMemo(
    () => calculateRarity(pfp.traits),
    [pfp.traits]
  );

  /* TODO: fetch real owner from Supabase */
  const owner = { pseudonym: "phantom_42" };
  const isOwned = false; // TODO: check if current user owns this token
  const isListed = false; // TODO: check if listed for sale

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Back link */}
      <Link
        href={`/collection/${collectionSlug}/gallery`}
        className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
      >
        &larr; Back to gallery
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* ── Left: PFP ── */}
        <div>
          <PFPViewer
            seed={seed}
            size={600}
            className="aspect-square w-full max-w-[600px]"
          />
        </div>

        {/* ── Right: Details ── */}
        <div className="flex flex-col gap-8">
          {/* Name + serial */}
          <div>
            <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[40px]">
              {collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1)} #{tokenNumber}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted">
              Serial: {seed}
            </p>
          </div>

          {/* Rarity score */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Rarity Score
              </span>
              <span
                className="font-hoodlrz text-3xl font-bold leading-none"
                style={{ color: rarityColor(rarity.tier) }}
              >
                {rarity.score}
              </span>
            </div>
            <Badge variant={tierBadgeVariant(rarity.tier)}>
              {rarity.tier}
            </Badge>
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Owner
            </span>
            <span className="text-sm font-semibold text-foreground">
              {owner.pseudonym}
            </span>
          </div>

          {/* Traits */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Traits
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {Object.entries(pfp.traits).map(([category, value]) => (
                <div
                  key={category}
                  className="flex flex-col gap-1 border border-[var(--border)] p-3"
                >
                  <span className="text-[10px] uppercase tracking-widest text-muted">
                    {category}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {value}
                    </span>
                    {rarity.breakdown[category] && (
                      <Badge
                        variant={traitRarityBadgeVariant(
                          rarity.breakdown[category]
                        )}
                      >
                        {rarity.breakdown[category]}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {/* TODO: implement download by extracting SVG from the generator */}
            <Button variant="secondary" size="md" onClick={() => {
              const blob = new Blob([pfp.svg], { type: "image/svg+xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${seed}.svg`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Download SVG
            </Button>

            {isListed && (
              <Button variant="primary" size="md">
                Buy
              </Button>
            )}

            {isOwned && !isListed && (
              <>
                <Button variant="primary" size="md">
                  Sell
                </Button>
                <Button variant="ghost" size="md">
                  Transfer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Ownership History ── */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          History
        </h2>
        {/* TODO: replace with real ownership_events from Supabase */}
        <div className="mt-4 flex flex-col gap-0">
          {SAMPLE_HISTORY.map((event, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-[var(--border)] py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">
                  {event.event}
                </span>
                <span className="text-muted">by {event.by}</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                {event.price && (
                  <span className="font-semibold text-foreground">
                    {event.price}
                  </span>
                )}
                <span className="text-xs">{event.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
