"use client";

/**
 * Les cours, en tete de la page Market.
 *
 * Quatre marches, une fenetre au choix. Les donnees viennent de notre
 * propre route, qui les lit chez Coinbase et les met en cache : le
 * navigateur ne peut pas appeler la source directement, la politique de
 * contenu du site ne l'autorise pas.
 *
 * SI LA SOURCE NE REPOND PAS, ON LE DIT. Rien n'est simule : un
 * graphique invente se lit comme une information, et c'est pire que pas
 * de graphique du tout.
 */

import { useCallback, useEffect, useState } from "react";
import PriceChart, { type Chandelier } from "./PriceChart";
import { IconSpinner } from "@/components/ui/icons";

interface Cours {
  paire: string;
  nom: string;
  chandeliers: Chandelier[];
  dernier: number;
  variation: number;
}

const FENETRES = [
  { cle: "24h", nom: "24H" },
  { cle: "7j", nom: "7D" },
  { cle: "30j", nom: "30D" },
] as const;

function prix(v: number) {
  return v.toLocaleString("en-GB", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v < 1 ? 6 : 2,
  });
}

export default function CoursPanel() {
  const [fenetre, setFenetre] = useState<string>("7j");
  const [cours, setCours] = useState<Cours[]>([]);
  const [etat, setEtat] = useState<"charge" | "pret" | "muet">("charge");

  const charger = useCallback(async () => {
    setEtat("charge");
    try {
      const r = await fetch(`/api/market?fenetre=${fenetre}`);
      const j = await r.json();
      if (!r.ok || !j.cours?.length) {
        setEtat("muet");
        return;
      }
      setCours(j.cours);
      setEtat("pret");
    } catch {
      setEtat("muet");
    }
  }, [fenetre]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <section className="mb-8">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Prices</h2>
        <div className="flex gap-1">
          {FENETRES.map((f) => (
            <button
              key={f.cle}
              onClick={() => setFenetre(f.cle)}
              aria-pressed={fenetre === f.cle}
              className={`border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors
                ${fenetre === f.cle
                  ? "border-accent-magenta text-foreground"
                  : "border-[var(--border)] text-muted hover:text-foreground"}`}
            >
              {f.nom}
            </button>
          ))}
        </div>
      </header>

      {etat === "charge" ? (
        <p className="flex items-center gap-2 border border-[var(--border)] p-6 text-sm text-muted">
          <IconSpinner size={14} />
          Reading prices…
        </p>
      ) : etat === "muet" ? (
        <div className="border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-sm text-foreground">Prices are unavailable right now.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The market feed did not answer. Nothing is shown rather than
            something made up.
          </p>
          <button
            onClick={charger}
            className="mt-4 border border-[var(--border)] px-4 py-2 text-xs font-bold uppercase
                       tracking-widest text-foreground transition-colors hover:bg-[var(--surface)]"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cours.map((c) => {
            const hausse = c.variation >= 0;
            return (
              <article key={c.paire} className="border border-[var(--border)] bg-[var(--surface)] p-4">
                <header className="mb-3 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{c.nom}</h3>
                    <p className="text-[11px] uppercase tracking-widest text-muted">{c.paire}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-foreground">{prix(c.dernier)}</p>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: hausse ? "#22c55e" : "#ff5a3c" }}
                    >
                      {hausse ? "+" : ""}
                      {c.variation.toFixed(2)} %
                    </p>
                  </div>
                </header>
                <PriceChart chandeliers={c.chandeliers} hausse={hausse} hauteur={120} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
