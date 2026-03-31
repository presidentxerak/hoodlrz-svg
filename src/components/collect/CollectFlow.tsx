"use client";

import { useState, useCallback } from "react";
import CollectButton from "./CollectButton";
import RevealOverlay from "./RevealOverlay";
import { generateSeed } from "@/lib/pfp/hash";

type FlowState = "idle" | "loading" | "revealing" | "complete" | "error";

interface CollectFlowProps {
  collectionSlug: string;
  price: string;
  /** Enable preview mode: skips Stripe, uses random seed */
  preview?: boolean;
}

interface CollectResult {
  seed: string;
  serialNumber: number;
  username: string;
}

export default function CollectFlow({
  collectionSlug,
  price,
  preview = false,
}: CollectFlowProps) {
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CollectResult | null>(null);

  const handleCollect = useCallback(async () => {
    setError(null);

    // ── Preview / demo mode ──
    if (preview) {
      setState("revealing");
      setResult({
        seed: generateSeed(),
        serialNumber: Math.floor(Math.random() * 9999) + 1,
        username: "preview_user",
      });
      return;
    }

    // ── Production flow ──
    setState("loading");

    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug }),
      });

      // Not authenticated → redirect to access page
      if (res.status === 401) {
        window.location.href = `/access?redirect=/${collectionSlug}`;
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Collection failed (${res.status})`);
      }

      const data = await res.json();

      // If the API returns a Stripe checkout URL, redirect to it.
      // After payment, the user returns to a callback that re-triggers
      // the reveal with the token data.
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Direct success (free mint, already paid, etc.)
      setState("revealing");
      setResult({
        seed: data.seed,
        serialNumber: data.serialNumber,
        username: data.username,
      });
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }, [collectionSlug, preview]);

  const handleClose = useCallback(() => {
    setState("complete");
  }, []);

  const handleCollectAgain = useCallback(() => {
    setState("idle");
    setResult(null);
    // Small delay so the overlay closes cleanly before re-triggering
    setTimeout(() => handleCollect(), 100);
  }, [handleCollect]);

  return (
    <div className="collect-flow">
      {/* CTA Button */}
      {(state === "idle" || state === "complete" || state === "error") && (
        <div className="flex flex-col items-center gap-3">
          <CollectButton
            collectionSlug={collectionSlug}
            price={price}
            disabled={false}
            onCollect={handleCollect}
          />

          {preview && (
            <span className="text-[10px] text-muted uppercase tracking-widest">
              Preview Mode
            </span>
          )}

          {error && (
            <p className="text-accent-red text-xs text-center max-w-xs mt-2">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {state === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 border-white/20 border-t-accent-red"
            style={{
              animation: "spin 0.8s linear infinite",
              borderRadius: "9999px",
            }}
          />
          <p className="text-muted text-xs uppercase tracking-widest">
            Preparing your PFP...
          </p>
        </div>
      )}

      {/* Reveal overlay */}
      {result && (
        <RevealOverlay
          isOpen={state === "revealing"}
          seed={result.seed}
          username={result.username}
          serialNumber={result.serialNumber}
          onClose={handleClose}
          collectionSlug={collectionSlug}
          onCollectAgain={handleCollectAgain}
        />
      )}
    </div>
  );
}
