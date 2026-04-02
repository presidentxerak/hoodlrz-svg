"use client";

import { useParams } from "next/navigation";
import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity, type RarityTier } from "@/lib/pfp/rarity";

/* ── Generate sample tokens — TODO: replace with Supabase query ── */
function generateSampleTokens(collectionSlug: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const seed = `${collectionSlug}-token-${String(i + 1).padStart(4, "0")}`;
    const pfp = generatePFP(seed);
    const rarity = calculateRarity(pfp.traits);
    return {
      id: `${collectionSlug}-${i + 1}`,
      seed,
      tokenNumber: i + 1,
      traits: pfp.traits,
      rarity,
    };
  });
}

const TRAIT_CATEGORIES = [
  "wall",
  "graffiti",
  "hoodie",
  "eyes",
  "mouth",
  "accessory",
  "foreground",
];

const ITEMS_PER_PAGE = 12;

function rarityBadgeVariant(
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

export default function CollectionGalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const allTokens = useMemo(
    () => generateSampleTokens(slug, 24),
    [slug]
  );

  const [filterTrait, setFilterTrait] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortBy, setSortBy] = useState<"number" | "rarity">("number");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  /* Unique values for the selected trait filter */
  const traitValues = useMemo(() => {
    if (!filterTrait) return [];
    const vals = new Set(allTokens.map((t) => t.traits[filterTrait]));
    return Array.from(vals).sort();
  }, [allTokens, filterTrait]);

  /* Filter + sort */
  const displayTokens = useMemo(() => {
    let tokens = [...allTokens];

    if (filterTrait && filterValue) {
      tokens = tokens.filter((t) => t.traits[filterTrait] === filterValue);
    }

    if (sortBy === "rarity") {
      tokens.sort((a, b) => b.rarity.score - a.rarity.score);
    } else {
      tokens.sort((a, b) => a.tokenNumber - b.tokenNumber);
    }

    return tokens;
  }, [allTokens, filterTrait, filterValue, sortBy]);

  const visibleTokens = displayTokens.slice(0, visibleCount);
  const hasMore = visibleCount < displayTokens.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => c + ITEMS_PER_PAGE);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link
          href={`/collection/${slug}`}
          className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to collection
        </Link>
        <h1 className="mt-2 font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[44px]">
          {slug.charAt(0).toUpperCase() + slug.slice(1)} Gallery
        </h1>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-end gap-4">
        {/* Trait filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Filter by trait
          </label>
          <select
            value={filterTrait}
            onChange={(e) => {
              setFilterTrait(e.target.value);
              setFilterValue("");
            }}
            className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          >
            <option value="">All traits</option>
            {TRAIT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Trait value */}
        {filterTrait && traitValues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Value
            </label>
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="">All</option>
              {traitValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Sort
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "number" | "rarity")}
            className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          >
            <option value="number">Token #</option>
            <option value="rarity">Rarity Score</option>
          </select>
        </div>

        <span className="ml-auto text-xs text-muted">
          {displayTokens.length} items
        </span>
      </div>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {visibleTokens.map((token) => (
          <Link key={token.id} href={`/token/${token.id}`}>
            <div className="group flex flex-col border border-[var(--border)] bg-white dark:bg-[var(--surface)] transition-transform duration-200 hover:-translate-y-1">
              <PFPViewer
                seed={token.seed}
                size={400}
                className="aspect-square w-full"
                example
              />
              <div className="flex items-center justify-between p-3">
                <span className="text-xs font-bold text-foreground">
                  #{token.tokenNumber}
                </span>
                <Badge variant={rarityBadgeVariant(token.rarity.tier)}>
                  {token.rarity.tier}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <Button variant="secondary" size="md" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}

      {displayTokens.length === 0 && (
        <div className="mt-16 flex justify-center">
          <p className="text-sm text-muted">No tokens match your filters.</p>
        </div>
      )}
    </div>
  );
}
