/**
 * Verifie que les cours arrivent vraiment.
 *
 * POURQUOI CE SCRIPT
 * Le conteneur ou ce code a ete ecrit n'a pas le droit de joindre les
 * API de marche : impossible d'y verifier que la source repond, que le
 * format est celui qu'on attend, et que les prix sont plausibles. Ce
 * script fait cette verification la ou le reseau est ouvert.
 *
 * Il n'interroge pas le site : il appelle la source directement, avec le
 * meme code que la route. Un echec dit donc si le probleme vient de la
 * source ou de notre cote.
 *
 * Usage :
 *   npm run market:check
 */

const SUIVIS = [
  { paire: "BTC-USD", nom: "Bitcoin" },
  { paire: "ETH-USD", nom: "Ethereum" },
  { paire: "SOL-USD", nom: "Solana" },
  { paire: "DOGE-USD", nom: "Dogecoin" },
];

const GRANULARITE = 3_600;
const FENETRE = 7 * 24 * 3_600;

console.log("\nCours — source Coinbase Exchange\n");

let echecs = 0;

for (const s of SUIVIS) {
  const fin = new Date();
  const debut = new Date(fin.getTime() - FENETRE * 1000);
  const u = new URL(`https://api.exchange.coinbase.com/products/${s.paire}/candles`);
  u.searchParams.set("granularity", String(GRANULARITE));
  u.searchParams.set("start", debut.toISOString());
  u.searchParams.set("end", fin.toISOString());

  process.stdout.write(`  ${s.nom.padEnd(10)} `);

  try {
    const r = await fetch(u, {
      headers: {
        "user-agent": "hoodlrz/1.0 (+https://www.hoodlrz.com)",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!r.ok) {
      console.log(`ECHEC  HTTP ${r.status}`);
      echecs++;
      continue;
    }

    const brut = await r.json();
    if (!Array.isArray(brut) || brut.length === 0) {
      console.log("ECHEC  reponse vide");
      echecs++;
      continue;
    }

    // [temps, bas, haut, ouverture, cloture, volume], du plus recent au
    // plus ancien.
    const bougies = brut
      .filter((l) => Array.isArray(l) && l.length >= 5)
      .map((l) => ({ t: l[0], l: l[1], h: l[2], o: l[3], c: l[4] }))
      .sort((a, b) => a.t - b.t);

    const premier = bougies[0];
    const dernier = bougies[bougies.length - 1];
    const variation = ((dernier.c - premier.o) / premier.o) * 100;

    // Une bougie est coherente si son bas est sous son haut et si
    // l'ouverture et la cloture tiennent entre les deux. Une source qui
    // renverrait les colonnes dans un autre ordre echouerait ici plutot
    // que de produire un graphique faux.
    const incoherentes = bougies.filter(
      (b) => !(b.l <= b.h && b.o >= b.l && b.o <= b.h && b.c >= b.l && b.c <= b.h),
    ).length;

    const age = Math.round((Date.now() / 1000 - dernier.t) / 60);

    console.log(
      `ok  ${String(bougies.length).padStart(3)} bougies  ` +
        `dernier ${dernier.c.toLocaleString("fr")} $  ` +
        `${variation >= 0 ? "+" : ""}${variation.toFixed(2)} %  ` +
        `il y a ${age} min` +
        (incoherentes ? `  ATTENTION ${incoherentes} bougies incoherentes` : ""),
    );

    if (incoherentes) echecs++;
    // Au-dela de deux heures, la source renvoie des donnees perimees :
    // le graphique s'afficherait sans que rien ne le signale.
    if (age > 120) {
      console.log(`     ATTENTION la derniere bougie a ${age} minutes`);
      echecs++;
    }
  } catch (e) {
    console.log(`ECHEC  ${String(e.message ?? e).slice(0, 80)}`);
    echecs++;
  }
}

console.log(
  echecs === 0
    ? "\nLes quatre marches repondent, les donnees sont coherentes et fraiches.\n"
    : `\n${echecs} probleme(s). Le Market affichera « prices unavailable » plutot qu'un graphique invente.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
