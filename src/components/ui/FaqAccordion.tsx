"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  items: FaqItem[];
  /** Index opened by default (default: 0). Pass -1 to keep all closed. */
  defaultOpen?: number;
}

export default function FaqAccordion({ items, defaultOpen = 0 }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(defaultOpen);

  return (
    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {items.map((item, i) => {
        const open = openIdx === i;
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpenIdx(open ? null : i)}
            className="w-full flex flex-col gap-2 py-5 text-left transition-colors hover:bg-[var(--surface)]/40"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                {item.q}
              </span>
              <span
                className={`text-muted text-lg transition-transform ${
                  open ? "rotate-45" : ""
                }`}
                aria-hidden
              >
                +
              </span>
            </div>
            {open && (
              <div className="flex flex-col gap-3 pr-8">
                {item.a.split("\n\n").map((para, k) => (
                  <p key={k} className="text-sm leading-relaxed text-muted">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { FaqItem };
