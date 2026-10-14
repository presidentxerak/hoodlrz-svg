import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";

export const metadata: Metadata = {
  title: "News — Hoodlrz",
  description:
    "A weekly pick of crypto, NFT and meme coin reading. Every card links to the publisher.",
};

/**
 * News est la seule section publique du reseau.
 *
 * C'est delibere : tout le reste demande une PFP, et un reseau
 * entierement ferme ne recrute personne. Une page partageable est ce qui
 * fait venir des gens jusqu'a la porte.
 *
 * ON NE PUBLIE PAS D'ARTICLE, ON RELAIE. Chaque carte porte le titre, le
 * resume que l'editeur publie lui-meme, son nom, et un lien vers chez
 * lui. Le lecteur part lire a la source : elle garde sa visite, sa
 * publicite et son attribution.
 *
 * Revalidation a l'heure : la selection change une fois par semaine, et
 * rendre la page a chaque requete couterait une lecture de base pour un
 * contenu qui n'a pas bouge.
 */
export const revalidate = 3600;

const RUBRIQUES = [
  { cle: "crypto", nom: "Crypto" },
  { cle: "nft", nom: "NFT" },
  { cle: "memecoin", nom: "Meme coins" },
] as const;

export default async function NewsPage() {
  const supabase = createClient();
  const { data: liens } = await supabase
    .from("news_links")
    .select("id, url, title, summary, publisher, category, accent, published_at")
    .order("published_at", { ascending: false })
    .limit(36);

  return (
    <PageShell large>
      <PageHeader
        title="News"
        subtitle="A weekly pick on crypto, NFTs and meme coins. We do not rewrite anything: every card opens at the publisher."
      />

      {!liens || liens.length === 0 ? (
        <EmptyState title="Nothing picked yet.">
          Links are gathered once a week by a scheduled job. Nothing appears
          until that job runs.
        </EmptyState>
      ) : (
        RUBRIQUES.map((r) => {
          const dedans = liens.filter((l) => l.category === r.cle);
          if (dedans.length === 0) return null;
          return (
            <section key={r.cle} className="mb-10">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
                {r.nom}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dedans.map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    /* noopener coupe l'acces de la page ouverte a la
                       notre via window.opener ; nofollow dit aux moteurs
                       que ce lien est un relais, pas une recommandation. */
                    rel="noopener noreferrer nofollow"
                    className="group flex flex-col"
                  >
                    <div className="aspect-[1200/630] w-full overflow-hidden bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/news/img/${l.id}.svg`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 border border-t-0 border-[var(--border)] p-4">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: l.accent }}
                      >
                        {l.publisher}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug text-foreground">
                        {l.title}
                      </h3>
                      {l.summary && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                          {l.summary}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <time className="text-[11px] text-muted" dateTime={l.published_at}>
                          {new Date(l.published_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </time>
                        <span className="flex items-center gap-1 text-[11px] text-muted transition-colors group-hover:text-foreground">
                          Read
                          <ExternalLink size={11} />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="mt-4 border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-muted">
        Headlines and summaries come from the publishers&rsquo; own feeds and
        belong to them. Every link opens in a new tab, at the source.
      </p>
    </PageShell>
  );
}
