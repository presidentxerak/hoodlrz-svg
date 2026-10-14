/**
 * L'illustration generative d'un article.
 *
 * POURQUOI PAS LE MOTEUR DES NFT DIRECTEMENT
 * Le moteur de Gen Kids dessine dans un navigateur : il faut Chromium
 * pour en tirer une image. Un cron hebdomadaire qui lance un navigateur
 * est lourd, lent et fragile, et la plupart des hebergeurs sans etat ne
 * le permettent pas. Cette illustration est donc du SVG pur, calcule
 * sans navigateur, mais elle emprunte au moteur ce qui fait son allure :
 * sa palette exacte, son mur de briques, ses enseignes au neon, ses
 * angles droits. Elle est de la meme famille sans etre une piece.
 *
 * ELLE EST DETERMINISTE
 * La graine vient du titre de l'article. Le meme article redonne la meme
 * image, hier comme dans six mois : une illustration qui change a chaque
 * affichage ne s'imprime dans aucune memoire et casse les caches.
 */

import { createHash } from "node:crypto";

/** La palette du moteur Gen Kids, reprise telle quelle. */
const NEON = ["#2f7bff", "#ff36c8", "#ffcf1a", "#7b2fff", "#22c55e", "#00c2d1", "#ff5a3c"];
const MOTS = ["HOODLRZ", "BURN", "MINT", "FORK", "WAGMI", "HODL", "REKT", "GM"];

/**
 * Un generateur pseudo-aleatoire a etat, alimente par la graine.
 *
 * `Math.random` ne conviendrait pas : il faut que la meme graine redonne
 * exactement la meme suite. xorshift32 suffit largement ici - il s'agit
 * de choisir des couleurs, pas de tirer des cles.
 */
function suite(graine: number) {
  let x = graine || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

function graineDe(texte: string): number {
  const h = createHash("sha256").update(texte).digest();
  return h.readUInt32BE(0);
}

export interface Illustration {
  svg: string;
  /** La couleur dominante, pour teinter la carte de l'article. */
  accent: string;
}

/**
 * Dessine l'illustration d'un article.
 *
 * Format 1200 x 630 : celui des cartes de partage. Une illustration qui
 * n'a pas ce rapport est recadree par les reseaux sociaux, en general au
 * mauvais endroit.
 */
export function illustrer(titre: string, categorie: string): Illustration {
  const r = suite(graineDe(`${titre}|${categorie}`));
  const L = 1200;
  const H = 630;

  const accent = NEON[Math.floor(r() * NEON.length)];
  const second = NEON[Math.floor(r() * NEON.length)];
  const mot = MOTS[Math.floor(r() * MOTS.length)];

  const p: string[] = [];

  // Le mur. Les briques sont decalees d'une demi-largeur une rangee sur
  // deux, comme dans le fond « bricks » du moteur.
  const bl = 72;
  const bh = 34;
  for (let y = 0, rang = 0; y < H; y += bh, rang++) {
    const decal = rang % 2 ? -bl / 2 : 0;
    for (let x = decal; x < L; x += bl) {
      const t = 0.06 + r() * 0.07;
      p.push(
        `<rect x="${x + 3}" y="${y + 3}" width="${bl - 6}" height="${bh - 6}" fill="#ffffff" opacity="${t.toFixed(3)}"/>`,
      );
    }
  }

  /**
   * Quatre enseignes, une par quart de largeur.
   *
   * Un trait horizontal seul ne se lit pas comme une enseigne : il se lit
   * comme une rayure. Il faut le cadre, les barres a l'interieur et le
   * halo - c'est le halo qui dit « neon » plutot que « trait ».
   *
   * Elles sont reparties par quart plutot que tirees librement : deux
   * tirages libres se tassent dans le meme coin une fois sur trois, et
   * laissent la moitie de l'image vide.
   */
  const enseigne = (x: number, y: number, l: number, h: number, c: string) => {
    const barres: string[] = [];
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const bw = (l - 28) * (0.35 + r() * 0.6);
      barres.push(
        `<rect x="${(x + 14).toFixed(0)}" y="${(y + 16 + i * 18).toFixed(0)}" width="${bw.toFixed(0)}" height="7" fill="${c}" opacity="${(0.85 - i * 0.2).toFixed(2)}"/>`,
      );
    }
    return (
      `<g filter="url(#halo)">` +
      `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${l.toFixed(0)}" height="${h.toFixed(0)}"` +
      ` fill="none" stroke="${c}" stroke-width="4" opacity="0.95"/>` +
      barres.join("") +
      `</g>`
    );
  };

  const quart = L / 4;
  for (let i = 0; i < 4; i++) {
    const l = 150 + r() * 110;
    const x = i * quart + 24 + r() * (quart - l - 48 > 0 ? quart - l - 48 : 10);
    // Les hauteurs alternent haut / bas : une rangee d'enseignes alignees
    // ferait un bandeau, pas une facade.
    const y = (i % 2 ? 230 : 70) + r() * 110;
    p.push(enseigne(x, y, l, 76 + r() * 24, i % 2 ? second : accent));
  }

  // Un tag a la bombe, en bas a gauche, comme sur les pieces.
  p.push(
    `<text x="56" y="${H - 54}" font-family="Impact, 'Arial Black', sans-serif" font-size="110"` +
      ` font-weight="900" fill="${accent}" opacity="0.95" letter-spacing="4"` +
      ` filter="url(#halo)">${mot}</text>`,
  );

  // Une bande pleine en bas : elle donne au titre un fond lisible quand
  // la carte l'ecrit par-dessus.
  p.push(`<rect x="0" y="${H - 16}" width="${L}" height="16" fill="${accent}"/>`);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img">` +
    // Le halo est ce qui distingue une enseigne au neon d'un rectangle.
    `<defs><filter id="halo" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feGaussianBlur stdDeviation="7" result="flou"/>` +
    `<feMerge><feMergeNode in="flou"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter></defs>` +
    `<rect width="${L}" height="${H}" fill="#0a0a0a"/>` +
    p.join("") +
    `</svg>`;

  return { svg, accent };
}
