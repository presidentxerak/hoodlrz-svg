/** Shared Genesis vinyl data — used by pages, API, and profile */

export interface GenesisVinyl {
  id: string; // e.g. "black-01"
  src: string; // public image path
  edition: "Black" | "White" | "Craft";
  number: number;
}

function makeVinyls(
  edition: "Black" | "White" | "Craft",
  count: number
): GenesisVinyl[] {
  const tag = edition.toLowerCase();
  return Array.from({ length: count }, (_, i) => ({
    id: `${tag}-${String(i + 1).padStart(2, "0")}`,
    src: `/images/genesis/${tag}/${String(i + 1).padStart(2, "0")}-${tag}.png`,
    edition,
    number: i + 1,
  }));
}

export const GENESIS_VINYLS = {
  black: makeVinyls("Black", 10),
  white: makeVinyls("White", 5),
  craft: makeVinyls("Craft", 10),
};

export const ALL_GENESIS_VINYLS: GenesisVinyl[] = [
  ...GENESIS_VINYLS.black,
  ...GENESIS_VINYLS.white,
  ...GENESIS_VINYLS.craft,
];

/** Look up a vinyl by id (e.g. "black-01") */
export function getVinylById(id: string): GenesisVinyl | undefined {
  return ALL_GENESIS_VINYLS.find((v) => v.id === id);
}

/** Get the image path for a vinyl id stored in token.seed */
export function getVinylImageSrc(vinylId: string): string | null {
  const vinyl = getVinylById(vinylId);
  return vinyl?.src ?? null;
}
