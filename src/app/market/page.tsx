import type { Metadata } from "next";
import { PageShell, PageHeader, Panel, EmptyState } from "@/components/app/Page";

export const metadata: Metadata = {
  title: "Market — Hoodlrz",
  robots: { index: false, follow: false },
};

/** Les trois volets du Market, nommes ici pour que la page dise deja ce
 *  qu'elle contiendra - un onglet vide est plus lisible qu'un onglet
 *  absent quand on explique ou en est le produit. */
const VOLETS = [
  { nom: "Markets", detail: "Floors, volumes and spreads across the collections you hold." },
  { nom: "Trends", detail: "What is moving today, and who moved first." },
  { nom: "Predictions", detail: "Call a move, stake your reputation, settle on chain data." },
];

export default function MarketPage() {
  return (
    <PageShell large>
      <PageHeader
        title="Market"
        subtitle="Prices, momentum and open predictions, read from the chain rather than from rumour."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {VOLETS.map((v) => (
          <Panel key={v.nom} className="p-5">
            <h2 className="text-sm font-semibold text-foreground">{v.nom}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{v.detail}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6">
        <EmptyState title="No market data connected yet.">
          The three panels above are wired to the same data source. It arrives
          with the market stage.
        </EmptyState>
      </div>
    </PageShell>
  );
}
