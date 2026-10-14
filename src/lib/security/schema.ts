/**
 * Le code et la base ne sont pas toujours a jour en meme temps.
 *
 * LE PROBLEME, VU EN VRAI
 * Les migrations 008 a 012 ajoutent les colonnes du reseau prive :
 * wallet_address, is_holder, holdings, hdlrz, avatar. Un deploiement qui
 * part AVANT que ces migrations soient passees - ce qui est le cas
 * normal, le code se deploie tout seul et les migrations se lancent a la
 * main - casse la connexion par wallet en entier : la creation de compte
 * echoue sur une colonne inconnue, la lecture du statut aussi, et
 * l'utilisateur voit une page qui ne repond pas.
 *
 * C'est exactement ce qui s'est produit. D'ou ce module.
 *
 * CE QU'IL FAIT
 * Il distingue « la base n'a pas les colonnes » de « la requete est
 * fausse ». Dans le premier cas, l'appelant continue en mode degrade :
 * la connexion marche, le statut de detenteur est simplement inconnu, et
 * la reponse porte un drapeau que l'interface affiche. Dans le second,
 * l'erreur remonte normalement.
 *
 * Le verdict est garde en memoire du processus : une fois les migrations
 * passees, le premier succes le remet a zero.
 */

/** Codes rendus quand une colonne manque. 42703 vient de Postgres,
 *  PGRST204 de PostgREST qui ne trouve pas la colonne dans son cache de
 *  schema - les deux veulent dire la meme chose ici. */
const CODES = ["42703", "PGRST204"];

export interface ErreurBase {
  code?: string;
  message?: string;
}

export function colonneManquante(e: ErreurBase | null | undefined): boolean {
  if (!e) return false;
  if (e.code && CODES.includes(e.code)) return true;
  return /column .* does not exist|could not find the .* column/i.test(e.message ?? "");
}

/** Vrai tant qu'une colonne du reseau prive a manque sur ce processus. */
let degrade = false;

export function signalerSchemaIncomplet() {
  if (!degrade) {
    degrade = true;
    console.error(
      "[schema] Les colonnes du reseau prive manquent. " +
        "Lancer : npm run db:migrate -- --baseline 007 && npm run db:migrate",
    );
  }
}

export function signalerSchemaComplet() {
  degrade = false;
}

export function schemaIncomplet(): boolean {
  return degrade;
}
