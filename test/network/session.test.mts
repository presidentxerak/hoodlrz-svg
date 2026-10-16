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
import {
  attacherCookies,
  domaineCookie,
  sessionOuverte,
  type CookieAPoser,
} from "../../src/lib/security/session";

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

/* ── Ouvrir une session depuis un gestionnaire de route ──────────────
 * Le bug : les cookies etaient poses par cookies().set(), entoure d'un
 * try/catch vide. Quand cette ecriture echouait, la route repondait
 * « success » sans qu'aucun cookie ne parte. Le navigateur restait
 * anonyme, et /api/auth/holder rendait 401 en boucle. */
{
  const aPoser: CookieAPoser[] = [
    { name: "sb-access-token", value: "jeton", options: { path: "/", httpOnly: true } },
    { name: "sb-refresh-token", value: "refresh", options: { path: "/", httpOnly: true } },
  ];

  verifier("deux cookies produits valent une session ouverte", sessionOuverte(aPoser) === true);
  verifier("aucun cookie ne vaut PAS une session", sessionOuverte([]) === false);

  const r = attacherCookies(NextResponse.json({ success: true }), aPoser);
  verifier("la reponse porte les deux cookies", r.cookies.getAll().length === 2);
  verifier(
    "le jeton d'acces y est, avec sa valeur",
    r.cookies.get("sb-access-token")?.value === "jeton",
  );
  verifier(
    "les attributs de securite sont conserves",
    r.cookies.getAll().every((c) => c.httpOnly === true && c.path === "/"),
  );
}

/* ── Le cookie doit valoir pour l'apex ET pour www ───────────────────
 * Le site repondait sur les deux hotes. Un cookie sans domaine est lie
 * a l'hote exact : celui de l'apex n'est pas envoye a www. Une page
 * ouverte sur l'un appelait une route servie par l'autre, et le serveur
 * repondait 401 pendant que l'interface affichait un membre connecte. */
{
  verifier("www.hoodlrz.com donne .hoodlrz.com", domaineCookie("www.hoodlrz.com") === ".hoodlrz.com");
  verifier("le port est ignore", domaineCookie("www.hoodlrz.com:443") === ".hoodlrz.com");
  verifier("hoodlrz.com reste sans domaine", domaineCookie("hoodlrz.com") === undefined);
  verifier("localhost reste sans domaine", domaineCookie("localhost:3000") === undefined);
  // vercel.app est un suffixe public : un cookie pose dessus serait
  // refuse, et sinon partage avec tous les autres projets.
  verifier(
    "un apercu vercel.app reste sans domaine",
    domaineCookie("hoodlrz-j1mj-abc.vercel.app") === undefined,
  );
  verifier("une adresse IP reste sans domaine", domaineCookie("127.0.0.1:3000") === undefined);

  const r = attacherCookies(
    NextResponse.json({ ok: true }),
    [{ name: "sb-access-token", value: "x", options: { path: "/" } }],
    "www.hoodlrz.com",
  );
  verifier(
    "le cookie pose porte bien le domaine",
    r.cookies.get("sb-access-token")?.domain === ".hoodlrz.com",
  );
}

console.log(
  echecs === 0
    ? "\nTout passe. La session s'ouvre, porte le bon domaine, et survit aux redirections.\n"
    : `\n${echecs} verification(s) en echec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
