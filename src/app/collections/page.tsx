"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";

<<<<<<< HEAD
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

=======
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
<<<<<<< HEAD
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
=======
        {/* Hoodlrz Collection */}
        <Link href="/collection/hoodlrz">
          <Card className="group flex flex-col gap-0 p-0 overflow-hidden">
            <div className="relative w-full aspect-square overflow-hidden bg-[var(--surface)]">
              <PFPViewer
                seed="hoodlrz-col-hero-001"
                size={600}
                className="aspect-square w-full"
              />
            </div>
            <div className="flex flex-col gap-3 p-5">
              <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                Hoodlrz
              </h2>
              <p className="text-sm leading-relaxed text-muted line-clamp-2">
                The flagship collection. 10,000 unique hooded identities
                generated as layered SVGs. Own the culture.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                <span>
                  <span className="font-bold text-foreground">10,000</span> supply
                </span>
                <span>
                  <span className="font-bold text-foreground">7</span> layer categories
                </span>
                <span className="font-bold text-foreground">$9.99</span>
              </div>
            </div>
          </Card>
        </Link>

        {/* Genesis Collection */}
        <Link href="/collection/genesis">
          <Card className="group flex flex-col gap-0 p-0 overflow-hidden">
            <div className="relative w-full aspect-square overflow-hidden bg-[var(--surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/genesis/black/01-black.png"
                alt="Genesis vinyl"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Badge variant="legendary">Genesis</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                Genesis
              </h2>
              <p className="text-sm leading-relaxed text-muted line-clamp-2">
                25 exclusive hand-crafted vinyl artworks. Three editions: Black,
                White, and Craft. Reserved for top collectors.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                <span>
                  <span className="font-bold text-foreground">25</span> pieces
                </span>
                <span>
                  <span className="font-bold text-foreground">3</span> editions
                </span>
                <span className="font-bold text-foreground">Exclusive</span>
              </div>
            </div>
          </Card>
        </Link>
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      </div>
    </div>
  );
}
