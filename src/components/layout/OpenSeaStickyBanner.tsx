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
    <a
      href={OPENSEA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-0 right-0 bottom-16 md:bottom-0 z-50 flex items-center justify-center bg-black px-4 py-3 sm:py-4 text-white text-base sm:text-lg font-bold uppercase tracking-widest hover:bg-black/90 active:scale-[0.99] transition-transform duration-150 select-none border-t border-white/10"
    >
      Mint on OpenSea
    </a>
  );
}
