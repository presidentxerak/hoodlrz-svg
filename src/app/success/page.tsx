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

  const [token, setToken] = useState<TokenData | null>(null);
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
          if (data.found && data.token) {
            setToken(data.token);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore fetch errors during polling
      }

      attempts++;
      if (attempts < maxAttempts) {
        // Webhook might not have processed yet, retry
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
            Generating your identity...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8 animate-fade-in-up">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[44px]">
            Welcome to the Club
          </h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            Your identity has been claimed.
          </p>
        </div>

        {/* PFP */}
        {token && (
          <div className="w-full max-w-xs">
            <PFPViewer
              seed={token.seed}
              size={400}
              className="aspect-square w-full"
            />
          </div>
        )}

        {/* Info */}
        {token && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-muted">
              Collected by{" "}
              <span className="font-semibold text-foreground">
                {token.username}
              </span>
            </p>
            <p className="text-xs uppercase tracking-widest text-muted">
              Serial #{String(token.serialNumber).padStart(4, "0")}
            </p>
          </div>
        )}

        {/* Fallback if webhook hasn't processed yet */}
        {!token && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted text-center">
              Your payment was successful! Your identity is being generated.
            </p>
            <p className="text-xs text-muted text-center">
              It will appear in your collection shortly.
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
