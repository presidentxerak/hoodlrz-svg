import { NextResponse } from "next/server";

/**
 * Rediriger sans perdre la session.
 *
 * LE PIEGE, ET POURQUOI CETTE FONCTION EXISTE
 * Dans un middleware, `supabase.auth.getUser()` fait tourner le jeton
 * quand il approche de son expiration : Supabase ecrit alors les
 * nouveaux cookies sur la reponse qu'on lui a donnee. Si on rend ensuite
 * un `NextResponse.redirect` tout neuf, ces cookies sont perdus. Le
 * navigateur garde l'ancien jeton de rafraichissement, qui vient d'etre
 * invalide cote serveur, et la session meurt.
 *
 * Le symptome est trompeur : on se connecte, on passe la porte, et
 * l'application redemande aussitot la connexion. Et comme cela ne se
 * produit QUE lorsque la redirection tombe pendant un rafraichissement,
 * ca marche la plupart du temps - jusqu'a ce que ca ne marche plus.
 *
 * Toute redirection d'un middleware qui a touche a l'authentification
 * doit donc passer par ici.
 */
export function redirigerAvecCookies(
  vers: URL,
  /** La reponse sur laquelle Supabase a pu ecrire des cookies. */
  source: NextResponse,
  /** La politique de contenu, qui doit suivre elle aussi. */
  csp?: string,
): NextResponse {
  const r = NextResponse.redirect(vers);
  source.cookies.getAll().forEach((c) => r.cookies.set(c));
  if (csp) r.headers.set("content-security-policy", csp);
  return r;
}
