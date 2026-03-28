"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";

/* ── Sample data — TODO: replace with Supabase query ── */
const COLLECTIONS = [
  {
    slug: "hoodlrz",
    name: "Hoodlrz",
    description:
      "The flagship collection. 10,000 unique hooded identities generated on-chain as SVGs. Own the culture.",
    supply: 10_000,
    minted: 2_347,
    priceCents: 4900,
    isGenesis: false,
    heroSeed: "hoodlrz-col-hero-001",
    dropDate: "2026-04-15T18:00:00Z",
  },
  {
    slug: "genesis",
    name: "Genesis",
    description:
      "Premium genesis pass. Limited to 500 holders. Unlocks early access, rare traits, and lifetime perks.",
    supply: 500,
    minted: 127,
    priceCents: 14900,
    isGenesis: true,
    heroSeed: "genesis-col-hero-001",
    dropDate: "2026-04-10T18:00:00Z",
  },
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function CollectionsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Header */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        Collections
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Explore drops from the Hoodlrz universe. Each collection is a unique
        world of digital identity.
      </p>

      {/* Grid */}
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {COLLECTIONS.map((col) => (
          <Link key={col.slug} href={`/collection/${col.slug}`}>
            <Card className="group flex flex-col gap-0 p-0 overflow-hidden">
              {/* Hero PFP */}
              <div className="relative w-full aspect-square overflow-hidden bg-[var(--surface)]">
                <PFPViewer
                  seed={col.heroSeed}
                  size={600}
                  className="aspect-square w-full"
                />
                {col.isGenesis && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="legendary">Genesis</Badge>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-3 p-5">
                <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                  {col.name}
                </h2>
                <p className="text-sm leading-relaxed text-muted line-clamp-2">
                  {col.description}
                </p>

                {/* Stats row */}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                  <span>
                    <span className="font-bold text-foreground">
                      {col.minted.toLocaleString()}
                    </span>
                    {" / "}
                    {col.supply.toLocaleString()} collected
                  </span>
                  <span className="font-bold text-foreground">
                    {formatPrice(col.priceCents)}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
