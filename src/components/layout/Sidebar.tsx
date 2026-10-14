"use client";

/**
 * La barre laterale du bureau.
 *
 * Elle remplace les boutons du haut : sur un reseau social, la navigation
 * est consultee en permanence et doit rester sous le pouce du regard, pas
 * dans un en-tete qui defile. Le haut de l'ecran est rendu a ce qui
 * change - le titre de la page et la recherche.
 *
 * Trois largeurs, sans point de rupture brutal : masquee sous 768 px, ou
 * la barre du bas prend le relais ; reduite aux icones entre 768 et
 * 1280 px ; depliee au-dela. Le choix est fait en CSS pur, donc juste des
 * le premier rendu - un calcul en JavaScript ferait sauter la mise en
 * page a l'hydratation.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  MessagesSquare,
  Building2,
  LayoutGrid,
  Newspaper,
  User,
  type LucideIcon,
} from "lucide-react";
import { NAV, type NavEntry } from "@/lib/app/nav";

/** Les icones sont nommees dans le modele de navigation et resolues ici.
 *  Une table explicite plutot qu'un acces dynamique a la bibliotheque :
 *  seules ces sept icones partent dans le bundle. */
const ICONS: Record<string, LucideIcon> = {
  Home,
  TrendingUp,
  MessagesSquare,
  Building2,
  LayoutGrid,
  Newspaper,
  User,
};

function estActif(pathname: string, entry: NavEntry) {
  return pathname === entry.href || pathname.startsWith(entry.href + "/");
}

export default function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[72px] shrink-0 flex-col
                 border-r border-[var(--border)] bg-background md:flex xl:w-[232px]"
    >
      {/* Marque */}
      <Link
        href="/"
        className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4 sm:h-16"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-hoodlrz.svg" alt="" className="h-8 w-8 shrink-0" />
        <span className="hidden font-hoodlrz text-xl font-bold tracking-wider xl:inline">
          hOodlrz
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {NAV.map((entry) => {
          const Icon = ICONS[entry.icon] ?? Home;
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
                <span className="hidden truncate xl:inline">{entry.label}</span>
                {entry.beta && (
                  <span className="ml-auto hidden border border-accent-magenta/60 px-1 text-[8px] font-bold uppercase tracking-widest leading-none text-accent-magenta xl:inline">
                    Beta
                  </span>
                )}
              </Link>

              {/* Les collections se deplient sous leur entree : c'est la
                  categorie qui les rassemble, et elles sont assez peu
                  nombreuses pour tenir a l'ecran sans repli. */}
              {entry.children && actif && (
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
    </aside>
  );
}
