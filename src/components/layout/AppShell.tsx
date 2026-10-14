"use client";

/**
 * Le chassis commun : barre laterale, barre du haut, contenu, barre du
 * bas.
 *
 * LE DECALAGE DU CONTENU SUIT LA BARRE, en classes et non en mesure a
 * l'execution. Mesurer donnerait un premier rendu a zero puis un saut ;
 * ici la bonne marge est peinte des le premier octet de HTML.
 *
 * L'ETAT DU REPLI VIT ICI et non dans la barre, parce que deux elements
 * en dependent : la barre elle-meme, et la marge du contenu. Le poser
 * dans la barre obligerait a le faire remonter.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

/**
 * Les pages sans chassis.
 *
 * /city n'y est plus : le jeu vit desormais DANS la page, avec un bouton
 * de plein ecran qui passe par l'API du navigateur. Le sortir du chassis
 * le privait de navigation pour un faux plein ecran qui laissait la barre
 * d'URL et ne donnait pas le verrouillage du pointeur.
 *
 * /access reste nu : y montrer une navigation vers des sections fermees
 * serait promettre ce qu'on refuse.
 */
const SANS_CHASSIS = ["/access"];

const CLE_REPLI = "hoodlrz-sidebar-repliee";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const nu = SANS_CHASSIS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  /**
   * Le choix est relu APRES le premier rendu, jamais pendant.
   *
   * Lire localStorage au rendu donnerait un HTML serveur different du
   * premier rendu client - donc une erreur d'hydratation, et une barre
   * qui saute sous les yeux. On part donc toujours depliee, et on replie
   * dans l'instant qui suit si c'etait le choix.
   */
  const [replie, setReplie] = useState(false);

  useEffect(() => {
    try {
      setReplie(localStorage.getItem(CLE_REPLI) === "1");
    } catch {
      /* navigation privee : on reste deplie */
    }
  }, []);

  const basculer = () => {
    setReplie((v) => {
      const suivant = !v;
      try {
        localStorage.setItem(CLE_REPLI, suivant ? "1" : "0");
      } catch {
        /* sans memoire du choix, on reproposera : acceptable */
      }
      return suivant;
    });
  };

  if (nu) return <>{children}</>;

  // Repliee, la barre fait la meme largeur que sa version « icones
  // seules » : une seule valeur de decalage a tenir des deux cotes.
  const decalage = replie ? "md:pl-[72px]" : "md:pl-[72px] xl:pl-[232px]";

  return (
    <div className="min-h-dvh">
      <Sidebar replie={replie} onReplier={basculer} />
      <div className={decalage}>
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
