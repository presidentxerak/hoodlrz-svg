"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Apercu du moteur generatif, joue en direct dans une iframe.
 *
 * L'artefact servi ici est le MEME fichier que celui stocke on-chain
 * (kids/engine/frozen.html, copie dans public/kids/). Le visiteur voit
 * donc exactement ce que produira son token, pas une maquette.
 *
 * L'iframe est en sandbox : le moteur n'a besoin que d'executer du
 * script et de jouer du son au clic. Il n'a aucune raison d'acceder au
 * wallet ou au meme origine que la page.
 */
export default function EnginePreview({
  className = "",
  autoCycleMs = 0,
  bare = false,
  fill = false,
}: {
  className?: string;
  autoCycleMs?: number;
  /** Sans le hash ni le bouton : pour les grilles, ou le cadre suffit. */
  bare?: boolean;
  /** Occupe toute la hauteur disponible, sans cadre ni ratio impose :
   *  pour servir de fond, ou l'image doit couvrir et non s'inscrire. */
  fill?: boolean;
}) {
  const [hash, setHash] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const roll = useCallback(() => {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    // Array.from plutot qu'un spread : la cible TypeScript du projet
    // n'autorise pas l'iteration directe d'un Uint8Array.
    setHash("0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(""));
  }, []);

  useEffect(() => { roll(); }, [roll]);

  useEffect(() => {
    if (!autoCycleMs) return;
    const id = setInterval(roll, autoCycleMs);
    return () => clearInterval(id);
  }, [autoCycleMs, roll]);

  return (
    <div className={`relative ${fill ? "h-full" : ""} ${className}`}>
      <div
        className={
          fill
            ? "h-full w-full bg-black overflow-hidden"
            : "aspect-square w-full border border-[var(--border)] bg-black overflow-hidden"
        }
      >
        {hash && (
          <iframe
            ref={frameRef}
            key={hash}
            src={`/kids/engine.html?hash=${hash}`}
            title="Hoodlrz Kids preview"
            className="h-full w-full border-0"
            sandbox="allow-scripts"
            loading="lazy"
          />
        )}
      </div>

      {!bare && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <code className="truncate font-mono text-[11px] text-[var(--muted)]">
              {hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "…"}
            </code>
            <button
              type="button"
              onClick={roll}
              className="shrink-0 border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest
                         transition-colors hover:border-accent-red hover:text-accent-red
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-red"
            >
              Roll another
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
            A random draw, played by the very engine that will be stored
            on-chain. Tap the artwork to change the punchline.
          </p>
        </>
      )}
    </div>
  );
}
