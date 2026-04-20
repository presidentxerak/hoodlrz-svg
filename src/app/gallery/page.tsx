"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity, type RarityTier } from "@/lib/pfp/rarity";
import { HOODLRZ_NFT_ADDRESS, CURRENT_CHAIN } from "@/lib/web3/config";

interface OnChainToken {
  tokenId: number;
  seed: string;
  owner: string;
  traits: Record<string, string>;
  rarity: ReturnType<typeof calculateRarity>;
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
  const [tokens, setTokens] = useState<OnChainToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalMinted, setTotalMinted] = useState(0);

  const [filterTrait, setFilterTrait] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "listed" | "unlisted">("all");
  const [sortBy, setSortBy] = useState<"number" | "rarity">("number");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const fetchAllTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.debug) console.warn("[gallery] debug:", data.debug);

      setTotalMinted(data.totalSupply);

      const enriched: OnChainToken[] = data.tokens.map(
        (t: { tokenId: number; seed: string; owner: string }) => {
          const pfp = generatePFP(t.seed);
          const rarity = calculateRarity(pfp.traits);
          return { ...t, traits: pfp.traits, rarity };
        }
      );

      setTokens(enriched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[gallery] Failed to fetch tokens:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTokens();
  }, [fetchAllTokens]);

  const traitValues = useMemo(() => {
    if (!filterTrait) return [];
    const vals = new Set(tokens.map((t) => t.traits[filterTrait]));
    return Array.from(vals).sort();
  }, [tokens, filterTrait]);

  const displayTokens = useMemo(() => {
    let filtered = [...tokens];

    if (filterStatus === "listed") {
      filtered = filtered.filter((t) => t.owner === "marketplace");
    } else if (filterStatus === "unlisted") {
      filtered = filtered.filter((t) => t.owner !== "marketplace");
    }

    if (filterTrait && filterValue) {
      filtered = filtered.filter((t) => t.traits[filterTrait] === filterValue);
    }

    if (sortBy === "rarity") {
      filtered.sort((a, b) => b.rarity.score - a.rarity.score);
    } else {
      filtered.sort((a, b) => a.tokenId - b.tokenId);
    }

    return filtered;
  }, [tokens, filterTrait, filterValue, filterStatus, sortBy]);

  const visibleTokens = displayTokens.slice(0, visibleCount);
  const hasMore = visibleCount < displayTokens.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => c + ITEMS_PER_PAGE);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-20">
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        Gallery
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Browse every minted Hoodlrz NFT on Ethereum.
        {totalMinted > 0 && (
          <span className="ml-1 text-foreground font-bold">
            {totalMinted} minted
          </span>
        )}
      </p>

      {error && (
        <div className="mt-6 border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchAllTokens}
            className="mt-2 text-xs text-muted hover:text-foreground underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && tokens.length === 0 && !error && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
          <p className="text-sm text-muted animate-pulse">
            Loading NFTs from Ethereum...
          </p>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="mt-8 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "listed" | "unlisted")}
              className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="all">All</option>
              <option value="listed">Listed</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>

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
      )}

      {visibleTokens.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {visibleTokens.map((token) => (
            <a
              key={token.tokenId}
              href={`${CURRENT_CHAIN.explorerUrl}/token/${HOODLRZ_NFT_ADDRESS || "0x3468802ffcE5Aa75793cA555eb485A4eCD67449e"}?a=${token.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="group flex flex-col border border-[var(--border)] bg-white dark:bg-[var(--surface)] transition-transform duration-200 hover:-translate-y-1">
                <div className="relative aspect-square w-full">
                  <PFPViewer
                    seed={token.seed}
                    size={400}
                    className="aspect-square w-full"
                    hideRarity
                  />
                </div>
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">
                      #{String(token.tokenId).padStart(4, "0")}
                    </span>
                    <span className="text-[10px] text-muted truncate max-w-[80px]">
                      {token.owner.slice(0, 6)}...{token.owner.slice(-4)}
                    </span>
                  </div>
                  <Badge variant={rarityBadgeVariant(token.rarity.tier)}>
                    {token.rarity.tier}
                  </Badge>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <Button variant="secondary" size="md" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}

      {!loading && tokens.length === 0 && !error && (
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="text-sm text-muted">No NFTs minted yet.</p>
          <Button variant="primary" size="md" href="/collection/hoodlrz">
            Mint Now
          </Button>
        </div>
      )}

      {!loading && displayTokens.length === 0 && tokens.length > 0 && (
        <div className="mt-16 flex justify-center">
          <p className="text-sm text-muted">No tokens match your filters.</p>
        </div>
      )}
    </div>
  );
}
