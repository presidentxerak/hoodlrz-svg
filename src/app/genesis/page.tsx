"use client";

import Link from "next/link";
import { GENESIS_VINYLS } from "@/lib/genesis";
import Badge from "@/components/ui/Badge";
import Countdown from "@/components/ui/Countdown";

const EDITIONS = ["Black", "White", "Craft"] as const;

const EDITION_COUNTS: Record<string, string> = {
  Black: "10 pieces",
  White: "5 pieces",
  Craft: "10 pieces",
};

const GENESIS_DROP_DATE = "2026-05-10T18:00:00Z";

export default function GenesisListingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* ── Video Hero ── */}
      <section className="relative flex w-full flex-col items-center justify-center px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[50vh]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-vinyl.mp4" type="video/mp4" />
          <source src="/hero-vinyl.mov" type="video/quicktime" />
        </video>
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-white sm:text-[56px]">
              Genesis Vinyl
            </h1>
            <Badge variant="legendary">Genesis</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            25 exclusive hand-crafted vinyl artworks across three editions: Black (10), White (5), and Craft (10).
            Each piece features a unique hand-drawn sleeve and a custom pressed disc — choose your 4 tracks
            and their order on Side A and Side B. A one-of-a-kind collectible shipped worldwide.
          </p>

          {/* Drop status */}
          <div className="mt-4 flex flex-col items-center gap-2">
            {new Date(GENESIS_DROP_DATE).getTime() > Date.now() ? (
              <>
                <span className="text-[10px] uppercase tracking-widest text-white/50">
                  Drop Date
                </span>
                <p className="font-hoodlrz text-3xl font-bold tracking-wider text-amber-500 sm:text-4xl">
                  {new Date(GENESIS_DROP_DATE).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
                </p>
                <div className="mt-2 [&_span]:!text-white [&_.text-muted]:!text-white/50 [&_.text-foreground]:!text-white">
                  <Countdown targetDate={GENESIS_DROP_DATE} />
                </div>
              </>
            ) : (
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                Available Now
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20">
        <div className="space-y-12">
          {EDITIONS.map((edition) => {
            const vinyls = GENESIS_VINYLS.filter((v) => v.edition === edition);

            return (
              <section key={edition}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                  {edition} Edition &mdash; {EDITION_COUNTS[edition]}
                </h2>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {vinyls.map((vinyl) => (
                    <Link
                      key={vinyl.id}
                      href={`/genesis/${vinyl.id}`}
                      className="group flex flex-col gap-2"
                    >
                      <div className="aspect-square overflow-hidden bg-[var(--surface)] border border-[var(--border)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_4px_24px_rgba(255,255,255,0.04)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vinyl.image}
                          alt={vinyl.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          {vinyl.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            $300
                          </span>
                          <Badge variant={vinyl.sold ? "warning" : "success"}>
                            {vinyl.sold ? "Sold" : "Available"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-muted uppercase tracking-widest text-center pt-4 border-t border-[var(--border)]">
            {GENESIS_VINYLS.length} unique pieces across 3 editions
          </p>
        </div>
      </div>
    </div>
  );
}
