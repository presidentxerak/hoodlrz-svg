"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useRouter } from "next/navigation";

type AuthTab = "email" | "wallet";

export default function AccessPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("wallet");

  // Email state
  const [email, setEmail] = useState("");
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

    setLoading(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
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
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleWalletConnect() {
    setWalletError("");
    setWalletLoading(true);

    try {
      const eth = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;

      if (!eth) {
        // Try deep link on mobile
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}/access`;
        setWalletLoading(false);
        return;
      }

      // Request account
      const accounts = await eth.request({ method: "eth_requestAccounts" });
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
        body: JSON.stringify({ address, signature: (signature as unknown as string), nonce }),
        headers: { "Content-Type": "application/json" },
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        setWalletError(data.error || "Verification failed.");
        setWalletLoading(false);
        return;
      }

      // Success — redirect
      setWalletLoading(false);
      router.push("/my-collection");
      router.refresh();
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

        {/* Wallet Tab */}
        {tab === "wallet" && (
          <div className="w-full flex flex-col items-center gap-5 animate-fade-in">
            <p className="text-xs text-center text-muted leading-relaxed">
              Sign a message with MetaMask to prove ownership of your wallet.
              No gas fees, no transaction — just a signature.
            </p>

            <button
              onClick={handleWalletConnect}
              disabled={walletLoading}
              className={[
                "w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm",
                "font-bold uppercase tracking-widest text-white",
                "bg-[#627eea] hover:bg-[#4c6ce0] active:scale-[0.98]",
                "transition-all duration-150",
                walletLoading ? "opacity-60 pointer-events-none" : "",
              ].join(" ")}
            >
              <svg width="18" height="18" viewBox="0 0 784 784" fill="none">
                <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="white" fillOpacity="0.8"/>
                <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="white"/>
                <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="white" fillOpacity="0.8"/>
                <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="white"/>
              </svg>
              {walletLoading ? "Connecting..." : "Connect with MetaMask"}
            </button>

            {walletError && (
              <p className="text-xs text-red-500 text-center">{walletError}</p>
            )}
          </div>
        )}

        {/* Email Tab */}
        {tab === "email" && !submitted && (
          <form
            onSubmit={handleEmailSubmit}
            className="flex w-full flex-col gap-5 animate-fade-in"
          >
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />

            <Button
              variant="primary"
              size="lg"
              disabled={loading}
            >
              {loading ? "Sending..." : "Get Magic Link"}
            </Button>

            <p className="text-[10px] text-center text-muted">
              No passwords. We&apos;ll send a magic link to your inbox.
            </p>
          </form>
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
