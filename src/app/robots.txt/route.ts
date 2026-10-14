/**
 * robots.txt, servi par une route plutot que par un fichier statique.
 *
 * POURQUOI UNE ROUTE
 * Le domaine du sitemap depend de l'environnement : une preview Vercel
 * qui annonce le sitemap de la production fait indexer la production
 * depuis une URL de test. Une route lit la variable a l'execution ; un
 * fichier statique l'aurait figee a la compilation.
 *
 * CE QUE CE FICHIER FAIT, ET CE QU'IL NE FAIT PAS
 * Il demande. Rien n'oblige un robot a obeir, et les aspirateurs de
 * contenu l'ignorent par construction. Il dit donc aux moteurs honnetes
 * de laisser les sections privees tranquilles - ce qui evite qu'une URL
 * de groupe se retrouve dans un resultat de recherche - pendant que le
 * vrai refus est pose ailleurs : la porte des detenteurs dans le
 * middleware, et le limiteur de debit sur les routes d'API.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Aspirateurs de contenu connus, refuses explicitement. La liste ne
 *  pretend pas etre complete : elle coute zero et retire le gros du
 *  trafic automatise. */
const ASPIRATEURS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Bytespider",
  "PetalBot",
  "DataForSeoBot",
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
  "DotBot",
  "Scrapy",
  "magpie-crawler",
];

const PRIVE = ["/api/", "/admin", "/feed", "/groups", "/market", "/profile", "/access"];

export function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hoodlrz.com").replace(/\/$/, "");

  const lignes = [
    "# Hoodlrz — reseau prive. Les sections ci-dessous demandent un wallet.",
    "",
    "User-agent: *",
    ...PRIVE.map((p) => `Disallow: ${p}`),
    "Allow: /",
    "",
    ...ASPIRATEURS.flatMap((ua) => [`User-agent: ${ua}`, "Disallow: /", ""]),
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ];

  return new NextResponse(lignes.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
