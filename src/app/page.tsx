"use client";

import Button from "@/components/ui/Button";
import Countdown from "@/components/ui/Countdown";
import PFPViewer from "@/components/ui/PFPViewer";

const FEATURED_SEEDS = ["hoodlrz-og-001", "hoodlrz-og-002", "hoodlrz-og-003", "hoodlrz-og-004"];
const DROP_DATE = "2026-04-15T18:00:00Z";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* ── Hero ── */}
      <section className="flex w-full flex-col items-center justify-center gap-6 px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[60px]">
          HOODLRZ
        </h1>
        <p className="max-w-md text-center text-sm leading-relaxed text-muted sm:text-base">
          Own the identity. Collect the culture.
        </p>

        {/* Countdown */}
        <div className="mt-4">
          <Countdown targetDate={DROP_DATE} label="Next Drop" />
        </div>

        {/* CTA */}
        <div className="mt-6">
          <Button variant="primary" size="lg" href="/collections">
            Collect Now
          </Button>
        </div>
      </section>

      {/* ── Featured PFPs ── */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20">
        <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-muted">
          Featured
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {FEATURED_SEEDS.map((seed) => (
            <div key={seed} className="animate-fade-in-up">
              <PFPViewer seed={seed} size={400} className="aspect-square w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
