import type { Metadata } from "next";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Groups — Hoodlrz",
  robots: { index: false, follow: false },
};

/**
 * Groups garde la mise en page a deux volets des messageries : la liste
 * des conversations a gauche, celle qui est ouverte a droite.
 *
 * Sous 1024 px le volet de droite disparait et la liste prend tout
 * l'ecran ; la conversation s'ouvrira alors sur son propre chemin,
 * /groups/<id>. C'est le seul decoupage qui marche sur telephone : deux
 * colonnes de 180 px ne sont lisibles ni l'une ni l'autre.
 */
export default function GroupsPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      <aside className="flex w-full flex-col border-r border-[var(--border)] lg:w-[320px] lg:shrink-0">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-hoodlrz text-xl font-bold tracking-wider">Groups</h1>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="max-w-[26ch] text-sm leading-relaxed text-muted">
            Your groups appear here once encrypted messaging is switched on.
          </p>
        </div>
      </aside>

      <section className="hidden flex-1 flex-col items-center justify-center gap-3 px-6 text-center lg:flex">
        <Lock size={22} className="text-muted" />
        <p className="text-sm font-medium text-foreground">End-to-end encrypted</p>
        <p className="max-w-[42ch] text-sm leading-relaxed text-muted">
          Messages are sealed on your device with a key derived from your wallet.
          The server stores ciphertext and never holds a key that opens it.
        </p>
      </section>
    </div>
  );
}
