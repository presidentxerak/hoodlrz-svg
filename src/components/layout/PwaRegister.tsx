"use client";

/**
 * Enregistre le service worker et propose l'installation.
 *
 * L'invite d'installation n'est pas declenchee d'office : le navigateur
 * laisse choisir le moment, et un bandeau qui surgit a la premiere
 * seconde se fait fermer sans etre lu. L'evenement est donc retenu, et le
 * bouton n'apparait qu'une fois - puis plus jamais si on le refuse, le
 * refus etant garde localement.
 *
 * Tout est entoure de try/catch : en navigation privee, le stockage local
 * et l'enregistrement du service worker peuvent lever, et aucun des deux
 * ne doit empecher la page de fonctionner.
 */

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface InvitePwa extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLE_REFUS = "hoodlrz-pwa-refuse";

export default function PwaRegister() {
  const [invite, setInvite] = useState<InvitePwa | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // L'enregistrement attend le chargement complet : lance plus tot, il
    // dispute la bande passante aux ressources de la premiere page.
    const poser = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    if (document.readyState === "complete") poser();
    else window.addEventListener("load", poser, { once: true });

    let refuse = false;
    try {
      refuse = localStorage.getItem(CLE_REFUS) === "1";
    } catch {
      /* stockage indisponible : on proposera, c'est sans gravite */
    }
    if (refuse) return;

    const capter = (e: Event) => {
      e.preventDefault();
      setInvite(e as InvitePwa);
    };
    window.addEventListener("beforeinstallprompt", capter);
    return () => window.removeEventListener("beforeinstallprompt", capter);
  }, []);

  if (!invite) return null;

  const refuser = () => {
    try {
      localStorage.setItem(CLE_REFUS, "1");
    } catch {
      /* sans memoire du refus, on reproposera : acceptable */
    }
    setInvite(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Hoodlrz"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex items-center gap-3
                 border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg
                 md:inset-x-auto md:bottom-4 md:right-4 md:w-[340px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-hoodlrz.svg" alt="" className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Install Hoodlrz</p>
        <p className="truncate text-xs text-muted">Full screen, from your home screen.</p>
      </div>
      <button
        onClick={async () => {
          const i = invite;
          setInvite(null);
          try {
            await i.prompt();
            await i.userChoice;
          } catch {
            /* l'invite n'est utilisable qu'une fois */
          }
        }}
        className="flex shrink-0 items-center gap-1.5 bg-accent-magenta px-3 py-1.5 text-xs font-bold
                   uppercase tracking-widest text-white"
      >
        <Download size={13} />
        Install
      </button>
      <button onClick={refuser} aria-label="Dismiss" className="shrink-0 p-1 text-muted hover:text-foreground">
        <X size={15} />
      </button>
    </div>
  );
}
