/**
 * Une redirection ne doit pas tuer la session.
 *
 * CE QUE CE TEST DEFEND
 * Le bug signale deux fois : on se connecte, l'application confirme que
 * le wallet detient bien des pieces, puis elle redemande aussitot la
 * connexion.
 *
 * La cause etait dans le middleware. `getUser()` fait tourner le jeton
 * quand il approche de son expiration, et Supabase ecrit alors les
 * nouveaux cookies sur la reponse en cours. Toute redirection rendue
 * ensuite par un `NextResponse.redirect` neuf les jetait : le navigateur
 * gardait un jeton de rafraichissement deja invalide, et la session
 * mourait.
 *
 * Le piege est qu'il ne se declenche QUE quand la redirection tombe
 * pendant un rafraichissement. Ca marche la plupart du temps, ce qui
 * rend le defaut impossible a trouver en cliquant.
 *
 * Lancement : npm run net:session
 */

import { NextResponse } from "next/server";
import { redirigerAvecCookies } from "../../src/lib/security/redirect";

let echecs = 0;
function verifier(nom: string, condition: boolean) {
  console.log(`  ${condition ? "ok   " : "ECHEC"}  ${nom}`);
  if (!condition) echecs++;
}

console.log("\nLa session survit a une redirection\n");

const CSP = "default-src 'self'";

/* Une reponse sur laquelle Supabase vient d'ecrire des cookies frais. */
const source = NextResponse.next();
source.cookies.set("sb-access-token", "jeton-neuf", { path: "/", httpOnly: true });
source.cookies.set("sb-refresh-token", "rafraichissement-neuf", { path: "/", httpOnly: true });

const vers = new URL("https://www.hoodlrz.com/access?gate=holder");
const redirection = redirigerAvecCookies(vers, source, CSP);

verifier("c'est bien une redirection", redirection.status >= 300 && redirection.status < 400);
verifier(
  "elle pointe vers la destination demandee",
  redirection.headers.get("location") === vers.toString(),
);

const portes = redirection.cookies.getAll();
verifier("les deux cookies rafraichis sont reportes", portes.length === 2);
verifier(
  "le jeton d'acces est le neuf, pas l'ancien",
  redirection.cookies.get("sb-access-token")?.value === "jeton-neuf",
);
verifier(
  "le jeton de rafraichissement aussi",
  redirection.cookies.get("sb-refresh-token")?.value === "rafraichissement-neuf",
);
verifier(
  "les attributs de securite survivent",
  portes.every((c) => c.httpOnly === true && c.path === "/"),
);
verifier(
  "la politique de contenu suit la redirection",
  redirection.headers.get("content-security-policy") === CSP,
);

/* Et le contre-exemple, celui qui cassait : une redirection nue. */
const nue = NextResponse.redirect(vers);
verifier(
  "une redirection nue n'emporte rien — c'etait le bug",
  nue.cookies.getAll().length === 0,
);

console.log(
  echecs === 0
    ? "\nTout passe. Une redirection du middleware n'efface plus la session.\n"
    : `\n${echecs} verification(s) en echec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
