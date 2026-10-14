"use client";

/**
 * Market : tous les marches ouverts, puis ceux qui attendent une
 * resolution, puis les tranches.
 *
 * L'ordre n'est pas chronologique mais utile : ce sur quoi on peut encore
 * agir d'abord, l'historique ensuite. Un membre qui ouvre cette page
 * cherche un marche a prendre, pas un releve.
 */

import { useCallback, useEffect, useState } from "react";
import { IconCoins } from "@/components/ui/icons";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";
import PredictionCard, { type Prediction, type MaPosition } from "@/components/feed/PredictionCard";

const CATEGORIES = [
  { cle: "", nom: "All" },
  { cle: "crypto", nom: "Crypto" },
  { cle: "nft", nom: "NFT" },
  { cle: "memecoin", nom: "Meme coins" },
] as const;

export default function MarketClient() {
  const [categorie, setCategorie] = useState("");
  const [ouverts, setOuverts] = useState<Prediction[]>([]);
  const [attente, setAttente] = useState<Prediction[]>([]);
  const [tranches, setTranches] = useState<Prediction[]>([]);
  const [positions, setPositions] = useState<Record<string, MaPosition>>({});
  const [solde, setSolde] = useState(0);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetch(`/api/predictions${categorie ? `?categorie=${categorie}` : ""}`);
      if (!r.ok) return;
      const j = await r.json();
      setOuverts(j.ouverts ?? []);
      setAttente(j.attente ?? []);
      setTranches(j.tranches ?? []);
      setSolde(j.hdlrz ?? 0);
      setPositions(
        Object.fromEntries(
          (j.stakes ?? []).map((s: { prediction_id: string; side: boolean; amount: number }) => [
            s.prediction_id,
            { side: s.side, amount: s.amount },
          ]),
        ),
      );
    } finally {
      setChargement(false);
    }
  }, [categorie]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const miser = async (id: string, side: boolean, amount: number) => {
    const r = await fetch("/api/hdlrz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "stake", predictionId: id, side, amount }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Mise refusee.");
    setSolde(j.hdlrz);
    await charger();
  };

  const bloc = (titre: string, liste: Prediction[]) =>
    liste.length === 0 ? null : (
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{titre}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {liste.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              position={positions[p.id]}
              solde={solde}
              onMise={(side, amount) => miser(p.id, side, amount)}
            />
          ))}
        </div>
      </section>
    );

  return (
    <PageShell large>
      <PageHeader
        title="Market"
        subtitle="Open questions on crypto, NFTs and meme coins. Take a side with Hdlrz; winners split both pools."
        action={
          <span className="flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-xs">
            <IconCoins size={13} className="text-accent-magenta" />
            <span className="font-medium text-foreground">{solde.toLocaleString("fr")}</span>
            <span className="text-muted">Hdlrz</span>
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.cle}
            onClick={() => setCategorie(c.cle)}
            className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors
              ${categorie === c.cle
                ? "border-accent-magenta text-foreground"
                : "border-[var(--border)] text-muted hover:text-foreground"}`}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {chargement ? (
        <p className="py-12 text-center text-sm text-muted">Loading…</p>
      ) : ouverts.length + attente.length + tranches.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No market here yet.">
            Markets are opened from the feed: write a post and attach a Yes / No
            question.
          </EmptyState>
        </div>
      ) : (
        <>
          {bloc("Open", ouverts)}
          {bloc("Awaiting resolution", attente)}
          {bloc("Settled", tranches)}
        </>
      )}
    </PageShell>
  );
}
