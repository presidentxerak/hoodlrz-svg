// /city - same-origin iframe wrapper around the self-contained game.
// MetaMask (window.ethereum) still works because the iframe is same-origin;
// pointer-lock, keyboard capture and the game's globals stay isolated from
// the host site.
//
// The iframe is fixed-positioned right under the sticky header and stretches
// to the bottom of the dynamic viewport. The BottomNav is hidden on this
// route (see BottomNav.tsx) so the game gets the full available height on
// mobile too.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "hOodlrz CITY (Beta) - The Block",
  description: "Explore The Block - every Hoodlrz holder is a tower.",
};

export default function CityPage() {
  // The header is 3.5rem (h-14). We use 100dvh so mobile browsers shrink
  // correctly when the URL bar appears/disappears.
  return (
    <div
      className="fixed inset-x-0 z-40"
      style={{ top: "3.5rem", height: "calc(100dvh - 3.5rem)" }}
    >
      <iframe
        src="/game/hoodlrz-city.html"
        title="hOodlrz CITY (Beta)"
        className="block w-full h-full border-0"
        allow="fullscreen; gamepad; accelerometer; microphone; clipboard-read; clipboard-write"
      />
    </div>
  );
}
