"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";
import { createClient } from "@/lib/supabase/client";
import { getVinylImageSrc, getVinylById } from "@/lib/genesis/vinyls";

interface Token {
  id: string;
  seed: string;
  serial_number: number;
  collection_id: string;
  collection_slug: string | null;
  is_listed: boolean;
  created_at: string;
}

interface AccountInfo {
  id: string;
  pseudonym: string;
  rewardsBalance: number;
}

export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Auth check ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/access");
      } else {
        setAuthed(true);
      }
    });
  }, [router]);

  /* ── Fetch tokens ── */
  useEffect(() => {
    if (!authed) return;

    fetch("/api/token/my-tokens")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setTokens(data.tokens || []);
        setAccount(data.account || null);
      })
      .catch(() => {
        // silently fail, show empty state
      })
      .finally(() => setLoading(false));
  }, [authed]);

  /* Loading / redirect */
  if (authed === null || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
          My Collection
        </h1>
        {account && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {account.pseudonym}
            </span>
            <span className="text-xs text-muted border border-[var(--border)] px-2 py-1">
              {account.rewardsBalance ?? 0} Hoodz
            </span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      {tokens.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Collected
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {tokens.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Listed
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {tokens.filter((t) => t.is_listed).length}
            </span>
          </div>
        </div>
      )}

      {/* ── Token Grid ── */}
      {tokens.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6">
          {tokens.map((token) => {
            const isGenesis = token.collection_slug === "genesis";
            const vinylSrc = isGenesis ? getVinylImageSrc(token.seed) : null;
            const vinyl = isGenesis ? getVinylById(token.seed) : null;

            return (
              <a
                key={token.id}
                href={isGenesis ? `/genesis/${token.seed}` : `/token/${token.id}`}
                className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]"
              >
                <div className="relative">
                  {isGenesis && vinylSrc ? (
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinylSrc}
                        alt={vinyl ? `Genesis ${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}` : "Genesis Vinyl"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <PFPViewer
                      seed={token.seed}
                      size={400}
                      className="aspect-square w-full"
                    />
                  )}
                  {token.is_listed && (
                    <span className="absolute bottom-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                      Listed
                    </span>
                  )}
                  {isGenesis && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                      Genesis
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted">
                    {isGenesis && vinyl
                      ? `${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}`
                      : `#${String(token.serial_number).padStart(4, "0")}`}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="mt-20 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 border border-[var(--border)] flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted"
            >
              <path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z" />
              <path d="M6 2h12" />
              <path d="M6 22h12" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-foreground">
            No collectibles yet
          </h2>

          <p className="max-w-md text-sm leading-relaxed text-muted">
            Start collecting to build your Hoodlrz identity. Each piece is
            unique, generated from 7 hand-drawn layers.
          </p>

          <Button variant="primary" size="lg" href="/collection/hoodlrz">
            Start Collecting
          </Button>
        </div>
      )}
    </div>
  );
}
