"use client";

import { Suspense } from "react";
import PFPViewer from "@/components/ui/PFPViewer";
import CollectFlow from "@/components/collect/CollectFlow";

const FEATURED = [
  { seed: "hoodlrz-featured-956", label: "Legendary" },
  { seed: "hoodlrz-featured-4", label: "Rare" },
  { seed: "hoodlrz-featured-7", label: "Uncommon" },
  { seed: "hoodlrz-featured-1", label: "Common" },
];

export default function HomePage() {
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

          {/* Collect UI */}
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 text-white/80 text-sm">
              <span>
                <strong className="text-white font-hoodlrz text-lg">$9.99</strong>
                <span className="ml-1 text-white/50">per piece</span>
              </span>
              <span className="text-white/30">|</span>
              <span>
                <strong className="text-white font-hoodlrz text-lg">10,000</strong>
                <span className="ml-1 text-white/50">supply</span>
              </span>
              <span className="text-white/30">|</span>
              <span className="text-white/50">No gas fees</span>
            </div>
            <Suspense fallback={null}>
              <CollectFlow collectionSlug="hoodlrz" price="$9.99" />
            </Suspense>
          </div>
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
