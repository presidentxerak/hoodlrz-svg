"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PFPViewer from "@/components/ui/PFPViewer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SellModal from "@/components/marketplace/SellModal";
import TransferModal from "@/components/marketplace/TransferModal";
import { generatePFP } from "@/lib/pfp/generator";
import { calculateRarity } from "@/lib/pfp/rarity";
import { downloadPNG } from "@/lib/pfp/export";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */
interface Token {
  id: string;
  seed: string;
  listed: boolean;
  listPrice?: number;
}

/* ── Demo data -- TODO: replace with Supabase queries ── */
const DEMO_TOKENS: Token[] = [
  { id: "0042", seed: "hoodlrz-owned-alpha-42", listed: false },
  { id: "0117", seed: "hoodlrz-owned-bravo-117", listed: true, listPrice: 49.99 },
  { id: "0233", seed: "hoodlrz-owned-charlie-233", listed: false },
  { id: "0401", seed: "hoodlrz-owned-delta-401", listed: false },
  { id: "0512", seed: "hoodlrz-owned-echo-512", listed: true, listPrice: 129.0 },
  { id: "0678", seed: "hoodlrz-owned-foxtrot-678", listed: false },
];

const DEMO_HOODZ_BALANCE = 73;
const HOODZ_PER_FREE = 100;
const DEMO_SELLER_BALANCE = 247.5;
const DEMO_IS_GENESIS_ELIGIBLE = false;

const RARITY_BADGE_MAP = {
  Common: "default",
  Uncommon: "success",
  Rare: "rare",
  Legendary: "legendary",
} as const;

/* ── Component ── */
export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sellModal, setSellModal] = useState<{ tokenId: string; seed: string } | null>(null);
  const [transferModal, setTransferModal] = useState<{ tokenId: string; seed: string } | null>(null);

  /* ── Auth check ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/access");
      } else {
        setAuthed(true);
        // TODO: Fetch user tokens from Supabase
        setTokens(DEMO_TOKENS);
      }
    });
  }, [router]);

  const listedTokens = useMemo(() => tokens.filter((t) => t.listed), [tokens]);
  const hoodzRemaining = HOODZ_PER_FREE - DEMO_HOODZ_BALANCE;
  const hoodzProgress = Math.min(100, (DEMO_HOODZ_BALANCE / HOODZ_PER_FREE) * 100);

  /* Loading / redirect */
  if (authed === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  /* Empty state */
  if (tokens.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
        <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
          My Collection
        </h1>
        <div className="mt-20 flex flex-col items-center gap-6">
          <div className="w-20 h-20 border border-[var(--border)] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="text-sm text-muted">No collectibles yet. Start your collection.</p>
          <Button variant="primary" href="/collections">
            Browse Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Header ── */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        My Collection
      </h1>
      <p className="mt-3 text-sm text-muted">
        {tokens.length} collectible{tokens.length !== 1 ? "s" : ""} owned
      </p>

      {/* ── Stats Row ── */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Hoodz Balance */}
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Hoodz Balance
          </p>
          <p className="text-2xl font-bold text-foreground">
            {DEMO_HOODZ_BALANCE}
          </p>
          <div className="w-full h-1.5 bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-red to-[#D53F8C] transition-all duration-500"
              style={{ width: `${hoodzProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            {hoodzRemaining} more to unlock a free collectible
          </p>
        </Card>

        {/* Seller Balance */}
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Seller Balance
          </p>
          <p className="text-2xl font-bold text-foreground">
            ${DEMO_SELLER_BALANCE.toFixed(2)}
          </p>
          <p className="text-xs text-muted">Available from sales</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // TODO: Implement withdraw flow
              alert("Withdraw flow coming soon");
            }}
          >
            Withdraw
          </Button>
        </Card>

        {/* Listed */}
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Listed for Sale
          </p>
          <p className="text-2xl font-bold text-foreground">
            {listedTokens.length}
          </p>
          <p className="text-xs text-muted">
            {listedTokens.length > 0
              ? `Total: $${listedTokens.reduce((s, t) => s + (t.listPrice ?? 0), 0).toFixed(2)}`
              : "No active listings"}
          </p>
        </Card>

        {/* Genesis Eligibility */}
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Genesis Access
          </p>
          <div className="flex items-center gap-2">
            {DEMO_IS_GENESIS_ELIGIBLE ? (
              <Badge variant="legendary">Unlocked</Badge>
            ) : (
              <Badge variant="default">Locked</Badge>
            )}
          </div>
          <p className="text-xs text-muted">
            {DEMO_IS_GENESIS_ELIGIBLE
              ? "You have exclusive access to Genesis works."
              : "Top collectors unlock exclusive access to Genesis works."}
          </p>
        </Card>
      </div>

      {/* ── Owned Artworks ── */}
      <section className="mt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
          Your Artworks
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tokens.map((token) => {
            const { traits } = generatePFP(token.seed);
            const rarity = calculateRarity(traits);

            return (
              <Card
                key={token.id}
                className="flex flex-col gap-0 p-0 overflow-hidden group"
              >
                {/* PFP - click navigates to detail */}
                <div
                  className="relative w-full aspect-square overflow-hidden bg-[var(--surface)] cursor-pointer"
                  onClick={() => router.push(`/token/${token.id}`)}
                >
                  <PFPViewer
                    seed={token.seed}
                    size={400}
                    className="aspect-square w-full"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant={RARITY_BADGE_MAP[rarity.tier]}>
                      {rarity.tier}
                    </Badge>
                  </div>
                  {token.listed && (
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant="warning">Listed</Badge>
                    </div>
                  )}
                </div>

                {/* Info + Actions */}
                <div className="flex flex-col gap-2.5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted">
                      #{token.id}
                    </span>
                    {token.listed && (
                      <span className="text-xs font-bold text-foreground">
                        ${token.listPrice?.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5">
                    {token.listed ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-[10px]"
                        onClick={() => {
                          // TODO: Unlist API call
                          setTokens((prev) =>
                            prev.map((t) =>
                              t.id === token.id
                                ? { ...t, listed: false, listPrice: undefined }
                                : t
                            )
                          );
                        }}
                      >
                        Unlist
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 text-[10px]"
                        onClick={() =>
                          setSellModal({ tokenId: token.id, seed: token.seed })
                        }
                      >
                        Sell
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px]"
                      onClick={() =>
                        setTransferModal({
                          tokenId: token.id,
                          seed: token.seed,
                        })
                      }
                    >
                      Transfer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px]"
                      onClick={() => downloadPNG(token.seed, `hoodlrz-${token.id}`)}
                    >
                      PNG
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Listed Tokens Detail ── */}
      {listedTokens.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
            Active Listings
          </h2>
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {listedTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 overflow-hidden">
                    <PFPViewer seed={token.seed} size={40} className="w-10 h-10" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    #{token.id}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-foreground">
                    ${token.listPrice?.toFixed(2)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // TODO: Unlist API call
                      setTokens((prev) =>
                        prev.map((t) =>
                          t.id === token.id
                            ? { ...t, listed: false, listPrice: undefined }
                            : t
                        )
                      );
                    }}
                  >
                    Unlist
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {sellModal && (
        <SellModal
          isOpen={true}
          onClose={() => setSellModal(null)}
          tokenId={sellModal.tokenId}
          seed={sellModal.seed}
        />
      )}
      {transferModal && (
        <TransferModal
          isOpen={true}
          onClose={() => setTransferModal(null)}
          tokenId={transferModal.tokenId}
          seed={transferModal.seed}
        />
      )}
    </div>
  );
}
