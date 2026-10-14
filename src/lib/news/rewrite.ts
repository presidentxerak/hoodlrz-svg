/**
 * La reecriture hebdomadaire.
 *
 * CE QUE FAIT CE MODULE, ET CE QU'IL NE FAIT PAS
 * Il prend les titres et resumes publies par des flux RSS, et demande un
 * texte de synthese : ce qui s'est passe cette semaine, dans un ordre
 * utile. Il ne recopie pas les articles, il n'invente pas de chiffres, et
 * il cite ses sources - qui sont ensuite affichees au bas de la page.
 *
 * Un article de synthese sans sources visibles est un plagiat avec une
 * etape de blanchiment au milieu. La consigne donnee au modele le dit, et
 * le schema de la base garde les sources a cote du texte.
 *
 * SI LA CLE N'EST PAS CONFIGUREE, RIEN N'EST PUBLIE. Pas de texte de
 * remplissage : une page vide se repare, un article invente se propage.
 */

import type { Article } from "./sources";

const MODELE = "claude-sonnet-5";

export interface Redaction {
  title: string;
  summary: string;
  body: string;
  category: "crypto" | "nft" | "memecoin";
  sources: { title: string; url: string; publisher: string }[];
}

const CONSIGNE = `Tu rediges la synthese hebdomadaire de Hoodlrz, un reseau prive de
collectionneurs et de traders.

Regles, dans l'ordre d'importance :
1. N'ecris que ce que les sources fournies disent. Aucun chiffre, aucune
   date, aucun nom qui ne vienne pas d'elles. Si une information te
   semble manquer, ne la comble pas : dis que la semaine n'a rien apporte
   sur ce point.
2. Cite tes sources. Chaque affirmation notable doit venir d'un des
   articles listes.
3. Ecris en anglais, ton direct, phrases courtes. Pas de superlatifs, pas
   de « revolutionnaire », pas d'exclamations, pas de conseil
   d'investissement.
4. Structure : trois a cinq paragraphes. Le premier dit ce qui compte
   cette semaine. Les suivants developpent.

Reponds UNIQUEMENT par un objet JSON, sans texte autour :
{
  "title": "titre de 8 a 90 caracteres",
  "summary": "une phrase de 20 a 300 caracteres",
  "body": "le texte, paragraphes separes par deux retours a la ligne",
  "category": "crypto" | "nft" | "memecoin",
  "sources": [{ "title": "...", "url": "...", "publisher": "..." }]
}`;

/**
 * Demande la synthese. Renvoie `null` plutot que de lever : l'appelant
 * est un travail programme qui doit journaliser son echec et s'arreter
 * proprement, pas remonter une pile d'appels a personne.
 */
export async function rediger(
  articles: Article[],
  categorie: "crypto" | "nft" | "memecoin",
): Promise<Redaction | null> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle || articles.length === 0) return null;

  const materiau = articles
    .slice(0, 40)
    .map((a, i) => `${i + 1}. [${a.publisher}] ${a.title}\n   ${a.summary}\n   ${a.url}`)
    .join("\n\n");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cle,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: MODELE,
        max_tokens: 2000,
        system: CONSIGNE,
        messages: [
          {
            role: "user",
            content: `Categorie demandee : ${categorie}.\n\nArticles de la semaine :\n\n${materiau}`,
          },
        ],
      }),
    });

    if (!r.ok) return null;
    const j = (await r.json()) as { content?: { type: string; text?: string }[] };
    const texte = j.content?.find((c) => c.type === "text")?.text ?? "";

    // Le modele repond parfois en entourant le JSON d'un bloc de code.
    const brut = texte.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const d = JSON.parse(brut) as Redaction;

    // On verifie ce qui vient d'un modele avant de l'ecrire en base :
    // les contraintes du schema rejetteraient l'insertion, mais l'erreur
    // arriverait trop tard pour etre lisible.
    if (
      typeof d.title !== "string" ||
      d.title.length < 8 ||
      d.title.length > 200 ||
      typeof d.summary !== "string" ||
      d.summary.length < 20 ||
      d.summary.length > 400 ||
      typeof d.body !== "string" ||
      d.body.length < 200 ||
      !Array.isArray(d.sources) ||
      d.sources.length === 0
    ) {
      return null;
    }

    // Une source doit pointer vers un des articles collectes. Sans cette
    // verification, une URL inventee passerait pour une reference.
    const connues = new Set(articles.map((a) => a.url));
    d.sources = d.sources.filter((s) => typeof s?.url === "string" && connues.has(s.url));
    if (d.sources.length === 0) return null;

    d.category = (["crypto", "nft", "memecoin"] as const).includes(d.category)
      ? d.category
      : categorie;

    return d;
  } catch {
    return null;
  }
}
