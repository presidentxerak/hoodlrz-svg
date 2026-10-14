import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app/Page";

export const revalidate = 3600;

interface Source {
  title?: string;
  url?: string;
  publisher?: string;
}

async function lire(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("news_articles")
    .select("slug, title, summary, body, category, sources, accent, published_at")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const a = await lire(params.slug);
  if (!a) return { title: "News — Hoodlrz" };
  return {
    title: `${a.title} — Hoodlrz`,
    description: a.summary,
    openGraph: {
      title: a.title,
      description: a.summary,
      type: "article",
      // L'illustration fait 1200 x 630, le format des cartes de partage :
      // une image d'un autre rapport serait recadree au mauvais endroit.
      images: [{ url: `/news/img/${a.slug}.svg`, width: 1200, height: 630 }],
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await lire(params.slug);
  if (!a) notFound();

  const sources = Array.isArray(a.sources) ? (a.sources as Source[]) : [];

  return (
    <PageShell>
      <Link href="/news" className="text-xs text-muted transition-colors hover:text-foreground">
        ← News
      </Link>

      <article className="mt-4">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: a.accent }}
        >
          {a.category}
        </span>
        <h1 className="mt-2 font-hoodlrz text-[30px] font-bold leading-tight tracking-wider text-foreground sm:text-[40px]">
          {a.title}
        </h1>
        <time className="mt-2 block text-xs text-muted" dateTime={a.published_at}>
          {new Date(a.published_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>

        <div className="mt-6 aspect-[1200/630] w-full overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/news/img/${a.slug}.svg`} alt="" className="h-full w-full object-cover" />
        </div>

        <p className="mt-6 text-base leading-relaxed text-foreground">{a.summary}</p>

        <div className="mt-6 flex flex-col gap-4">
          {a.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>

        {/* Les sources ne sont pas un ornement. Un article de synthese
            ecrit a partir du travail d'autrui sans dire d'ou il vient est
            un plagiat, quelle que soit la machine qui l'a redige. */}
        {sources.length > 0 && (
          <section className="mt-10 border-t border-[var(--border)] pt-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Sources</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {sources.map((s, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-foreground underline underline-offset-2 hover:text-accent-magenta"
                  >
                    {s.title ?? s.url}
                  </a>
                  {s.publisher && <span className="text-muted"> — {s.publisher}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PageShell>
  );
}
