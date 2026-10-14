"use client";

/**
 * La barre du bas, sur mobile uniquement.
 *
 * Elle montre cinq destinations sur les sept de la barre laterale : au-
 * dela, les cibles tactiles passent sous les 44 px recommandes et on
 * touche la mauvaise. Les deux qui restent, City et News, sont atteintes
 * depuis les pages elles-memes.
 *
 * La marge basse respecte l'encoche des telephones recents via
 * env(safe-area-inset-bottom), pose dans globals.css.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  MessagesSquare,
  LayoutGrid,
  User,
  type LucideIcon,
} from "lucide-react";
import { MOBILE_NAV } from "@/lib/app/nav";

const ICONS: Record<string, LucideIcon> = {
  Home,
  TrendingUp,
  MessagesSquare,
  LayoutGrid,
  User,
};

export default function BottomNav() {
  const pathname = usePathname() ?? "/";

  // Le jeu hOodlrz CITY occupe tout le viewport mobile : la barre
  // mangerait le bas de l'iframe et couperait la zone de jeu.
  if (pathname.startsWith("/city")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around
                 border-t border-[var(--border)] bg-background/90 pb-[env(safe-area-inset-bottom)]
                 backdrop-blur-md md:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const Icon = ICONS[item.icon] ?? Home;
        const actif =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-1
              ${actif ? "text-foreground" : "text-muted"}`}
          >
            <span
              aria-hidden
              className={`absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-accent-magenta transition-opacity
                ${actif ? "opacity-100" : "opacity-0"}`}
            />
            <Icon size={20} />
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
