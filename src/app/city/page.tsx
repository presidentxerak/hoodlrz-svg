"use client";

// /city - same-origin iframe wrapper around the self-contained game.
// MetaMask (window.ethereum) still works because the iframe is same-origin;
// pointer-lock, keyboard capture and the game's globals stay isolated from
// the host site.
//
// The MetaMask deep-link prompt lives in the TOP window (not the iframe)
// because mobile browsers - especially Chrome iOS - strip iframe-originated
// universal links. Rendering the <a href="metamask.app.link/..."> here
// means the tap is treated as a top-level navigation and reliably opens
// MetaMask on every browser we tested.

import { useEffect, useState } from "react";

// Production canonical host. The MetaMask deep-link MUST point here
// (not at the Vercel preview URL `hoodlrz-j1mj-…vercel.app` the user
// happens to be on), otherwise MetaMask hits the Vercel SSO auth wall
// because preview deployments are protected by default.
const PROD_HOST = "hoodlrz.com";

// Cache-busting query string for the game iframe. Build-time constant so
// every deploy invalidates the iframe HTML, defeating browsers that
// aggressively cache the static file across deploys.
const BUILD_ID =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  String(Date.now());

export default function CityPage() {
  const [showMm, setShowMm] = useState(false);

  useEffect(() => {
    // The game is OPEN to everyone now - no wallet needed to enter, so we
    // never auto-show the MetaMask prompt on page load. We still listen
    // for an explicit request-metamask-prompt message from the iframe
    // (fired by the optional CONNECT WALLET button) for the free-mint
    // flow.
    function onMessage(e: MessageEvent) {
      if (!e || !e.data) return;
      const t = (e.data as { type?: string }).type;
      if (t === "request-metamask-prompt") setShowMm(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ALWAYS deep-link to the production host. If we used
  // window.location.host the user on the preview URL would land back
  // on a SSO-protected preview deployment inside MetaMask.
  const universalLink = `https://metamask.app.link/dapp/${PROD_HOST}/city`;
  const schemeLink = `metamask://dapp/${PROD_HOST}/city`;
  const bareUrl = `https://${PROD_HOST}/city`;

  return (
    <>
      {/* Wrapper-based iframe sizing (option 3) - browser computes
          height from top+bottom, iframe fills 100%/100%. */}
      <div
        style={{
          position: "fixed",
          top: "3.5rem",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      >
        <iframe
          src={`/game/hoodlrz-city.html?v=${BUILD_ID}`}
          title="hOodlrz CITY (Beta)"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
          allow="fullscreen; gamepad; accelerometer; microphone; clipboard-read; clipboard-write"
        />
      </div>
      {showMm && (
        <MmPrompt
          universalLink={universalLink}
          schemeLink={schemeLink}
          bareUrl={bareUrl}
          onClose={() => setShowMm(false)}
        />
      )}
    </>
  );
}

function MmPrompt({
  universalLink,
  schemeLink,
  bareUrl,
  onClose,
}: {
  universalLink: string;
  schemeLink: string;
  bareUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const range = document.createRange();
      const el = document.getElementById("mm-url");
      if (el) {
        range.selectNode(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        try {
          document.execCommand("copy");
        } catch {
          /* noop */
        }
        sel?.removeAllRanges();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-[#0a0a14] border border-white/30 p-5 text-white">
        <h2 className="font-hoodlrz text-2xl tracking-wider mb-2">
          OPEN IN METAMASK
        </h2>
        <p className="text-xs text-white/60 leading-relaxed mb-4">
          Your wallet only injects inside the MetaMask in-app browser. Try the
          buttons in order if the first one doesn&apos;t open MetaMask on your
          device.
        </p>

        <a
          href={universalLink}
          className="block text-center py-3.5 px-4 mb-2 bg-[#ff2db5] text-black font-bold uppercase tracking-widest text-sm hover:bg-white"
        >
          1 · Open MetaMask
        </a>
        <a
          href={schemeLink}
          className="block text-center py-3 px-4 mb-4 border border-white/50 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10"
        >
          2 · Try direct link (metamask://)
        </a>

        <div className="border-t border-white/15 pt-3 mb-3">
          <p className="text-[11.5px] text-white/60 leading-relaxed mb-2">
            <span className="text-white font-bold">Still nothing?</span> Open
            MetaMask app → tap the menu (☰) → Browser → paste:
          </p>
          <div
            id="mm-url"
            className="p-2 bg-black border border-dashed border-[#ff2db5] text-[#ff2db5] font-mono text-[11px] break-all select-all"
          >
            {bareUrl}
          </div>
          <button
            type="button"
            onClick={copy}
            className="mt-2 border border-white/40 text-white text-[11px] py-1.5 px-3 hover:bg-white/10"
          >
            {copied ? "✓ Copied" : "📋 Copy URL"}
          </button>
        </div>

        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-2 text-white text-[11.5px] underline hover:no-underline"
        >
          Don&apos;t have MetaMask? Install it
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full text-white/60 text-xs underline hover:no-underline"
        >
          Continue without wallet (limited)
        </button>
      </div>
    </div>
  );
}
