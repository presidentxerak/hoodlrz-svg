"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Countdown from "@/components/ui/Countdown";
import PFPViewer from "@/components/ui/PFPViewer";
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
    priceEth: string;
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
      "The flagship collection. 1,337 unique hooded identities generated as layered SVGs, stored fully on-chain on Ethereum. Each one composed of 7 hand-drawn layers. Own the identity. Collect the culture.",
    supply: 1_337,
    minted: 0,
    priceEth: "0.007 ETH",
    isGenesis: false,
    dropStatus: "upcoming" as const,
    dropDate: "2026-06-15T18:00:00Z",
    whitelistDate: "2026-06-12T18:00:00Z",
  },
  genesis: {
    name: "Genesis",
    slug: "genesis",
    description:
      "25 exclusive hand-crafted vinyl artworks across three editions: Black (10), White (5), and Craft (10). Each piece features a unique hand-drawn sleeve and a custom pressed disc — you choose your 4 tracks and their order on Side A and Side B. Reserved for top collectors.",
    supply: 25,
    minted: 0,
    priceEth: "",
    isGenesis: true,
    dropStatus: "public" as const,
    dropDate: "",
    whitelistDate: "",
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
    <div className="flex flex-col items-center">
      {/* ── Video Hero ── */}
      <section className="relative flex w-full flex-col items-center justify-center px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[50vh]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={isGenesis ? "/hero-vinyl.mp4" : "/hero-collection.mp4"} type="video/mp4" />
          <source src={isGenesis ? "/hero-vinyl.mov" : "/hero-collection.mov"} type="video/quicktime" />
        </video>
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-white sm:text-[56px]">
              {collection.name}
            </h1>
            {isGenesis && <Badge variant="legendary">Genesis</Badge>}
            {!isGenesis && (
              <span className="text-[10px] uppercase tracking-widest bg-[#627eea]/10 text-[#627eea] border border-[#627eea]/30 px-2 py-0.5">
                On-Chain
              </span>
            )}
          </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          {collection.description}
        </p>

        {/* Drop date */}
        {!isGenesis && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              {dropStatus === "live" ? "Dropped" : "Drop Date"}
            </span>
            <p className="font-hoodlrz text-2xl font-bold tracking-wider text-[#627eea] sm:text-3xl">
              {new Date(collection.dropDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
            </p>
          </div>
        )}

        {/* Durability Score — Hoodlrz only */}
        {!isGenesis && (
          <a
            href="https://nftimeless.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center gap-3 border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nftimeless-logo.svg" alt="NFTimeless" className="h-6 w-6" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nftimeless-logo.svg" alt="" className="h-6 w-6" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nftimeless-logo.svg" alt="" className="h-6 w-6" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-hoodlrz text-2xl font-bold text-emerald-400">86%</span>
              <span className="text-[10px] uppercase tracking-widest text-white/50">Durability Score</span>
            </div>
            <span className="text-[10px] text-white/40 ml-1">nftimeless.com</span>
          </a>
        )}
        </div>
      </section>

      {/* ── Page Content ── */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-20">

      {/* ── Stats ── */}
      <div className="mt-10 flex flex-wrap justify-center gap-8">
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
            <Stat label="Price" value={collection.priceEth} />
          </>
        )}
      </div>

      {/* ── Countdown + CTA ── */}
      <div className="mt-12 flex flex-col items-center gap-6">
        {dropStatus !== "live" && countdownLabel && (
          <Countdown targetDate={countdownTarget} label={countdownLabel} />
        )}

        <div className="flex flex-wrap justify-center gap-3">
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
            <Suspense fallback={null}>
              <EthMintFlow disabled={dropStatus !== "live"} />
            </Suspense>
          )}
          {dropStatus === "live" && isGenesis && (
            <p className="text-sm text-muted">
              Click on any vinyl below to collect it.
            </p>
          )}
          {!isGenesis && (
            <Button
              variant="secondary"
              size="lg"
              href={`/collection/${slug}/gallery`}
            >
              View Gallery
            </Button>
          )}
        </div>
      </div>

      {/* ── How It Works (Hoodlrz only) ── */}
      {!isGenesis && (
        <section className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
            How It Works
          </h2>

          <Card className="flex flex-col gap-3 border-l-2 border-l-[#627eea]">
            <p className="text-sm font-bold text-foreground">Full On-Chain ERC-721 NFT on Ethereum</p>
            <p className="text-sm leading-relaxed text-muted">
              Each Hoodlrz is a unique SVG artwork stored entirely on-chain. 7 hand-drawn layers
              composed using the same deterministic algorithm on the smart contract. No IPFS, no
              external hosting — your NFT lives on Ethereum forever.
            </p>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
              <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">On-Chain</span>
              <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">ERC-721</span>
              <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">Full SVG</span>
              <span className="bg-[#627eea]/10 text-[#627eea] px-2 py-0.5">SSTORE2</span>
            </div>
          </Card>

          {/* Details */}
          <div className="mt-8 border border-[var(--border)] p-6 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#627eea] mb-2">
              Ethereum Details
            </p>
            {[
              ["Price", "0.007 ETH"],
              ["Gas fees", "Network gas (Ethereum)"],
              ["Wallet", "MetaMask / WalletConnect"],
              ["Payment", "ETH"],
              ["Standard", "ERC-721"],
              ["Storage", "Full on-chain (SSTORE2)"],
              ["Royalties", "10% (ERC-2981)"],
              ["Secondary", "OpenSea, Blur, any marketplace"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">{label}</span>
                <span className="text-sm font-bold text-foreground">{value}</span>
              </div>
            ))}
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
                  <Link key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
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
                      <span className="text-[10px] font-bold text-foreground">€500</span>
                    </div>
                  </Link>
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
                  <Link key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
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
                      <span className="text-[10px] font-bold text-foreground">€500</span>
                    </div>
                  </Link>
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
                  <Link key={vinyl.id} href={`/genesis/${vinyl.id}`} className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]">
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
                      <span className="text-[10px] font-bold text-foreground">€500</span>
                    </div>
                  </Link>
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
                  example
                />
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
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
