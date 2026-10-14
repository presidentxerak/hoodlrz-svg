import type { Metadata } from "next";
import GroupsClient from "@/components/groups/GroupsClient";

export const metadata: Metadata = {
  title: "Groups — Hoodlrz",
  // Une page derriere la porte n'a aucune raison d'etre indexee, et son
  // URL seule renseigne deja sur la structure du reseau.
  robots: { index: false, follow: false },
};

export default function GroupsPage() {
  return <GroupsClient />;
}
