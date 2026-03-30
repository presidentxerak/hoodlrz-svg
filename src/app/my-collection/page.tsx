"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  /* ── Auth check ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/access");
      } else {
        setAuthed(true);
      }
    });
  }, [router]);

  /* Loading / redirect */
  if (authed === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Header ── */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        My Collection
      </h1>

      {/* ── Placeholder ── */}
      <div className="mt-20 flex flex-col items-center gap-6 text-center">
        {/* Hourglass icon */}
        <div className="w-20 h-20 border border-[var(--border)] flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted"
          >
            <path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z" />
            <path d="M6 2h12" />
            <path d="M6 22h12" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-foreground">
          Your collection will appear here after the drop
        </h2>

        <p className="max-w-md text-sm leading-relaxed text-muted">
          Once the Hoodlrz collection drops, all your collectibles, Hoodz
          rewards, seller balance, and Genesis eligibility will be visible here.
        </p>

        <Button variant="primary" size="lg" href="/collections">
          View Collections
        </Button>

        <p className="text-xs text-muted">Drop date: April 15, 2026</p>
      </div>
    </div>
  );
}
