"use client";

import { useMemo, useState } from "react";
import ListingCard from "./ListingCard";

/* ── Sample data -- TODO: replace with Supabase query ── */
const SAMPLE_SELLERS = [
  "0xAbstract",
  "HoodCollector",
  "NFTWhale",
  "PixelPunk",
  "CryptoKid",
  "ShadowMint",
  "RareFinder",
  "DigiArt",
];

function generateSampleListings() {
  return Array.from({ length: 10 }, (_, i) => ({
    tokenId: String(1000 + i),
    seed: `marketplace-listing-${i}-${Math.floor(Math.random() * 99999)}`,
    price: parseFloat((5 + Math.random() * 195).toFixed(2)),
    seller: SAMPLE_SELLERS[i % SAMPLE_SELLERS.length],
    isOwner: i === 2, // one item is "yours" for demo
    createdAt: Date.now() - i * 3600_000,
  }));
}

type SortOption = "price-asc" | "price-desc" | "recent";

export default function MarketplaceGrid() {
  const listings = useMemo(generateSampleListings, []);
  const [sort, setSort] = useState<SortOption>("recent");

  const sorted = useMemo(() => {
    const copy = [...listings];
    switch (sort) {
      case "price-asc":
        return copy.sort((a, b) => a.price - b.price);
      case "price-desc":
        return copy.sort((a, b) => b.price - a.price);
      case "recent":
      default:
        return copy.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [listings, sort]);

  return (
    <div className="flex flex-col gap-8">
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          <span className="font-bold text-foreground">{sorted.length}</span>{" "}
          listings
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted">
            Sort
          </span>
          {(
            [
              { value: "recent", label: "Recent" },
              { value: "price-asc", label: "Price: Low" },
              { value: "price-desc", label: "Price: High" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={[
                "px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-150",
                "border",
                sort === opt.value
                  ? "border-accent-red text-accent-red bg-accent-red/5"
                  : "border-[var(--border)] text-muted hover:text-foreground hover:border-foreground/30",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((listing) => (
          <ListingCard
            key={listing.tokenId}
            tokenId={listing.tokenId}
            seed={listing.seed}
            price={listing.price}
            seller={listing.seller}
            isOwner={listing.isOwner}
          />
        ))}
      </div>
    </div>
  );
}
