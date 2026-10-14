"use client";

/**
 * Sceller une cle de groupe pour un destinataire, et l'ouvrir.
 *
 * COMMENT UN GROUPE EST CHIFFRE
 * Chaque conversation possede une cle symetrique tiree au sort. Les
 * messages sont chiffres avec elle, une fois, quel que soit le nombre de
 * membres - chiffrer chaque message pour chaque membre couterait N fois
 * la taille du message et rendrait un groupe de cinquante inutilisable.
 *
 * C'est donc la CLE qui est scellee pour chacun, une fois a l'ajout. Un
 * membre retire perd l'acces aux messages suivants des lors que la cle
 * est renouvelee ; il garde ceux qu'il a deja pu lire, ce qui est vrai de
 * toute messagerie et qu'aucune cryptographie ne peut defaire.
 *
 * LE SCEAU
 * ECDH X25519 entre une paire ephemere et la cle publique du
 * destinataire, HKDF-SHA256 pour en tirer une cle AES, puis AES-GCM. La
 * paire ephemere est jetee aussitot : sans elle, le secret partage n'est
 * recalculable que par le destinataire.
 *
 * AES-GCM plutot qu'un chiffrement sans authentification : il refuse un
 * message modifie au lieu de rendre des octets faux, ce qui ferme la
 * famille d'attaques ou l'on retourne des bits pour changer un texte
 * qu'on ne sait pas lire.
 */

import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";

const INFO = new TextEncoder().encode("hoodlrz-group-key-v1");

/** Un conteneur scelle, tel qu'il voyage et tel qu'il est stocke. */
export interface Scelle {
  /** Cle publique ephemere, hex. */
  e: string;
  /** Vecteur d'initialisation, hex. */
  iv: string;
  /** Chiffre + etiquette d'authentification, hex. */
  c: string;
}

function hex(o: Uint8Array): string {
  let s = "";
  for (let i = 0; i < o.length; i++) s += o[i].toString(16).padStart(2, "0");
  return s;
}

function bin(h: string): Uint8Array {
  const o = new Uint8Array(h.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16);
  return o;
}

async function cleAes(partage: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  // HKDF transforme le point ECDH en cle AES. Utiliser le point brut
  // serait une faute classique : ses octets ne sont pas uniformes.
  const brut = hkdf(sha256, partage, undefined, INFO, 32);
  return crypto.subtle.importKey("raw", brut as unknown as BufferSource, "AES-GCM", false, usage);
}

/** Scelle `secret` pour le detenteur de `publiqueDestinataire`. */
export async function sceller(
  secret: Uint8Array,
  publiqueDestinataire: Uint8Array,
): Promise<Scelle> {
  const ephemerePrivee = randomBytes(32);
  const ephemerePublique = x25519.getPublicKey(ephemerePrivee);
  const partage = x25519.getSharedSecret(ephemerePrivee, publiqueDestinataire);

  const cle = await cleAes(partage, ["encrypt"]);
  // 96 bits, la taille pour laquelle AES-GCM est specifie. Tire au sort a
  // chaque sceau : reutiliser un IV avec la meme cle casse GCM
  // completement, ce n'est pas une degradation progressive.
  const iv = randomBytes(12);
  const chiffre = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    cle,
    secret as unknown as BufferSource,
  );

  ephemerePrivee.fill(0);
  return { e: hex(ephemerePublique), iv: hex(iv), c: hex(new Uint8Array(chiffre)) };
}

/** Ouvre un sceau avec sa cle privee. Leve si le contenu a ete modifie. */
export async function ouvrir(scelle: Scelle, privee: Uint8Array): Promise<Uint8Array> {
  const partage = x25519.getSharedSecret(privee, bin(scelle.e));
  const cle = await cleAes(partage, ["decrypt"]);
  const clair = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bin(scelle.iv) as unknown as BufferSource },
    cle,
    bin(scelle.c) as unknown as BufferSource,
  );
  return new Uint8Array(clair);
}

/** Une cle de groupe neuve. */
export function nouvelleCleDeGroupe(): Uint8Array {
  return randomBytes(32);
}
