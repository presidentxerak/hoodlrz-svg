/**
 * Le travail hebdomadaire : collecter, reecrire, illustrer, publier.
 *
 * Declenche par le programmateur de l'hebergeur (vercel.json), une fois
 * par semaine. Peut aussi etre lance a la main avec le meme secret, ce
 * qui evite d'attendre sept jours pour verifier qu'il marche.
 *
 * L'AUTHENTIFICATION N'EST PAS DECORATIVE. Sans elle, n'importe qui
 * declenche la collecte autant de fois qu'il veut : c'est une facture
 * d'API et un moyen de remplir la table. La comparaison du secret se
 * fait a temps constant - comparer deux chaines avec `===` fuit leur
 * prefixe commun par le temps de reponse, ce qui suffit a les deviner
 * caractere par caractere.
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { collecter, semaineISO } from "@/lib/news/sources";
import { rediger } from "@/lib/news/rewrite";
import { illustrer } from "@/lib/news/illustration";

export const dynamic = "force-dynamic";
// La collecte, trois appels de modele et les ecritures : largement
// au-dela des dix secondes par defaut.
export const maxDuration = 300;

const CATEGORIES = ["crypto", "nft", "memecoin"] as const;

function secretValide(fourni: string | null): boolean {
  const attendu = process.env.CRON_SECRET;
  if (!attendu || !fourni) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  // timingSafeEqual exige deux tampons de meme longueur ; la difference
  // de longueur est de toute facon publique.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** « ethereum-tient-le-choc » a partir d'un titre. */
function slug(titre: string, semaine: string, categorie: string): string {
  const base = titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // La semaine et la categorie prefixent : deux titres identiques a six
  // mois d'ecart doivent rester deux articles.
  return `${semaine.toLowerCase()}-${categorie}-${base || "news"}`;
}

export async function POST(request: NextRequest) {
  const entete = request.headers.get("authorization");
  const jeton = entete?.startsWith("Bearer ") ? entete.slice(7) : null;
  if (!secretValide(jeton)) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const semaine = semaineISO();
  const admin = createAdminClient();

  const journal = async (ok: boolean, detail: string) => {
    await admin.from("news_runs").insert({ week: semaine, ok, detail });
  };

  const articles = await collecter(7);
  if (articles.length === 0) {
    await journal(false, "Aucun flux n'a repondu.");
    return NextResponse.json({ error: "Aucune source." }, { status: 502 });
  }

  const publies: string[] = [];
  const manques: string[] = [];

  for (const categorie of CATEGORIES) {
    // Un article par categorie et par semaine : l'index unique le
    // garantit cote base, on evite juste l'appel de modele inutile.
    const { data: existe } = await admin
      .from("news_articles")
      .select("slug")
      .eq("week", semaine)
      .eq("category", categorie)
      .maybeSingle();
    if (existe) {
      manques.push(`${categorie} : deja publie`);
      continue;
    }

    const texte = await rediger(articles, categorie);
    if (!texte) {
      // Rien n'est publie plutot qu'un texte de remplissage : une page
      // vide se repare, un article invente se propage.
      manques.push(`${categorie} : redaction indisponible`);
      continue;
    }

    const image = illustrer(texte.title, categorie);

    const { error } = await admin.from("news_articles").insert({
      slug: slug(texte.title, semaine, categorie),
      title: texte.title,
      summary: texte.summary,
      body: texte.body,
      category: categorie,
      sources: texte.sources,
      illustration: image.svg,
      accent: image.accent,
      week: semaine,
    });

    if (error) manques.push(`${categorie} : ${error.message}`);
    else publies.push(categorie);
  }

  const ok = publies.length > 0;
  await journal(ok, [`publies: ${publies.join(", ") || "aucun"}`, ...manques].join(" | "));

  return NextResponse.json({ semaine, publies, manques }, { status: ok ? 200 : 207 });
}

/** Le programmateur de Vercel appelle en GET. Meme traitement. */
export async function GET(request: NextRequest) {
  return POST(request);
}
