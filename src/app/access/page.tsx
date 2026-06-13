"use client";

import { useState, useEffect, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type AuthTab = "wallet" | "email";
type EmailMode = "signin" | "signup";

// EVM wallet detection - supports multiple coexisting wallets
function getAvailableWallets(): { name: string; icon: string; provider: unknown }[] {
  if (typeof window === "undefined") return [];

  const wallets: { name: string; icon: string; provider: unknown }[] = [];
  const seen = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const eth = win.ethereum;

  // Some wallets register in window.ethereum.providers (EIP-5749 style)
  const providers: unknown[] = eth?.providers || (eth ? [eth] : []);

  for (const p of providers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prov = p as any;
    if (prov.isRabby && !seen.has("rabby")) {
      wallets.push({ name: "Rabby", icon: "🐰", provider: prov });
      seen.add("rabby");
    }
    if (prov.isMetaMask && !prov.isRabby && !seen.has("metamask")) {
      wallets.push({ name: "MetaMask", icon: "🦊", provider: prov });
      seen.add("metamask");
    }
    if (prov.isRainbow && !seen.has("rainbow")) {
      wallets.push({ name: "Rainbow", icon: "🌈", provider: prov });
      seen.add("rainbow");
    }
    if (prov.isCoinbaseWallet && !seen.has("coinbase")) {
      wallets.push({ name: "Coinbase Wallet", icon: "🔵", provider: prov });
      seen.add("coinbase");
    }
    if (prov.isBraveWallet && !seen.has("brave")) {
      wallets.push({ name: "Brave Wallet", icon: "🦁", provider: prov });
      seen.add("brave");
    }
    if (prov.isZerion && !seen.has("zerion")) {
      wallets.push({ name: "Zerion", icon: "⚡", provider: prov });
      seen.add("zerion");
    }
  }

  // Phantom injects on window.phantom.ethereum separately
  if (win.phantom?.ethereum && !seen.has("phantom")) {
    wallets.push({ name: "Phantom", icon: "👻", provider: win.phantom.ethereum });
    seen.add("phantom");
  }

  // Fallback: if no known wallet detected but ethereum exists
  if (wallets.length === 0 && eth) {
    wallets.push({ name: "Browser Wallet", icon: "💎", provider: eth });
  }

  return wallets;
}

export default function AccessPage() {
  const [tab, setTab] = useState<AuthTab>("wallet");
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");

  // If already logged in, redirect to My Collection
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        window.location.href = "/my-collection";
      }
    });
  }, []);

  // Email state
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Wallet state
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (emailMode === "signup" && (!pseudo || pseudo.trim().length < 2)) {
      setError("Choose a pseudo (at least 2 characters).");
      return;
    }

    setLoading(true);

    try {
      if (emailMode === "signin") {
        // Sign in: existing user - connect directly and go to My Collection
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          body: JSON.stringify({ email }),
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }

        setLoading(false);
        window.location.href = "/my-collection";
      } else {
        // Sign up: send magic link to confirm email
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, pseudonym: pseudo.trim() }),
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }

        setLoading(false);
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function connectWallet(provider: unknown) {
    setWalletError("");
    setWalletLoading(true);

    try {
      const eth = provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

      // Request account
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts || accounts.length === 0) {
        setWalletError("No account selected.");
        setWalletLoading(false);
        return;
      }
      const address = accounts[0];

      // Get nonce from server
      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
        headers: { "Content-Type": "application/json" },
      });
      if (!nonceRes.ok) {
        const data = await nonceRes.json().catch(() => ({}));
        setWalletError(data.error || "Failed to get nonce.");
        setWalletLoading(false);
        return;
      }
      const { nonce, message } = await nonceRes.json();

      // Sign message
      const signature = await eth.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Verify signature on server
      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature, nonce }),
        headers: { "Content-Type": "application/json" },
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        setWalletError(data.error || "Verification failed.");
        setWalletLoading(false);
        return;
      }

      // Success - full page reload to pick up session cookies
      setWalletLoading(false);
      window.location.href = "/my-collection";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed.";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        setWalletError("Connection cancelled.");
      } else {
        setWalletError(msg);
      }
      setWalletLoading(false);
    }
  }

  const wallets = getAvailableWallets();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
            Access
          </h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            Connect with your wallet or sign in with email.
          </p>
        </div>

        {/* Tabs */}
        <div className="w-full flex border border-[var(--border)]">
          <button
            onClick={() => setTab("wallet")}
            className={[
              "flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors",
              tab === "wallet"
                ? "bg-[#627eea]/10 text-[#627eea] border-b-2 border-[#627eea]"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 784 784" fill="none">
                <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="currentColor" fillOpacity="0.8"/>
                <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="currentColor"/>
                <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="currentColor" fillOpacity="0.8"/>
                <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="currentColor"/>
              </svg>
              Wallet
            </span>
          </button>
          <button
            onClick={() => setTab("email")}
            className={[
              "flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors",
              tab === "email"
                ? "bg-accent-red/10 text-accent-red border-b-2 border-accent-red"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 7l-10 6L2 7"/>
              </svg>
              Email
            </span>
          </button>
        </div>

        {/* ═══ Wallet Tab ═══ */}
        {tab === "wallet" && (
          <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
            <p className="text-xs text-center text-muted leading-relaxed">
              Sign a message to prove ownership of your wallet.
              No gas fees, no transaction - just a signature.
            </p>

            {wallets.length > 0 ? (
              <div className="w-full flex flex-col gap-2">
                {wallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => connectWallet(w.provider)}
                    disabled={walletLoading}
                    className={[
                      "w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm",
                      "font-bold uppercase tracking-widest text-white",
                      "bg-[#627eea] hover:bg-[#4c6ce0] active:scale-[0.98]",
                      "transition-all duration-150",
                      walletLoading ? "opacity-60 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    <span className="text-base">{w.icon}</span>
                    {walletLoading ? "Connecting..." : `Connect ${w.name}`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                {/* No wallet detected - show install links */}
                <p className="text-xs text-center text-muted">
                  No wallet detected. Install one to continue:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "MetaMask", url: "https://metamask.io/download/" },
                    { name: "Phantom", url: "https://phantom.app/download" },
                    { name: "Rainbow", url: "https://rainbow.me/download" },
                    { name: "Rabby", url: "https://rabby.io/" },
                  ].map((w) => (
                    <a
                      key={w.name}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-muted hover:text-foreground hover:border-[#627eea] transition-colors"
                    >
                      {w.name}
                    </a>
                  ))}
                </div>

                {/* Mobile deep link */}
                <button
                  onClick={() => {
                    window.location.href = `https://metamask.app.link/dapp/${window.location.host}/access`;
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest border border-[#627eea] text-[#627eea] hover:bg-[#627eea]/10 transition-colors"
                >
                  Open in MetaMask (Mobile)
                </button>
              </div>
            )}

            {walletError && (
              <p className="text-xs text-red-500 text-center">{walletError}</p>
            )}
          </div>
        )}

        {/* ═══ Email Tab ═══ */}
        {tab === "email" && !submitted && (
          <div className="w-full flex flex-col gap-5 animate-fade-in">
            {/* Sign In / Sign Up toggle */}
            <div className="flex border border-[var(--border)]">
              <button
                onClick={() => { setEmailMode("signin"); setError(""); }}
                className={[
                  "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                  emailMode === "signin"
                    ? "bg-accent-red/10 text-accent-red"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                Sign In
              </button>
              <button
                onClick={() => { setEmailMode("signup"); setError(""); }}
                className={[
                  "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                  emailMode === "signup"
                    ? "bg-accent-red/10 text-accent-red"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              {emailMode === "signup" && (
                <Input
                  label="Pseudo"
                  name="pseudo"
                  type="text"
                  placeholder="Your collector name"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                />
              )}

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />

              <Button variant="primary" size="lg" disabled={loading}>
                {loading
                  ? emailMode === "signin" ? "Connecting..." : "Sending..."
                  : emailMode === "signin"
                    ? "My Collection"
                    : "Send Magic Link"}
              </Button>
            </form>

            <p className="text-[10px] text-center text-muted">
              {emailMode === "signin"
                ? "Access your collection directly. No password needed."
                : "We'll send a confirmation link to your inbox to verify your email."}
            </p>
          </div>
        )}

        {/* Email success state */}
        {tab === "email" && submitted && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center border border-emerald-500/40 bg-emerald-500/10">
              <svg
                width="28"
                height="28"
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
            <p className="text-center text-sm leading-relaxed text-muted">
              Check your inbox. We sent a magic link to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Try a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
