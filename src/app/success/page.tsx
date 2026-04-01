"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";
import { getVinylImageSrc, getVinylById } from "@/lib/genesis/vinyls";

interface TokenData {
  id: string;
  seed: string;
  serialNumber: number;
  collectionSlug: string | null;
  username: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const collectionSlug = searchParams.get("collection") || "hoodlrz";
  const sessionId = searchParams.get("session_id");

  const isGenesisCollection = collectionSlug === "genesis";
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real token data from the Stripe session
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      try {
        const res = await fetch(`/api/token/by-session?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.tokens?.length > 0) {
            setTokens(data.tokens);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore fetch errors during polling
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setLoading(false);
      }
    };

    poll();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 border-white/20 border-t-accent-red"
            style={{
              animation: "spin 0.8s linear infinite",
              borderRadius: "9999px",
            }}
          />
          <p className="text-sm text-muted animate-pulse">
            Generating your identit{tokens.length > 1 ? "ies" : "y"}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 animate-fade-in-up">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[44px]">
            {isGenesisCollection ? "Welcome, Genesis Collector" : "Welcome to the Club"}
          </h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            {isGenesisCollection
              ? "Your vinyl artwork has been claimed. It will be shipped to your address."
              : tokens.length > 1
                ? `${tokens.length} identities have been claimed.`
                : "Your identity has been claimed."}
          </p>
        </div>

        {/* Token Grid */}
        {tokens.length > 0 && (
          <div
            className={`w-full grid gap-4 ${
              tokens.length === 1
                ? "max-w-xs mx-auto grid-cols-1"
                : tokens.length <= 4
                  ? "grid-cols-2 max-w-md mx-auto"
                  : "grid-cols-3 sm:grid-cols-5 max-w-2xl mx-auto"
            }`}
          >
            {tokens.map((token) => {
              const isGenesis = token.collectionSlug === "genesis";
              const vinylSrc = isGenesis ? getVinylImageSrc(token.seed) : null;
              const vinyl = isGenesis ? getVinylById(token.seed) : null;

              return (
                <div key={token.id} className="flex flex-col items-center gap-1">
                  {isGenesis && vinylSrc ? (
                    <div className="aspect-square overflow-hidden bg-[var(--surface)] w-full">
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
                  <p className="text-[10px] uppercase tracking-widest text-muted">
                    {isGenesis && vinyl
                      ? `${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}`
                      : `#${String(token.serialNumber).padStart(4, "0")}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        {tokens.length > 0 && (
          <p className="text-sm text-muted">
            Collected by{" "}
            <span className="font-semibold text-foreground">
              {tokens[0].username}
            </span>
          </p>
        )}

        {/* Fallback if webhook hasn't processed yet */}
        {tokens.length === 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted text-center">
              {isGenesisCollection
                ? "Your payment was successful! Your vinyl is being prepared."
                : `Your payment was successful! Your identit${tokens.length > 1 ? "ies are" : "y is"} being generated.`}
            </p>
            <p className="text-xs text-muted text-center">
              {isGenesisCollection
                ? "It will appear in your collection shortly."
                : "They will appear in your collection shortly."}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            href={isGenesisCollection ? "/collection/genesis" : `/collection/${collectionSlug}?collect=true`}
          >
            {isGenesisCollection ? "View Genesis Collection" : "Collect Again"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            href="/my-collection"
          >
            View My Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-sm text-muted">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
