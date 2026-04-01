"use client";

import Link from "next/link";
import { GENESIS_VINYLS } from "@/lib/genesis";
import Badge from "@/components/ui/Badge";

const EDITIONS = ["Black", "White", "Craft"] as const;

const EDITION_COUNTS: Record<string, string> = {
  Black: "10 pieces",
  White: "5 pieces",
  Craft: "10 pieces",
};

export default function GenesisListingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[56px]">
            Genesis
          </h1>
          <Badge variant="legendary">Genesis</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          25 exclusive hand-crafted vinyl artworks across three editions. Each
          piece is a unique physical artwork shipped directly to you.
        </p>
      </div>

      <div className="mt-12 space-y-12">
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
  );
}
