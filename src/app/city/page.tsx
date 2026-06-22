"use client";

// /city - same-origin iframe wrapper around the self-contained game.
// MetaMask (window.ethereum) still works because the iframe is same-origin;
// pointer-lock, keyboard capture and the game's globals stay isolated from
// the host site.
//
// On mobile browsers without a wallet injection (Safari / Chrome iOS,
// Chrome Android outside of MetaMask's in-app browser), the iframe-based
// deep link to MetaMask is unreliable - browsers strip the user-gesture
// chain by the time the async click handler runs, and Chrome iOS in
// particular ignores Universal Links from inside iframes. We solve that
// by rendering the MetaMask prompt and the deep-link <a> in the TOP
// window (this component), which the browser accepts as a regular
// top-level navigation.

import { useEffect, useState } from "react";

export default function CityPage() {
  const [showMm, setShowMm] = useState(false);
  const [host, setHost] = useState("hoodlrz.com");
  // iframe height kept in sync with the actual visible viewport so MM /
  // Safari mobile WebViews (where 100dvh is unreliable) still get a
  // properly sized game canvas.
  const [iframeH, setIframeH] = useState("calc(100dvh - 3.5rem)");

  useEffect(() => {
    setHost(window.location.host);

    const HEADER_PX = 56;
    const resize = () => {
      const h = Math.max(window.innerHeight - HEADER_PX, 320);
      setIframeH(h + "px");
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    // Some mobile browsers fire 'resize' late after the URL bar
    // collapses; force one more measure after the next frame.
    requestAnimationFrame(resize);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasEthereum =
      typeof (window as unknown as { ethereum?: unknown }).ethereum !==
      "undefined";
    if (isMobile && !hasEthereum) setShowMm(true);

    // Iframe can request the prompt at any time (e.g. when the user
    // taps the gate button inside the game).
    function onMessage(e: MessageEvent) {
      if (!e || !e.data) return;
      const t = (e.data as { type?: string }).type;
      if (t === "request-metamask-prompt") setShowMm(true);
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const universalLink = `https://metamask.app.link/dapp/${host}/city`;
  const schemeLink = `metamask://dapp/${host}/city`;
  const bareUrl = `https://${host}/city`;

  return (
    <>
      <iframe
        src="/game/hoodlrz-city.html"
        title="hOodlrz CITY (Beta)"
        style={{
          position: "fixed",
          top: "3.5rem",
          left: 0,
          right: 0,
          width: "100%",
          height: iframeH,
          border: 0,
          display: "block",
        }}
        allow="fullscreen; gamepad; accelerometer; microphone; clipboard-read; clipboard-write"
      />
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
