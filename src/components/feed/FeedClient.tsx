"use client";

/**
 * Le feed, et son compositeur.
 *
 * Un post est du texte. Il peut porter une question binaire, auquel cas
 * la carte affiche le marche : Yes, No, et ce que croit l'ensemble des
 * mises. Les deux vivent dans la meme carte parce qu'une prediction sans
 * son argumentaire n'est qu'un sondage.
 *
 * Le solde de Hdlrz est tenu ici et redescendu aux cartes : une carte qui
 * interrogerait le solde elle-meme en ferait une requete par ligne du
 * feed.
 */

import { useCallback, useEffect, useState } from "react";
import { Coins, Gift, Send } from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";
import PredictionCard, { type Prediction, type MaPosition } from "./PredictionCard";

interface Post {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { pseudonym: string } | { pseudonym: string }[] | null;
  prediction: Prediction | Prediction[] | null;
}

/** Supabase remonte une relation imbriquee tantot en objet, tantot en
 *  tableau d'un element selon la forme de la requete. On normalise plutot
 *  que de parier sur l'une des deux. */
function un<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function FeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [positions, setPositions] = useState<Record<string, MaPosition>>({});
  const [solde, setSolde] = useState(0);
  const [donDispo, setDonDispo] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [texte, setTexte] = useState("");
  const [avecPrediction, setAvecPrediction] = useState(false);
  const [question, setQuestion] = useState("");
  const [categorie, setCategorie] = useState<"crypto" | "nft" | "memecoin">("crypto");
  const [echeance, setEcheance] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [f, h] = await Promise.all([fetch("/api/feed"), fetch("/api/hdlrz")]);
      if (!f.ok) {
        setErreur("Feed indisponible.");
        return;
      }
      const data = await f.json();
      setPosts(data.posts ?? []);
      setPositions(
        Object.fromEntries(
          (data.stakes ?? []).map((s: { prediction_id: string; side: boolean; amount: number }) => [
            s.prediction_id,
            { side: s.side, amount: s.amount },
          ]),
        ),
      );
      if (h.ok) {
        const j = await h.json();
        setSolde(j.hdlrz ?? 0);
        setDonDispo(Boolean(j.dailyAvailable));
      }
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const miser = async (predictionId: string, side: boolean, amount: number) => {
    const r = await fetch("/api/hdlrz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "stake", predictionId, side, amount }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Mise refusee.");
    setSolde(j.hdlrz);
    await charger();
  };

  const reclamer = async () => {
    const r = await fetch("/api/hdlrz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "daily" }),
    });
    if (r.ok) {
      const j = await r.json();
      setSolde(j.hdlrz);
      setDonDispo(false);
    }
  };

  const publier = async (e: React.FormEvent) => {
    e.preventDefault();
    const corps = texte.trim();
    if (!corps || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await fetch("/api/feed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: corps,
          prediction: avecPrediction
            ? { question: question.trim(), category: categorie, closesAt: echeance }
            : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErreur(j.error ?? "Publication refusee.");
        return;
      }
      setTexte("");
      setQuestion("");
      setAvecPrediction(false);
      await charger();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Feed"
        subtitle="Calls, charts and open questions. Take a side with Hdlrz."
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-xs">
              <Coins size={13} className="text-accent-magenta" />
              <span className="font-medium text-foreground">{solde.toLocaleString("fr")}</span>
              <span className="text-muted">Hdlrz</span>
            </span>
            {donDispo && (
              <button
                onClick={reclamer}
                title="Claim today's 100 Hdlrz"
                className="flex items-center gap-1.5 bg-accent-magenta px-3 py-1.5 text-xs font-bold
                           uppercase tracking-widest text-white"
              >
                <Gift size={13} />
                +100
              </button>
            )}
          </div>
        }
      />

      {/* ── Compositeur ──────────────────────────────────────────── */}
      <form onSubmit={publier} className="mb-6 border border-[var(--border)] bg-[var(--surface)] p-4">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What are you watching?"
          aria-label="Post"
          className="w-full resize-y border border-[var(--border)] bg-background p-3 text-sm
                     text-foreground placeholder:text-muted focus:outline-none
                     focus:ring-1 focus:ring-accent-magenta"
        />

        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={avecPrediction}
            onChange={(e) => setAvecPrediction(e.target.checked)}
            className="accent-[var(--foreground)]"
          />
          Attach a Yes / No market
        </label>

        {avecPrediction && (
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={240}
              placeholder="Will ETH close above $3,000 on 31 October?"
              aria-label="Question"
              className="h-10 w-full border border-[var(--border)] bg-background px-3 text-sm
                         text-foreground placeholder:text-muted focus:outline-none
                         focus:ring-1 focus:ring-accent-magenta"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as typeof categorie)}
                aria-label="Category"
                className="h-10 border border-[var(--border)] bg-background px-3 text-sm text-foreground
                           focus:outline-none focus:ring-1 focus:ring-accent-magenta sm:w-40"
              >
                <option value="crypto">Crypto</option>
                <option value="nft">NFT</option>
                <option value="memecoin">Meme coin</option>
              </select>
              <input
                type="datetime-local"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
                aria-label="Closes at"
                className="h-10 min-w-0 flex-1 border border-[var(--border)] bg-background px-3 text-sm
                           text-foreground focus:outline-none focus:ring-1 focus:ring-accent-magenta"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted">
              A market needs a question that settles on a fact, and a closing
              time before the answer is knowable.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{texte.length} / 2000</span>
          <button
            type="submit"
            disabled={envoi || !texte.trim()}
            className="flex items-center gap-1.5 bg-accent-magenta px-4 py-2 text-xs font-bold
                       uppercase tracking-widest text-white disabled:opacity-40"
          >
            <Send size={13} />
            Post
          </button>
        </div>

        {erreur && <p className="mt-2 text-xs text-accent-red">{erreur}</p>}
      </form>

      {/* ── Le fil ───────────────────────────────────────────────── */}
      {chargement ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState title="Nothing posted yet.">
          Be the first. A post with a Yes / No market gets the most replies.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => {
            const auteur = un(p.author);
            const pred = un(p.prediction);
            return (
              <article key={p.id} className="border border-[var(--border)] bg-[var(--surface)] p-4">
                <header className="mb-2 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-foreground">
                    {auteur?.pseudonym ?? "member"}
                  </span>
                  <time className="text-[11px] text-muted" dateTime={p.created_at}>
                    {new Date(p.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </header>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {p.body}
                </p>

                {pred && (
                  <div className="mt-3">
                    <PredictionCard
                      prediction={pred}
                      position={positions[pred.id]}
                      solde={solde}
                      onMise={(side, amount) => miser(pred.id, side, amount)}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
