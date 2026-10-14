"use client";

/**
 * Regler les marches echus.
 *
 * Seuls ceux dont l'echeance est passee sont montres : trancher un
 * marche encore ouvert reviendrait a decider pendant que les membres
 * misent.
 *
 * La justification est obligatoire et publiee avec le resultat. Un
 * reglement sans source demande aux membres de croire l'administrateur
 * sur parole, ce qui est exactement ce qu'un marche de predictions est
 * cense eviter.
 */

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";

interface Marche {
  id: string;
  question: string;
  category: string;
  closes_at: string;
  status: string;
  pool_yes: number;
  pool_no: number;
}

export default function AdminPredictions() {
  const [attente, setAttente] = useState<Marche[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetch("/api/predictions");
      if (!r.ok) {
        setErreur("Marches illisibles.");
        return;
      }
      const j = await r.json();
      setAttente(j.attente ?? []);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const trancher = async (id: string, outcome: boolean) => {
    setErreur(null);
    const r = await fetch("/api/predictions/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ predictionId: id, outcome, note: notes[id] ?? "" }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErreur(j.error ?? "Resolution refusee.");
      return;
    }
    await charger();
  };

  return (
    <PageShell large>
      <PageHeader
        title="Resolve markets"
        subtitle="Markets past their closing time. Settling pays every winner and empties both pools."
      />

      {erreur && <p className="mb-4 text-sm text-accent-red">{erreur}</p>}

      {chargement ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : attente.length === 0 ? (
        <EmptyState title="Nothing waiting.">
          Markets appear here once their closing time has passed.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {attente.map((m) => (
            <div key={m.id} className="border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-medium text-foreground">{m.question}</p>
              <p className="mt-1 text-xs text-muted">
                {m.category} · closed{" "}
                {new Date(m.closes_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {m.pool_yes.toLocaleString("fr")} Yes / {m.pool_no.toLocaleString("fr")} No
              </p>

              <input
                value={notes[m.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })}
                placeholder="What settles it — source, price, block"
                aria-label="Resolution note"
                className="mt-3 h-10 w-full border border-[var(--border)] bg-background px-3 text-sm
                           text-foreground placeholder:text-muted focus:outline-none
                           focus:ring-1 focus:ring-accent-magenta"
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => trancher(m.id, true)}
                  className="flex-1 border border-emerald-500 py-2 text-xs font-bold uppercase
                             tracking-widest text-emerald-500"
                >
                  Settle Yes
                </button>
                <button
                  onClick={() => trancher(m.id, false)}
                  className="flex-1 border border-accent-red py-2 text-xs font-bold uppercase
                             tracking-widest text-accent-red"
                >
                  Settle No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
