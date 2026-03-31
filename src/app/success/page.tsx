"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";

interface TokenData {
  id: string;
  seed: string;
  serialNumber: number;
  username: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const collectionSlug = searchParams.get("collection") || "hoodlrz";
  const sessionId = searchParams.get("session_id");

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
            Welcome to the Club
          </h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            {tokens.length > 1
              ? `${tokens.length} identities have been claimed.`
              : "Your identity has been claimed."}
          </p>
        </div>

        {/* PFP Grid */}
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
            {tokens.map((token) => (
              <div key={token.id} className="flex flex-col items-center gap-1">
                <PFPViewer
                  seed={token.seed}
                  size={400}
                  className="aspect-square w-full"
                />
                <p className="text-[10px] uppercase tracking-widest text-muted">
                  #{String(token.serialNumber).padStart(4, "0")}
                </p>
              </div>
            ))}
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
              Your payment was successful! Your identit{tokens.length > 1 ? "ies are" : "y is"} being generated.
            </p>
            <p className="text-xs text-muted text-center">
              They will appear in your collection shortly.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            href={`/collection/${collectionSlug}?collect=true`}
          >
            Collect Again
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
