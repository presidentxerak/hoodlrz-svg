"use client";

/**
 * La barre laterale du bureau.
 *
 * Elle remplace les boutons du haut : sur un reseau social, la navigation
 * est consultee en permanence et doit rester sous le pouce du regard, pas
 * dans un en-tete qui defile.
 *
 * TROIS LARGEURS, SANS POINT DE RUPTURE BRUTAL. Masquee sous 768 px, ou
 * la barre du bas prend le relais ; reduite aux icones entre 768 et
 * 1280 px ; depliee au-dela. Le choix est fait en CSS pur, donc juste des
 * le premier rendu - un calcul en JavaScript ferait sauter la mise en
 * page a l'hydratation.
 *
 * LE REPLI EST UNE QUATRIEME LARGEUR, decidee par l'utilisateur et
 * memorisee. Il ne remplace pas les trois premieres : sur un ecran etroit
 * la barre est deja reduite, et le bouton n'a rien a y faire.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFeed,
  IconMarket,
  IconGroups,
  IconCity,
  IconCollections,
  IconNews,
  IconProfile,
  type IconProps,
} from "@/components/ui/icons";
import { NAV, type NavEntry } from "@/lib/app/nav";

/** Les icones sont nommees dans le modele de navigation et resolues ici.
 *  Une table explicite plutot qu'un acces dynamique : seules ces sept
 *  icones partent dans le bundle. */
const ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  Home: IconFeed,
  TrendingUp: IconMarket,
  MessagesSquare: IconGroups,
  Building2: IconCity,
  LayoutGrid: IconCollections,
  Newspaper: IconNews,
  User: IconProfile,
};

function estActif(pathname: string, entry: NavEntry) {
  return pathname === entry.href || pathname.startsWith(entry.href + "/");
}

export default function Sidebar({
  replie,
  onReplier,
}: {
  replie: boolean;
  onReplier: () => void;
}) {
  const pathname = usePathname() ?? "/";

  // Repliee, la barre garde la largeur de la version « icones seules » :
  // une seule largeur reduite a tenir, et le contenu se decale pareil.
  const large = replie ? "w-[72px]" : "w-[72px] xl:w-[232px]";
  const texte = replie ? "hidden" : "hidden xl:inline";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col border-r
                  border-[var(--border)] bg-background md:flex ${large}`}
    >
      <Link
        href="/"
        className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4 sm:h-16"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-hoodlrz.svg" alt="" className="h-8 w-8 shrink-0" />
        <span className={`font-hoodlrz text-xl font-bold tracking-wider ${texte}`}>hOodlrz</span>
      </Link>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {NAV.map((entry) => {
          const Icon = ICONS[entry.icon] ?? IconFeed;
          const actif = estActif(pathname, entry);
          return (
            <div key={entry.id}>
              <Link
                href={entry.href}
                aria-current={actif ? "page" : undefined}
                title={entry.label}
                className={`relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                  ${actif ? "text-foreground" : "text-muted hover:text-foreground"}`}
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-accent-magenta transition-opacity
                    ${actif ? "opacity-100" : "opacity-0"}`}
                />
                <Icon size={20} className="shrink-0" />
                <span className={`truncate ${texte}`}>{entry.label}</span>
                {entry.beta && (
                  <span
                    className={`ml-auto border border-accent-magenta/60 px-1 text-[8px] font-bold
                                uppercase tracking-widest leading-none text-accent-magenta ${texte}`}
                  >
                    Beta
                  </span>
                )}
              </Link>

              {/* Les collections se deplient sous leur entree : c'est la
                  categorie qui les rassemble. Repliee, la barre n'a pas
                  la place de les montrer. */}
              {entry.children && actif && !replie && (
                <div className="hidden xl:block">
                  {entry.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block py-1.5 pl-12 pr-4 text-[13px] transition-colors
                        ${pathname.startsWith(c.href)
                          ? "text-foreground"
                          : "text-muted hover:text-foreground"}`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Le bouton ne s'affiche qu'a partir de 1280 px : en dessous, la
          barre est deja reduite et le replier ne changerait rien. */}
      <button
        onClick={onReplier}
        aria-label={replie ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={replie}
        title={replie ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden items-center gap-3 border-t border-[var(--border)] px-4 py-3 text-muted
                   transition-colors hover:text-foreground xl:flex"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          aria-hidden
          className="shrink-0"
        >
          <path d="M4.2 4.4h15.5l-.2 15.3H4.3z" />
          <path d="M9.6 4.5v15.1" />
          {/* Le chevron pointe vers la ou l'on va : vers l'exterieur pour
              deplier, vers l'interieur pour replier. */}
          {replie ? <path d="m13.4 9.3 3.1 2.8-3.2 2.7" /> : <path d="m16.6 9.3-3.1 2.8 3.2 2.7" />}
        </svg>
        <span className={`text-sm ${replie ? "hidden" : "hidden xl:inline"}`}>Collapse</span>
      </button>
    </aside>
  );
}
