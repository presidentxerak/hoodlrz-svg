"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AccessPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

<<<<<<< HEAD
    // TODO: replace with Supabase auth magic link
    // const { error } = await supabase.auth.signInWithOtp({ email });
    await new Promise((r) => setTimeout(r, 1200));

    setLoading(false);
    setSubmitted(true);
=======
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
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
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
            Enter your email to get a magic link. No passwords, no friction.
          </p>
        </div>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-5"
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
              {loading ? "Sending..." : "Get Access"}
            </Button>
          </form>
        ) : (
          /* Success state */
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
