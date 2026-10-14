"use client";

/**
 * Chiffrer et dechiffrer un message avec la cle de son groupe.
 *
 * Le serveur ne recoit que `iv` et `c`. Il ne peut pas lire un message,
 * pas le modifier sans que le destinataire s'en apercoive, et pas
 * fabriquer un message qui passe pour authentique - l'etiquette
 * d'authentification de GCM couvre aussi les donnees associees, ou l'on
 * met l'identifiant de la conversation et celui de l'auteur.
 *
 * POURQUOI LES DONNEES ASSOCIEES COMPTENT
 * Sans elles, un serveur malveillant pourrait recopier un message chiffre
 * d'une conversation vers une autre qui partage la cle, ou l'attribuer a
 * quelqu'un d'autre. Le chiffre serait valide et le texte s'afficherait.
 * En liant le chiffre a sa conversation et a son auteur, un message
 * deplace ne se dechiffre plus du tout.
 */

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

export interface MessageChiffre {
  iv: string;
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

async function importer(cleGroupe: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    cleGroupe as unknown as BufferSource,
    "AES-GCM",
    false,
    usage,
  );
}

function lien(conversationId: string, auteur: string): Uint8Array {
  return encodeur.encode(`${conversationId}|${auteur}`);
}

export async function chiffrer(
  texte: string,
  cleGroupe: Uint8Array,
  conversationId: string,
  auteur: string,
): Promise<MessageChiffre> {
  const cle = await importer(cleGroupe, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
      additionalData: lien(conversationId, auteur) as unknown as BufferSource,
    },
    cle,
    encodeur.encode(texte) as unknown as BufferSource,
  );
  return { iv: hex(iv), c: hex(new Uint8Array(chiffre)) };
}

/**
 * Rend le texte, ou `null` si le message ne s'ouvre pas.
 *
 * Un echec n'est pas une exception a remonter : dans un fil de deux cents
 * messages, un seul illisible - cle renouvelee, message corrompu - ne
 * doit pas empecher d'afficher les 199 autres. L'interface montre alors
 * une ligne « message illisible » a sa place.
 */
export async function dechiffrer(
  message: MessageChiffre,
  cleGroupe: Uint8Array,
  conversationId: string,
  auteur: string,
): Promise<string | null> {
  try {
    const cle = await importer(cleGroupe, ["decrypt"]);
    const clair = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bin(message.iv) as unknown as BufferSource,
        additionalData: lien(conversationId, auteur) as unknown as BufferSource,
      },
      cle,
      bin(message.c) as unknown as BufferSource,
    );
    return decodeur.decode(clair);
  } catch {
    return null;
  }
}
