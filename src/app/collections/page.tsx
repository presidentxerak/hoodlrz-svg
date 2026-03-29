"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PFPViewer from "@/components/ui/PFPViewer";

/* ── Genesis vinyl pieces ── */
const GENESIS_COVERS = [
  "/images/genesis/black/01-black.png",
  "/images/genesis/white/01-white.png",
  "/images/genesis/craft/01-craft.png",
];

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
              {/* Show 3 vinyl covers in a grid preview */}
              <div className="w-full h-full grid grid-cols-3 gap-0">
                {GENESIS_COVERS.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`Genesis vinyl ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ))}
              </div>
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
      </div>
    </div>
  );
}
