"use client";

/**
 * La paire de cles de chiffrement d'un membre.
 *
 * LE PROBLEME A RESOUDRE
 * Un chiffrement de bout en bout suppose une cle privee qui ne quitte
 * jamais l'appareil. Mais un membre change de telephone, vide son cache,
 * ou se connecte depuis un deuxieme navigateur. S'il perd sa cle, il perd
 * toutes ses conversations - et une messagerie qui oublie tout a chaque
 * appareil n'est pas utilisable.
 *
 * LA SOLUTION RETENUE
 * La cle privee est DERIVEE d'une signature de wallet. On fait signer une
 * phrase fixe, on hache la signature, et le hachage devient la cle X25519.
 * Le wallet reproduit la meme signature partout, donc la meme cle, sur
 * tous les appareils et sans sauvegarde a transporter. Rien n'est stocke
 * sur le serveur a part la cle PUBLIQUE.
 *
 * POURQUOI C'EST SUR, ET OU EST LA LIMITE
 * Sur : le serveur ne voit jamais la signature ni la cle privee, et un
 * attaquant qui prend la base de donnees n'y trouve que du chiffre.
 *
 * Limite, dite franchement : qui obtient la cle privee du WALLET peut
 * refabriquer la cle de messagerie et relire l'historique. Il n'y a donc
 * pas de confidentialite persistante au sens de Signal - la ou une cle
 * volee aujourd'hui ne donne pas les messages d'hier. C'est le prix d'une
 * cle qu'on ne sauvegarde pas, et c'est le bon compromis ici : la
 * sauvegarde manuelle d'une cle est exactement ce que les gens perdent.
 *
 * La signature est demandee UNE fois par session et gardee en memoire
 * vive. Pas dans localStorage : un script injecte lirait le stockage,
 * alors qu'il ne peut pas lire la memoire d'un module ferme.
 */

import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

/**
 * La phrase signee.
 *
 * Elle est fixe - sinon la cle changerait a chaque signature - et elle
 * dit clairement ce qu'elle autorise. Un wallet ne doit jamais faire
 * signer un texte ambigu : le membre doit pouvoir lire ce qu'il approuve.
 */
export const PHRASE =
  "Hoodlrz — encryption key\n\n" +
  "Signing this message derives the key that encrypts your conversations.\n" +
  "It authorises no transaction and spends nothing.\n\n" +
  "Version: 1";

export interface PaireDeCles {
  privee: Uint8Array;
  publique: Uint8Array;
}

/** Vivante le temps de l'onglet, jamais ecrite sur disque. */
let enMemoire: PaireDeCles | null = null;

/** Hexadecimal sans prefixe, format d'echange avec le serveur. */
export function enHex(o: Uint8Array): string {
  let s = "";
  for (let i = 0; i < o.length; i++) s += o[i].toString(16).padStart(2, "0");
  return s;
}

export function depuisHex(h: string): Uint8Array {
  const propre = h.startsWith("0x") ? h.slice(2) : h;
  const o = new Uint8Array(propre.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(propre.substr(i * 2, 2), 16);
  return o;
}

/**
 * Derive la paire a partir d'une signature.
 *
 * Le hachage n'est pas decoratif : une signature ECDSA fait 65 octets et
 * n'est pas uniformement distribuee, alors qu'une cle X25519 demande 32
 * octets quelconques. SHA-256 fait la conversion et evite qu'une
 * structure de la signature se retrouve dans la cle.
 */
export function deriverDepuisSignature(signature: string): PaireDeCles {
  const graine = sha256(depuisHex(signature));
  const privee = graine.slice(0, 32);
  const publique = x25519.getPublicKey(privee);
  return { privee, publique };
}

/**
 * Obtient la paire, en demandant la signature si besoin.
 *
 * `signer` est fourni par l'appelant plutot qu'importe ici : ce module ne
 * doit connaitre ni le wallet, ni le fournisseur, ni la facon dont on
 * parle a l'un ou a l'autre. Il fait de la cryptographie, rien d'autre.
 */
export async function obtenirCles(
  adresse: string,
  signer: (message: string, adresse: string) => Promise<string>,
): Promise<PaireDeCles> {
  if (enMemoire) return enMemoire;
  const signature = await signer(PHRASE, adresse);
  enMemoire = deriverDepuisSignature(signature);
  return enMemoire;
}

/** Oublie la cle. Appele a la deconnexion : laisser la cle en memoire
 *  apres un « Log out » sur un ordinateur partage est exactement le genre
 *  d'oubli qui rend un chiffrement decoratif. */
export function oublier() {
  if (enMemoire) {
    enMemoire.privee.fill(0);
    enMemoire = null;
  }
}

export function clesChargees(): boolean {
  return enMemoire !== null;
}
