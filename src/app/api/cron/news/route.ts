/**
 * La veille hebdomadaire : collecter, trier, enregistrer les liens.
 *
 * Declenche par le programmateur de l'hebergeur (vercel.json) une fois
 * par semaine. Peut aussi etre lance a la main avec le meme secret, ce
 * qui evite d'attendre sept jours pour verifier qu'il marche.
 *
 * ON N'ECRIT RIEN. On relaie un titre, un resume publie par l'editeur et
 * un lien vers chez lui. Le lecteur part lire a la source, qui garde sa
 * visite. C'est aussi ce qui rend la section defendable : republier un
 * texte reecrit a partir du travail d'autrui est un plagiat, relayer ce
 * qu'un flux publie POUR etre repris ne l'est pas.
 *
 * L'AUTHENTIFICATION N'EST PAS DECORATIVE. Sans elle, n'importe qui
 * declenche la collecte autant de fois qu'il veut : c'est un moyen de
 * remplir la table et de marteler les flux des editeurs. La comparaison
 * du secret se fait a temps constant - comparer deux chaines avec `===`
 * fuit leur prefixe commun par le temps de reponse, ce qui suffit a les
 * deviner caractere par caractere.
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { collecter, semaineISO } from "@/lib/news/sources";
import { classer, type Rubrique } from "@/lib/news/classer";
import type { Database } from "@/types/database";
import { illustrer } from "@/lib/news/illustration";

export const dynamic = "force-dynamic";
// Trois flux a lire, avec leurs delais d'attente : au-dela des dix
// secondes par defaut.
export const maxDuration = 120;

/** Combien de liens on garde par rubrique et par semaine. Au-dela, la
 *  page devient une liste et plus une selection. */
const PAR_RUBRIQUE = 8;

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

/**
 * Deux articles differents sur le meme evenement portent des titres
 * presque identiques. On compare donc des titres reduits a leurs lettres
 * et chiffres, ce qui rapproche « Ethereum ETF flows turn positive » et
 * « Ethereum ETF flows turn positive! ».
 */
function empreinteTitre(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
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

  // Les liens deja connus. La contrainte d'unicite sur l'URL suffirait,
  // mais une lecture prealable evite d'envoyer des dizaines d'insertions
  // vouees a etre rejetees, et permet d'ecarter aussi les doublons de
  // TITRE - le meme evenement relate par deux editeurs.
  const { data: connus } = await admin
    .from("news_links")
    .select("url, title")
    .order("published_at", { ascending: false })
    .limit(500);

  const urlsConnues = new Set((connus ?? []).map((l) => l.url));
  const titresConnus = new Set((connus ?? []).map((l) => empreinteTitre(l.title)));

  const retenus: Record<Rubrique, number> = { crypto: 0, nft: 0, memecoin: 0 };
  const aEcrire: Database["public"]["Tables"]["news_links"]["Insert"][] = [];

  // `collecter` rend deja les articles du plus recent au plus ancien :
  // les premiers arrives sont donc les plus frais, ce qui est le bon
  // critere quand on ne garde que huit liens par rubrique.
  for (const a of articles) {
    if (urlsConnues.has(a.url)) continue;
    const empreinte = empreinteTitre(a.title);
    if (titresConnus.has(empreinte)) continue;

    const rubrique = classer(a.title, a.summary);
    if (retenus[rubrique] >= PAR_RUBRIQUE) continue;

    retenus[rubrique]++;
    urlsConnues.add(a.url);
    titresConnus.add(empreinte);

    aEcrire.push({
      url: a.url,
      title: a.title.slice(0, 300),
      // Le resume du flux, coupe net : certains editeurs y mettent
      // l'article entier, ce qui n'est pas ce qu'on relaie.
      summary: a.summary.slice(0, 400),
      publisher: a.publisher,
      category: rubrique,
      accent: illustrer(a.title, rubrique).accent,
      published_at: a.date,
      week: semaine,
    });
  }

  if (aEcrire.length === 0) {
    await journal(true, "Rien de neuf cette semaine.");
    return NextResponse.json({ semaine, ajoutes: 0, detail: "rien de neuf" });
  }

  const { error } = await admin.from("news_links").insert(aEcrire);
  if (error) {
    await journal(false, error.message);
    return NextResponse.json({ error: "Enregistrement refuse." }, { status: 500 });
  }

  await journal(
    true,
    `${aEcrire.length} liens : crypto ${retenus.crypto}, nft ${retenus.nft}, memecoin ${retenus.memecoin}`,
  );

  return NextResponse.json({ semaine, ajoutes: aEcrire.length, parRubrique: retenus });
}

/** Le programmateur de Vercel appelle en GET. Meme traitement. */
export async function GET(request: NextRequest) {
  return POST(request);
}
