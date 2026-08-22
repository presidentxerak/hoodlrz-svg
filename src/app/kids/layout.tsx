import type { Metadata } from "next";

/**
 * Metadonnees propres a la page de drop.
 *
 * page.tsx est un composant client - il ne peut pas exporter `metadata`.
 * Ce layout existe pour ca, et pour ca seulement : un lien vers /kids
 * partage sur X ou Discord doit annoncer la collection, pas le titre
 * generique du site.
 */
export const metadata: Metadata = {
  title: "Hoodlrz Kids — 8,888 fully on-chain generative pieces",
  description:
    "A free-mint generative collection whose rendering engine lives inside the blockchain. Every Kid redraws itself from its own seed. Hoodlrz holders mint first.",
  openGraph: {
    title: "Hoodlrz Kids",
    description:
      "8,888 generative pieces, fully on-chain. Free mint. Hoodlrz holders first.",
  },
};

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
