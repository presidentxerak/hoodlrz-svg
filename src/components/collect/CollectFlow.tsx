"use client";

import { useState, useCallback } from "react";
import CollectButton from "./CollectButton";
import RevealOverlay from "./RevealOverlay";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { generateSeed } from "@/lib/pfp/hash";

type FlowState = "idle" | "auth" | "loading" | "revealing" | "complete" | "error";

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

  // Auth modal state
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState("");

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

    // Production flow
    setState("loading");

    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug }),
      });

      // Not authenticated → show auth modal
      if (res.status === 401) {
        setState("auth");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Collection failed (${res.status})`);
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setState("revealing");
      setResult({
        seed: data.seed,
        serialNumber: data.serialNumber,
        username: data.username,
      });
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg === "Failed to fetch" ? "Connection error. Please try again." : msg);
    }
  }, [collectionSlug, preview]);

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
                Check your inbox. We sent a magic link to{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
              <p className="text-xs text-muted text-center">
                Click the link in the email, then come back here and click Collect again.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setState("idle");
                  setAuthSent(false);
                  setEmail("");
                }}
              >
                Got it
              </Button>
            </div>
          )}
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
