/**
 * La navigation de l'application, decrite une seule fois.
 *
 * POURQUOI UN SEUL FICHIER
 * Il y a trois endroits qui doivent connaitre les memes destinations : la
 * barre laterale du bureau, la barre du bas sur mobile, et le middleware
 * qui decide ce qui est reserve aux detenteurs. Les laisser diverger,
 * c'est se retrouver avec un onglet visible qui renvoie vers une porte
 * fermee, ou l'inverse - une section privee accessible parce qu'un
 * chemin a ete ajoute a la barre sans l'etre au garde.
 *
 * « gated » est donc la propriete qui compte : elle vit ici et nulle part
 * ailleurs, et le middleware la lit dans ce meme tableau.
 */

export type NavId =
  | "feed"
  | "market"
  | "groups"
  | "city"
  | "collections"
  | "news"
  | "profile";

export interface NavEntry {
  id: NavId;
  href: string;
  /** Libelle court, celui de la barre laterale. */
  label: string;
  /** Nom de l'icone lucide-react, resolue cote composant. */
  icon: string;
  /** Reserve aux wallets detenant une PFP Hoodlrz. */
  gated: boolean;
  /** Sous-entrees depliees sous l'entree, barre laterale uniquement. */
  children?: { href: string; label: string }[];
  /** Presente dans la barre du bas sur mobile (cinq places utiles). */
  mobile?: boolean;
  beta?: boolean;
}

/**
 * Les collections du projet.
 *
 * Masquees ici plutot que supprimees : une collection retiree de la
 * navigation garde ses pages, ses pieces et ses liens de partage. Vinyl
 * est masquee a la demande du createur, elle n'est pas morte.
 */
export interface CollectionEntry {
  slug: string;
  href: string;
  label: string;
  hidden: boolean;
}

export const COLLECTIONS: CollectionEntry[] = [
  { slug: "og", href: "/collection/hoodlrz", label: "OG Hoodlrz", hidden: false },
  { slug: "kids", href: "/kids", label: "Gen Kids", hidden: false },
  { slug: "vinyl", href: "/genesis", label: "Vinyl", hidden: true },
];

export const VISIBLE_COLLECTIONS = COLLECTIONS.filter((c) => !c.hidden);

export const NAV: NavEntry[] = [
  { id: "feed", href: "/feed", label: "Feed", icon: "Home", gated: true, mobile: true },
  { id: "market", href: "/market", label: "Market", icon: "TrendingUp", gated: true, mobile: true },
  { id: "groups", href: "/groups", label: "Groups", icon: "MessagesSquare", gated: true, mobile: true },
  { id: "city", href: "/city", label: "City", icon: "Building2", gated: false, beta: true },
  {
    id: "collections",
    href: "/collections",
    label: "Collections",
    icon: "LayoutGrid",
    gated: false,
    mobile: true,
    children: VISIBLE_COLLECTIONS.map((c) => ({ href: c.href, label: c.label })),
  },
  { id: "news", href: "/news", label: "News", icon: "Newspaper", gated: false },
  { id: "profile", href: "/profile", label: "Profile", icon: "User", gated: true, mobile: true },
];

export const MOBILE_NAV = NAV.filter((e) => e.mobile);

/** Les prefixes de chemin reserves aux detenteurs, pour le middleware. */
export const GATED_PREFIXES = NAV.filter((e) => e.gated).map((e) => e.href);

/**
 * Un chemin tombe-t-il derriere la porte ?
 *
 * La comparaison se fait sur un segment entier : « /feed » protege
 * « /feed/123 » mais pas « /feedback », qui serait sinon ferme par
 * accident.
 */
export function isGated(pathname: string): boolean {
  return GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}
