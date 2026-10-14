import type { Metadata } from "next";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { PageShell, PageHeader } from "@/components/app/Page";
import { COLLECTIONS } from "@/lib/app/nav";

export const metadata: Metadata = {
  title: "Collections — Hoodlrz",
  description:
    "Every Hoodlrz drop in one place: OG Hoodlrz on Ethereum and Gen Kids, fully on chain on Robinhood Chain.",
};

/**
 * La categorie Collections rassemble les drops.
 *
 * Les cartes sont decrites par des donnees et non ecrites une par une :
 * ajouter un drop devient une ligne, et aucune collection ne peut etre
 * oubliee dans une des trois listes qui la mentionnent.
 *
 * Ce qui est visible vient de COLLECTIONS, dans le modele de navigation.
 * Vinyl y est marquee masquee : la page /genesis existe toujours et
 * repond toujours, elle n'est simplement plus mise en avant.
 */
interface Carte {
  slug: string;
  titre: string;
  resume: string;
  badge: { texte: string; variante: "success" | "legendary" | "default" };
  media: { type: "video" | "image"; src: string };
  faits: { valeur: string; libelle: string }[];
}

const CARTES: Record<string, Carte> = {
  og: {
    slug: "og",
    titre: "OG Hoodlrz",
    resume:
      "1 337 identites encapuchonnees sur Ethereum. ERC-721 classique, dessinees a la main par XERAK.",
    badge: { texte: "ERC-721", variante: "success" },
    media: { type: "video", src: "/hoodlrz-banner-1.mp4" },
    faits: [
      { valeur: "1 337", libelle: "pieces" },
      { valeur: "Ethereum", libelle: "chaine" },
    ],
  },
  kids: {
    slug: "kids",
    titre: "Hoodlrz Gen Kids",
    resume:
      "3 333 pieces entierement on-chain : l'art, les traits et le moteur de rendu vivent dans le contrat, sans serveur ni IPFS.",
    badge: { texte: "Full on-chain", variante: "legendary" },
    media: { type: "image", src: "/kids/img/0.png" },
    faits: [
      { valeur: "3 333", libelle: "pieces" },
      { valeur: "Robinhood", libelle: "chaine" },
      { valeur: "100 %", libelle: "on-chain" },
    ],
  },
  vinyl: {
    slug: "vinyl",
    titre: "Genesis Vinyl",
    resume:
      "25 pochettes dessinees a la main avec disques presses sur mesure. Quatre titres par face, trois editions.",
    badge: { texte: "Genesis", variante: "legendary" },
    media: { type: "image", src: "/images/genesis/black/01-black.png" },
    faits: [
      { valeur: "25", libelle: "pieces" },
      { valeur: "3", libelle: "editions" },
    ],
  },
};

export default function CollectionsPage() {
  const visibles = COLLECTIONS.filter((c) => !c.hidden);

  return (
    <PageShell large>
      <PageHeader
        title="Collections"
        subtitle="Chaque drop de l'univers Hoodlrz. Detenir une piece ouvre le reseau prive."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {visibles.map((c) => {
          const carte = CARTES[c.slug];
          if (!carte) return null;
          return (
            <Link key={c.slug} href={c.href}>
              <Card className="group flex h-full flex-col gap-0 overflow-hidden p-0">
                <div className="relative aspect-square w-full overflow-hidden bg-black">
                  {carte.media.type === "video" ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    >
                      <source src={carte.media.src} type="video/mp4" />
                    </video>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={carte.media.src}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge variant={carte.badge.variante}>{carte.badge.texte}</Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                    {carte.titre}
                  </h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted">{carte.resume}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-2 text-xs text-muted">
                    {carte.faits.map((f) => (
                      <span key={f.libelle}>
                        <span className="font-bold text-foreground">{f.valeur}</span> {f.libelle}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
