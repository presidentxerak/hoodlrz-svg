"use client";

import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Countdown from "@/components/ui/Countdown";
import PFPViewer from "@/components/ui/PFPViewer";

/* ── Sample data — TODO: replace with Supabase query by slug ── */
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
    dropDate: string;
    whitelistDate: string;
  }
> = {
  hoodlrz: {
    name: "Hoodlrz",
    slug: "hoodlrz",
    description:
      "The flagship collection. 10,000 unique hooded identities generated on-chain as SVGs. Each one is deterministic, verifiable, and entirely yours. Own the identity. Collect the culture.",
    supply: 10_000,
    minted: 2_347,
    priceCents: 4900,
    isGenesis: false,
    dropDate: "2026-04-15T18:00:00Z",
    whitelistDate: "2026-04-12T18:00:00Z",
  },
  genesis: {
    name: "Genesis",
    slug: "genesis",
    description:
      "Premium genesis pass. Limited to 500 holders. Unlocks early access, rare traits, lifetime perks, and priority on every future drop. The key to the inner circle.",
    supply: 500,
    minted: 127,
    priceCents: 14900,
    isGenesis: true,
    dropDate: "2026-04-10T18:00:00Z",
    whitelistDate: "2026-04-08T18:00:00Z",
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

type DropStatus = "pre-whitelist" | "whitelist-live" | "public-drop" | "live";

function getDropStatus(whitelistDate: string, dropDate: string): DropStatus {
  const now = Date.now();
  const wl = new Date(whitelistDate).getTime();
  const drop = new Date(dropDate).getTime();

  if (now < wl) return "pre-whitelist";
  if (now < drop) return "whitelist-live";
  return "live";
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
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

  const dropStatus = getDropStatus(
    collection.whitelistDate,
    collection.dropDate
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
          {collection.isGenesis && (
            <Badge variant="legendary">Genesis</Badge>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {collection.description}
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="mt-10 flex flex-wrap gap-8">
        <Stat label="Supply" value={collection.supply.toLocaleString()} />
        <Stat label="Collected" value={collection.minted.toLocaleString()} />
        <Stat
          label="Available"
          value={(collection.supply - collection.minted).toLocaleString()}
        />
        <Stat label="Price" value={formatPrice(collection.priceCents)} />
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
            <Button variant="primary" size="lg">
              Collect - {formatPrice(collection.priceCents)}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            href={`/collection/${slug}/gallery`}
          >
            View Gallery
          </Button>
        </div>
      </div>

      {/* ── Gallery Preview ── */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Preview
          </h2>
          <Button
            variant="ghost"
            size="sm"
            href={`/collection/${slug}/gallery`}
          >
            View All
          </Button>
        </div>

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
