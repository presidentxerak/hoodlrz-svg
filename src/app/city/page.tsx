// /city - same-origin iframe wrapper around the self-contained game.
// MetaMask (window.ethereum) still works because the iframe is same-origin;
// pointer-lock, keyboard capture and the game's globals stay isolated from
// the host site.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "hOodlrz CITY (Beta) - The Block",
  description: "Explore The Block - every Hoodlrz holder is a tower.",
};

export default function CityPage() {
  return (
    <iframe
      src="/game/hoodlrz-city.html"
      title="hOodlrz CITY (Beta)"
      // Fixed below the sticky header (3.5rem) and above the mobile
      // BottomNav (4rem). On desktop BottomNav is hidden so bottom = 0.
      className="fixed left-0 right-0 top-14 bottom-16 md:bottom-0 w-full border-0 block"
      allow="fullscreen; gamepad; accelerometer; microphone; clipboard-read; clipboard-write"
    />
  );
}
