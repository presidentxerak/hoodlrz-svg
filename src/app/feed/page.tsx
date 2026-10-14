import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";

export const metadata: Metadata = {
  title: "Feed — Hoodlrz",
  // Une page derriere la porte n'a aucune raison d'etre indexee, et son
  // URL seule renseigne deja sur la structure du reseau.
  robots: { index: false, follow: false },
};

export default function FeedPage() {
  return (
    <PageShell>
      <PageHeader
        title="Feed"
        subtitle="What the holders are posting. Calls, charts, drops and noise, in one column."
      />
      <EmptyState
        title="The feed opens with the posts."
        action={
          <Link
            href="/groups"
            className="border border-[var(--border)] px-4 py-2 text-xs font-bold uppercase tracking-widest
                       text-foreground transition-colors hover:bg-[var(--surface-alt)]"
          >
            Go to groups
          </Link>
        }
      >
        Posting, reactions and replies land with the feed itself. The wall is
        built, the bricks come next.
      </EmptyState>
    </PageShell>
  );
}
