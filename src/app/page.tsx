"use client";

import { useMemo } from "react";
import PFPViewer from "@/components/ui/PFPViewer";
import CollectFlow from "@/components/collect/CollectFlow";
import Countdown from "@/components/ui/Countdown";
import Button from "@/components/ui/Button";

const FEATURED = [
  { seed: "hoodlrz-featured-956", label: "Legendary" },
  { seed: "hoodlrz-featured-4", label: "Rare" },
  { seed: "hoodlrz-featured-7", label: "Uncommon" },
  { seed: "hoodlrz-featured-1", label: "Common" },
];

const DROP_DATE = "2026-05-15T18:00:00Z";
const WHITELIST_DATE = "2026-05-12T18:00:00Z";

export default function HomePage() {
  const dropStatus = useMemo(() => {
    const now = Date.now();
    const wl = new Date(WHITELIST_DATE).getTime();
    const drop = new Date(DROP_DATE).getTime();
    if (now < wl) return "pre-whitelist" as const;
    if (now < drop) return "whitelist-live" as const;
    return "live" as const;
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* ── Hero with video background ── */}
      <section className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[70vh]">
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-hoodlrz-video.mp4" type="video/mp4" />
          <source src="/hero-hoodlrz-video.mov" type="video/quicktime" />
        </video>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Content over video */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-white sm:text-[60px]">
            HOODLRZ
          </h1>
          <p className="max-w-md text-center text-sm leading-relaxed text-white/70 sm:text-base">
            Own the identity. Collect the culture.
          </p>

          {dropStatus === "live" ? (
            /* Drop is live — show collect button directly */
            <div className="mt-6">
              <CollectFlow collectionSlug="hoodlrz" price="$9.99" />
            </div>
          ) : (
            /* Drop not live — show countdown */
            <>
              <div className="mt-4">
                <Countdown
                  targetDate={dropStatus === "pre-whitelist" ? WHITELIST_DATE : DROP_DATE}
                  label={dropStatus === "pre-whitelist" ? "Whitelist Opens" : "Drop"}
                />
              </div>
              <div className="mt-6">
                <Button variant="primary" size="lg" href="/access">
                  {dropStatus === "pre-whitelist" ? "Join Whitelist" : "Get Access"}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Featured PFPs ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20">
        <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-muted">
          Featured
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {FEATURED.map(({ seed, label }) => (
            <div key={seed} className="animate-fade-in-up flex flex-col gap-2">
              <PFPViewer seed={seed} className="aspect-square w-full" />
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
