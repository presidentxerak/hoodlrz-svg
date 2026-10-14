"use client";

/**
 * L'ecran des groupes.
 *
 * Deux volets au-dela de 1024 px, un seul en dessous : la liste, puis la
 * conversation quand on en choisit une. Deux colonnes de 180 px sur un
 * telephone ne sont lisibles ni l'une ni l'autre.
 *
 * Rien n'est affiche avant le deverrouillage. Ce n'est pas une precaution
 * d'interface : sans la cle derivee de la signature, il n'y a rien a
 * afficher - le navigateur n'a que du chiffre.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { IconLock, IconPlus, IconSend, IconShield } from "@/components/ui/icons";
import { useE2E, type Message } from "./useE2E";

export default function GroupsClient() {
  const e2e = useE2E();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [moiId, setMoiId] = useState<string>("");
  const [envoiEnCours, setEnvoi] = useState(false);
  const bas = useRef<HTMLDivElement>(null);

  // L'identifiant de compte sert de donnee associee au chiffrement : un
  // message est lie a son auteur, et ne se dechiffre pas ailleurs.
  useEffect(() => {
    fetch("/api/auth/holder")
      .then((r) => r.json())
      .then((j) => setMoiId(j.accountId ?? ""))
      .catch(() => {});
  }, []);

  const rafraichir = useCallback(
    async (id: string) => {
      const m = await e2e.lireMessages(id);
      setMessages(m);
      requestAnimationFrame(() => bas.current?.scrollIntoView({ block: "end" }));
    },
    [e2e],
  );

  useEffect(() => {
    if (ouverte) void rafraichir(ouverte);
  }, [ouverte, rafraichir]);

  /* ── Verrou ─────────────────────────────────────────────────────── */
  if (!e2e.pret) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <IconLock size={24} className="text-muted" />
          <h1 className="font-hoodlrz text-[28px] font-bold tracking-wider">Unlock messages</h1>
          <p className="text-sm leading-relaxed text-muted">
            Your conversations are encrypted with a key derived from your wallet
            signature. Nothing is stored on our side that can open them, so the
            key has to be rebuilt on this device.
          </p>
          <button
            onClick={() => void e2e.deverrouiller()}
            disabled={e2e.occupe}
            className="bg-accent-magenta px-5 py-2.5 text-xs font-bold uppercase tracking-widest
                       text-white disabled:opacity-50"
          >
            {e2e.occupe ? "Waiting for signature…" : "Sign to unlock"}
          </button>
          {e2e.erreur && <p className="text-xs text-accent-red">{e2e.erreur}</p>}
          <p className="max-w-[40ch] text-xs leading-relaxed text-muted">
            The signature authorises no transaction and spends nothing.
          </p>
        </div>
      </div>
    );
  }

  /* ── Deux volets ────────────────────────────────────────────────── */
  const conv = e2e.conversations.find((c) => c.id === ouverte) ?? null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      <aside
        className={`flex w-full flex-col border-r border-[var(--border)] lg:w-[320px] lg:shrink-0
                   ${ouverte ? "hidden lg:flex" : "flex"}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-hoodlrz text-xl font-bold tracking-wider">Groups</h1>
          <button
            aria-label="New group"
            title="New group"
            className="p-1.5 text-muted transition-colors hover:text-foreground"
          >
            <IconPlus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {e2e.conversations.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm leading-relaxed text-muted">
              No conversations yet.
            </p>
          ) : (
            e2e.conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setOuverte(c.id)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--border)]
                            px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]
                            ${ouverte === c.id ? "bg-[var(--surface)]" : ""}`}
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {c.titre ?? "Encrypted group"}
                </span>
                <span className="text-[11px] text-muted">
                  {new Date(c.last_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            ))
          )}
        </div>

        <p className="flex items-center gap-1.5 border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-muted">
          <IconShield size={12} />
          End-to-end encrypted
        </p>
      </aside>

      <section className={`flex-1 flex-col ${ouverte ? "flex" : "hidden lg:flex"}`}>
        {!conv ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <IconLock size={22} className="text-muted" />
            <p className="max-w-[42ch] text-sm leading-relaxed text-muted">
              Pick a conversation. Messages are sealed on your device; the server
              stores ciphertext and never holds a key that opens it.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <button
                onClick={() => setOuverte(null)}
                className="text-sm text-muted lg:hidden"
                aria-label="Back"
              >
                ←
              </button>
              <h2 className="truncate text-sm font-semibold">{conv.titre ?? "Encrypted group"}</h2>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {messages.map((m) => {
                const mien = m.author_id === moiId;
                return (
                  <div key={m.id} className={`flex ${mien ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] border px-3 py-2 text-sm leading-relaxed
                        ${mien
                          ? "border-accent-magenta/40 bg-accent-magenta/10"
                          : "border-[var(--border)] bg-[var(--surface)]"}`}
                    >
                      {m.texte ?? (
                        <span className="text-muted">Message cannot be decrypted.</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bas} />
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const texte = brouillon.trim();
                if (!texte || !conv || envoiEnCours) return;
                setEnvoi(true);
                try {
                  await e2e.envoyer(conv.id, moiId, texte);
                  setBrouillon("");
                  await rafraichir(conv.id);
                } finally {
                  setEnvoi(false);
                }
              }}
              className="flex items-center gap-2 border-t border-[var(--border)] p-3
                         pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            >
              <input
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                placeholder="Write a message"
                aria-label="Message"
                className="h-10 min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface)] px-3
                           text-sm text-foreground placeholder:text-muted focus:outline-none
                           focus:ring-1 focus:ring-accent-magenta"
              />
              <button
                type="submit"
                disabled={envoiEnCours || !brouillon.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-magenta
                           text-white disabled:opacity-40"
              >
                <IconSend size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
