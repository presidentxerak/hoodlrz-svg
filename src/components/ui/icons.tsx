/**
 * Les pictogrammes, dessines a la main.
 *
 * POURQUOI PAS UNE BIBLIOTHEQUE
 * Le logo, les titres et les pieces sont traces au feutre, de travers et
 * assumes. Des icones geometriques parfaites a cote de ca ne font pas
 * « propre », elles font « colle depuis un autre site ». Celles-ci sont
 * donc dessinees avec les memes defauts : des lignes qui ne ferment pas
 * tout a fait, des angles qui tombent a un degre pres, des cercles qui
 * ne sont pas des cercles.
 *
 * LE TRAIT FAIT 1,5 PX ET NE BOUGE PAS AVEC LA TAILLE.
 * `vectorEffect="non-scaling-stroke"` fige l'epaisseur en pixels ecran :
 * sans lui, une icone affichee a 20 px dans une boite de 24 verrait son
 * trait s'amincir, et deux icones de tailles differentes n'auraient plus
 * le meme poids dans la meme barre.
 *
 * Les bouts et les jonctions sont arrondis : c'est ce qui distingue un
 * trait de feutre d'un trait de regle, plus encore que l'irregularite
 * des coordonnees.
 */

import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number;
}

function Dessin({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ── Navigation ───────────────────────────────────────────────────── */

/** Feed. Une maison dont le toit penche et dont la base ne ferme pas :
 *  un trait de feutre s'arrete rarement pile sur son depart. */
export const IconFeed = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.4 10.6 12 3.6l8.7 6.8" />
    <path d="M5.2 10v9.6c0 .5.4.8.9.8h11.7c.5 0 .9-.4.8-.9V10.2" />
    <path d="M9.6 20.2v-5.4c0-.4.3-.7.7-.7h3.3c.4 0 .7.3.8.7l.1 5.4" />
  </Dessin>
);

/** Market. Une courbe qui monte en zigzag, avec sa fleche. Les sommets
 *  ne sont pas alignes : une courbe de prix reguliere n'existe pas. */
export const IconMarket = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.3 19.4h17.4" />
    <path d="M4.2 15.8 8 11.4l3.4 3 3.2-5.1 2.9 2.6" />
    <path d="M14.6 6.6h5.1l-.2 5" />
    <path d="M19.6 6.8 15.3 12" />
  </Dessin>
);

/** Groups. Deux bulles, dont l'une mord sur l'autre. */
export const IconGroups = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.4 8.1c0-1.4 1.1-2.4 2.5-2.4h8.3c1.4 0 2.5 1.1 2.4 2.5v4.6c0 1.4-1.1 2.4-2.5 2.4H8.1l-3.6 2.7.2-2.8c-.8-.3-1.3-1.1-1.3-2V8.1Z" />
    <path d="M19 9.4c.9.3 1.6 1.2 1.6 2.2v4.1c0 .8-.4 1.5-1.1 1.9l.2 2.6-3.2-2.4h-4" />
  </Dessin>
);

/** City. Trois immeubles inegaux, avec leurs fenetres. */
export const IconCity = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.4 20.5V9.3l5.4-2.2.1 13.4" />
    <path d="M9 20.4V4.1l6.2 2.1v14.3" />
    <path d="M15.3 20.4v-8.2l5.3 1.9-.2 6.4" />
    <path d="M3.1 20.6h17.8" />
    <path d="M5.6 12.1h1.3M5.5 15.6h1.4M11.3 8.6h1.5M11.2 12.3h1.6M11.4 16h1.4M17.3 15.9h1.3" />
  </Dessin>
);

/** Collections. Quatre carres poses a la main, donc pas tout a fait
 *  alignes ni tout a fait de la meme taille. */
export const IconCollections = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.6 4.2h6.6v6.3H3.5z" />
    <path d="M13.6 3.9h6.8v6.5l-6.7.1z" />
    <path d="M3.8 13.7h6.5v6.6H3.6z" />
    <path d="M13.5 13.6h6.9l-.1 6.7h-6.7z" />
  </Dessin>
);

/** News. Une feuille pliee, avec ses lignes de texte. */
export const IconNews = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M4.3 5.1h11.4l.2 14.3H6c-.9 0-1.7-.7-1.7-1.6z" />
    <path d="M15.8 8.6h3c.8 0 1.4.6 1.4 1.4v7.6c0 1-.8 1.8-1.8 1.7-.9 0-1.6-.8-1.6-1.7" />
    <path d="M6.8 8.4h6.2M6.7 11.5h6.4M6.9 14.6h4.1" />
  </Dessin>
);

/** Profile. Une tete et des epaules, tracees d'un geste. */
export const IconProfile = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 3.9c2.1 0 3.8 1.7 3.7 3.8 0 2.1-1.7 3.8-3.8 3.7a3.75 3.75 0 0 1 .1-7.5Z" />
    <path d="M4.5 20.2c.3-3.5 3.5-6 7.6-6 4 0 7.2 2.4 7.4 5.9" />
  </Dessin>
);

/* ── Interface ────────────────────────────────────────────────────── */

export const IconSearch = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M10.9 4.2a6.6 6.6 0 0 1 .2 13.2 6.6 6.6 0 0 1-.3-13.2Z" />
    <path d="M15.8 15.9 20.2 20" />
  </Dessin>
);

export const IconBell = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M5.9 17.3c1-1 1.4-2 1.4-3.3v-2.6c0-2.6 2-4.7 4.6-4.7 2.6 0 4.7 2.1 4.7 4.7V14c0 1.3.4 2.3 1.4 3.3z" />
    <path d="M10.3 20c.4.6 1 .9 1.7.9s1.3-.3 1.7-.9" />
    <path d="M12 4.1v2.5" />
  </Dessin>
);

export const IconLogOut = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M14.3 4.3H6.1c-.8 0-1.5.7-1.5 1.5v12.3c0 .9.7 1.6 1.6 1.5h8.1" />
    <path d="M10.6 12h9.1" />
    <path d="m16.6 8.6 3.2 3.4-3.3 3.4" />
  </Dessin>
);

export const IconWallet = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M4 7.4c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.7.7 1.7 1.7v1.3" />
    <path d="M4 7.3v9.4c0 1 .8 1.8 1.8 1.7h12.5c.9 0 1.7-.7 1.6-1.6v-6c0-.9-.7-1.6-1.6-1.6H5.7" />
    <path d="M16.2 12.9c.5 0 .9.4.9.9s-.4.9-.9.8a.87.87 0 0 1 0-1.7Z" />
  </Dessin>
);

export const IconCoins = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M9.4 4.3c3.1 0 5.6 1.2 5.6 2.7s-2.5 2.8-5.6 2.7C6.3 9.7 3.8 8.5 3.9 7c0-1.5 2.5-2.7 5.5-2.7Z" />
    <path d="M3.9 7v3.6c0 1.5 2.5 2.7 5.5 2.7 1 0 2-.1 2.8-.4" />
    <path d="M14.6 10.9c3 0 5.5 1.2 5.5 2.7s-2.5 2.7-5.6 2.7c-3 0-5.5-1.2-5.5-2.7 0-1.5 2.5-2.8 5.6-2.7Z" />
    <path d="M9 13.6v3.6c0 1.5 2.5 2.7 5.6 2.7 3 0 5.5-1.2 5.5-2.7v-3.6" />
  </Dessin>
);

export const IconGift = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M4.1 10.9h15.8v3H4z" />
    <path d="M5.5 13.9v5.3c0 .6.5 1 1.1 1h10.8c.6 0 1.1-.5 1.1-1.1v-5.2" />
    <path d="M12 10.8v9.4" />
    <path d="M12 10.9c-1.2-2-2.3-3.1-3.4-3.3-1-.2-1.8.3-2 1.1-.3.9.3 1.8 1.4 2.1z" />
    <path d="M12 10.9c1.2-2 2.4-3.1 3.5-3.3 1-.2 1.8.3 2 1.2.2.9-.4 1.8-1.5 2.1z" />
  </Dessin>
);

export const IconSend = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M20.4 3.8 3.9 10.2l6.6 2.7 2.4 6.9z" />
    <path d="m10.5 12.9 9.9-9.1" />
  </Dessin>
);

export const IconLock = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M5.2 10.6h13.5l-.2 8.5c0 .7-.6 1.2-1.3 1.2H6.6c-.7 0-1.3-.5-1.3-1.2z" />
    <path d="M8 10.5V7.9c0-2.2 1.8-4 4.1-4 2.2 0 4 1.8 3.9 4.1v2.5" />
    <path d="M12 14.1v3.1" />
  </Dessin>
);

export const IconShield = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 3.6 4.6 6.1v5.6c0 4 3 7.5 7.4 8.7 4.4-1.2 7.3-4.6 7.4-8.6V6.2z" />
    <path d="m8.6 11.9 2.5 2.6 4.3-5" />
  </Dessin>
);

export const IconCheck = (p: IconProps) => (
  <Dessin {...p}>
    <path d="m4.6 12.4 4.7 5.1L19.5 6.3" />
  </Dessin>
);

export const IconX = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M5.4 5.1 18.7 18.8" />
    <path d="M18.8 5.2 5.2 18.7" />
  </Dessin>
);

export const IconPlus = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 4.4v15.3" />
    <path d="M4.3 12.1h15.4" />
  </Dessin>
);

export const IconClock = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 3.7a8.3 8.3 0 0 1 .2 16.6A8.3 8.3 0 0 1 12 3.7Z" />
    <path d="M11.9 7.2v5l3.4 2.1" />
  </Dessin>
);

export const IconDownload = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 3.9v10.8" />
    <path d="m7.9 10.8 4.2 4.2 4-4.3" />
    <path d="M4.4 17.3v2c0 .5.4.9.9.9h13.4c.5 0 .9-.4.9-.9v-2.1" />
  </Dessin>
);

export const IconExternal = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M18.6 13.2v5.5c0 .8-.6 1.4-1.4 1.4H5.5c-.8 0-1.4-.7-1.4-1.5V6.9c0-.8.6-1.4 1.4-1.4h5.4" />
    <path d="M14.2 4.2h5.7l-.2 5.6" />
    <path d="M19.8 4.3 10.4 14" />
  </Dessin>
);

export const IconPencil = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M16.4 3.9 20 7.6 8.3 19.4l-4.4.9 1-4.4z" />
    <path d="m14.4 6 3.7 3.6" />
  </Dessin>
);

export const IconTrash = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M4.4 6.5h15.2" />
    <path d="M9 6.4V4.9c0-.6.5-1 1.1-1h3.8c.6 0 1 .5 1 1.1v1.4" />
    <path d="M6.2 6.6 7 19.3c0 .6.5 1 1.1 1h7.8c.6 0 1-.5 1.1-1l.8-12.7" />
    <path d="M10.3 10v6.7M13.8 10v6.7" />
  </Dessin>
);

export const IconGem = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M7.5 3.9h9.2l3.4 5.2L12 20.2 3.8 9.1z" />
    <path d="M3.9 9.2h16.1" />
    <path d="m7.6 4 2.1 5.1L12 20.1l2.4-11L16.6 4" />
  </Dessin>
);

export const IconSun = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 7.6a4.4 4.4 0 0 1 .1 8.8 4.4 4.4 0 0 1-.2-8.8Z" />
    <path d="M12 2.9v2.2M12 18.9v2.2M4.5 4.6l1.6 1.6M17.9 18l1.6 1.6M2.9 12h2.2M18.9 12h2.2M4.6 19.5l1.6-1.6M18 6.1l1.6-1.6" />
  </Dessin>
);

export const IconMoon = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M20.1 14.5A8.3 8.3 0 0 1 9.4 3.9a8.4 8.4 0 1 0 10.7 10.6Z" />
  </Dessin>
);

/**
 * L'attente.
 *
 * Un cercle incomplet qui tourne, plutot qu'un trait plein : il garde la
 * meme main que les autres. L'animation est en CSS plutot qu'en SMIL,
 * pour qu'elle s'arrete sous prefers-reduced-motion comme le reste.
 */
export const IconSpinner = ({ size = 20, className = "", ...p }: IconProps) => (
  <Dessin size={size} className={`motion-safe:animate-spin ${className}`} {...p}>
    <path d="M12 3.8a8.2 8.2 0 0 1 7.9 6" />
    <path d="M20.1 14.4A8.2 8.2 0 0 1 4.3 14" />
  </Dessin>
);

/* ── Administration ───────────────────────────────────────────────── */

export const IconUsers = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M9.4 4.4a3.3 3.3 0 0 1 .1 6.6 3.3 3.3 0 0 1-.2-6.6Z" />
    <path d="M3.3 19.6c.2-3 2.9-5.2 6.2-5.2 3.2 0 5.9 2.1 6 5.1" />
    <path d="M15.4 5.2a3 3 0 0 1 .8 5.8" />
    <path d="M16.3 14.7c2.4.4 4.2 2.3 4.4 4.7" />
  </Dessin>
);

export const IconLayers = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 3.6 3.4 7.9 12 12.3l8.6-4.3z" />
    <path d="m3.5 12.2 8.5 4.3 8.5-4.4" />
    <path d="m3.5 16.5 8.5 4.2 8.5-4.3" />
  </Dessin>
);

export const IconCart = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.3 4.3h2.4l2.1 10.1h9.4l1.9-7.1H6.4" />
    <path d="M9.4 18.2a1.1 1.1 0 1 1 .1 2.2 1.1 1.1 0 0 1-.1-2.2Z" />
    <path d="M16.3 18.2a1.1 1.1 0 1 1 .1 2.2 1.1 1.1 0 0 1-.1-2.2Z" />
  </Dessin>
);

export const IconTag = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M11.3 3.5H20l-.2 8.6-8.4 8.3-8.1-8.3z" />
    <path d="M16 6.9a.9.9 0 1 1 .1 1.8.9.9 0 0 1-.1-1.8Z" />
  </Dessin>
);

export const IconDollar = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M12 2.9v18.2" />
    <path d="M16.3 7.1c-.6-1.4-2.2-2.3-4.1-2.3-2.4 0-4 1.2-4 2.9 0 4.4 8.6 2.2 8.5 6.7 0 1.8-1.8 3-4.3 3-2.1 0-3.8-.9-4.4-2.4" />
  </Dessin>
);

export const IconDashboard = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M3.7 4.2h7v6.1l-7 .1z" />
    <path d="M13.5 4.1h6.8l-.1 3.6h-6.7z" />
    <path d="M13.4 10.8h6.9l-.1 9h-6.7z" />
    <path d="M3.6 13.9h7.1l-.1 5.9H3.7z" />
  </Dessin>
);

export const IconMenu = (p: IconProps) => (
  <Dessin {...p}>
    <path d="M4 6.7h16.1" />
    <path d="M4.2 12.1h15.7" />
    <path d="M4 17.4h16" />
  </Dessin>
);
