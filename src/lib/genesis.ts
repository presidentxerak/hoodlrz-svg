export interface GenesisVinyl {
  id: string;
  edition: "Black" | "White" | "Craft";
  number: number;
  name: string;
  image: string;
  price: number; // cents
  sold: boolean;
}

export const GENESIS_VINYLS: GenesisVinyl[] = [
  // Black Edition (10 pieces)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `black-${String(i + 1).padStart(2, "0")}`,
    edition: "Black" as const,
    number: i + 1,
    name: `Black Edition #${String(i + 1).padStart(2, "0")}`,
    image: `/images/genesis/black/${String(i + 1).padStart(2, "0")}-black.png`,
    price: 30000,
    sold: false,
  })),
  // White Edition (5 pieces)
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `white-${String(i + 1).padStart(2, "0")}`,
    edition: "White" as const,
    number: i + 1,
    name: `White Edition #${String(i + 1).padStart(2, "0")}`,
    image: `/images/genesis/white/${String(i + 1).padStart(2, "0")}-white.png`,
    price: 30000,
    sold: false,
  })),
  // Craft Edition (10 pieces)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `craft-${String(i + 1).padStart(2, "0")}`,
    edition: "Craft" as const,
    number: i + 1,
    name: `Craft Edition #${String(i + 1).padStart(2, "0")}`,
    image: `/images/genesis/craft/${String(i + 1).padStart(2, "0")}-craft.png`,
    price: 30000,
    sold: false,
  })),
];

export function getVinylById(id: string): GenesisVinyl | undefined {
  return GENESIS_VINYLS.find((v) => v.id === id);
}
