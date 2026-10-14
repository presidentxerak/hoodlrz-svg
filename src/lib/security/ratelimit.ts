/**
 * Limiteur de debit pour les routes d'API.
 *
 * CE QU'IL ARRETE
 * Le pillage methodique : un script qui parcourt les identifiants un par
 * un pour aspirer des profils, et le forcage d'une signature ou d'un code
 * en rejouant la meme route des milliers de fois. Un seau a jetons par
 * appelant et par route suffit a rendre les deux inexploitables, parce
 * que l'interet d'un aspirateur tient a son debit.
 *
 * SA LIMITE, DITE FRANCHEMENT
 * Le compteur vit dans la memoire du processus. Sur un hebergement sans
 * etat, chaque instance a le sien : dix instances, dix fois la limite
 * annoncee. C'est une gene serieuse pour un attaquant, pas une garantie.
 * Le jour ou il faudra une vraie garantie, remplacer `memoire` par un
 * magasin partage - Redis, ou une table Postgres avec un compteur
 * atomique - sans toucher aux appelants : la signature de `limiter` est
 * faite pour ca.
 *
 * Usage dans une route :
 *
 *   const refus = limiter(req, { nom: "wallet-nonce", par: 10, fenetre: 60 });
 *   if (refus) return refus;
 */

import { NextResponse, type NextRequest } from "next/server";

interface Seau {
  jetons: number;
  dernier: number;
}

const memoire = new Map<string, Seau>();

/** Purge paresseuse : sans elle la table grandit avec chaque adresse IP
 *  croisee et finit par tenir toute la memoire du processus. */
let dernierMenage = 0;
function menage(maintenant: number) {
  if (maintenant - dernierMenage < 60_000) return;
  dernierMenage = maintenant;
  // `forEach` plutot qu'une boucle sur les entrees : la cible de
  // compilation du projet est ES5, qui ne sait pas parcourir une Map.
  const perimes: string[] = [];
  memoire.forEach((seau, cle) => {
    if (maintenant - seau.dernier > 600_000) perimes.push(cle);
  });
  perimes.forEach((cle) => memoire.delete(cle));
}

/**
 * Qui appelle.
 *
 * Derriere un proxy, l'adresse reelle est dans X-Forwarded-For, dont on
 * prend le PREMIER element : les suivants sont ajoutes par les relais et
 * un client peut forger le debut de l'en-tete. Sur Vercel,
 * `x-real-ip` est pose par la plateforme et ne peut pas etre forge ; il
 * passe donc en premier choix.
 */
function appelant(req: NextRequest): string {
  const reel = req.headers.get("x-real-ip");
  if (reel) return reel;
  const suivi = req.headers.get("x-forwarded-for");
  if (suivi) return suivi.split(",")[0]!.trim();
  return "inconnu";
}

export interface Regle {
  /** Nom de la route, pour que deux routes ne partagent pas un seau. */
  nom: string;
  /** Nombre d'appels autorises par fenetre. */
  par: number;
  /** Duree de la fenetre, en secondes. */
  fenetre: number;
  /** Cle d'identite plus precise que l'IP, quand on la connait : un
   *  wallet, un identifiant de compte. Plusieurs membres derriere la meme
   *  connexion ne se penalisent pas entre eux. */
  identite?: string;
}

/**
 * Renvoie une reponse 429 si l'appelant a depasse, `null` sinon.
 *
 * Le seau se remplit de maniere continue plutot que par paliers : une
 * fenetre fixe laisse passer deux fois la limite a cheval sur sa
 * frontiere, ce qui est exactement le moment que choisit un script.
 */
export function limiter(req: NextRequest, regle: Regle): NextResponse | null {
  const maintenant = Date.now();
  menage(maintenant);

  const cle = `${regle.nom}:${regle.identite ?? appelant(req)}`;
  const debit = regle.par / (regle.fenetre * 1000);

  const seau = memoire.get(cle) ?? { jetons: regle.par, dernier: maintenant };
  seau.jetons = Math.min(regle.par, seau.jetons + (maintenant - seau.dernier) * debit);
  seau.dernier = maintenant;

  if (seau.jetons < 1) {
    memoire.set(cle, seau);
    const attendre = Math.ceil((1 - seau.jetons) / debit / 1000);
    return NextResponse.json(
      { error: "Trop de requetes. Reessayez dans un instant." },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.max(1, attendre)),
          "x-ratelimit-limit": String(regle.par),
          "x-ratelimit-remaining": "0",
        },
      },
    );
  }

  seau.jetons -= 1;
  memoire.set(cle, seau);
  return null;
}
