"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CollectButton from "./CollectButton";
import RevealOverlay from "./RevealOverlay";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { generateSeed } from "@/lib/pfp/hash";

type FlowState = "idle" | "auth" | "quantity" | "loading" | "revealing" | "complete" | "error";

interface CollectFlowProps {
  collectionSlug: string;
  price: string;
  preview?: boolean;
  isGenesis?: boolean;
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
  isGenesis = false,
}: CollectFlowProps) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Auth modal state
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check auth on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // Auto-trigger collect flow when ?collect=true is in URL
  useEffect(() => {
    if (autoTriggered || isLoggedIn === null || preview) return;
    if (searchParams.get("collect") === "true") {
      setAutoTriggered(true);
      if (isLoggedIn) {
        setState("quantity");
      } else {
        setState("auth");
      }
    }
  }, [searchParams, isLoggedIn, autoTriggered, preview]);

  const handleCollect = useCallback(async () => {
    setError(null);

    // Preview mode
    if (preview) {
      setState("revealing");
      setResult({
        seed: generateSeed(),
        serialNumber: Math.floor(Math.random() * 9999) + 1,
        username: "preview_user",
      });
      return;
    }

    // Not logged in → show auth modal
    if (!isLoggedIn) {
      setState("auth");
      return;
    }

    // Show quantity selector
    setState("quantity");
  }, [preview, isLoggedIn]);

  const handleProceedToPayment = useCallback(async () => {
    setState("loading");

    // Genesis pieces are unique — always quantity 1
    const mintQuantity = isGenesis ? 1 : quantity;

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug, quantity: mintQuantity }),
      });

      if (res.status === 401) {
        setState("auth");
        setIsLoggedIn(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      // Direct success (free mint etc)
      setState("revealing");
      setResult({
        seed: data.seed ?? generateSeed(),
        serialNumber: data.serialNumber ?? 1,
        username: data.username ?? "Collector",
      });
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg === "Failed to fetch" ? "Connection error. Please check your connection and try again." : msg);
    }
  }, [collectionSlug, quantity, isGenesis]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!email || !email.includes("@")) {
      setAuthError("Enter a valid email address.");
      return;
    }

    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || "Something went wrong.");
        setAuthLoading(false);
        return;
      }

      setAuthLoading(false);
      setAuthSent(true);
    } catch {
      setAuthError("Network error. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setState("complete");
  }, []);

  const handleCollectAgain = useCallback(() => {
    setState("idle");
    setResult(null);
    setTimeout(() => handleCollect(), 100);
  }, [handleCollect]);

  // Close button component for modals
  const CloseButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors text-xl leading-none"
      aria-label="Close"
    >
      &times;
    </button>
  );

  return (
    <div className="collect-flow">
      {/* CTA Button */}
      {(state === "idle" || state === "complete" || state === "error") && (
        <div className="flex flex-col items-center gap-3">
          <CollectButton
            collectionSlug={collectionSlug}
            price={price}
            disabled={isLoggedIn === null}
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
          <p className="text-white/70 text-xs uppercase tracking-widest">
            Redirecting to payment...
          </p>
        </div>
      )}

      {/* Auth Modal */}
      <Modal isOpen={state === "auth"} onClose={() => setState("idle")}>
        <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <CloseButton onClick={() => setState("idle")} />
          <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
            Sign Up to Collect
          </h2>
          <p className="text-sm text-center text-muted">
            Enter your email to get a magic link. No passwords, no wallet, no friction.
          </p>

          {!authSent ? (
            <form onSubmit={handleAuthSubmit} className="w-full flex flex-col gap-4">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={authError}
              />
              <Button variant="primary" size="lg" disabled={authLoading}>
                {authLoading ? "Sending..." : "Get Access"}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center border border-emerald-500/40 bg-emerald-500/10">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-center text-muted">
                Check your inbox! We sent a magic link to{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
              <p className="text-xs text-muted text-center">
                Click the link in the email to sign in, then come back and collect.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setAuthSent(false);
                  setEmail("");
                  // Re-check auth — if signed in, go directly to payment
                  const supabase = createClient();
                  supabase.auth.getUser().then(({ data }) => {
                    const loggedIn = !!data.user;
                    setIsLoggedIn(loggedIn);
                    if (loggedIn) {
                      setState("quantity");
                    } else {
                      setState("idle");
                    }
                  });
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Modal — Genesis (unique pieces, no quantity selector) */}
      {isGenesis ? (
        <Modal isOpen={state === "quantity"} onClose={() => setState("idle")}>
          <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
            <CloseButton onClick={() => setState("idle")} />
            <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
              Genesis Collection
            </h2>
            <p className="text-sm text-center text-muted">
              25 exclusive hand-crafted vinyl artworks. Each piece is unique and one-of-a-kind.
              Once collected, it&apos;s yours forever.
            </p>

            {/* Price summary */}
            <div className="w-full border border-[var(--border)] p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Piece</span>
                <span className="text-foreground font-semibold">1 unique artwork</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Edition</span>
                <span className="text-foreground font-semibold">Black, White, or Craft</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Gas fees</span>
                <span className="text-foreground font-semibold">$0.00</span>
              </div>
              <div className="border-t border-[var(--border)] pt-2 flex justify-between text-sm">
                <span className="text-foreground font-bold">Total</span>
                <span className="text-foreground font-bold font-hoodlrz text-lg">
                  {price}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleProceedToPayment}
              className="w-full"
            >
              Pay {price}
            </Button>

            <p className="text-[10px] text-muted text-center">
              Powered by Stripe. Secure payment.
            </p>
          </div>
        </Modal>
      ) : (
        /* Payment Modal — Hoodlrz (quantity selector) */
        <Modal isOpen={state === "quantity"} onClose={() => setState("idle")}>
          <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
            <CloseButton onClick={() => setState("idle")} />
            <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
              Collect
            </h2>
            <p className="text-sm text-center text-muted">
              Each piece is unique, generated from 7 hand-drawn layers.
              No gas fees. No hidden costs.
            </p>

            {/* Quantity selector */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 border border-[var(--border)] text-foreground font-bold text-lg hover:bg-[var(--surface)] transition-colors"
              >
                -
              </button>
              <span className="font-hoodlrz text-3xl font-bold text-foreground w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="w-10 h-10 border border-[var(--border)] text-foreground font-bold text-lg hover:bg-[var(--surface)] transition-colors"
              >
                +
              </button>
            </div>

            {/* Price summary */}
            <div className="w-full border border-[var(--border)] p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Price per piece</span>
                <span className="text-foreground font-semibold">{price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Quantity</span>
                <span className="text-foreground font-semibold">{quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Gas fees</span>
                <span className="text-foreground font-semibold">$0.00</span>
              </div>
              <div className="border-t border-[var(--border)] pt-2 flex justify-between text-sm">
                <span className="text-foreground font-bold">Total</span>
                <span className="text-foreground font-bold font-hoodlrz text-lg">
                  ${(parseFloat(price.replace("$", "")) * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleProceedToPayment}
              className="w-full"
            >
              Pay ${(parseFloat(price.replace("$", "")) * quantity).toFixed(2)}
            </Button>

            <p className="text-[10px] text-muted text-center">
              Powered by Stripe. Secure payment.
            </p>
          </div>
        </Modal>
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
