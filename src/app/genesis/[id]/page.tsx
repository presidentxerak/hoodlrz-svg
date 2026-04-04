"use client";

import { useParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { getVinylById, ALL_GENESIS_VINYLS } from "@/lib/genesis/vinyls";
import Countdown from "@/components/ui/Countdown";
import TrackSelector, { type TrackSelection } from "@/components/genesis/TrackSelector";

// Genesis drop dates — must match collection page
const GENESIS_DROP_DATE = "2026-05-10T18:00:00Z";
const GENESIS_WHITELIST_DATE = "2026-05-08T18:00:00Z";

function getGenesisDropStatus(): "pre-whitelist" | "whitelist-live" | "live" {
  const now = Date.now();
  if (now < new Date(GENESIS_WHITELIST_DATE).getTime()) return "pre-whitelist";
  if (now < new Date(GENESIS_DROP_DATE).getTime()) return "whitelist-live";
  return "live";
}

const EDITION_DESCRIPTIONS: Record<string, string> = {
  Black:
    "The Black Edition is the boldest expression of the Hoodlrz universe. Raw, minimal, and powerful. 10 unique hand-drawn vinyl covers.",
  White:
    "The White Edition is pure light. Clean lines, ethereal compositions. Only 5 exist — the rarest of the Genesis collection.",
  Craft:
    "The Craft Edition celebrates raw texture and organic imperfection. 10 unique pieces blending street art with artisanal craft.",
};

type FlowState = "idle" | "auth" | "loading" | "error";

function GenesisVinylContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const vinylId = params.id as string;

  const vinyl = getVinylById(vinylId);
  const dropStatus = getGenesisDropStatus();
  const isDropLive = dropStatus === "live";

  // Flow state
  const [state, setState] = useState<FlowState>("idle");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Track selection
  const [trackSelection, setTrackSelection] = useState<TrackSelection | null>(null);

  // Auth state
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

  // Auto-trigger collect flow
  useEffect(() => {
    if (autoTriggered || isLoggedIn === null) return;
    if (searchParams.get("collect") === "true") {
      setAutoTriggered(true);
      if (isLoggedIn && trackSelection) {
        handleProceedToPayment();
      } else if (!isLoggedIn) {
        setState("auth");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoggedIn, autoTriggered]);

  const handleCollect = useCallback(() => {
    setError(null);
    if (!trackSelection) {
      setError("Please select your 4 tracks before collecting.");
      return;
    }
    if (!isLoggedIn) {
      setState("auth");
    } else {
      handleProceedToPayment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, trackSelection]);

  const handleProceedToPayment = async () => {
    if (!trackSelection) return;
    setState("loading");

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionSlug: "genesis",
          quantity: 1,
          vinylId,
          trackSelection: {
            sideA: trackSelection.sideA.map((t) => t.title),
            sideB: trackSelection.sideB.map((t) => t.title),
          },
        }),
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
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        msg === "Failed to fetch"
          ? "Connection error. Please check your connection and try again."
          : msg
      );
    }
  };

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

  const CloseButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors text-xl leading-none"
      aria-label="Close"
    >
      &times;
    </button>
  );

  if (!vinyl) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted mb-4">Vinyl not found.</p>
          <Button variant="secondary" size="md" href="/collection/genesis">
            View Genesis Collection
          </Button>
        </div>
      </div>
    );
  }

  // Find adjacent vinyls for navigation
  const currentIndex = ALL_GENESIS_VINYLS.findIndex((v) => v.id === vinylId);
  const prevVinyl = currentIndex > 0 ? ALL_GENESIS_VINYLS[currentIndex - 1] : null;
  const nextVinyl =
    currentIndex < ALL_GENESIS_VINYLS.length - 1
      ? ALL_GENESIS_VINYLS[currentIndex + 1]
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Breadcrumb */}
      <div className="mb-8">
        <a
          href="/collection/genesis"
          className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
        >
          &larr; Genesis Collection
        </a>
      </div>

      {/* Main content: image + details side by side */}
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Vinyl image */}
        <div className="aspect-square overflow-hidden bg-[var(--surface)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vinyl.src}
            alt={`Genesis ${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="legendary">Genesis</Badge>
              <span className="text-xs uppercase tracking-widest text-muted">
                {vinyl.edition} Edition
              </span>
            </div>
            <h1 className="font-hoodlrz text-[32px] font-bold leading-none tracking-wider text-foreground sm:text-[44px]">
              {vinyl.edition} #{String(vinyl.number).padStart(2, "0")}
            </h1>
          </div>

          <p className="text-sm leading-relaxed text-muted">
            {EDITION_DESCRIPTIONS[vinyl.edition]}
          </p>

          {/* Product details */}
          <div className="border border-[var(--border)] p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Price</span>
              <span className="text-foreground font-bold font-hoodlrz text-lg">
                $300.00
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Type</span>
              <span className="text-foreground font-semibold">
                Physical vinyl + digital image
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Edition</span>
              <span className="text-foreground font-semibold">
                {vinyl.edition} ({vinyl.edition === "White" ? "5" : "10"} pieces)
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shipping</span>
              <span className="text-foreground font-semibold">Worldwide</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Includes</span>
              <span className="text-foreground font-semibold">
                Unique sleeve + pressed disc + digital collectible
              </span>
            </div>
          </div>

          {/* ── Track Selection ── */}
          {isDropLive && (
            <TrackSelector
              onSelectionComplete={setTrackSelection}
              disabled={state === "loading"}
            />
          )}

          {/* CTA or Countdown */}
          {!isDropLive ? (
            <div className="flex flex-col gap-4">
              <Countdown
                targetDate={dropStatus === "pre-whitelist" ? GENESIS_WHITELIST_DATE : GENESIS_DROP_DATE}
                label={dropStatus === "pre-whitelist" ? "Whitelist Opens" : "Public Drop"}
              />
              <button
                disabled
                className="w-full px-8 py-4 text-sm font-bold uppercase tracking-widest text-white opacity-40 cursor-not-allowed grayscale"
                style={{
                  background: "linear-gradient(135deg, #E53E3E 0%, #D53F8C 100%)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span>Coming Soon</span>
                  <span className="text-white/70 text-xs font-normal">$300.00</span>
                </span>
              </button>
            </div>
          ) : (state === "idle" || state === "error") ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCollect}
                disabled={isLoggedIn === null || !trackSelection}
                className={[
                  "w-full px-8 py-4 text-sm font-bold uppercase tracking-widest text-white",
                  "transition-all duration-150 ease-out",
                  isLoggedIn === null || !trackSelection
                    ? "opacity-40 cursor-not-allowed grayscale"
                    : "cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(229,62,62,0.5)]",
                ].join(" ")}
                style={{
                  background:
                    "linear-gradient(135deg, #E53E3E 0%, #D53F8C 100%)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span>Collect This Vinyl</span>
                  <span className="text-white/70 text-xs font-normal">
                    $300.00
                  </span>
                </span>
              </button>
              {!trackSelection && (
                <p className="text-[10px] text-muted text-center">
                  Select your 4 tracks above to enable checkout.
                </p>
              )}
              <p className="text-[10px] text-muted text-center">
                Shipping address will be collected at checkout.
              </p>
              {error && (
                <p className="text-accent-red text-xs text-center">{error}</p>
              )}
            </div>
          ) : null}

          {/* Loading state */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="w-10 h-10 border-2 border-white/20 border-t-accent-red"
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

          {/* What you get */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              What you get
            </p>
            <ul className="space-y-1.5 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>
                  Unique hand-drawn vinyl sleeve shipped to your address
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>
                  Custom pressed vinyl disc with your 4 chosen tracks
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>
                  High-resolution digital image in your Hoodlrz collection
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>Certificate of authenticity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                <span>Genesis collector status + exclusive access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── How It Works — Tutorial ── */}
      <div className="mt-16 border-t border-[var(--border)] pt-12">
        <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground sm:text-3xl mb-8 text-center">
          How It Works
        </h2>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="border border-[var(--border)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 border border-accent-red text-accent-red font-hoodlrz text-sm font-bold">
                1
              </span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                Unique Sleeve
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Each vinyl comes with a <strong className="text-foreground">unique hand-drawn cover</strong> — your sleeve is a one-of-a-kind artwork that no one else will ever own. It&apos;s your piece of the Hoodlrz universe, designed and illustrated by XERAK.
            </p>
          </div>

          {/* Step 2 */}
          <div className="border border-[var(--border)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 border border-accent-red text-accent-red font-hoodlrz text-sm font-bold">
                2
              </span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                Your Tracks
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Pick <strong className="text-foreground">4 tracks</strong> from the Hoodlrz catalog and arrange them across <strong className="text-foreground">Side A</strong> and <strong className="text-foreground">Side B</strong>. You choose the order — your disc is pressed to your exact specifications.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border border-[var(--border)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 border border-accent-red text-accent-red font-hoodlrz text-sm font-bold">
                3
              </span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                Pressed & Shipped
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Once your order is confirmed, your vinyl is <strong className="text-foreground">custom pressed</strong> with your tracklist and shipped worldwide with your unique sleeve, certificate of authenticity, and digital collectible.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation between vinyls */}
      <div className="mt-12 flex justify-between border-t border-[var(--border)] pt-6">
        {prevVinyl ? (
          <a
            href={`/genesis/${prevVinyl.id}`}
            className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            &larr; {prevVinyl.edition} #{String(prevVinyl.number).padStart(2, "0")}
          </a>
        ) : (
          <span />
        )}
        {nextVinyl ? (
          <a
            href={`/genesis/${nextVinyl.id}`}
            className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            {nextVinyl.edition} #{String(nextVinyl.number).padStart(2, "0")} &rarr;
          </a>
        ) : (
          <span />
        )}
      </div>

      {/* ── Auth Modal ── */}
      <Modal isOpen={state === "auth"} onClose={() => setState("idle")}>
        <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <CloseButton onClick={() => setState("idle")} />
          <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
            Sign Up to Collect
          </h2>
          <p className="text-sm text-center text-muted">
            Enter your email to get a magic link. No passwords, no wallet, no
            friction.
          </p>

          {!authSent ? (
            <form
              onSubmit={handleAuthSubmit}
              className="w-full flex flex-col gap-4"
            >
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
                Click the link in the email to sign in, then come back and
                collect.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setAuthSent(false);
                  setEmail("");
                  const supabase = createClient();
                  supabase.auth.getUser().then(({ data }) => {
                    const loggedIn = !!data.user;
                    setIsLoggedIn(loggedIn);
                    if (loggedIn && trackSelection) {
                      handleProceedToPayment();
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
    </div>
  );
}

export default function GenesisVinylPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted">Loading...</p>
        </div>
      }
    >
      <GenesisVinylContent />
    </Suspense>
  );
}
