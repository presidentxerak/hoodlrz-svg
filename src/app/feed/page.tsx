import type { Metadata } from "next";
import FeedClient from "@/components/feed/FeedClient";

export const metadata: Metadata = {
  title: "Feed — Hoodlrz",
  // Une page derriere la porte n'a aucune raison d'etre indexee, et son
  // URL seule renseigne deja sur la structure du reseau.
  robots: { index: false, follow: false },
};

export default function FeedPage() {
  return <FeedClient />;
}
