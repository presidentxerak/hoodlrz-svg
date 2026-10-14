"use client";

/**
 * Le marche binaire, dans la carte du feed.
 *
 * LA COTE AFFICHEE EST UNE PROBABILITE, PAS UN PRIX
 * Les reserves sont parimutuelles : les gagnants se partagent la totalite
 * des deux reserves au prorata de leur mise. La part de Yes dans le total
 * est donc ce que le marche croit, et c'est ce qu'on affiche. Il n'y a ni
 * teneur de marche ni cote garantie - ce qui est le seul modele tenable
 * quand la monnaie est distribuee gratuitement tous les jours.
 *
 * Consequence a dire au membre, et affichee : le rapport evolue jusqu'a
 * la fermeture. Miser tot sur le camp minoritaire paie plus, et c'est
 * tout l'interet.
 */

import { useState } from "react";
import { Check, X, Clock } from "lucide-react";

export interface Prediction {
  id: string;
  question: string;
  category: "crypto" | "nft" | "memecoin";
  closes_at: string;
  status: "open" | "closed" | "resolved" | "void";
  outcome: boolean | null;
  pool_yes: number;
  pool_no: number;
}

export interface MaPosition {
  side: boolean;
  amount: number;
}

const MISES = [10, 50, 100, 500];

/** Ce que le marche croit, en pourcentage. Un marche vide est affiche a
 *  50 % : c'est l'absence d'opinion, pas une opinion a zero. */
function partYes(p: Prediction): number {
  const total = p.pool_yes + p.pool_no;
  if (total === 0) return 50;
  return Math.round((p.pool_yes / total) * 100);
}

/** Ce que rapporterait une mise, aux reserves actuelles. */
function rapport(p: Prediction, cote: boolean, montant: number): number {
  const camp = (cote ? p.pool_yes : p.pool_no) + montant;
  const total = p.pool_yes + p.pool_no + montant;
  return Math.floor((montant * total) / camp);
}

export default function PredictionCard({
  prediction,
  position,
  solde,
  onMise,
}: {
  prediction: Prediction;
  position?: MaPosition;
  solde: number;
  onMise: (side: boolean, amount: number) => Promise<void>;
}) {
  const [cote, setCote] = useState<boolean | null>(null);
  const [montant, setMontant] = useState(50);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const yes = partYes(prediction);
  const ferme = prediction.status !== "open" || new Date(prediction.closes_at) <= new Date();
  const tranche = prediction.status === "resolved" || prediction.status === "void";

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-magenta">
            {prediction.category}
          </span>
          <p className="mt-1 text-sm font-medium leading-snug text-foreground">
            {prediction.question}
          </p>
        </div>
        <span className="shrink-0 text-right">
          <span className="block font-hoodlrz text-2xl font-bold leading-none text-foreground">
            {yes}%
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted">yes</span>
        </span>
      </div>

      {/* La barre montre le partage des reserves. Les deux camps sont
          nommes dessous : une barre seule se lit a l'envers une fois sur
          deux. */}
      <div className="px-4 pt-3">
        <div className="flex h-1.5 w-full overflow-hidden bg-[var(--surface-alt)]">
          <div className="bg-emerald-500" style={{ width: `${yes}%` }} />
          <div className="bg-accent-red" style={{ width: `${100 - yes}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>{prediction.pool_yes.toLocaleString("fr")} Hdlrz on Yes</span>
          <span>{prediction.pool_no.toLocaleString("fr")} on No</span>
        </div>
      </div>

      <div className="px-4 py-3">
        {tranche ? (
          <p className="flex items-center gap-2 text-sm">
            {prediction.status === "void" ? (
              <span className="text-muted">Void — every stake was refunded.</span>
            ) : (
              <>
                {prediction.outcome ? (
                  <Check size={15} className="text-emerald-500" />
                ) : (
                  <X size={15} className="text-accent-red" />
                )}
                <span className="font-medium text-foreground">
                  Resolved {prediction.outcome ? "Yes" : "No"}
                </span>
              </>
            )}
          </p>
        ) : ferme ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Clock size={14} />
            Closed — waiting for resolution.
          </p>
        ) : position ? (
          <p className="text-sm text-muted">
            You are in for{" "}
            <span className="font-medium text-foreground">
              {position.amount.toLocaleString("fr")} Hdlrz
            </span>{" "}
            on {position.side ? "Yes" : "No"}.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setCote(true)}
                aria-pressed={cote === true}
                className={`flex-1 border py-2 text-xs font-bold uppercase tracking-widest transition-colors
                  ${cote === true
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                    : "border-[var(--border)] text-muted hover:text-foreground"}`}
              >
                Yes
              </button>
              <button
                onClick={() => setCote(false)}
                aria-pressed={cote === false}
                className={`flex-1 border py-2 text-xs font-bold uppercase tracking-widest transition-colors
                  ${cote === false
                    ? "border-accent-red bg-accent-red/15 text-accent-red"
                    : "border-[var(--border)] text-muted hover:text-foreground"}`}
              >
                No
              </button>
            </div>

            {cote !== null && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {MISES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMontant(m)}
                      disabled={m > solde}
                      className={`border px-2.5 py-1 text-xs transition-colors disabled:opacity-30
                        ${montant === m
                          ? "border-accent-magenta text-foreground"
                          : "border-[var(--border)] text-muted hover:text-foreground"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-xs text-muted">
                  {montant} Hdlrz would return about{" "}
                  <span className="font-medium text-foreground">
                    {rapport(prediction, cote, montant).toLocaleString("fr")}
                  </span>{" "}
                  if {cote ? "Yes" : "No"} wins. The ratio moves until close.
                </p>

                <button
                  disabled={envoi || montant > solde}
                  onClick={async () => {
                    setEnvoi(true);
                    setErreur(null);
                    try {
                      await onMise(cote, montant);
                    } catch (e) {
                      setErreur((e as Error).message);
                    } finally {
                      setEnvoi(false);
                    }
                  }}
                  className="mt-3 w-full bg-accent-magenta py-2 text-xs font-bold uppercase
                             tracking-widest text-white disabled:opacity-40"
                >
                  {montant > solde
                    ? "Not enough Hdlrz"
                    : envoi
                      ? "Placing…"
                      : `Back ${cote ? "Yes" : "No"} with ${montant}`}
                </button>

                {erreur && <p className="mt-2 text-xs text-accent-red">{erreur}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
