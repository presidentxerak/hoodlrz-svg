// ── SVG PFP Generator for Hoodlrz ──
<<<<<<< HEAD
// Deterministic: same seed ALWAYS produces the same SVG.

import { seedToNumber } from "./hash";
import {
  BACKGROUNDS,
  BACKGROUND_COLORS,
  HEADS,
  EYES,
  MOUTHS,
  HOODS,
  HOOD_COLORS,
  ACCESSORIES,
  PATTERNS,
  SKIN_TONES,
  RARITY_WEIGHTS,
  type TraitOption,
=======
// Composes real SVG layer files into a single PFP.
// Deterministic: same seed ALWAYS produces the same combination.

import { seedToNumber } from "./hash";
import {
  WALLS,
  FOREGROUNDS,
  EYES,
  MOUTHS_LIGHT,
  MOUTHS_DARK,
  HOODIES,
  ACCESSORIES,
  GRAFFITIS_LIGHT,
  GRAFFITIS_DARK,
  RARITY_WEIGHTS,
  type TraitOption,
  type LayerVariant,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
} from "./traits";

// ── Result type ──

export interface PFPResult {
<<<<<<< HEAD
  svg: string;
  traits: Record<string, string>;
  traitsJson: string;
=======
  /** Composite SVG string (uses <image> references to layer files) */
  svg: string;
  /** Layer paths in stacking order for rendering */
  layers: LayerInfo[];
  /** Trait names map */
  traits: Record<string, string>;
  /** JSON string of traits */
  traitsJson: string;
  /** light or dark variant */
  variant: LayerVariant;
}

export interface LayerInfo {
  category: string;
  name: string;
  file: string;
  path: string; // full public path e.g. "/layers/02-layers-dark/02-eyes/eyes-1.svg"
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
}

/** @deprecated Use PFPResult instead */
export type GeneratedPFP = PFPResult;

// ── Mulberry32 PRNG ──

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function pickTrait(options: TraitOption[], rand: () => number): TraitOption {
  const totalWeight = options.reduce(
    (sum, o) => sum + RARITY_WEIGHTS[o.rarity],
    0
  );
  let r = rand() * totalWeight;
  for (const option of options) {
    r -= RARITY_WEIGHTS[option.rarity];
    if (r <= 0) return option;
  }
  return options[options.length - 1];
}

<<<<<<< HEAD
function pickFrom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amt));
  const ng = Math.min(255, Math.round(g + (255 - g) * amt));
  const nb = Math.min(255, Math.round(b + (255 - b) * amt));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - amt)));
  const ng = Math.max(0, Math.round(g * (1 - amt)));
  const nb = Math.max(0, Math.round(b * (1 - amt)));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ── SVG Defs (gradients, filters, shadows) ──

function renderDefs(
  bgName: string,
  bgColor: string,
  hoodColor: string,
  skinColor: string
): string {
  const bgLight = lighten(bgColor, 0.12);
  const hoodLight = lighten(hoodColor, 0.22);
  const hoodDark = darken(hoodColor, 0.3);
  const skinLight = lighten(skinColor, 0.18);
  const skinDark = darken(skinColor, 0.18);

  let extraGrad = "";
  if (bgName === "Holographic") {
    extraGrad = `<linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff006e"/><stop offset="25%" stop-color="#8338ec"/>
      <stop offset="50%" stop-color="#3a86ff"/><stop offset="75%" stop-color="#06d6a0"/>
      <stop offset="100%" stop-color="#ffbe0b"/></linearGradient>`;
  }
  if (bgName === "Liquid Gold") {
    extraGrad = `<linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b8860b"/><stop offset="35%" stop-color="#ffd700"/>
      <stop offset="65%" stop-color="#daa520"/><stop offset="100%" stop-color="#b8860b"/>
      </linearGradient>`;
  }

  return `<defs>
    <radialGradient id="bg-g" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${bgLight}"/><stop offset="100%" stop-color="${bgColor}"/>
    </radialGradient>
    <linearGradient id="hood-g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${hoodLight}"/><stop offset="100%" stop-color="${hoodDark}"/>
    </linearGradient>
    <radialGradient id="skin-g" cx="42%" cy="38%" r="58%">
      <stop offset="0%" stop-color="${skinLight}"/><stop offset="100%" stop-color="${skinDark}"/>
    </radialGradient>
    <filter id="shd"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity=".35"/></filter>
    <filter id="shd-sm"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity=".25"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${extraGrad}
  </defs>`;
}

// ── Background ──

function renderBackground(bgName: string, bgColor: string): string {
  if (bgName === "Holographic")
    return `<rect width="400" height="400" fill="url(#holo)"/><rect width="400" height="400" fill="${bgColor}" opacity=".3"/>`;
  if (bgName === "Liquid Gold")
    return `<rect width="400" height="400" fill="url(#gold)"/><rect width="400" height="400" fill="${bgColor}" opacity=".2"/>`;
  return `<rect width="400" height="400" fill="url(#bg-g)"/>`;
}

// ── Head ──

function renderHead(shape: string): string {
  const cx = 200,
    cy = 215;
  const f = 'fill="url(#skin-g)" filter="url(#shd)"';

  switch (shape) {
    case "Circle":
      return `<circle cx="${cx}" cy="${cy}" r="95" ${f}/>`;
    case "Square":
      return `<rect x="${cx - 95}" y="${cy - 95}" width="190" height="190" rx="6" ${f}/>`;
    case "Rounded Square":
      return `<rect x="${cx - 95}" y="${cy - 95}" width="190" height="190" rx="34" ${f}/>`;
    case "Diamond":
      return `<polygon points="${cx},${cy - 108} ${cx + 95},${cy} ${cx},${cy + 108} ${cx - 95},${cy}" ${f}/>`;
    case "Hexagon": {
      const r = 100;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${pts}" ${f}/>`;
    }
    case "Pentagon": {
      const r = 100;
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = ((2 * Math.PI) / 5) * i - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${pts}" ${f}/>`;
    }
    case "Octagon": {
      const r = 100;
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${pts}" ${f}/>`;
    }
    case "Triangle":
      return `<polygon points="${cx},${cy - 112} ${cx + 108},${cy + 80} ${cx - 108},${cy + 80}" ${f}/>`;
    default:
      return `<circle cx="${cx}" cy="${cy}" r="95" ${f}/>`;
  }
}

// ── Eyes ──

function renderEyes(style: string): string {
  const lx = 170,
    rx = 230,
    ey = 205;
  const c = "#111";
  // Highlight dots for gloss
  const hl = (x: number, y: number) =>
    `<circle cx="${x + 3}" cy="${y - 3}" r="2" fill="#fff" opacity=".6"/>`;

  switch (style) {
    case "Dots":
      return `<circle cx="${lx}" cy="${ey}" r="7" fill="${c}"/><circle cx="${rx}" cy="${ey}" r="7" fill="${c}"/>
      ${hl(lx, ey)}${hl(rx, ey)}`;
    case "Lines":
      return `<line x1="${lx - 11}" y1="${ey}" x2="${lx + 11}" y2="${ey}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="${rx - 11}" y1="${ey}" x2="${rx + 11}" y2="${ey}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`;
    case "Circles":
      return `<circle cx="${lx}" cy="${ey}" r="11" fill="none" stroke="${c}" stroke-width="2.5"/>
      <circle cx="${lx}" cy="${ey}" r="4.5" fill="${c}"/>${hl(lx, ey)}
      <circle cx="${rx}" cy="${ey}" r="11" fill="none" stroke="${c}" stroke-width="2.5"/>
      <circle cx="${rx}" cy="${ey}" r="4.5" fill="${c}"/>${hl(rx, ey)}`;
    case "Wide":
      return `<ellipse cx="${lx}" cy="${ey}" rx="15" ry="11" fill="#fff" stroke="${c}" stroke-width="2"/>
      <circle cx="${lx + 2}" cy="${ey}" r="6" fill="${c}"/>${hl(lx + 2, ey)}
      <ellipse cx="${rx}" cy="${ey}" rx="15" ry="11" fill="#fff" stroke="${c}" stroke-width="2"/>
      <circle cx="${rx + 2}" cy="${ey}" r="6" fill="${c}"/>${hl(rx + 2, ey)}`;
    case "Closed":
      return `<path d="M${lx - 11},${ey} Q${lx},${ey - 9} ${lx + 11},${ey}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <path d="M${rx - 11},${ey} Q${rx},${ey - 9} ${rx + 11},${ey}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <line x1="${lx - 3}" y1="${ey + 5}" x2="${lx}" y2="${ey + 2}" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="${rx - 3}" y1="${ey + 5}" x2="${rx}" y2="${ey + 2}" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`;
    case "X-Marks":
      return `<g stroke="${c}" stroke-width="3" stroke-linecap="round">
        <line x1="${lx - 8}" y1="${ey - 8}" x2="${lx + 8}" y2="${ey + 8}"/>
        <line x1="${lx + 8}" y1="${ey - 8}" x2="${lx - 8}" y2="${ey + 8}"/>
        <line x1="${rx - 8}" y1="${ey - 8}" x2="${rx + 8}" y2="${ey + 8}"/>
        <line x1="${rx + 8}" y1="${ey - 8}" x2="${rx - 8}" y2="${ey + 8}"/>
      </g>`;
    case "Triangles":
      return `<polygon points="${lx},${ey - 9} ${lx + 10},${ey + 7} ${lx - 10},${ey + 7}" fill="${c}"/>
      <polygon points="${rx},${ey - 9} ${rx + 10},${ey + 7} ${rx - 10},${ey + 7}" fill="${c}"/>`;
    case "Diamonds":
      return `<polygon points="${lx},${ey - 10} ${lx + 8},${ey} ${lx},${ey + 10} ${lx - 8},${ey}" fill="${c}"/>
      <polygon points="${rx},${ey - 10} ${rx + 8},${ey} ${rx},${ey + 10} ${rx - 8},${ey}" fill="${c}"/>
      ${hl(lx, ey)}${hl(rx, ey)}`;
    case "Slits":
      return `<ellipse cx="${lx}" cy="${ey}" rx="3" ry="11" fill="${c}"/>
      <ellipse cx="${rx}" cy="${ey}" rx="3" ry="11" fill="${c}"/>
      <ellipse cx="${lx}" cy="${ey - 2}" rx="1.5" ry="4" fill="#4ade80" opacity=".5"/>
      <ellipse cx="${rx}" cy="${ey - 2}" rx="1.5" ry="4" fill="#4ade80" opacity=".5"/>`;
    case "Cyber":
      return `<rect x="${lx - 15}" y="${ey - 5}" width="30" height="10" rx="2" fill="#00f0ff" opacity=".85" filter="url(#glow)"/>
      <rect x="${rx - 15}" y="${ey - 5}" width="30" height="10" rx="2" fill="#00f0ff" opacity=".85" filter="url(#glow)"/>
      <rect x="${lx - 13}" y="${ey - 3}" width="26" height="6" rx="1" fill="#001a1f"/>
      <rect x="${rx - 13}" y="${ey - 3}" width="26" height="6" rx="1" fill="#001a1f"/>
      <circle cx="${lx}" cy="${ey}" r="2" fill="#00f0ff"/><circle cx="${rx}" cy="${ey}" r="2" fill="#00f0ff"/>
      <line x1="${lx - 19}" y1="${ey}" x2="${lx - 15}" y2="${ey}" stroke="#00f0ff" stroke-width="1.5" opacity=".5"/>
      <line x1="${rx + 15}" y1="${ey}" x2="${rx + 19}" y2="${ey}" stroke="#00f0ff" stroke-width="1.5" opacity=".5"/>`;
    default:
      return `<circle cx="${lx}" cy="${ey}" r="7" fill="${c}"/><circle cx="${rx}" cy="${ey}" r="7" fill="${c}"/>`;
  }
}

// ── Mouth ──

function renderMouth(style: string): string {
  const cx = 200,
    my = 245;
  const c = "#111";

  switch (style) {
    case "Line":
      return `<line x1="${cx - 16}" y1="${my}" x2="${cx + 16}" y2="${my}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    case "Smile":
      return `<path d="M${cx - 20},${my - 3} Q${cx},${my + 16} ${cx + 20},${my - 3}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    case "Frown":
      return `<path d="M${cx - 18},${my + 7} Q${cx},${my - 12} ${cx + 18},${my + 7}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    case "Open":
      return `<ellipse cx="${cx}" cy="${my + 2}" rx="13" ry="10" fill="#2d1b1b" stroke="${c}" stroke-width="2"/>
      <ellipse cx="${cx}" cy="${my + 7}" rx="8" ry="3.5" fill="#c0392b" opacity=".55"/>`;
    case "Teeth":
      return `<rect x="${cx - 15}" y="${my - 6}" width="30" height="16" rx="5" fill="#2d1b1b" stroke="${c}" stroke-width="2"/>
      <line x1="${cx - 7}" y1="${my - 6}" x2="${cx - 7}" y2="${my + 2}" stroke="#fff" stroke-width="2"/>
      <line x1="${cx}" y1="${my - 6}" x2="${cx}" y2="${my + 2}" stroke="#fff" stroke-width="2"/>
      <line x1="${cx + 7}" y1="${my - 6}" x2="${cx + 7}" y2="${my + 2}" stroke="#fff" stroke-width="2"/>`;
    case "Tongue":
      return `<path d="M${cx - 18},${my} Q${cx},${my + 14} ${cx + 18},${my}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="${cx + 2}" cy="${my + 10}" rx="7" ry="9" fill="#e74c3c" opacity=".75"/>`;
    case "Mask":
      return `<rect x="${cx - 38}" y="${my - 12}" width="76" height="32" rx="7" fill="#2c3e50" opacity=".82"/>
      <line x1="${cx - 22}" y1="${my + 2}" x2="${cx + 22}" y2="${my + 2}" stroke="#556" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="${cx - 22}" y1="${my - 3}" x2="${cx + 22}" y2="${my - 3}" stroke="#556" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="${cx - 22}" y1="${my + 7}" x2="${cx + 22}" y2="${my + 7}" stroke="#556" stroke-width="1" stroke-dasharray="4,3"/>`;
    case "None":
      return "";
    default:
      return `<line x1="${cx - 16}" y1="${my}" x2="${cx + 16}" y2="${my}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  }
}

// ── Hood / Headwear ──

function renderHood(style: string, hoodColor: string): string {
  const hd = darken(hoodColor, 0.25);
  const hl = lighten(hoodColor, 0.25);

  switch (style) {
    case "Classic":
      return `<path d="M95,232 Q95,102 200,82 Q305,102 305,232 L290,227 Q285,118 200,100 Q115,118 110,227 Z" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <path d="M100,225 Q100,138 200,112 Q300,138 300,225" fill="none" stroke="${hd}" stroke-width="2.5" opacity=".35"/>
      <path d="M118,172 Q200,138 282,172" fill="none" stroke="${hl}" stroke-width="1.5" opacity=".2"/>`;

    case "Beanie":
      return `<path d="M112,188 Q112,112 200,96 Q288,112 288,188 L278,183 Q278,126 200,113 Q122,126 122,183 Z" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <rect x="112" y="178" width="176" height="14" rx="4" fill="${hd}" opacity=".45"/>
      ${[132, 162, 200, 238, 268].map((x) => `<line x1="${x}" y1="${x === 200 ? 126 : x < 200 ? 142 : 142}" x2="${x}" y2="178" stroke="${hl}" stroke-width="1.5" opacity=".18"/>`).join("")}
      <circle cx="200" cy="96" r="8" fill="${hoodColor}" filter="url(#shd-sm)"/>`;

    case "Cap":
      return `<path d="M112,188 Q115,132 200,118 Q285,132 288,188 L122,188 Z" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <path d="M88,188 L312,188 L320,198 L80,198 Z" fill="${hd}"/>
      <rect x="172" y="124" width="32" height="12" rx="3" fill="${hl}" opacity=".35"/>`;

    case "Ninja":
      return `<path d="M95,255 Q95,102 200,82 Q305,102 305,255 L290,250 Q285,118 200,100 Q115,118 110,250 Z" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <rect x="100" y="192" width="200" height="28" rx="4" fill="${hd}" opacity=".55"/>
      <path d="M100,220 Q122,265 200,270 Q278,265 300,220" fill="${hoodColor}" opacity=".82"/>
      <line x1="142" y1="198" x2="258" y2="198" stroke="${hl}" stroke-width="1" opacity=".25"/>`;

    case "Bandana":
      return `<path d="M112,192 Q115,156 200,148 Q285,156 288,192" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <path d="M108,192 L292,192" stroke="${hd}" stroke-width="6" stroke-linecap="round"/>
      <path d="M262,192 L288,235 L276,240 L254,200" fill="${hoodColor}" opacity=".75"/>
      <circle cx="200" cy="160" r="4" fill="${hl}" opacity=".35"/>`;

    case "Cyber":
      return `<path d="M102,202 Q102,112 200,92 Q298,112 298,202 L284,197 Q284,126 200,110 Q116,126 116,197 Z" fill="url(#hood-g)" filter="url(#shd-sm)"/>
      <line x1="118" y1="172" x2="282" y2="172" stroke="#00f0ff" stroke-width="2" opacity=".65"/>
      <line x1="124" y1="148" x2="276" y2="148" stroke="#00f0ff" stroke-width="1" opacity=".35"/>
      <rect x="176" y="94" width="48" height="6" rx="3" fill="#00f0ff" opacity=".45"/>
      <circle cx="142" cy="172" r="3" fill="#00f0ff" opacity=".75"/>
      <circle cx="258" cy="172" r="3" fill="#00f0ff" opacity=".75"/>`;

    case "Crown":
      return `<path d="M132,172 L132,128 L158,150 L178,108 L200,142 L222,108 L242,150 L268,128 L268,172 Z" fill="#ffd700" filter="url(#shd-sm)"/>
      <path d="M132,172 L268,172" stroke="#b8860b" stroke-width="3"/>
      <circle cx="158" cy="140" r="4" fill="#e74c3c"/><circle cx="200" cy="128" r="5" fill="#3498db"/><circle cx="242" cy="140" r="4" fill="#2ecc71"/>
      <rect x="132" y="170" width="136" height="8" rx="2" fill="#daa520"/>`;

    case "Mohawk":
      return `<path d="M190,82 Q195,42 200,30 Q205,42 210,82 L214,82 Q218,28 200,12 Q182,28 186,82 Z" fill="${hoodColor}" filter="url(#shd-sm)"/>
      <path d="M187,98 Q194,55 200,40 Q206,55 213,98" fill="${hoodColor}"/>
      <path d="M189,114 Q195,72 200,56 Q205,72 211,114" fill="${lighten(hoodColor, 0.08)}"/>
      <line x1="200" y1="38" x2="200" y2="114" stroke="${hl}" stroke-width="1.5" opacity=".25"/>`;

    case "Horns":
      return `<path d="M142,168 Q122,102 108,62 Q118,82 148,142" fill="${hoodColor}" filter="url(#shd-sm)"/>
      <path d="M258,168 Q278,102 292,62 Q282,82 252,142" fill="${hoodColor}" filter="url(#shd-sm)"/>
      <path d="M142,168 Q126,112 112,72" fill="none" stroke="${hl}" stroke-width="2" opacity=".25"/>
      <path d="M258,168 Q274,112 288,72" fill="none" stroke="${hl}" stroke-width="2" opacity=".25"/>
      <circle cx="110" cy="65" r="5" fill="${lighten(hoodColor, 0.3)}"/>
      <circle cx="290" cy="65" r="5" fill="${lighten(hoodColor, 0.3)}"/>`;

    case "Halo":
      return `<ellipse cx="200" cy="108" rx="82" ry="18" fill="none" stroke="#ffd700" stroke-width="6" opacity=".8" filter="url(#glow)"/>
      <ellipse cx="200" cy="108" rx="82" ry="18" fill="none" stroke="#fff8dc" stroke-width="2" opacity=".45"/>`;

    default:
      return "";
  }
}

// ── Accessories ──

function renderAccessory(style: string): string {
  switch (style) {
    case "Chain":
      return `<path d="M162,292 Q172,314 200,318 Q228,314 238,292" fill="none" stroke="#daa520" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M164,293 Q174,314 200,318 Q226,314 236,293" fill="none" stroke="#ffd700" stroke-width="1.5" opacity=".45"/>
      <circle cx="200" cy="320" r="6" fill="#ffd700" filter="url(#shd-sm)"/><circle cx="200" cy="320" r="3" fill="#b8860b"/>`;

    case "Earring":
      return `<circle cx="114" cy="228" r="4" fill="#ffd700" filter="url(#shd-sm)"/>
      <line x1="114" y1="232" x2="114" y2="245" stroke="#daa520" stroke-width="1.5"/>
      <circle cx="114" cy="248" r="5" fill="none" stroke="#ffd700" stroke-width="2"/>`;

    case "Glasses":
      return `<circle cx="170" cy="205" r="19" fill="none" stroke="#333" stroke-width="3.5"/>
      <circle cx="230" cy="205" r="19" fill="none" stroke="#333" stroke-width="3.5"/>
      <line x1="189" y1="205" x2="211" y2="205" stroke="#333" stroke-width="3"/>
      <line x1="151" y1="205" x2="118" y2="198" stroke="#333" stroke-width="2.5"/>
      <line x1="249" y1="205" x2="282" y2="198" stroke="#333" stroke-width="2.5"/>
      <circle cx="170" cy="205" r="17" fill="#88ccff" opacity=".1"/>
      <circle cx="230" cy="205" r="17" fill="#88ccff" opacity=".1"/>`;

    case "Scar":
      return `<path d="M237,188 L252,222 L244,222 L260,258" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" opacity=".65"/>
      <path d="M242,198 L250,198 M248,218 L256,218 M252,242 L260,242" fill="none" stroke="#c0392b" stroke-width="1.5" opacity=".45"/>`;

    case "Tattoo":
      return `<g opacity=".55" fill="none" stroke="#2c3e50" stroke-width="1.5">
        <path d="M248,235 L256,223 L264,235 L256,247 Z"/>
        <circle cx="256" cy="235" r="3.5"/>
        <line x1="256" y1="219" x2="256" y2="223"/><line x1="256" y1="247" x2="256" y2="251"/>
        <line x1="244" y1="235" x2="248" y2="235"/><line x1="264" y1="235" x2="268" y2="235"/>
      </g>`;

    case "Piercing":
      return `<circle cx="200" cy="260" r="3.5" fill="#c0c0c0" filter="url(#shd-sm)"/>
      <circle cx="200" cy="260" r="1.5" fill="#888"/>
      <circle cx="178" cy="198" r="2.5" fill="#c0c0c0"/>`;

    case "Bandaid":
      return `<g transform="translate(242,178) rotate(25)">
        <rect x="-20" y="-8" width="40" height="16" rx="3" fill="#f5c6a1" stroke="#d4a574" stroke-width=".8"/>
        <rect x="-7" y="-8" width="14" height="16" rx="1" fill="#e8b88a"/>
        <circle cx="-2" cy="-1" r="1" fill="#d4a574" opacity=".5"/>
        <circle cx="3" cy="2" r="1" fill="#d4a574" opacity=".5"/>
        <circle cx="0" cy="3" r=".8" fill="#d4a574" opacity=".35"/>
      </g>`;

    case "None":
    default:
      return "";
  }
}

// ── Pattern Overlay ──

function renderPattern(style: string, rand: () => number): string {
  switch (style) {
    case "Stripes":
      return `<g opacity=".055">${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32 + 55}" y2="400" stroke="#fff" stroke-width="7"/>`).join("")}</g>`;

    case "Dots": {
      const dots = Array.from({ length: 35 }, () => {
        const x = rand() * 400;
        const y = rand() * 400;
        const r = 2 + rand() * 4;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff"/>`;
      }).join("");
      return `<g opacity=".045">${dots}</g>`;
    }

    case "Grid":
      return `<g opacity=".035">
        ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="400" stroke="#fff" stroke-width="1"/>`).join("")}
        ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="400" y2="${i * 40}" stroke="#fff" stroke-width="1"/>`).join("")}
      </g>`;

    case "Noise": {
      const rects = Array.from({ length: 90 }, () => {
        const x = rand() * 400;
        const y = rand() * 400;
        const s = 1 + rand() * 3;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="#fff"/>`;
      }).join("");
      return `<g opacity=".03">${rects}</g>`;
    }

    case "Gradient":
      return `<rect width="400" height="400" fill="url(#bg-g)" opacity=".07"/>
      <rect width="400" height="200" fill="#fff" opacity=".025"/>`;

    case "None":
    default:
      return "";
  }
}

// ── Body / Neck ──

function renderBody(hoodColor: string): string {
  const hd = darken(hoodColor, 0.2);
  return `<rect x="176" y="292" width="48" height="58" rx="8" fill="url(#skin-g)" opacity=".8"/>
    <path d="M142,322 Q142,292 176,292 L224,292 Q258,292 258,322 L258,400 L142,400 Z" fill="url(#hood-g)" opacity=".82"/>
    <path d="M142,322 Q142,292 176,292 L224,292 Q258,292 258,322" fill="none" stroke="${hd}" stroke-width="1.5" opacity=".35"/>`;
=======
/**
 * Build the public path to a layer SVG file.
 */
function layerPath(
  variant: LayerVariant,
  folder: string,
  file: string
): string {
  const variantFolder = variant === "light" ? "01-layers-light" : "02-layers-dark";
  return `/layers/${variantFolder}/${folder}/${file}`;
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
}

// ════════════════════════════════════════
// Main generator
// ════════════════════════════════════════

/**
<<<<<<< HEAD
 * Generate a full SVG PFP from a seed string.
=======
 * Generate a PFP composition from a seed string.
 * Returns the list of layers and a composite SVG.
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
 * Deterministic: same seed always produces the same output.
 */
export function generatePFP(seed: string): PFPResult {
  const rand = mulberry32(seedToNumber(seed));

<<<<<<< HEAD
  // Pick traits
  const background = pickTrait(BACKGROUNDS, rand);
  const head = pickTrait(HEADS, rand);
  const eyes = pickTrait(EYES, rand);
  const mouth = pickTrait(MOUTHS, rand);
  const hood = pickTrait(HOODS, rand);
  const accessory = pickTrait(ACCESSORIES, rand);
  const pattern = pickTrait(PATTERNS, rand);
  const skinTone = pickFrom(SKIN_TONES, rand);
  const hoodColor = pickFrom(HOOD_COLORS, rand);

  const bgColor = BACKGROUND_COLORS[background.name] || "#0a0a0a";

  const traits: Record<string, string> = {
    background: background.name,
    head: head.name,
    eyes: eyes.name,
    mouth: mouth.name,
    hood: hood.name,
    accessory: accessory.name,
    pattern: pattern.name,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  ${renderDefs(background.name, bgColor, hoodColor, skinTone)}
  ${renderBackground(background.name, bgColor)}
  ${renderPattern(pattern.name, rand)}
  ${renderBody(hoodColor)}
  ${renderHead(head.name)}
  ${renderHood(hood.name, hoodColor)}
  ${renderEyes(eyes.name)}
  ${renderMouth(mouth.name)}
  ${renderAccessory(accessory.name)}
=======
  // Pick variant (light or dark)
  const variant: LayerVariant = rand() > 0.5 ? "dark" : "light";

  // Use variant-specific trait lists (file availability differs between light/dark)
  const mouths = variant === "light" ? MOUTHS_LIGHT : MOUTHS_DARK;
  const graffitis = variant === "light" ? GRAFFITIS_LIGHT : GRAFFITIS_DARK;

  // Pick one trait from each category
  const wall = pickTrait(WALLS, rand);
  const graffiti = pickTrait(graffitis, rand);
  const hoodie = pickTrait(HOODIES, rand);
  const eyes = pickTrait(EYES, rand);
  const mouth = pickTrait(mouths, rand);
  const accessory = pickTrait(ACCESSORIES, rand);
  const foreground = pickTrait(FOREGROUNDS, rand);

  const traits: Record<string, string> = {
    variant,
    wall: wall.name,
    graffiti: graffiti.name,
    hoodie: hoodie.name,
    eyes: eyes.name,
    mouth: mouth.name,
    accessory: accessory.name,
    foreground: foreground.name,
  };

  // Build layers in stacking order (back to front)
  // 1. Wall (brick background)
  // 2. Graffiti (on the wall, behind character)
  // 3. Hoodie (the character body)
  // 4. Eyes (on the face)
  // 5. Mouth (on the face)
  // 6. Accessories (headphones etc, on top of character)
  // 7. Foreground (decorative overlay, topmost)
  const layerDefs: { category: string; trait: TraitOption; folder: string }[] = [
    { category: "wall", trait: wall, folder: "07-walls" },
    { category: "graffiti", trait: graffiti, folder: "06-graffitis" },
    { category: "hoodie", trait: hoodie, folder: "05-hoodies" },
    { category: "eyes", trait: eyes, folder: "02-eyes" },
    { category: "mouth", trait: mouth, folder: "04-mouths" },
    { category: "accessory", trait: accessory, folder: "03-accessories" },
    { category: "foreground", trait: foreground, folder: "01-foregrounds" },
  ];

  const layers: LayerInfo[] = [];

  for (const def of layerDefs) {
    if (!def.trait.file) continue;
    const path = layerPath(variant, def.folder, def.trait.file);
    layers.push({
      category: def.category,
      name: def.trait.name,
      file: def.trait.file,
      path,
    });
  }

  // Build composite SVG using <image> references
  const size = 400;
  const imageElements = layers
    .map(
      (l) =>
        `  <image href="${l.path}" x="0" y="0" width="${size}" height="${size}" />`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${variant === "dark" ? "#000000" : "#ffffff"}" />
${imageElements}
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
</svg>`;

  return {
    svg,
<<<<<<< HEAD
    traits,
    traitsJson: JSON.stringify(traits, null, 2),
=======
    layers,
    traits,
    traitsJson: JSON.stringify(traits, null, 2),
    variant,
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
  };
}
