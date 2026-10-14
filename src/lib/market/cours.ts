/**
 * Les cours, lus chez Coinbase Exchange.
 *
 * POURQUOI CETTE SOURCE
 * Son API publique ne demande aucune cle, publie des chandeliers prets a
 * tracer, et ne limite pas le debit au point de gener un site qui met en
 * cache. Les alternatives demandent soit une cle (CoinGecko), soit sont
 * geobloquees selon le pays de l'hebergeur (Binance aux Etats-Unis).
 *
 * POURQUOI CE MODULE EST COTE SERVEUR
 * Deux raisons, et les deux comptent. La politique de contenu du site
 * n'autorise les appels sortants du navigateur que vers nos propres
 * domaines : un appel direct depuis la page serait bloque. Et une
 * reponse mise en cache ici sert tous les visiteurs, au lieu d'un appel
 * par onglet ouvert.
 *
 * AUCUNE DONNEE N'EST SIMULEE. Si la source ne repond pas, la fonction
 * rend `null` et l'interface dit que le cours est indisponible. Un
 * graphique invente est pire que pas de graphique : il se lit comme une
 * information.
 */

export interface Chandelier {
  /** Secondes UNIX, debut de la bougie. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface Cours {
  paire: string;
  nom: string;
  chandeliers: Chandelier[];
  dernier: number;
  /** Variation sur la fenetre, en pourcentage. */
  variation: number;
}

/** Les marches suivis. Le nom est celui qu'on affiche, la paire celle
 *  que connait la source. */
export const SUIVIS = [
  { paire: "BTC-USD", nom: "Bitcoin", symbole: "BTC" },
  { paire: "ETH-USD", nom: "Ethereum", symbole: "ETH" },
  { paire: "SOL-USD", nom: "Solana", symbole: "SOL" },
  { paire: "DOGE-USD", nom: "Dogecoin", symbole: "DOGE" },
] as const;

/** Les fenetres proposees, et la granularite qui va avec. Coinbase
 *  n'accepte que ces granularites-la, et au plus 300 bougies par appel :
 *  chaque couple est choisi pour rester sous cette limite. */
export const FENETRES = {
  "24h": { secondes: 86_400, granularite: 900 }, //  96 bougies de 15 min
  "7j": { secondes: 604_800, granularite: 3_600 }, // 168 bougies d'une heure
  "30j": { secondes: 2_592_000, granularite: 21_600 }, // 120 bougies de 6 h
} as const;

export type Fenetre = keyof typeof FENETRES;

/**
 * Lit les chandeliers d'une paire.
 *
 * Rend `null` plutot que de lever : l'appelant est une route qui doit
 * repondre quelque chose, et un marche muet ne doit pas faire tomber les
 * trois autres.
 */
export async function lireCours(
  paire: string,
  nom: string,
  fenetre: Fenetre = "7j",
): Promise<Cours | null> {
  const f = FENETRES[fenetre];
  const fin = new Date();
  const debut = new Date(fin.getTime() - f.secondes * 1000);

  const u = new URL(`https://api.exchange.coinbase.com/products/${paire}/candles`);
  u.searchParams.set("granularity", String(f.granularite));
  u.searchParams.set("start", debut.toISOString());
  u.searchParams.set("end", fin.toISOString());

  try {
    const r = await fetch(u, {
      // La source refuse les requetes sans agent identifiable.
      headers: { "user-agent": "hoodlrz/1.0 (+https://www.hoodlrz.com)", accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
      // Le cache de Next evite de rappeler la source a chaque visiteur.
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;

    const brut = (await r.json()) as unknown;
    if (!Array.isArray(brut) || brut.length === 0) return null;

    // La source rend [temps, bas, haut, ouverture, cloture, volume], du
    // plus recent au plus ancien. On remet dans l'ordre du temps : un
    // graphique se lit de gauche a droite.
    const chandeliers: Chandelier[] = brut
      .filter((l): l is number[] => Array.isArray(l) && l.length >= 5)
      .map((l) => ({ t: l[0], l: l[1], h: l[2], o: l[3], c: l[4] }))
      .filter((c) => [c.t, c.o, c.h, c.l, c.c].every((v) => Number.isFinite(v)))
      .sort((a, b) => a.t - b.t);

    if (chandeliers.length < 2) return null;

    const premier = chandeliers[0].o;
    const dernier = chandeliers[chandeliers.length - 1].c;

    return {
      paire,
      nom,
      chandeliers,
      dernier,
      variation: premier > 0 ? ((dernier - premier) / premier) * 100 : 0,
    };
  } catch {
    return null;
  }
}

/** Tous les marches suivis, en parallele. Un marche muet manque a
 *  l'appel, les autres passent. */
export async function lireTous(fenetre: Fenetre = "7j"): Promise<Cours[]> {
  const lots = await Promise.all(SUIVIS.map((s) => lireCours(s.paire, s.nom, fenetre)));
  return lots.filter((c): c is Cours => c !== null);
}
