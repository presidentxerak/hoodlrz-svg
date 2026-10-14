import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";

export const metadata: Metadata = {
  title: "News — Hoodlrz",
  description:
    "Weekly crypto, NFT and meme coin reading, rewritten in house and illustrated by the Hoodlrz engine.",
};

/**
 * News est la seule section publique du reseau.
 *
 * C'est delibere : tout le reste demande une PFP, et un reseau
 * entierement ferme ne recrute personne. Une page d'articles partageable
 * est ce qui fait venir des gens jusqu'a la porte.
 *
 * Revalidation a l'heure plutot qu'a chaque visite : les articles
 * paraissent une fois par semaine, et rendre la page a chaque requete
 * couterait une lecture de base pour un contenu qui n'a pas bouge.
 */
export const revalidate = 3600;

export default async function NewsPage() {
  const supabase = createClient();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("slug, title, summary, category, accent, published_at")
    .order("published_at", { ascending: false })
    .limit(30);

  return (
    <PageShell large>
      <PageHeader
        title="News"
        subtitle="A weekly read on crypto, NFTs and meme coins. Gathered from public feeds, rewritten in house, illustrated by the same palette that draws the collections."
      />

      {!articles || articles.length === 0 ? (
        <EmptyState title="The first issue has not been published yet.">
          Articles are collected and rewritten once a week by a scheduled job.
          Nothing is published until that job runs — a blank page is easier to
          fix than an invented article.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link key={a.slug} href={`/news/${a.slug}`} className="group flex flex-col">
              <div className="aspect-[1200/630] w-full overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/news/img/${a.slug}.svg`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 border border-t-0 border-[var(--border)] p-4">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: a.accent }}
                >
                  {a.category}
                </span>
                <h2 className="text-sm font-semibold leading-snug text-foreground">{a.title}</h2>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted">{a.summary}</p>
                <time
                  className="mt-auto pt-2 text-[11px] text-muted"
                  dateTime={a.published_at}
                >
                  {new Date(a.published_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
