/**
 * Les pseudonymes du reseau.
 *
 * POURQUOI PAS L'ADRESSE
 * Afficher « 0x2606…a143 » a cote de chaque message detruit l'anonymat
 * que la porte pretend offrir. Une adresse est publique par nature : elle
 * donne le solde, l'historique complet des echanges, les autres
 * collections, et souvent un nom ENS. Un membre qui parle librement sous
 * son adresse parle en realite sous son relevé de compte.
 *
 * Le pseudonyme est donc tire au sort a la creation du compte, sans
 * aucun lien calculable avec l'adresse. Le serveur, lui, connait les
 * deux - il le faut pour verifier la detention - mais il ne publie
 * jamais la correspondance.
 *
 * POURQUOI UN SUFFIXE NUMERIQUE
 * Deux membres peuvent tomber sur le meme couple de mots. Le suffixe
 * rend la collision visible plutot que silencieuse : « ghost-brick » et
 * « ghost-brick-7731 » se distinguent a l'oeil, alors que deux
 * « ghost-brick » identiques permettraient de se faire passer l'un pour
 * l'autre.
 */

import { randomInt } from "node:crypto";

const ADJECTIFS = [
  "silent", "hooded", "midnight", "neon", "feral", "static", "velvet", "rogue",
  "frozen", "crimson", "hollow", "lucid", "savage", "quiet", "wired", "molten",
  "phantom", "brutal", "golden", "restless", "electric", "iron", "wicked", "faded",
];

const NOMS = [
  "brick", "ghost", "wolf", "siren", "ember", "vault", "comet", "raven",
  "drifter", "signal", "anchor", "nomad", "prophet", "lantern", "cipher", "monk",
  "beacon", "harbor", "falcon", "oracle", "mirage", "tempest", "relic", "jester",
];

/**
 * Un pseudonyme neuf.
 *
 * Le tirage passe par le generateur cryptographique et non par
 * Math.random : un pseudonyme devinable permet de deviner l'ordre
 * d'arrivee des membres, donc de reconstituer qui s'est inscrit quand.
 */
export function nouveauPseudonyme(): string {
  const a = ADJECTIFS[randomInt(ADJECTIFS.length)];
  const n = NOMS[randomInt(NOMS.length)];
  const suffixe = randomInt(1000, 10000);
  return `${a}-${n}-${suffixe}`;
}

/** Un pseudonyme choisi par un membre reste dans les memes bornes que
 *  ceux qu'on tire : minuscules, chiffres et tirets, 3 a 24 caracteres.
 *  Sans cette contrainte, un espace insecable ou un caractere cyrillique
 *  suffit a fabriquer un sosie visuel d'un autre membre. */
export const PSEUDO_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/;

export function pseudonymeValide(p: string): boolean {
  return PSEUDO_REGEX.test(p) && !p.includes("--");
}
