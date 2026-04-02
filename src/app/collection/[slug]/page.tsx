"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Countdown from "@/components/ui/Countdown";
import PFPViewer from "@/components/ui/PFPViewer";
import CollectFlow from "@/components/collect/CollectFlow";
import EthMintFlow from "@/components/collect/EthMintFlow";
import { GENESIS_VINYLS, ALL_GENESIS_VINYLS } from "@/lib/genesis/vinyls";

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
    dropStatus: "upcoming" as const,
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
    priceCents: 30000,
    isGenesis: true,
    dropStatus: "upcoming" as const,
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
          {dropStatus === "live" && !isGenesis && (
            <>
              <Suspense fallback={null}>
                <CollectFlow
                  collectionSlug={slug}
                  price={`$${(collection.priceCents / 100).toFixed(2)}`}
                />
              </Suspense>
              <Suspense fallback={null}>
                <EthMintFlow disabled={dropStatus !== "live"} />
              </Suspense>
            </>
          )}
          {dropStatus === "live" && isGenesis && (
            <p className="text-sm text-muted">
              Click on any vinyl below to collect it.
            </p>
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

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Protocol option */}
            <Card className="flex flex-col gap-3 border-l-2 border-l-accent-red">
              <p className="text-sm font-bold text-foreground">Hoodlrz Protocol — $9.99</p>
              <p className="text-sm leading-relaxed text-muted">
                Collect via our platform. No wallet needed, no gas fees.
                Pay with credit card through Stripe. Instant ownership and PFP download.
              </p>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                <span className="bg-accent-red/10 text-accent-red px-2 py-0.5">No Gas</span>
                <span className="bg-accent-red/10 text-accent-red px-2 py-0.5">No Wallet</span>
                <span className="bg-accent-red/10 text-accent-red px-2 py-0.5">Instant</span>
              </div>
            </Card>

            {/* Ethereum option */}
            <Card className="flex flex-col gap-3 border-l-2 border-l-[#627eea]">
              <p className="text-sm font-bold text-foreground">Ethereum On-Chain — ETH</p>
              <p className="text-sm leading-relaxed text-muted">
                Mint as a full on-chain ERC-721 NFT on Ethereum. Same 7 hand-drawn layers,
                same generation algorithm, stored forever on the blockchain.
              </p>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">On-Chain</span>
                <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">ERC-721</span>
                <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">SVG</span>
              </div>
            </Card>
          </div>

          {/* Pricing comparison */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-[var(--border)] p-6 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-accent-red mb-2">
                Protocol
              </p>
              {[
                ["Price", "$9.99"],
                ["Gas fees", "None"],
                ["Wallet", "Not required"],
                ["Payment", "Credit card (Stripe)"],
                ["Ownership", "Hoodlrz Protocol"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted">{label}</span>
                  <span className="text-sm font-bold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <div className="border border-[var(--border)] p-6 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#627eea] mb-2">
                Ethereum
              </p>
              {[
                ["Price", "ETH (variable)"],
                ["Gas fees", "Network gas"],
                ["Wallet", "MetaMask / WalletConnect"],
                ["Payment", "ETH"],
                ["Ownership", "Ethereum blockchain"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted">{label}</span>
                  <span className="text-sm font-bold text-foreground">{value}</span>
                </div>
              ))}
            </div>
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
                  <a key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis Black #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        Black #{String(vinyl.number).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold text-foreground">$300</span>
                    </div>
                  </a>
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
                  <a key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis White #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        White #{String(vinyl.number).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold text-foreground">$300</span>
                    </div>
                  </a>
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
                  <a key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinyl.src}
                        alt={`Genesis Craft #${vinyl.number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                        Craft #{String(vinyl.number).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold text-foreground">$300</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Total */}
            <p className="text-xs text-muted uppercase tracking-widest text-center pt-4 border-t border-[var(--border)]">
              {ALL_GENESIS_VINYLS.length} unique pieces across 3 editions
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
