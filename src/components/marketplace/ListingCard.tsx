"use client";

import { useState } from "react";
import PFPViewer from "@/components/ui/PFPViewer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity } from "@/lib/pfp/rarity";

interface ListingCardProps {
  tokenId: string;
  seed: string;
  price: number;
  seller: string;
  isOwner: boolean;
}

const RARITY_BADGE_MAP = {
  Common: "default",
  Uncommon: "success",
  Rare: "rare",
  Legendary: "legendary",
} as const;

export default function ListingCard({
  tokenId,
  seed,
  price,
  seller,
  isOwner,
}: ListingCardProps) {
  const [loading, setLoading] = useState(false);
  const [bought, setBought] = useState(false);

  const { traits } = generatePFP(seed);
  const rarity = calculateRarity(traits);

  async function handleBuy() {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch("/api/marketplace/buy", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ tokenId }),
      // });
      await new Promise((r) => setTimeout(r, 800));
      setBought(true);
    } catch {
      // TODO: handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlist() {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await fetch("/api/marketplace/unlist", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ tokenId }),
      // });
      await new Promise((r) => setTimeout(r, 800));
    } catch {
      // TODO: handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      {/* PFP */}
      <div className="relative w-full aspect-square overflow-hidden bg-[var(--surface)]">
        <PFPViewer seed={seed} size={400} className="aspect-square w-full" />
        <div className="absolute top-2.5 left-2.5">
          <Badge variant={RARITY_BADGE_MAP[rarity.tier]}>{rarity.tier}</Badge>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            #{tokenId}
          </span>
          <span className="text-sm font-bold text-foreground">
            ${price.toFixed(2)}
          </span>
        </div>

        <p className="text-xs text-muted truncate">
          Seller: {seller}
        </p>

        {bought ? (
          <div className="flex items-center justify-center py-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
            Purchased
          </div>
        ) : isOwner ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUnlist}
            disabled={loading}
          >
            {loading ? "Unlisting..." : "Unlist"}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleBuy}
            disabled={loading}
          >
            {loading ? "Buying..." : "Buy Now"}
          </Button>
        )}
      </div>
    </Card>
  );
}
