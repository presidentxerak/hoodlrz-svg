import { NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

/** Un cookie que Supabase demande a poser. */
export interface CookieAPoser {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Ouvrir une session depuis un gestionnaire de route.
 *
 * LE PIEGE, ET LE BUG QU'IL A CAUSE
 * Le reflexe est de donner a `createServerClient` un `setAll` qui ecrit
 * via `cookies().set(...)`, entoure d'un try/catch parce que cette
 * ecriture echoue dans certains contextes. Le catch etait vide. Quand
 * l'ecriture echouait, l'erreur disparaissait, la route repondait
 * « success », et AUCUN cookie de session ne partait : le navigateur
 * restait anonyme.
 *
 * Le symptome etait incomprehensible de l'exterieur. L'application
 * annoncait « 11 pieces trouvees, vous etes dedans », puis redemandait
 * la connexion a la page suivante, et la console montrait des 401 en
 * boucle sur la route qui lit le statut. La verification avait bien eu
 * lieu et son resultat etait juste ; rien ne le gardait.
 *
 * LA REGLE : on collecte ce que Supabase veut poser, et on l'attache a
 * la REPONSE. Un gestionnaire de route peut toujours poser un cookie sur
 * sa propre reponse - c'est le seul endroit ou cela ne peut pas echouer
 * en silence.
 */
export function attacherCookies(
  reponse: NextResponse,
  aPoser: CookieAPoser[],
  /** L'hote de la requete, pour elargir le cookie au domaine. */
  hote?: string,
): NextResponse {
  const domaine = domaineCookie(hote);
  for (const c of aPoser) {
    reponse.cookies.set({
      name: c.name,
      value: c.value,
      ...(c.options ?? {}),
      ...(domaine ? { domain: domaine } : {}),
    });
  }
  return reponse;
}

/**
 * Le domaine sur lequel poser le cookie de session.
 *
 * LE DEUXIEME VISAGE DU MEME BUG. Le site repondait sur hoodlrz.com et
 * sur www.hoodlrz.com. Un cookie pose sans domaine est lie a l'hote
 * exact : celui de l'apex n'est pas envoye a www, et inversement. Une
 * page ouverte sur l'un appelait une route servie par l'autre, et le
 * serveur ne voyait aucune session - 401, alors que l'interface
 * affichait un membre connecte.
 *
 * La redirection vers l'hote canonique (next.config.mjs) supprime la
 * cause. Elargir le cookie au domaine parent eteint le probleme aussi
 * pour les sessions deja ouvertes sur le mauvais hote.
 *
 * RENVOIE `undefined` DANS DEUX CAS, ET C'EST IMPORTANT :
 *  - en local, ou « localhost » n'a pas de domaine parent ;
 *  - sur vercel.app, qui est un suffixe public : un cookie pose sur
 *    « .vercel.app » serait refuse par le navigateur, et s'il ne
 *    l'etait pas, il serait partage avec tous les autres projets.
 */
export function domaineCookie(hote?: string): string | undefined {
  if (!hote) return undefined;
  const nu = hote.split(":")[0].toLowerCase();

  if (nu === "localhost" || /^[0-9.]+$/.test(nu)) return undefined;
  if (nu.endsWith(".vercel.app") || nu === "vercel.app") return undefined;

  const morceaux = nu.split(".");
  if (morceaux.length < 3) return undefined; // deja le domaine nu
  // On ne remonte que d'un cran, au domaine enregistrable usuel :
  // www.hoodlrz.com -> .hoodlrz.com
  return `.${morceaux.slice(-2).join(".")}`;
}

/**
 * Une session sans cookie n'est pas une session.
 *
 * Supabase rend la main sans erreur meme quand il n'a produit aucun
 * cookie. Repondre « success » dans ce cas, c'est promettre une
 * connexion qui n'existe pas. L'appelant doit s'arreter la.
 */
export function sessionOuverte(aPoser: CookieAPoser[]): boolean {
  return aPoser.length > 0;
}
