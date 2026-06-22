"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Button from "@/components/ui/Button";

const STREET_SUPPLY = 333;
const ITEMS_PER_PAGE = 24;

interface TraitAttribute {
  trait_type: string;
  value: string | number;
}

interface CollectionToken {
  tokenId: number;
  name: string;
  image: string;
  attributes: TraitAttribute[];
}

interface CollectionPayload {
  tokens: CollectionToken[];
  totalSupply: number;
  facets: Record<string, string[]>;
  contract: string;
  chainId: number;
  error?: string;
}

function openseaUrl(contract: string, tokenId: number) {
  return `https://opensea.io/assets/ethereum/${contract}/${tokenId}`;
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      <Hero />
      <Collection />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[70vh]">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hoodlrz-banner-1.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl text-center">
        <h1 className="font-hoodlrz text-[40px] font-bold leading-none tracking-wider text-white sm:text-[72px]">
          HOODLRZ
        </h1>
        <p className="font-hoodlrz max-w-3xl text-center text-2xl font-bold leading-tight tracking-wider text-white sm:text-4xl md:text-5xl">
          Own the identity. Collect the culture.
        </p>
        <p className="text-white/70 text-sm sm:text-base">
          {STREET_SUPPLY} NFTs · ERC-721 on Ethereum
        </p>
      </div>
    </section>
  );
}

function Collection() {
  const [data, setData] = useState<CollectionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({});
  const [expandedFacet, setExpandedFacet] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hoodlrz/collection");
      const payload = (await res.json()) as CollectionPayload;
      if (payload.error) throw new Error(payload.error);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const toggleFilter = useCallback((trait: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[trait] ?? []);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      if (set.size === 0) {
        delete next[trait];
      } else {
        next[trait] = set;
      }
      return next;
    });
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).reduce((acc, s) => acc + s.size, 0),
    [activeFilters],
  );

  const filteredTokens = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(activeFilters);
    if (entries.length === 0) return data.tokens;
    return data.tokens.filter((token) =>
      entries.every(([trait, vals]) => {
        const attr = token.attributes.find((a) => a.trait_type === trait);
        return attr ? vals.has(String(attr.value)) : false;
      }),
    );
  }, [data, activeFilters]);

  const visibleTokens = filteredTokens.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTokens.length;

  return (
    <section className="w-full bg-[var(--surface)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="font-hoodlrz text-[28px] font-bold tracking-wider text-foreground sm:text-[36px]">
              The Collection
            </h2>
            {data && (
              <p className="text-sm text-muted mt-2">
                {filteredTokens.length} of {data.totalSupply} shown
                {activeFilterCount > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-foreground underline hover:no-underline"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Mobile filter toggle */}
          {data && Object.keys(data.facets).length > 0 && (
            <button
              type="button"
              onClick={() => setShowMobileFilters((v) => !v)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-foreground hover:bg-[var(--background)]"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters sidebar */}
          {data && Object.keys(data.facets).length > 0 && (
            <aside
              className={[
                "border border-[var(--border)] bg-[var(--background)] p-4 flex flex-col gap-2 self-start",
                "lg:sticky lg:top-20",
                showMobileFilters ? "" : "hidden lg:flex",
              ].join(" ")}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Filters
              </p>
              {Object.entries(data.facets).map(([trait, values]) => {
                const open = expandedFacet === trait;
                const selected = activeFilters[trait]?.size ?? 0;
                return (
                  <div key={trait} className="border-t border-[var(--border)] pt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedFacet(open ? null : trait)}
                      className="w-full flex items-center justify-between py-2 text-left text-xs font-bold uppercase tracking-widest text-foreground hover:text-muted"
                    >
                      <span>
                        {trait}
                        {selected > 0 && (
                          <span className="ml-2 text-[10px] font-normal text-accent-red">
                            ({selected})
                          </span>
                        )}
                      </span>
                      <span className={`text-muted transition-transform ${open ? "rotate-45" : ""}`}>+</span>
                    </button>
                    {open && (
                      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1 pb-2">
                        {values.map((v) => {
                          const checked = activeFilters[trait]?.has(v) ?? false;
                          return (
                            <label
                              key={v}
                              className="flex items-center gap-2 cursor-pointer text-xs text-muted hover:text-foreground py-0.5"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFilter(trait, v)}
                                className="accent-accent-red"
                              />
                              <span>{v}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </aside>
          )}

          {/* Grid */}
          <div>
            {loading && (
              <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-8 h-8 border-2 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
                <p className="text-sm text-muted animate-pulse">
                  Loading collection…
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="border border-red-500/30 bg-red-500/10 p-6 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={fetchCollection}
                  className="mt-3 text-xs text-muted hover:text-foreground underline"
                >
                  Retry
                </button>
              </div>
            )}

            {data && !loading && filteredTokens.length === 0 && (
              <div className="border border-[var(--border)] p-12 text-center text-sm text-muted">
                No NFTs match your filters.{" "}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-foreground underline hover:no-underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {data && visibleTokens.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
                {visibleTokens.map((token) => (
                  <a
                    key={token.tokenId}
                    href={openseaUrl(data.contract, token.tokenId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col border border-[var(--border)] bg-[var(--background)] transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface)]">
                      {token.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={token.image}
                          alt={token.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                          #{token.tokenId}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span className="text-xs font-bold text-foreground truncate">
                        {token.name}
                      </span>
                      <span className="text-[10px] text-muted shrink-0 ml-2">
                        #{String(token.tokenId).padStart(4, "0")}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
