"use client";

import { useState, useCallback, useEffect } from "react";
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [quantity, setQuantity] = useState(1);

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

    try {
      // Make one request per quantity (or loop)
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug }),
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
  }, [collectionSlug]);

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
        <div className="flex flex-col items-center gap-6 p-6 max-w-sm mx-auto">
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
                  setState("idle");
                  setAuthSent(false);
                  setEmail("");
                  // Re-check auth in case they signed in via another tab
                  const supabase = createClient();
                  supabase.auth.getUser().then(({ data }) => {
                    setIsLoggedIn(!!data.user);
                  });
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Modal — Quantity selector */}
      <Modal isOpen={state === "quantity"} onClose={() => setState("idle")}>
        <div className="flex flex-col items-center gap-6 p-6 max-w-sm mx-auto">
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
