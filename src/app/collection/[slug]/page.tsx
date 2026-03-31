"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Countdown from "@/components/ui/Countdown";
import PFPViewer from "@/components/ui/PFPViewer";
import CollectFlow from "@/components/collect/CollectFlow";

/* ── Genesis vinyl data ── */
const GENESIS_VINYLS = {
  black: Array.from({ length: 10 }, (_, i) => ({
    id: `black-${String(i + 1).padStart(2, "0")}`,
    src: `/images/genesis/black/${String(i + 1).padStart(2, "0")}-black.png`,
    edition: "Black",
    number: i + 1,
  })),
  white: Array.from({ length: 5 }, (_, i) => ({
    id: `white-${String(i + 1).padStart(2, "0")}`,
    src: `/images/genesis/white/${String(i + 1).padStart(2, "0")}-white.png`,
    edition: "White",
    number: i + 1,
  })),
  craft: Array.from({ length: 10 }, (_, i) => ({
    id: `craft-${String(i + 1).padStart(2, "0")}`,
    src: `/images/genesis/craft/${String(i + 1).padStart(2, "0")}-craft.png`,
    edition: "Craft",
    number: i + 1,
  })),
};

const ALL_VINYLS = [
  ...GENESIS_VINYLS.black,
  ...GENESIS_VINYLS.white,
  ...GENESIS_VINYLS.craft,
];

/* ── Collection data ── */
const COLLECTIONS_MAP: Record<
  string,
  {
    name: string;
    slug: string;
    description: string;
    supply: number;
    minted: number;
    priceCents: number;
    isGenesis: boolean;
    dropStatus: string;
    dropDate: string;
    whitelistDate: string;
  }
> = {
  hoodlrz: {
    name: "Hoodlrz",
    slug: "hoodlrz",
    description:
      "The flagship collection. 10,000 unique hooded identities generated as layered SVGs. Each one composed of 7 hand-drawn layers. Own the identity. Collect the culture.",
    supply: 10_000,
    minted: 0,
    priceCents: 999,
    isGenesis: false,
    dropStatus: "public" as const,
    dropDate: "2026-05-15T18:00:00Z",
    whitelistDate: "2026-05-12T18:00:00Z",
  },
  genesis: {
    name: "Genesis",
    slug: "genesis",
    description:
      "25 exclusive hand-crafted vinyl artworks across three editions: Black (10), White (5), and Craft (10). Each piece is a unique vinyl cover drawn by hand. Reserved for top collectors.",
    supply: 25,
    minted: 0,
    priceCents: 20000,
    isGenesis: true,
    dropStatus: "public" as const,
    dropDate: "2026-05-10T18:00:00Z",
    whitelistDate: "2026-05-08T18:00:00Z",
  },
};

const GALLERY_SEEDS = [
  "gallery-preview-001",
  "gallery-preview-002",
  "gallery-preview-003",
  "gallery-preview-004",
  "gallery-preview-005",
  "gallery-preview-006",
  "gallery-preview-007",
  "gallery-preview-008",
];

type DropStatus = "pre-whitelist" | "whitelist-live" | "live";

function getDropStatus(whitelistDate: string, dropDate: string, dbStatus?: string): DropStatus {
  // If the DB says public, the drop is live regardless of dates
  if (dbStatus === "public") return "live";

  const now = Date.now();
  const wl = new Date(whitelistDate).getTime();
  const drop = new Date(dropDate).getTime();

  if (now < wl) return "pre-whitelist";
  if (now < drop) return "whitelist-live";
  return "live";
}

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const collection = COLLECTIONS_MAP[slug];

  if (!collection) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted">Collection not found.</p>
      </div>
    );
  }

  const isGenesis = collection.isGenesis;

  const dropStatus = getDropStatus(
    collection.whitelistDate,
    collection.dropDate,
    collection.dropStatus
  );

  const countdownTarget =
    dropStatus === "pre-whitelist"
      ? collection.whitelistDate
      : collection.dropDate;

  const countdownLabel =
    dropStatus === "pre-whitelist"
      ? "Whitelist Opens"
      : dropStatus === "whitelist-live"
        ? "Public Drop"
        : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Hero ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[56px]">
            {collection.name}
          </h1>
          {isGenesis && <Badge variant="legendary">Genesis</Badge>}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {collection.description}
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="mt-10 flex flex-wrap gap-8">
        <Stat label="Supply" value={String(collection.supply)} />
        {isGenesis ? (
          <>
            <Stat label="Editions" value="3" />
            <Stat label="Black" value="10" />
            <Stat label="White" value="5" />
            <Stat label="Craft" value="10" />
          </>
        ) : (
          <>
            <Stat label="Collected" value={collection.minted.toLocaleString()} />
            <Stat
              label="Available"
              value={(collection.supply - collection.minted).toLocaleString()}
            />
            <Stat label="Price" value={`$${(collection.priceCents / 100).toFixed(2)}`} />
          </>
        )}
      </div>

      {/* ── Countdown + CTA ── */}
      <div className="mt-12 flex flex-col items-start gap-6">
        {dropStatus !== "live" && countdownLabel && (
          <Countdown targetDate={countdownTarget} label={countdownLabel} />
        )}

        <div className="flex flex-wrap gap-3">
          {dropStatus === "pre-whitelist" && (
            <Button variant="primary" size="lg" href="/access">
              Join Whitelist
            </Button>
          )}
          {dropStatus === "whitelist-live" && (
            <>
              <Button variant="primary" size="lg" href="/access">
                Join Whitelist
              </Button>
              <Badge variant="success">Whitelist Open</Badge>
            </>
          )}
          {dropStatus === "live" && (
            <Suspense fallback={null}>
              <CollectFlow
                collectionSlug={slug}
                price={`$${(collection.priceCents / 100).toFixed(2)}`}
              />
            </Suspense>
          )}
          {!isGenesis && (
            <>
              <Button
                variant="secondary"
                size="lg"
                href={`/collection/${slug}/gallery`}
              >
                View Gallery
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── How It Works (Hoodlrz only) ── */}
      {!isGenesis && (
        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
            How It Works
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-3">
              <p className="text-sm font-bold text-foreground">No Gas Fees</p>
              <p className="text-sm leading-relaxed text-muted">
                Zero hidden costs. The price you see is the price you pay. No
                gas fees, no wallet needed.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <p className="text-sm font-bold text-foreground">New Protocol</p>
              <p className="text-sm leading-relaxed text-muted">
                Collected through our revolutionary digital art protocol. No
                blockchain complexity. Just art.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <p className="text-sm font-bold text-foreground">Fixed Price</p>
              <p className="text-sm leading-relaxed text-muted">
                $9.99 per collectible. Each piece is unique, generated from 7
                hand-drawn SVG layers.
              </p>
            </Card>
          </div>

          {/* Pricing breakdown */}
          <div className="mt-8 border border-[var(--border)] p-6 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">
              Pricing Breakdown
            </p>
            {[
              ["Collection", "Hoodlrz \u2014 10,000 unique pieces"],
              ["Price", "$9.99 per piece"],
              ["Gas fees", "None"],
              ["Wallet required", "No"],
              ["Ownership", "Instant"],
              ["PFP download", "Immediate"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  {label}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Price Activity (Hoodlrz only) ── */}
      {!isGenesis && (
        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
            Price Activity
          </h2>
          <div className="border border-[var(--border)] p-8 flex items-center justify-center">
            <p className="text-sm text-muted text-center">
              Price history and market activity will be available after the drop.
            </p>
          </div>
        </section>
      )}

      {/* ── Gallery Preview ── */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            {isGenesis ? "The Collection" : "Preview"}
          </h2>
          {!isGenesis && (
            <Button
              variant="ghost"
              size="sm"
              href={`/collection/${slug}/gallery`}
            >
              View All
            </Button>
          )}
        </div>

        {isGenesis ? (
          /* Genesis vinyl gallery */
          <div className="mt-8 space-y-12">
            {/* Black Edition */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                Black Edition — 10 pieces
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {GENESIS_VINYLS.black.map((vinyl) => (
                  <div key={vinyl.id} className="flex flex-col gap-2">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis Black #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      Black #{String(vinyl.number).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* White Edition */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                White Edition — 5 pieces
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {GENESIS_VINYLS.white.map((vinyl) => (
                  <div key={vinyl.id} className="flex flex-col gap-2">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis White #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      White #{String(vinyl.number).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Craft Edition */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                Craft Edition — 10 pieces
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {GENESIS_VINYLS.craft.map((vinyl) => (
                  <div key={vinyl.id} className="flex flex-col gap-2">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis Craft #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      Craft #{String(vinyl.number).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <p className="text-xs text-muted uppercase tracking-widest text-center pt-4 border-t border-[var(--border)]">
              {ALL_VINYLS.length} unique pieces across 3 editions
            </p>
          </div>
        ) : (
          /* Hoodlrz PFP gallery preview */
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {GALLERY_SEEDS.map((seed) => (
              <div key={seed} className="animate-fade-in-up">
                <PFPViewer
                  seed={`${slug}-${seed}`}
                  size={400}
                  className="aspect-square w-full"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Stat helper ── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
        {value}
      </span>
    </div>
  );
}
