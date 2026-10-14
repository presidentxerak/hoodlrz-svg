import type { Metadata } from "next";
import { PageShell, PageHeader, EmptyState } from "@/components/app/Page";

export const metadata: Metadata = {
  title: "News — Hoodlrz",
  description:
    "Weekly crypto, NFT and meme coin reading, rewritten in house and illustrated by the Hoodlrz engine.",
};

export default function NewsPage() {
  return (
    <PageShell large>
      <PageHeader
        title="News"
        subtitle="A weekly read on crypto, NFTs and meme coins. Gathered, rewritten, and illustrated by the same engine that draws the collections."
      />
      <EmptyState title="The first issue has not been published yet.">
        Articles are collected and rewritten once a week by a scheduled job,
        then illustrated with a generative image seeded by the article itself.
        Nothing is published until that job runs.
      </EmptyState>
    </PageShell>
  );
}
