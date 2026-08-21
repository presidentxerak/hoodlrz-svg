"use client";

import { useEffect, useState } from "react";

/**
 * Compte a rebours vers un timestamp UNIX.
 *
 * L'horloge vient du navigateur, donc elle peut deriver de celle de la
 * chaine. C'est sans consequence : le compte a rebours est indicatif,
 * c'est le contrat qui tranche. On evite juste d'afficher "0" pendant
 * plusieurs secondes en signalant l'echeance des qu'elle est atteinte.
 */
export default function Countdown({
  to,
  onReach,
}: {
  to: number;
  onReach?: () => void;
}) {
  // La page est prerendue : initialiser avec Date.now() donnerait un HTML
  // serveur different du premier rendu client, donc une erreur
  // d'hydratation. On demarre a null et on ne calcule qu'une fois monte.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    setLeft(to - Math.floor(Date.now() / 1000));
    const id = setInterval(() => {
      const l = to - Math.floor(Date.now() / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        onReach?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [to, onReach]);

  // Espace insecable plutot qu'une chaine vide : evite que la ligne
  // sursaute au moment de l'hydratation.
  if (left === null) return <span className="font-mono tabular-nums">&nbsp;</span>;
  if (left <= 0) return <span className="font-mono tabular-nums">maintenant</span>;

  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono tabular-nums">
      {d > 0 && `${d}j `}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
