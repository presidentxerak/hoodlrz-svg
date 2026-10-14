/**
 * Configuration Next.js.
 *
 * L'essentiel de ce fichier est une politique de securite. Un reseau
 * prive dont les membres parlent d'argent est une cible : les en-tetes
 * poses ici sont la premiere barriere, celle qui s'applique meme aux
 * pages qu'on oubliera de proteger individuellement.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // L'en-tete « X-Powered-By: Next.js » annonce la pile a qui scanne.
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    // Les hotes sont nommes plutot que laisses a « ** » : un joker
    // transforme l'optimiseur d'images en relais ouvert, capable de
    // telecharger n'importe quelle URL au nom du serveur.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "www.hoodlrz.com" },
      { protocol: "https", hostname: "hoodlrz.com" },
      { protocol: "https", hostname: "i.seadn.io" },
      { protocol: "https", hostname: "openseauserdata.com" },
      { protocol: "https", hostname: "nft-cdn.alchemy.com" },
    ],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Pas d'affichage dans une iframe tierce : sans ca, un site
          // pirate superpose la page a la sienne et fait cliquer le
          // membre sur un bouton qu'il ne voit pas.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // L'adresse d'une page privee ne doit pas partir dans le
          // referrer vers un site externe.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "interest-cohort=()",
            ].join(", "),
          },
          // HSTS : une fois la page vue en HTTPS, le navigateur refuse
          // le HTTP pendant deux ans, ce qui ferme l'interception au
          // premier saut sur un reseau Wi-Fi ouvert.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Isole l'onglet : une fenetre ouverte par un tiers ne garde
          // pas de poignee sur celle-ci.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // Rien de ce que renvoie l'API ne doit etre garde par un cache
        // partage : ces reponses dependent de qui demande.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
