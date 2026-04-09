"use client";

import Link from "next/link";
import PFPViewer from "@/components/ui/PFPViewer";
import Countdown from "@/components/ui/Countdown";

/* ── Drop dates ── */
const HOODLRZ_DROP_DATE = "2026-05-15T18:00:00Z";

const WHITELIST_URL =
  "https://forms.gle/ugVMdtzV2JMbZ745A";

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
      <section className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[80vh]">
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
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl text-center">
          <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-white sm:text-[60px]">
            HOODLRZ
          </h1>
          <p className="max-w-md text-center text-sm leading-relaxed text-white/70 sm:text-base">
            Own the identity. Collect the culture. On-chain forever.
          </p>

          {/* Collection info */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className="text-white/90 font-hoodlrz text-lg tracking-wider sm:text-xl">
              10,000 On-Chain NFTs on Ethereum
            </p>
            <p className="text-white/90 font-hoodlrz text-lg tracking-wider sm:text-xl">
              25 Genesis Vinyls Collection
            </p>
          </div>

          {/* Drop date */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="font-hoodlrz text-2xl font-bold tracking-wider text-white sm:text-3xl">
              MAY 15, 2026
            </p>
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              Drop in
            </span>
            <div className="[&_span]:!text-white [&_.text-muted]:!text-white/50 [&_.text-foreground]:!text-white">
              <Countdown targetDate={HOODLRZ_DROP_DATE} />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#featured"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white border border-white/30 hover:border-white hover:bg-white/10 transition-all duration-150 select-none"
            >
              Know More
            </a>
            <a
              href={WHITELIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white cta-gradient hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(229,62,62,0.5),0_0_48px_rgba(213,63,140,0.3)] active:scale-[0.98] transition-transform duration-150 select-none"
            >
              White List
            </a>
          </div>
        </div>
      </section>

      {/* ── Featured PFPs ── */}
      <section id="featured" className="mx-auto w-full max-w-5xl px-4 py-20">
        <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-muted">
          Featured
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {FEATURED.map(({ seed, label }) => (
            <div key={seed} className="animate-fade-in-up flex flex-col gap-2">
              <PFPViewer seed={seed} className="aspect-square w-full" example />
              <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="w-full bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="font-hoodlrz text-center text-[28px] font-bold tracking-wider text-foreground sm:text-[36px]">
            How It Works
          </h2>
          <p className="mt-3 mx-auto max-w-lg text-center text-sm leading-relaxed text-muted">
            Two collections. Full on-chain ownership. One universe.
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-2">
            {/* Hoodlrz Ethereum Card */}
            <div className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--background)] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 784 784" fill="none">
                  <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="#627eea" fillOpacity="0.8"/>
                  <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="#627eea"/>
                  <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="#627eea" fillOpacity="0.8"/>
                  <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="#627eea"/>
                </svg>
                <h3 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
                  Hoodlrz
                </h3>
                <span className="text-[10px] uppercase tracking-widest bg-[#627eea]/10 text-[#627eea] border border-[#627eea]/30 px-2 py-0.5">
                  On-Chain
                </span>
              </div>

              {/* Preview PFPs */}
              <div className="grid grid-cols-4 gap-2">
                {FEATURED.map(({ seed }) => (
                  <PFPViewer key={`eth-${seed}`} seed={`eth-${seed}`} className="aspect-square w-full" example />
                ))}
              </div>

              <p className="text-sm leading-relaxed text-muted">
                10,000 unique digital identities minted as{" "}
                <strong className="text-foreground">full on-chain ERC-721 NFTs</strong> on
                Ethereum. Every SVG layer is stored directly on the blockchain using SSTORE2.
                Your Hoodlrz lives on-chain forever.
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#627eea]/10 text-[#627eea] text-xs font-bold">1</span>
                  <span className="text-muted"><strong className="text-foreground">Connect Wallet</strong> — MetaMask or any Ethereum wallet</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#627eea]/10 text-[#627eea] text-xs font-bold">2</span>
                  <span className="text-muted"><strong className="text-foreground">Choose quantity</strong> — Pick how many you want (1-10 per tx)</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#627eea]/10 text-[#627eea] text-xs font-bold">3</span>
                  <span className="text-muted"><strong className="text-foreground">Collect</strong> — Confirm the transaction. Pay in ETH + gas</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-[#627eea]/10 text-[#627eea] text-xs font-bold">4</span>
                  <span className="text-muted"><strong className="text-foreground">On-Chain</strong> — Your SVG is generated and stored on Ethereum</span>
                </div>
              </div>

              {/* Drop date */}
              <div className="flex items-center justify-center border-t border-[var(--border)] pt-4">
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-widest text-muted">Drop</span>
                  <p className="font-hoodlrz text-lg font-bold tracking-wider text-[#627eea]">MAY 15, 2026</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-hoodlrz text-xl font-bold text-[#627eea]">0.007 ETH</span>
                <Link
                  href="/collection/hoodlrz"
                  className="text-xs font-bold uppercase tracking-widest text-[#627eea] hover:underline"
                >
                  View Collection &rarr;
                </Link>
              </div>
            </div>

            {/* Genesis Card */}
            <div className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--background)] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <h3 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
                  Genesis
                </h3>
                <span className="text-[10px] uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5">
                  25 vinyls
                </span>
              </div>

              {/* Preview vinyls */}
              <div className="grid grid-cols-4 gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/genesis/black/01-black.png" alt="Black #01" className="aspect-square w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/genesis/black/03-black.png" alt="Black #03" className="aspect-square w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/genesis/black/05-black.png" alt="Black #05" className="aspect-square w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/genesis/black/07-black.png" alt="Black #07" className="aspect-square w-full object-cover" />
              </div>

              <p className="text-sm leading-relaxed text-muted">
                25 exclusive hand-crafted vinyl artworks across three editions:
                <strong className="text-foreground"> Black</strong> (10),
                <strong className="text-foreground"> White</strong> (5), and
                <strong className="text-foreground"> Craft</strong> (10).
                Each piece features a <strong className="text-foreground">unique hand-drawn sleeve</strong> and
                a <strong className="text-foreground">custom pressed disc</strong> — choose your 4 tracks from
                the Hoodlrz catalog and arrange them on Side A &amp; Side B.
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-amber-500/10 text-amber-500 text-xs font-bold">1</span>
                  <span className="text-muted"><strong className="text-foreground">Browse</strong> — Explore all 25 unique vinyls and choose yours</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-amber-500/10 text-amber-500 text-xs font-bold">2</span>
                  <span className="text-muted"><strong className="text-foreground">Your Tracks</strong> — Pick 4 tracks and arrange them on Side A &amp; Side B</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-amber-500/10 text-amber-500 text-xs font-bold">3</span>
                  <span className="text-muted"><strong className="text-foreground">Collect</strong> — Sign in, confirm your tracklist, and pay by card</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-amber-500/10 text-amber-500 text-xs font-bold">4</span>
                  <span className="text-muted"><strong className="text-foreground">Shipped</strong> — Your custom pressed vinyl + unique sleeve delivered worldwide</span>
                </div>
              </div>

              {/* Drop date */}
              <div className="flex items-center justify-center border-t border-[var(--border)] pt-4">
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-widest text-muted">Drop</span>
                  <p className="font-hoodlrz text-lg font-bold tracking-wider text-amber-500">MAY 10, 2026</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-hoodlrz text-xl font-bold text-foreground">$300.00</span>
                <Link
                  href="/genesis"
                  className="text-xs font-bold uppercase tracking-widest text-amber-500 hover:underline"
                >
                  View Vinyls &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
