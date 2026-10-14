/**
 * Service worker de Hoodlrz.
 *
 * CE QU'IL NE MET PAS EN CACHE, ET POURQUOI
 * Un service worker ecrit dans un stockage qui survit a la fermeture de
 * l'onglet et n'est lie a aucune session. Mettre en cache une reponse
 * d'API, c'est deposer sur le disque le fil de discussion d'un membre, ou
 * sa liste de groupes, la ou le membre suivant du meme appareil pourra le
 * relire apres deconnexion. Rien de ce qui depend de qui regarde n'est
 * donc stocke : ni /api/, ni les pages, ni les requetes authentifiees.
 *
 * Ce qu'il met en cache est exactement ce qui est identique pour tout le
 * monde et deja public : polices, icones, images statiques, bundles. Ca
 * suffit a rendre l'application installable et rapide au deuxieme
 * lancement, sans rien promettre hors ligne qu'on ne puisse tenir.
 */

const VERSION = "hoodlrz-v1";
const STATIQUE = `${VERSION}-statique`;
const HORS_LIGNE = "/offline.html";

/** Les prefixes dont une reponse ne doit jamais toucher le disque. */
const JAMAIS = ["/api/", "/admin", "/feed", "/groups", "/market", "/profile", "/access"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(STATIQUE)
      .then((c) => c.addAll([HORS_LIGNE, "/logo-hoodlrz.svg", "/icon-192.png", "/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Une ressource immuable, servie telle quelle a tout le monde. */
function estStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:woff2?|ttf|png|jpe?g|svg|webp|avif|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Un service worker ne sert que son propre domaine : relayer un domaine
  // tiers en ferait un point de collecte de requetes sortantes.
  if (url.origin !== self.location.origin) return;
  if (JAMAIS.some((p) => url.pathname.startsWith(p))) return;

  if (estStatique(url)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copie = res.clone();
              caches.open(STATIQUE).then((c) => c.put(req, copie));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Tout le reste part sur le reseau. Hors ligne, une page de navigation
  // recoit un ecran qui le dit, plutot que l'erreur du navigateur.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(HORS_LIGNE)));
  }
});
