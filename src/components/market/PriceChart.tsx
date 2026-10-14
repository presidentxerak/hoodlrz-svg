"use client";

/**
 * Le graphique de cours.
 *
 * MINIMALISTE, ET DANS LA MEME MAIN QUE LE RESTE. Pas de grille, pas
 * d'axes, pas de legende : une ligne, une zone sous la ligne, et le prix
 * sous le curseur. Ce qu'on regarde sur un graphique de cours tient en
 * deux questions - ca monte ou ca descend, et combien maintenant - et
 * tout le reste encombre.
 *
 * TRACE EN SVG, SANS BIBLIOTHEQUE. Une bibliotheque de graphiques pese
 * plus que toute l'application, impose son propre style, et il faudrait
 * ensuite lutter contre lui pour retrouver le trait du logo. Ici le trait
 * fait 1,5 px comme les pictogrammes, et l'epaisseur est figee en pixels
 * ecran : sans `vectorEffect`, elle s'etirerait avec le viewBox.
 *
 * AUCUNE DONNEE N'EST SIMULEE. Sans cours, le composant affiche qu'il
 * n'y en a pas.
 */

import { useMemo, useState } from "react";

export interface Chandelier {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

const L = 600;
const H = 160;
const MARGE = 6;

export default function PriceChart({
  chandeliers,
  hausse,
  hauteur = 160,
}: {
  chandeliers: Chandelier[];
  hausse: boolean;
  hauteur?: number;
}) {
  const [survol, setSurvol] = useState<number | null>(null);

  const { ligne, aire, points, bas, haut } = useMemo(() => {
    const cs = chandeliers.map((c) => c.c);
    const bas = Math.min(...cs);
    const haut = Math.max(...cs);
    // Une serie plate donnerait une division par zero ; on lui invente
    // une amplitude d'un pour cent, ce qui la dessine bien a plat.
    const amplitude = haut - bas || haut * 0.01 || 1;

    const points = chandeliers.map((c, i) => {
      const x = MARGE + (i / (chandeliers.length - 1)) * (L - MARGE * 2);
      const y = MARGE + (1 - (c.c - bas) / amplitude) * (H - MARGE * 2);
      return { x, y, c };
    });

    const ligne = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const aire = `${ligne} L${points[points.length - 1].x.toFixed(1)} ${H} L${points[0].x.toFixed(1)} ${H} Z`;
    return { ligne, aire, points, bas, haut };
  }, [chandeliers]);

  if (chandeliers.length < 2) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-[var(--border)] text-xs text-muted"
        style={{ height: hauteur }}
      >
        No price data.
      </div>
    );
  }

  const couleur = hausse ? "#22c55e" : "#ff5a3c";
  const vu = survol !== null ? points[survol] : null;

  return (
    <div className="relative" style={{ height: hauteur }}>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={`Price from ${bas.toFixed(2)} to ${haut.toFixed(2)}`}
        onMouseLeave={() => setSurvol(null)}
        onMouseMove={(e) => {
          // La position est ramenee a l'indice du point le plus proche.
          // Chercher le point le plus proche en distance euclidienne
          // ferait sauter la lecture sur les parties verticales.
          const r = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - r.left) / r.width;
          const i = Math.round(ratio * (points.length - 1));
          setSurvol(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id={`degrade-${hausse ? "h" : "b"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity="0.28" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={aire} fill={`url(#degrade-${hausse ? "h" : "b"})`} />
        <path
          d={ligne}
          fill="none"
          stroke={couleur}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {vu && (
          <>
            <line
              x1={vu.x}
              y1={0}
              x2={vu.x}
              y2={H}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              className="text-muted"
            />
            <circle cx={vu.x} cy={vu.y} r={3} fill={couleur} />
          </>
        )}
      </svg>

      {/* La valeur survolee est posee en HTML et non dans le SVG : le
          viewBox est etire horizontalement par preserveAspectRatio="none",
          et un texte a l'interieur serait deforme avec lui. */}
      {vu && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap
                     border border-[var(--border)] bg-background px-2 py-1 text-[11px]"
          style={{ left: `${(vu.x / L) * 100}%` }}
        >
          <span className="font-medium text-foreground">
            {vu.c.c.toLocaleString("en-GB", { maximumFractionDigits: vu.c.c < 1 ? 6 : 2 })}
          </span>
          <span className="ml-2 text-muted">
            {new Date(vu.c.t * 1000).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
