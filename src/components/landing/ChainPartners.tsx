"use client";

/**
 * Le bandeau des chaines et des briques sur lesquelles l'app tourne.
 *
 * POURQUOI UN DEFILEMENT ET PAS UNE GRILLE
 * Une grille de six tuiles se lit une fois puis devient du decor. Un
 * bandeau qui glisse garde l'oeil, et surtout tient a n'importe quelle
 * largeur sans se casser en deux lignes bancales sur telephone.
 *
 * LE DEFILEMENT S'ARRETE POUR QUI LE DEMANDE. `prefers-reduced-motion`
 * n'est pas une preference esthetique : un mouvement continu declenche
 * des nausees chez une partie des gens, et certains ne peuvent pas lire
 * un texte qui bouge. Le bandeau devient alors une liste qui defile a la
 * main.
 *
 * Les marques sont citees, pas imitees : un glyphe geometrique et le nom
 * ecrit. Redessiner approximativement un logo depose rend le resultat
 * faux et le rend juridiquement discutable.
 */

import type { ReactNode } from "react";
import { HOODLRZ_STREET_SUPPLY } from "@/lib/web3/config";

interface Brique {
  nom: string;
  role: string;
  couleur: string;
  glyphe: ReactNode;
}

/** Le losange d'Ethereum, la seule forme assez connue pour etre dessinee
 *  sans ambiguite. Les autres recoivent un glyphe neutre. */
const Losange = (
  <svg viewBox="0 0 784 784" className="h-5 w-5" aria-hidden>
    <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="currentColor" fillOpacity=".7" />
    <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="currentColor" />
    <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="currentColor" fillOpacity=".7" />
    <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="currentColor" />
  </svg>
);

const Carre = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <rect x="9" y="9" width="6" height="6" fill="currentColor" />
  </svg>
);

const Couches = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M12 3L3 8l9 5 9-5-9-5z" fill="currentColor" />
    <path d="M3 13l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const Cercle = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
  </svg>
);

const Onde = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M2 16c3-8 5-8 8 0s5 8 8 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BRIQUES: Brique[] = [
  { nom: "Ethereum", role: `OG Hoodlrz, ${HOODLRZ_STREET_SUPPLY} pieces`, couleur: "#627eea", glyphe: Losange },
  { nom: "Robinhood Chain", role: "Gen Kids, fully on-chain", couleur: "#c6f24e", glyphe: Carre },
  { nom: "Arbitrum Orbit", role: "the stack Robinhood Chain runs on", couleur: "#2f7bff", glyphe: Couches },
  { nom: "Alchemy", role: "RPC and holder snapshots", couleur: "#7b2fff", glyphe: Onde },
  { nom: "OpenSea", role: "secondary market, both chains", couleur: "#00c2d1", glyphe: Cercle },
  { nom: "Global Dollar", role: "USDG, the quote currency", couleur: "#22c55e", glyphe: Cercle },
];

function Tuile({ b }: { b: Brique }) {
  // L'espacement est une marge sur la tuile et non un `gap` du
  // conteneur. Avec un gap, la largeur totale vaut 12 tuiles + 11
  // espaces : la translation de -50 % tombe alors a un demi-espace a
  // cote et la boucle sursaute a chaque tour. Avec une marge, chaque
  // tuile fait exactement la meme largeur et le compte est juste.
  return (
    <div className="mr-3 flex shrink-0 items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
      <span style={{ color: b.couleur }}>{b.glyphe}</span>
      <span className="whitespace-nowrap">
        <span className="block text-sm font-medium leading-tight text-foreground">{b.nom}</span>
        <span className="block text-[11px] leading-tight text-muted">{b.role}</span>
      </span>
    </div>
  );
}

export default function ChainPartners() {
  return (
    <section className="w-full py-10">
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted">
        Built on
      </p>

      {/* Le masque efface les bords : sans lui, les tuiles apparaissent et
          disparaissent d'un coup et le defilement a l'air casse. */}
      <div
        className="group relative overflow-hidden"
        style={{
          maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div className="flex w-max motion-safe:animate-[defile_42s_linear_infinite] motion-safe:group-hover:[animation-play-state:paused] motion-reduce:overflow-x-auto">
          {/* La liste est doublee : c'est ce qui rend la boucle invisible,
              la seconde copie prenant la place de la premiere au moment
              exact ou celle-ci sort du cadre. */}
          {[...BRIQUES, ...BRIQUES].map((b, i) => (
            <Tuile key={`${b.nom}-${i}`} b={b} />
          ))}
        </div>
      </div>
    </section>
  );
}
