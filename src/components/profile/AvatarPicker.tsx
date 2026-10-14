"use client";

/**
 * Choisir sa photo de profil parmi ses pieces.
 *
 * La grille ne montre QUE ce que le wallet detient : la liste vient de la
 * chaine, pas d'un catalogue. Un membre ne peut donc pas se donner une
 * piece qu'il n'a pas, et n'a pas non plus a chercher laquelle il
 * possede.
 *
 * Le clic enregistre immediatement. Pas de bouton « Enregistrer » : le
 * choix est reversible d'un autre clic, et une confirmation pour changer
 * une image est une etape de trop.
 */

import { useCallback, useEffect, useState } from "react";
import { IconCheck, IconSpinner } from "@/components/ui/icons";

interface Piece {
  contract: string;
  tokenId: number;
  collection: string;
  image: string;
}

export default function AvatarPicker() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [actuel, setActuel] = useState<{ contract: string; tokenId: number } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetch("/api/profile/avatar");
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErreur(j.error ?? "Pieces illisibles.");
        return;
      }
      const j = await r.json();
      setPieces(j.pieces ?? []);
      setActuel(j.actuel ? { contract: j.actuel.contract, tokenId: j.actuel.tokenId } : null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const choisir = async (p: Piece) => {
    const cle = `${p.contract}:${p.tokenId}`;
    setEnvoi(cle);
    setErreur(null);
    try {
      const r = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contract: p.contract, tokenId: p.tokenId, image: p.image }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErreur(j.error ?? "Refuse.");
        return;
      }
      setActuel({ contract: p.contract, tokenId: p.tokenId });
    } finally {
      setEnvoi(null);
    }
  };

  if (chargement) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted">
        <IconSpinner size={14} />
        Reading your pieces from the chain…
      </p>
    );
  }

  if (pieces.length === 0) {
    return (
      <p className="py-6 text-sm leading-relaxed text-muted">
        {erreur ?? "No piece found on this wallet yet."}
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Pick any piece you hold. {pieces.length} found.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {pieces.map((p) => {
          const cle = `${p.contract}:${p.tokenId}`;
          const choisi =
            actuel?.contract.toLowerCase() === p.contract.toLowerCase() &&
            actuel?.tokenId === p.tokenId;
          return (
            <button
              key={cle}
              onClick={() => choisir(p)}
              title={`${p.collection} #${p.tokenId}`}
              aria-pressed={choisi}
              className={`relative aspect-square overflow-hidden border transition-colors
                ${choisi ? "border-accent-magenta" : "border-[var(--border)] hover:border-muted"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={`${p.collection} #${p.tokenId}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {choisi && (
                <span className="absolute right-1 top-1 bg-accent-magenta p-0.5 text-white">
                  <IconCheck size={11} />
                </span>
              )}
              {envoi === cle && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                  <IconSpinner size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {erreur && <p className="mt-3 text-xs text-accent-red">{erreur}</p>}

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Ownership is checked on the chain when you pick. The image address is
        rebuilt from the contract and the token number, never taken from your
        browser.
      </p>
    </div>
  );
}
