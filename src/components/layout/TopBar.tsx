"use client";

/**
 * La barre du haut, reduite a ce qui change.
 *
 * Les destinations sont parties dans la barre laterale ; il ne reste ici
 * que la recherche, les notifications et l'identite. Sur mobile, la barre
 * laterale n'existe pas, donc le logo revient ici - c'est le seul endroit
 * ou il tienne.
 *
 * L'identite affichee est l'adresse tronquee, jamais un courriel. Sur un
 * reseau anonyme, afficher « untel@gmail.com » en haut a droite d'une
 * capture d'ecran suffit a lever l'anonymat de son auteur.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

/** « 0x2606…a143 » : assez pour se reconnaitre, trop peu pour etre suivi
 *  par un lecteur de passage. */
function abreger(adresse: string) {
  return `${adresse.slice(0, 6)}…${adresse.slice(-4)}`;
}

export default function TopBar() {
  const [connecte, setConnecte] = useState(false);
  const [identite, setIdentite] = useState("");

  useEffect(() => {
    const supabase = createClient();

    function lire(user: { email?: string | null } | null) {
      if (!user) {
        setConnecte(false);
        setIdentite("");
        return;
      }
      setConnecte(true);
      const email = user.email ?? "";
      // Les comptes wallet portent un courriel de synthese
      // « <adresse>@wallet.hoodlrz.com » : on n'en garde que l'adresse.
      if (email.endsWith("@wallet.hoodlrz.com")) {
        setIdentite(abreger(email.replace("@wallet.hoodlrz.com", "")));
      } else {
        setIdentite("");
      }
    }

    supabase.auth.getSession().then(({ data }) => lire(data.session?.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => lire(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const deconnecter = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setConnecte(false);
    setIdentite("");
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6">
        {/* Le logo n'apparait que la ou la barre laterale ne le porte pas. */}
        <Link href="/" className="flex shrink-0 items-center gap-2 md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hoodlrz.svg" alt="Hoodlrz" className="h-8 w-8" />
          <span className="font-hoodlrz text-xl font-bold tracking-wider">hOodlrz</span>
        </Link>

        <label className="relative hidden min-w-0 flex-1 items-center sm:flex">
          <Search size={15} className="pointer-events-none absolute left-3 text-muted" />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search"
            className="h-9 w-full max-w-md border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3
                       text-sm text-foreground placeholder:text-muted focus:outline-none
                       focus:ring-1 focus:ring-accent-magenta"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {connecte && (
            <Link
              href="/profile"
              aria-label="Notifications"
              className="p-2 text-muted transition-colors hover:text-foreground"
            >
              <Bell size={17} />
            </Link>
          )}

          <ThemeToggle />

          {connecte ? (
            <>
              {identite && (
                <span className="hidden font-mono text-[11px] text-muted sm:inline">
                  {identite}
                </span>
              )}
              <button
                onClick={deconnecter}
                title="Log out"
                aria-label="Log out"
                className="p-2 text-muted transition-colors hover:text-foreground"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              href="/access"
              className="border border-[var(--border)] px-3 py-1.5 text-xs font-bold uppercase
                         tracking-widest text-foreground transition-colors hover:bg-[var(--surface)]"
            >
              Access
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
