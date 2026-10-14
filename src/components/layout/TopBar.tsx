"use client";

/**
 * La barre du haut, reduite a ce qui change.
 *
 * Les destinations sont parties dans la barre laterale ; il ne reste ici
 * que la recherche, les notifications et l'identite. Sur mobile, la barre
 * laterale n'existe pas, donc le logo revient ici - c'est le seul endroit
 * ou il tienne.
 *
 * L'identite affichee est le PSEUDONYME, jamais l'adresse et jamais un
 * courriel. Une adresse est publique par nature : elle donne le solde,
 * l'historique des echanges et souvent un nom ENS. L'afficher en haut a
 * droite de chaque capture d'ecran reviendrait a annuler l'anonymat que
 * la porte pretend offrir.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function TopBar() {
  const [connecte, setConnecte] = useState(false);
  const [identite, setIdentite] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let vivant = true;

    async function lire(connecteMaintenant: boolean) {
      if (!vivant) return;
      setConnecte(connecteMaintenant);
      if (!connecteMaintenant) {
        setIdentite("");
        return;
      }
      try {
        const r = await fetch("/api/auth/holder");
        const j = await r.json();
        if (vivant && j.pseudonym) setIdentite(j.pseudonym);
      } catch {
        // Sans pseudonyme on n'affiche rien : mieux vaut un coin vide
        // qu'une adresse qui leve l'anonymat.
      }
    }

    supabase.auth.getSession().then(({ data }) => lire(Boolean(data.session?.user)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => lire(Boolean(session?.user)));

    return () => {
      vivant = false;
      subscription.unsubscribe();
    };
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
                <Link
                  href="/profile"
                  className="hidden max-w-[160px] truncate font-mono text-[11px] text-muted
                             transition-colors hover:text-foreground sm:inline"
                >
                  {identite}
                </Link>
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
