"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity, type RarityTier } from "@/lib/pfp/rarity";

/* ── Sample tokens across collections — TODO: replace with Supabase query ── */
function generateAllTokens() {
  const collections = [
    { slug: "hoodlrz", name: "Hoodlrz", count: 16 },
    { slug: "genesis", name: "Genesis", count: 8 },
  ];

  const tokens: Array<{
    id: string;
    seed: string;
    tokenNumber: number;
    collectionSlug: string;
    collectionName: string;
    traits: Record<string, string>;
    rarity: ReturnType<typeof calculateRarity>;
  }> = [];

  for (const col of collections) {
    for (let i = 1; i <= col.count; i++) {
      const seed = `${col.slug}-token-${String(i).padStart(4, "0")}`;
      const pfp = generatePFP(seed);
      const rarity = calculateRarity(pfp.traits);
      tokens.push({
        id: `${col.slug}-${i}`,
        seed,
        tokenNumber: i,
        collectionSlug: col.slug,
        collectionName: col.name,
        traits: pfp.traits,
        rarity,
      });
    }
  }

  return tokens;
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

export default function GlobalGalleryPage() {
  const allTokens = useMemo(() => generateAllTokens(), []);

  const [filterCollection, setFilterCollection] = useState("");
  const [filterTrait, setFilterTrait] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortBy, setSortBy] = useState<"number" | "rarity">("number");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  /* Unique collection names */
  const collections = useMemo(() => {
    const set = new Set(allTokens.map((t) => t.collectionSlug));
    return Array.from(set);
  }, [allTokens]);

  /* Trait values for selected trait category */
  const traitValues = useMemo(() => {
    if (!filterTrait) return [];
    const vals = new Set(allTokens.map((t) => t.traits[filterTrait]));
    return Array.from(vals).sort();
  }, [allTokens, filterTrait]);

  /* Filter + sort */
  const displayTokens = useMemo(() => {
    let tokens = [...allTokens];

    if (filterCollection) {
      tokens = tokens.filter((t) => t.collectionSlug === filterCollection);
    }
    if (filterTrait && filterValue) {
      tokens = tokens.filter((t) => t.traits[filterTrait] === filterValue);
    }
    if (sortBy === "rarity") {
      tokens.sort((a, b) => b.rarity.score - a.rarity.score);
    } else {
      tokens.sort((a, b) => a.tokenNumber - b.tokenNumber);
    }

    return tokens;
  }, [allTokens, filterCollection, filterTrait, filterValue, sortBy]);

  const visibleTokens = displayTokens.slice(0, visibleCount);
  const hasMore = visibleCount < displayTokens.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => c + ITEMS_PER_PAGE);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Header */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        Gallery
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Browse every identity across the Hoodlrz universe.
      </p>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-end gap-4">
        {/* Collection filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Collection
          </label>
          <select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none"
          >
            <option value="">All Collections</option>
            {collections.map((slug) => (
              <option key={slug} value={slug}>
                {slug.charAt(0).toUpperCase() + slug.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Trait filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Trait
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
              />
              <div className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">
                    #{token.tokenNumber}
                  </span>
                  <span className="text-[10px] text-muted">
                    {token.collectionName}
                  </span>
                </div>
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
