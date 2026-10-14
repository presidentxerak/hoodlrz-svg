/**
 * Middleware : politique de contenu, puis controle d'acces.
 *
 * DEUX CHOSES, DANS CET ORDRE
 *
 * 1. Une Content-Security-Policy avec nonce. C'est la defense qui compte
 *    vraiment contre l'injection de script : meme si un message piege
 *    parvient a glisser du HTML dans une page, le navigateur refusera de
 *    l'executer faute du nonce du jour. Un nonce doit etre different a
 *    chaque reponse, donc il se fabrique ici et nulle part ailleurs.
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

/**
 * La politique.
 *
 * 'strict-dynamic' dit au navigateur de faire confiance aux scripts
 * charges PAR un script deja autorise par son nonce. Sans lui, il
 * faudrait enumerer les morceaux que Next charge a la demande, liste qui
 * change a chaque compilation.
 *
 * 'unsafe-inline' reste present pour les styles seulement : Tailwind et
 * les animations posent des attributs style, et un style injecte ne
 * s'execute pas. Pour les scripts, il est absent - c'est tout l'interet.
 */
function politique(nonce: string, dev: boolean) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return [
    `default-src 'self'`,
    // En developpement, Next recompile a chaud avec eval ; en production
    // il n'en a pas besoin et on le lui refuse.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ""}`,
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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = politique(nonce, dev);

  // Next lit le nonce dans la CSP de la REQUETE pour en marquer ses
  // propres balises script ; il faut donc la poser des deux cotes.
  const enTetes = new Headers(request.headers);
  enTetes.set("x-nonce", nonce);
  enTetes.set("content-security-policy", csp);

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/access";
    vers.searchParams.set("redirect", pathname);
    return NextResponse.redirect(vers);
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
      return NextResponse.redirect(vers);
    }
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
    "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|mp4|mov|mp3)$).*)",
  ],
};
