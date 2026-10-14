/**
 * La collecte des sources.
 *
 * Des flux RSS publics, lus directement. Pas de bibliotheque de parsing :
 * un flux RSS est un format simple et stable, et ajouter une dependance
 * qui lit du XML arbitraire dans un travail automatise ajoute une surface
 * d'attaque pour un gain nul.
 *
 * CE QUI EST EXTRAIT, ET CE QUI NE L'EST PAS
 * Titre, lien, date, et le resume que le flux publie lui-meme. Jamais le
 * corps de l'article : il n'est pas dans le flux, et aller le chercher
 * sur le site reviendrait a aspirer un contenu qu'on n'a pas le droit de
 * republier. Un resume de flux est publie POUR etre repris.
 */

export interface Source {
  publisher: string;
  url: string;
}

export interface Article {
  publisher: string;
  title: string;
  url: string;
  summary: string;
  date: string;
}

export const FLUX: Source[] = [
  { publisher: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { publisher: "Decrypt", url: "https://decrypt.co/feed" },
  { publisher: "Cointelegraph", url: "https://cointelegraph.com/rss" },
];

/** Enleve les balises et rend les entites les plus courantes. Un resume
 *  de flux contient souvent du HTML ; le laisser passer tel quel
 *  l'injecterait dans l'invite donnee au modele. */
function texteNu(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function champ(bloc: string, nom: string): string {
  const m = bloc.match(new RegExp(`<${nom}[^>]*>([\\s\\S]*?)</${nom}>`, "i"));
  return m ? texteNu(m[1]) : "";
}

/**
 * Lit un flux. Ne leve jamais : un editeur en panne ne doit pas faire
 * echouer la collecte entiere, il doit juste manquer a l'appel.
 */
async function lireFlux(source: Source, depuis: number): Promise<Article[]> {
  try {
    const r = await fetch(source.url, {
      headers: { "user-agent": "HoodlrzNewsBot/1.0 (+https://www.hoodlrz.com)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return [];
    const xml = await r.text();

    const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    const sortie: Article[] = [];

    for (const bloc of items.slice(0, 25)) {
      const titre = champ(bloc, "title");
      const lien = champ(bloc, "link");
      const date = champ(bloc, "pubDate");
      if (!titre || !lien) continue;

      const quand = Date.parse(date);
      if (Number.isFinite(quand) && quand < depuis) continue;

      sortie.push({
        publisher: source.publisher,
        title: titre.slice(0, 300),
        url: lien,
        summary: (champ(bloc, "description") || champ(bloc, "content:encoded")).slice(0, 800),
        date: Number.isFinite(quand) ? new Date(quand).toISOString() : new Date().toISOString(),
      });
    }
    return sortie;
  } catch {
    return [];
  }
}

/** Tout ce qui est paru depuis `jours` jours, tous flux confondus. */
export async function collecter(jours = 7): Promise<Article[]> {
  const depuis = Date.now() - jours * 24 * 60 * 60 * 1000;
  const lots = await Promise.all(FLUX.map((f) => lireFlux(f, depuis)));
  return lots
    .flat()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);
}

/** La semaine ISO, « 2026-W42 ». Sert de cle d'unicite : deux
 *  executions la meme semaine ne publient pas deux fois. */
export function semaineISO(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Le jeudi de la semaine determine l'annee ISO : une semaine a cheval
  // sur deux annees appartient a celle qui contient son jeudi.
  const jour = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - jour);
  const debut = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t.getTime() - debut.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(n).padStart(2, "0")}`;
}
