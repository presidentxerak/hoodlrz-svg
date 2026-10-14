"use client";

/**
 * Trouver les wallets installes dans le navigateur.
 *
 * POURQUOI L'ANCIENNE METHODE NE MARCHAIT PAS
 * Lire `window.ethereum` au moment du rendu echoue pour deux raisons, et
 * les deux se produisent en permanence :
 *
 *  1. L'INJECTION EST TARDIVE. Une extension injecte son fournisseur
 *     quand elle a fini de se charger, ce qui arrive souvent APRES le
 *     premier rendu de React. A cet instant `window.ethereum` vaut
 *     `undefined`, on en conclut « aucun wallet », et on propose un lien
 *     de telechargement a quelqu'un qui a deja l'extension installee.
 *
 *  2. PLUSIEURS WALLETS SE DISPUTENT LA MEME VARIABLE. MetaMask, Rabby,
 *     Phantom et Coinbase ecrasent tous `window.ethereum`. Le dernier
 *     charge gagne, les autres deviennent invisibles, et l'utilisateur
 *     se voit proposer un wallet qu'il n'utilise pas.
 *
 * LA SOLUTION EST EIP-6963. Chaque extension annonce son fournisseur sur
 * un evenement, avec son nom et son icone. On ecoute, on demande, on
 * collecte : plus de course a la variable globale, plus d'ecrasement, et
 * la liste se complete toute seule au fur et a mesure des annonces.
 *
 * `window.ethereum` reste en secours pour les wallets anciens et pour les
 * navigateurs integres aux applications mobiles, qui ne l'implementent
 * pas toujours.
 */

export interface Fournisseur1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (evenement: string, rappel: (...args: unknown[]) => void) => void;
  removeListener?: (evenement: string, rappel: (...args: unknown[]) => void) => void;
}

export interface WalletDetecte {
  /** Identifiant stable fourni par l'extension (rdns), ou un repli. */
  id: string;
  nom: string;
  /** data: URI fournie par l'extension. Jamais une URL distante : la
   *  politique de contenu du site les bloquerait, et une icone qui part
   *  chercher un domaine tiers dit a ce domaine qui visite le site. */
  icone?: string;
  fournisseur: Fournisseur1193;
}

interface DetailAnnonce {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Fournisseur1193;
}

/**
 * Les wallets vus depuis le chargement de la page.
 *
 * Un tableau et un index, plutot qu'une Map : la cible de compilation du
 * projet est ES5, qui ne sait pas parcourir une Map, et la liste est
 * rendue telle quelle aux abonnes sans copie a chaque appel.
 */
const trouves: WalletDetecte[] = [];
const vus = new Set<string>();
const abonnes = new Set<(liste: WalletDetecte[]) => void>();
let ecoute = false;

function prevenir() {
  const liste = trouves.slice();
  abonnes.forEach((f) => f(liste));
}

/** Le repli : ce que `window.ethereum` expose, pour les wallets qui
 *  n'annoncent rien. Appele plusieurs fois, car l'injection peut arriver
 *  bien apres le chargement. */
function ramasserLegacy() {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    ethereum?: Fournisseur1193 & {
      providers?: Fournisseur1193[];
      isMetaMask?: boolean;
      isRabby?: boolean;
      isCoinbaseWallet?: boolean;
      isBraveWallet?: boolean;
      isRainbow?: boolean;
      isTrust?: boolean;
    };
    phantom?: { ethereum?: Fournisseur1193 };
  };

  const candidats: { p: Fournisseur1193; nom: string }[] = [];
  const eth = w.ethereum;

  if (eth) {
    // Certains wallets empilent les fournisseurs plutot que de s'ecraser.
    const liste = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth];
    for (const p of liste) {
      const d = p as unknown as Record<string, unknown>;
      const nom = d.isRabby
        ? "Rabby"
        : d.isCoinbaseWallet
          ? "Coinbase Wallet"
          : d.isBraveWallet
            ? "Brave Wallet"
            : d.isRainbow
              ? "Rainbow"
              : d.isTrust
                ? "Trust Wallet"
                : d.isMetaMask
                  ? "MetaMask"
                  : "Browser wallet";
      candidats.push({ p, nom });
    }
  }
  if (w.phantom?.ethereum) candidats.push({ p: w.phantom.ethereum, nom: "Phantom" });

  let change = false;
  for (const { p, nom } of candidats) {
    const id = `legacy:${nom}`;
    // Un wallet deja annonce en EIP-6963 ne doit pas apparaitre deux
    // fois : on compare l'objet fournisseur lui-meme, pas le nom.
    const deja = trouves.some((w) => w.fournisseur === p);
    if (deja || vus.has(id)) continue;
    vus.add(id);
    trouves.push({ id, nom, fournisseur: p });
    change = true;
  }
  if (change) prevenir();
}

function demarrer() {
  if (ecoute || typeof window === "undefined") return;
  ecoute = true;

  window.addEventListener("eip6963:announceProvider", (e) => {
    const d = (e as CustomEvent<DetailAnnonce>).detail;
    if (!d?.info || !d.provider) return;
    const id = d.info.rdns || d.info.uuid;
    if (vus.has(id)) return;
    vus.add(id);
    trouves.push({
      id,
      nom: d.info.name,
      // Les extensions envoient une data: URI ; tout le reste est ignore
      // plutot que charge depuis un domaine tiers.
      icone: d.info.icon?.startsWith("data:") ? d.info.icon : undefined,
      fournisseur: d.provider,
    });
    prevenir();
  });

  // La demande declenche les annonces de ceux qui ecoutaient deja.
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  ramasserLegacy();

  // MetaMask emet cet evenement quand son injection est terminee.
  window.addEventListener("ethereum#initialized", ramasserLegacy, { once: true });

  // Et parce qu'aucune de ces garanties n'est tenue par tout le monde, on
  // repasse quelques fois. Trois secondes couvrent largement une
  // extension lente ; au-dela, il n'y a vraiment rien.
  const t = [100, 300, 600, 1200, 2400, 3000];
  t.forEach((ms) => setTimeout(ramasserLegacy, ms));
}

/** La liste actuelle. Vide ne veut PAS dire « pas de wallet » tant que la
 *  detection n'a pas eu le temps de tourner - d'ou `attendreWallets`. */
export function walletsTrouves(): WalletDetecte[] {
  demarrer();
  return trouves.slice();
}

/** S'abonne aux decouvertes. Rend la fonction de desabonnement. */
export function surWallets(rappel: (liste: WalletDetecte[]) => void): () => void {
  demarrer();
  abonnes.add(rappel);
  rappel(trouves.slice());
  return () => abonnes.delete(rappel);
}

/**
 * Attend qu'au moins un wallet se manifeste, jusqu'a `delai`.
 *
 * C'est la fonction qui empeche l'erreur d'origine : annoncer « aucun
 * wallet detecte » doit demander d'avoir cherche, pas d'avoir regarde une
 * fois au premier rendu.
 */
export function attendreWallets(delai = 1500): Promise<WalletDetecte[]> {
  demarrer();
  const deja = trouves.slice();
  if (deja.length) return Promise.resolve(deja);

  return new Promise((resoudre) => {
    const stop = surWallets((liste) => {
      if (liste.length) {
        stop();
        clearTimeout(minuteur);
        resoudre(liste);
      }
    });
    const minuteur = setTimeout(() => {
      stop();
      resoudre(trouves.slice());
    }, delai);
  });
}

/**
 * Attend que la liste cesse de bouger.
 *
 * `attendreWallets` rend la main des le premier wallet trouve : c'est ce
 * qu'il faut pour repondre « y a-t-il un wallet ». Ce n'est PAS ce qu'il
 * faut pour repondre « lequel ».
 *
 * Les extensions ne s'annoncent pas en meme temps. MetaMask peut repondre
 * en 10 ms et Rabby en 250 : conclure « il n'y en a qu'un » a la premiere
 * reponse revient a choisir le wallet signataire a la place de
 * l'utilisateur, en silence, et selon l'ordre de chargement du jour.
 *
 * On attend donc `calme` millisecondes sans nouvelle annonce, dans la
 * limite de `max`. En pratique tout est la en moins de 400 ms, et le
 * plafond ne sert que si une extension ne repond jamais.
 */
export function attendreStabilite(calme = 400, max = 2000): Promise<WalletDetecte[]> {
  demarrer();
  return new Promise((resoudre) => {
    const depart = Date.now();
    let dernier = trouves.length;
    let derniereAnnonce = Date.now();

    // `surWallets` previent son abonne immediatement : la declaration de
    // derniereAnnonce doit donc le preceder, sinon le rappel s'execute
    // avant l'initialisation de la variable qu'il modifie.
    const stop = surWallets(() => {
      dernier = trouves.length;
      derniereAnnonce = Date.now();
    });

    const battement = setInterval(() => {
      const stable = Date.now() - derniereAnnonce >= calme && trouves.length === dernier;
      if (stable || Date.now() - depart >= max) {
        clearInterval(battement);
        stop();
        resoudre(trouves.slice());
      }
    }, 80);
  });
}
