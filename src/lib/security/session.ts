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
export function attacherCookies(reponse: NextResponse, aPoser: CookieAPoser[]): NextResponse {
  for (const c of aPoser) {
    reponse.cookies.set({ name: c.name, value: c.value, ...(c.options ?? {}) });
  }
  return reponse;
}

/**
 * POURQUOI ON NE POSE PAS DE `domain` SUR LE COOKIE.
 *
 * J'ai cru un moment que le site repondait sur deux hotes, hoodlrz.com
 * et www.hoodlrz.com, parce que la barre d'adresse montrait l'un et la
 * console l'autre. C'etait faux : Chrome masque « www. » dans la barre
 * d'adresse. Il n'y a qu'un hote.
 *
 * Elargir le cookie au domaine parent aurait donc corrige un probleme
 * inexistant, et en aurait cree un vrai : l'ancien cookie, lie a l'hote,
 * et le nouveau, lie au domaine, coexistent et sont envoyes tous les
 * deux. Le serveur en choisit un, pas forcement le bon, et la session
 * devient intermittente d'une facon tres difficile a diagnostiquer.
 *
 * On laisse donc Supabase poser ses cookies comme il l'entend.
 */

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
