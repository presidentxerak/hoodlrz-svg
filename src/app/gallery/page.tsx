"use client";

import Link from "next/link";
import Countdown from "@/components/ui/Countdown";

const STREET_DROP_DATE = "2026-06-16T17:30:00Z";

export default function GalleryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-20 pb-20 sm:pt-28">
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        Gallery
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        The Hoodlrz Street gallery will open after the public mint.
      </p>

      <div className="mt-16 flex flex-col items-center gap-6 border border-[var(--border)] py-16 px-6">
        <span className="text-[10px] uppercase tracking-widest text-muted">
          Mint opens in
        </span>
        <Countdown targetDate={STREET_DROP_DATE} />
        <p className="text-sm text-muted text-center max-w-md">
          Browse every minted Hoodlrz Street NFT on Ethereum once the drop is live.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-foreground border border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
        >
          Back to Mint
        </Link>
      </div>
    </div>
  );
}
