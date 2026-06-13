"use client";

import { usePathname } from "next/navigation";

const OPENSEA_URL = "https://opensea.io/collection/hoodlrz/overview";

/**
 * Sticky black bar with the "Mint on OpenSea" CTA. Visible site-wide
 * except on the vinyl routes where the audio player already occupies
 * the same screen real estate.
 */
export default function OpenSeaStickyBanner() {
  const pathname = usePathname();
  if (pathname?.startsWith("/genesis")) return null;

  return (
    <div className="fixed left-0 right-0 bottom-16 md:bottom-0 z-50 bg-black border-t border-white/10 px-4 py-3 sm:py-4 flex justify-center">
      <a
        href={OPENSEA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full max-w-xl items-center justify-center px-10 py-3 sm:py-4 text-base sm:text-lg font-bold uppercase tracking-widest text-white cta-gradient hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(229,62,62,0.5),0_0_64px_rgba(213,63,140,0.3)] active:scale-[0.98] transition-transform duration-150 select-none"
      >
        Mint on OpenSea
      </a>
    </div>
  );
}
