"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PFPViewer from "@/components/ui/PFPViewer";
import { generatePFP, type PFPResult } from "@/lib/pfp/generator";
import {
  calculateRarity,
  rarityColor,
  type RarityResult,
  type RarityTier,
} from "@/lib/pfp/rarity";
import type { RarityWeight } from "@/lib/pfp/traits";
import { getVinylById } from "@/lib/genesis/vinyls";

/* ── Helpers ── */

function parseSeedFromId(id: string): {
  collectionSlug: string;
  tokenNumber: number;
  seed: string;
} {
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

/* ── Placeholder data ── */

const PRICE_HISTORY_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const PRICE_HISTORY_VALUES = [0, 0, 0, 0, 0, 0, 0]; // empty — no sales yet

export default function TokenDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Check if this is a Genesis vinyl ID (e.g. "black-01", "white-03", "craft-10")
  const genesisVinyl = useMemo(() => getVinylById(id), [id]);

  const { collectionSlug, tokenNumber, seed } = useMemo(
    () => parseSeedFromId(id),
    [id]
  );

  const pfp: PFPResult = useMemo(() => generatePFP(seed), [seed]);
  const rarity: RarityResult = useMemo(
    () => calculateRarity(pfp.traits),
    [pfp.traits]
  );

  const owner = { pseudonym: "—" };

  // ── Genesis token: show vinyl page instead of PFP ──
  if (genesisVinyl) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
        <Link
          href="/collection/genesis"
          className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Genesis Collection
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="aspect-square overflow-hidden bg-[var(--surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={genesisVinyl.src}
              alt={`Genesis ${genesisVinyl.edition} #${String(genesisVinyl.number).padStart(2, "0")}`}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="legendary">Genesis</Badge>
                <span className="text-xs uppercase tracking-widest text-muted">
                  {genesisVinyl.edition} Edition
                </span>
              </div>
              <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[40px]">
                {genesisVinyl.edition} #{String(genesisVinyl.number).padStart(2, "0")}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Type</span>
                <span className="mt-1 block text-sm font-bold text-foreground">Physical + Digital</span>
              </Card>
              <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Edition</span>
                <span className="mt-1 block text-sm font-bold text-foreground">{genesisVinyl.edition}</span>
              </Card>
              <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Price</span>
                <span className="mt-1 block font-hoodlrz text-lg font-bold text-foreground">$300</span>
              </Card>
              <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Owner</span>
                <span className="mt-1 block text-sm font-semibold text-foreground">{owner.pseudonym}</span>
              </Card>
            </div>

            <Button variant="primary" size="lg" href={`/genesis/${genesisVinyl.id}`}>
              View Full Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Hoodlrz PFP token ──
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
              {collectionSlug.charAt(0).toUpperCase() +
                collectionSlug.slice(1)}{" "}
              #{tokenNumber}
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted">
              Serial: {seed}
            </p>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Current Price
              </span>
              <span className="mt-1 block font-hoodlrz text-lg font-bold leading-none text-foreground">
                --
              </span>
            </Card>
            <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Last Sale
              </span>
              <span className="mt-1 block font-hoodlrz text-lg font-bold leading-none text-foreground">
                --
              </span>
            </Card>
            <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Rarity Score
              </span>
              <span
                className="mt-1 block font-hoodlrz text-lg font-bold leading-none"
                style={{ color: rarityColor(rarity.tier) }}
              >
                {rarity.score}
              </span>
            </Card>
            <Card className="!p-4 hover:!translate-y-0 hover:!shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Owner
              </span>
              <span className="mt-1 block text-sm font-semibold leading-none text-foreground truncate">
                {owner.pseudonym}
              </span>
            </Card>
          </div>

          {/* Rarity badge */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Rarity Tier
              </span>
              <Badge variant={tierBadgeVariant(rarity.tier)}>
                {rarity.tier}
              </Badge>
            </div>
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
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                import("@/lib/pfp/export").then(({ downloadSVG }) =>
                  downloadSVG(seed, seed)
                );
              }}
            >
              Download SVG
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                import("@/lib/pfp/export").then(({ downloadPNG }) =>
                  downloadPNG(seed, seed)
                );
              }}
            >
              Download PFP
            </Button>
          </div>

          <p className="text-xs text-muted">
            Listing, selling, and transferring will be available after the drop.
          </p>
        </div>
      </div>

      {/* ── Price History ── */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Price History
        </h2>
        <Card className="mt-4 hover:!translate-y-0 hover:!shadow-none">
          {PRICE_HISTORY_VALUES.every((v) => v === 0) ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm font-semibold text-muted">
                Activity will appear after the drop
              </p>
            </div>
          ) : (
            /* CSS bar chart */
            <div className="flex items-end justify-between gap-2 h-40">
              {PRICE_HISTORY_DAYS.map((day, i) => {
                const max = Math.max(...PRICE_HISTORY_VALUES, 1);
                const pct = (PRICE_HISTORY_VALUES[i] / max) * 100;
                return (
                  <div
                    key={day}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full max-w-[32px] bg-accent-red/80 transition-all duration-300"
                        style={{ height: `${pct}%`, minHeight: pct > 0 ? "4px" : "0px" }}
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* ── Activity ── */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Activity
        </h2>
        <Card className="mt-4 hover:!translate-y-0 hover:!shadow-none !p-0 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 border-b border-[var(--border)] px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Date
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Event
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              From
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              To
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted text-right">
              Price
            </span>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-semibold text-muted">
              Activity will appear after the drop
            </p>
          </div>
        </Card>
      </section>

    </div>
  );
}
