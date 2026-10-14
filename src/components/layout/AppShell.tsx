"use client";

/**
 * Le chassis commun : barre laterale, barre du haut, contenu, barre du
 * bas.
 *
 * Le decalage du contenu suit exactement les largeurs de la barre
 * laterale, declare en classes plutot que mesure a l'execution. Mesurer
 * donnerait un premier rendu a zero puis un saut ; ici la bonne marge est
 * peinte des le premier octet de HTML.
 *
 * Deux pages echappent au chassis. /city est un jeu en plein ecran : une
 * barre laterale lui volerait 232 px de largeur et la barre du bas lui
 * couperait les pieds. /access est la porte d'entree : y montrer une
 * navigation vers des sections fermees serait promettre ce qu'on refuse.
 */

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

const SANS_CHASSIS = ["/city", "/access"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const nu = SANS_CHASSIS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (nu) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="md:pl-[72px] xl:pl-[232px]">
        <TopBar />
        {/* La reserve en bas vaut la hauteur de la barre mobile plus
            l'encoche ; sur grand ecran il n'y a pas de barre du bas. */}
        <main className="min-h-[calc(100dvh-3.5rem)] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-12">
          {children}
        </main>
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
