/**
 * Middleware : politique de contenu, puis controle d'acces.
 *
 * DEUX CHOSES, DANS CET ORDRE
 *
 * 1. Une Content-Security-Policy. Elle refuse tout script venu d'un
 *    autre domaine, tout formulaire poste ailleurs, tout plugin, et tout
 *    encadrement par un tiers. Voir `politique` pour ce qu'elle ne fait
 *    PAS, et pourquoi.
 *
 * 2. La porte. Les sections sociales demandent une session. La liste des
 *    chemins fermes n'est pas recopiee ici : elle est lue dans le modele
 *    de navigation, pour qu'un onglet ajoute a la barre laterale ne
 *    puisse pas rester ouvert par oubli.
 *
 * Ce que ce fichier ne fait PAS : verifier la detention d'une PFP. Cette
 * verification demande une lecture de chaine, trop lente pour s'executer
 * a chaque navigation ; elle est faite a la connexion et inscrite dans la
 * session. Voir src/lib/security/gate.ts.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isGated } from "@/lib/app/nav";
import { colonneManquante } from "@/lib/security/schema";
import { redirigerAvecCookies } from "@/lib/security/redirect";

/**
 * La politique.
 *
 * POURQUOI PAS DE NONCE, ALORS QUE C'EST LA MEILLEURE DEFENSE
 * Un nonce doit etre inscrit sur chaque balise script du HTML. Next ne
 * peut le faire qu'en rendant la page a la demande. Or la plupart des
 * pages de ce site sont PREGENEREES a la compilation : leur HTML est
 * ecrit une fois pour toutes, sans nonce. Le middleware y ajoutait
 * pourtant une politique exigeant un nonce different a chaque reponse.
 *
 * Resultat observe : le navigateur refusait TOUS les scripts de Next, y
 * compris son propre amorcage. Le site s'affichait et ne reagissait plus
 * a rien - pas de barre repliable, pas de connexion wallet, pas de jeu.
 * Une politique qui casse le site ne protege rien, elle met seulement
 * hors service.
 *
 * Ce qui est garde ici bloque toujours l'essentiel : aucun script venu
 * d'un autre domaine, aucun formulaire poste ailleurs, aucun plugin,
 * aucun encadrement par un tiers. Ce qui est perdu, dit franchement :
 * 'unsafe-inline' laisse passer un script injecte dans la page. La vraie
 * defense contre ca reste a sa place - on n'insere jamais de HTML venu
 * d'un membre, React echappe tout ce qu'il affiche.
 *
 * Revenir au nonce demanderait de rendre toutes les pages a la demande.
 * C'est un choix possible, mais il se paie en temps de reponse sur
 * chaque page publique, et il doit etre decide, pas subi.
 */
function politique(dev: boolean) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return [
    `default-src 'self'`,
    // En developpement, Next recompile a chaud avec eval ; en production
    // il n'en a pas besoin et on le lui refuse.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${supabase} https://*.supabase.co wss://*.supabase.co https://*.g.alchemy.com https://api.opensea.io`,
    `frame-src 'self'`,
    // Personne ne nous encadre : la version en-tete de X-Frame-Options,
    // comprise par les navigateurs recents et plus precise.
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    // Un formulaire ne peut pas poster vers un domaine tiers : c'est la
    // porte de sortie classique d'un vol d'identifiants.
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ")
    .replace(/\s{2,}/g, " ");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const dev = process.env.NODE_ENV !== "production";

  const csp = politique(dev);
  const enTetes = new Headers(request.headers);

  const suite = () => {
    const r = NextResponse.next({ request: { headers: enTetes } });
    r.headers.set("content-security-policy", csp);
    return r;
  };

  const adminRoute = pathname.startsWith("/admin");
  if (!adminRoute && !isGated(pathname)) return suite();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Sans configuration, on laisse passer : c'est le cas du developpement
  // local, ou refuser rendrait l'application impossible a demarrer.
  if (!url || !cle) return suite();

  const reponse = NextResponse.next({ request: { headers: enTetes } });
  reponse.headers.set("content-security-policy", csp);

  const supabase = createServerClient(url, cle, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aPoser) =>
        aPoser.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options)),
    },
  });

  /**
   * TOUTE REDIRECTION DOIT EMPORTER LES COOKIES RAFRAICHIS.
   *
   * `getUser()` fait tourner le jeton quand il est proche d'expirer :
   * Supabase ecrit alors les nouveaux cookies sur `reponse`. Rendre un
   * `NextResponse.redirect` tout neuf les jette. Le navigateur garde
   * l'ancien jeton de rafraichissement, qui vient d'etre invalide cote
   * serveur - et la session est morte.
   *
   * C'est ce qui produisait le symptome signale : on se connecte, on
   * passe la porte, et l'application redemande aussitot la connexion.
   * Le bug est d'autant plus trompeur qu'il ne se produit QUE quand la
   * redirection tombe pendant un rafraichissement, donc par
   * intermittence.
   */
  const rediriger = (vers: URL) => redirigerAvecCookies(vers, reponse, csp);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/access";
    vers.searchParams.set("redirect", pathname);
    return rediriger(vers);
  }

  if (adminRoute) {
    const { data: compte, error } = await supabase
      .from("accounts")
      .select("is_admin")
      .eq("auth_id", user.id)
      .single();
    if (error || !compte?.is_admin) {
      const vers = request.nextUrl.clone();
      vers.pathname = "/";
      return rediriger(vers);
    }
    return reponse;
  }

  // La porte des detenteurs. Le verdict a ete inscrit sur le compte par
  // la verification de signature, et peut etre rafraichi par
  // /api/auth/holder apres un achat ; on ne relit pas la chaine ici,
  // deux appels RPC par navigation rendraient le site inutilisable.
  const { data: compte, error } = await supabase
    .from("accounts")
    .select("is_holder")
    .eq("auth_id", user.id)
    .single();

  /**
   * Les migrations du reseau prive ne sont pas passees.
   *
   * Sans ce cas, la lecture echoue sur une colonne inconnue, le membre
   * est renvoye vers /access, qui le renvoie ici, et ainsi de suite. Il
   * voit une page qui clignote sans un mot d'explication. On l'envoie
   * vers un ecran qui dit ce qui manque.
   */
  if (colonneManquante(error)) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/access";
    vers.searchParams.set("gate", "schema");
    return rediriger(vers);
  }

  if (!compte?.is_holder) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/access";
    vers.searchParams.set("gate", "holder");
    vers.searchParams.set("redirect", pathname);
    return rediriger(vers);
  }

  return reponse;
}

export const config = {
  /**
   * Tout sauf les fichiers servis tels quels. Les exclure n'est pas une
   * optimisation de confort : poser une CSP sur une image ou une police
   * ne protege rien et coute une invocation de middleware a chaque octet
   * du site.
   */
  matcher: [
    /**
     * Tout sauf les fichiers servis tels quels, ET le jeu.
     *
     * `game/` est exclu pour une raison precise : le jeu est un fichier
     * HTML autonome qui porte onze scripts en ligne et charge three.js
     * depuis un CDN. La politique a nonce ci-dessus les refuse tous -
     * c'est son travail - et le jeu reste un ecran noir. Il recoit donc
     * sa propre politique, plus permissive et limitee a son chemin,
     * posee dans next.config.mjs.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|game/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|mp4|mov|mp3)$).*)",
  ],
};
