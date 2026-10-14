"use client";

/**
 * Les illustrations animees de la page de connexion.
 *
 * NOIR ET BLANC, AU TRAIT, COMME LES PIECES D'ORIGINE. Les OG Hoodlrz
 * sont dessines au feutre blanc sur fond noir : un personnage, un mur de
 * briques, des tags. On reprend exactement ca, en SVG, parce que ca
 * s'anime sans video, se redimensionne sans flou et pese quelques
 * kilo-octets.
 *
 * L'ANIMATION EST LENTE ET BOUCLE SANS COUTURE. Une page de connexion se
 * regarde pendant quinze secondes, pas une : un mouvement rapide y
 * devient agressif au deuxieme coup d'oeil. Le capuchon respire, les
 * yeux clignent de temps en temps, la bombe de peinture trace son tag.
 *
 * TOUT S'ARRETE SOUS prefers-reduced-motion. Ce n'est pas une preference
 * esthetique : un mouvement continu rend une partie des gens malades, et
 * une page de connexion est exactement celle qu'on ne peut pas eviter.
 */

import type { CSSProperties } from "react";

/** Le trait commun : blanc, 1,5 px fige en pixels ecran, bouts arrondis.
 *  Les memes reglages que les pictogrammes, pour que la page entiere ait
 *  ete dessinee par la meme main. */
const TRAIT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

/** Le mur, pose derriere tout le reste. Les rangees sont decalees d'une
 *  demi-brique, et les briques ne sont pas toutes de la meme longueur :
 *  un mur parfaitement regulier se lit comme une grille. */
function Mur({ opacite = 0.16, hauteur = 200 }: { opacite?: number; hauteur?: number }) {
  const lignes: string[] = [];
  const bl = 34;
  const bh = 17;
  for (let y = 0, rang = 0; y <= hauteur; y += bh, rang++) {
    lignes.push(`M0 ${y} H200`);
    const decal = rang % 2 ? bl / 2 : 0;
    for (let x = decal; x < 200; x += bl) {
      lignes.push(`M${x.toFixed(0)} ${y} v${bh}`);
    }
  }
  return (
    <g style={{ opacity: opacite }} {...TRAIT} strokeWidth={1}>
      {lignes.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

/**
 * Le Hoodlrz.
 *
 * CE QUI FAIT QU'ON LE RECONNAIT, et que le premier jet ratait : le
 * capuchon et le visage ne sont pas la meme forme. Dessines d'un seul
 * ovale, on obtient un oeuf souriant. Il faut la coque exterieure du
 * capuchon, qui descend sur les epaules, ET l'ouverture interieure dans
 * laquelle le visage apparait - c'est l'anneau entre les deux qui dit
 * « capuche ».
 *
 * Les cordons pendent de cette ouverture, pas du menton. Les yeux sont
 * deux croix, comme sur une partie des pieces d'origine.
 *
 * `--respire` fait monter et descendre la capuche de deux unites. Le
 * decalage est passe en parametre pour que deux personnages cote a cote
 * ne respirent pas a l'unisson, ce qui ferait mecanique.
 */
function Hoodlrz({ decalage = 0 }: { decalage?: number }) {
  const style: CSSProperties = { animationDelay: `${decalage}s` };
  return (
    <g {...TRAIT}>
      {/* Torse */}
      <path d="M62 190c0-22 8-36 20-42h36c12 6 20 20 20 42" />

      <g className="motion-safe:animate-[respire_6s_ease-in-out_infinite]" style={style}>
        {/* Coque du capuchon : un sommet arrondi, des cotes qui tombent
            jusqu'aux epaules. */}
        <path d="M60 148c-6-18-8-34-4-50 6-24 24-38 44-38s38 14 44 38c4 16 2 32-4 50" />
        {/* Ouverture : l'anneau entre les deux est ce qui se lit comme une
            capuche. Elle est plus haute que large, et remonte sur le
            front. */}
        <path d="M76 100c0-16 10-27 24-27s24 11 24 27c0 20-11 34-24 34s-24-14-24-34Z" />
        {/* Cordons, partant du bord de l'ouverture */}
        <path d="M80 128c-2 14-3 24-2 34M120 128c2 14 3 24 2 34" />
        <path d="M78 165a3.5 3.5 0 1 0 .1 0M122 165a3.5 3.5 0 1 0 .1 0" />
      </g>

      {/* Les yeux. Deux croix, comme sur une partie des pieces. Le
          clignement les ecrase brievement sur leur centre. */}
      <g
        className="motion-safe:animate-[cligne_7s_ease-in-out_infinite]"
        style={{ ...style, transformOrigin: "100px 100px" }}
      >
        <path d="m88 95 7 8M95 95l-7 8" />
        <path d="m105 95 7 8M112 95l-7 8" />
      </g>

      {/* Bouche, legerement de travers : une bouche symetrique sur un
          dessin au feutre sonne faux. */}
      <path d="M90 116c5 4 14 3 19-2" />
    </g>
  );
}

/** Une bombe de peinture qui trace. Le trait apparait par
 *  `stroke-dashoffset`, la seule facon d'animer un dessin qui s'ecrit
 *  sans redessiner le chemin a chaque image. */
function Tag() {
  return (
    <g {...TRAIT}>
      <path
        d="M22 176c8-14 16-14 22 0s14 14 22-2 16-12 22 2"
        className="motion-safe:animate-[trace_9s_ease-in-out_infinite]"
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
    </g>
  );
}

/**
 * La colonne d'illustrations du volet de gauche.
 *
 * UNE SEULE SCENE, ET NON TROIS CARREES EMPILEES. Trois scenes carrees
 * dans un volet haut et etroit obligent a choisir entre deux defauts :
 * les laisser se centrer, et on obtient des bandes noires de chaque
 * cote ; les faire remplir, et le cadrage coupe les tetes. Une
 * composition dessinee d'emblee a la hauteur du volet n'a ni l'un ni
 * l'autre : on place les figures ou on veut qu'elles soient.
 *
 * Les trois ne font pas la meme taille et ne sont pas alignees : une
 * rangee de figures identiques se lit comme un motif, pas comme un
 * dessin.
 */
export default function HoodlrzScene({ className = "" }: { className?: string }) {
  return (
    <svg
      /* Le viewBox est aux proportions du volet, autour de 3 pour 4 :
         ce qui est dessine est donc a peu pres ce qui est vu, et le
         recadrage ne mange que les bords. Un viewBox beaucoup plus haut
         que le volet ferait disparaitre les deux tiers du dessin sans
         qu'on sache lesquels. */
      viewBox="0 0 200 270"
      /* « slice » parce que c'est un decor qui doit remplir son volet, et
         le viewBox est deja a ses proportions : le recadrage ne mange
         donc que quelques unites sur les bords. */
      preserveAspectRatio="xMidYMid slice"
      className={`text-white ${className}`}
      aria-hidden
      focusable="false"
    >
      <rect x="-20" y="-20" width="240" height="310" fill="#000" />
      <Mur hauteur={270} />

      {/* La figure principale, cadrage pleine hauteur. */}
      <g transform="translate(0 22)">
        <Hoodlrz decalage={0} />
      </g>

      {/* Une seconde, plus petite et coupee par le bas : elle donne de la
          profondeur a la scene sans disputer l'attention a la premiere. */}
      <g transform="translate(118 168) scale(0.52)">
        <Hoodlrz decalage={2.4} />
      </g>

      <g transform="translate(-8 36)">
        <Tag />
      </g>
      <g transform="translate(88 70) scale(0.7)">
        <Tag />
      </g>
    </svg>
  );
}
