"use client";

/**
 * Choisir entre plusieurs wallets installes.
 *
 * POURQUOI CE COMPOSANT EXISTE
 * Un navigateur peut porter MetaMask, Rabby et Phantom en meme temps.
 * Avant EIP-6963, ils s'ecrasaient tous dans `window.ethereum` et le
 * dernier charge gagnait : l'utilisateur voyait s'ouvrir un wallet qu'il
 * n'utilise pas, ou rien du tout. On les liste donc, et c'est lui qui
 * tranche.
 *
 * Avec un seul wallet installe, ce composant ne s'affiche pas : poser une
 * question a un seul choix est une etape de plus pour rien.
 */

import { useEffect, useState } from "react";
import { surWallets, type WalletDetecte } from "@/lib/web3/providers";
import { choisirWallet } from "@/lib/web3/signer";

export default function WalletPicker({
  onChoix,
  sombre = true,
}: {
  onChoix: (w: WalletDetecte) => void;
  /** Sur fond sombre (le hero) ou sur fond de page. */
  sombre?: boolean;
}) {
  const [liste, setListe] = useState<WalletDetecte[]>([]);

  useEffect(() => surWallets(setListe), []);

  if (liste.length < 2) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className={`text-[11px] uppercase tracking-widest ${sombre ? "text-white/45" : "text-muted"}`}>
        Which wallet?
      </p>
      {liste.map((w) => (
        <button
          key={w.id}
          onClick={() => {
            choisirWallet(w);
            onChoix(w);
          }}
          className={`flex items-center gap-3 border px-4 py-2.5 text-sm transition-colors
            ${sombre
              ? "border-white/20 text-white hover:bg-white/10"
              : "border-[var(--border)] text-foreground hover:bg-[var(--surface-alt)]"}`}
        >
          {/* L'icone vient de l'extension en data: URI. Un wallet qui n'en
              fournit pas garde sa place, sans pastille. */}
          {w.icone && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={w.icone} alt="" className="h-5 w-5 shrink-0" />
          )}
          <span className="truncate">{w.nom}</span>
        </button>
      ))}
    </div>
  );
}
