"use client";

/**
 * L'etat de la messagerie chiffree, du cote du navigateur.
 *
 * Il tient trois choses :
 *  - le DEVERROUILLAGE, c'est-a-dire la signature qui derive la cle ;
 *  - la liste des conversations, avec la cle de chaque groupe ouverte en
 *    memoire ;
 *  - l'envoi et la lecture, qui chiffrent et dechiffrent au passage.
 *
 * Les cles de groupe ouvertes vivent dans une Map de ce hook. Pas dans un
 * etat React serialisable, pas dans le stockage du navigateur : une cle
 * qu'on peut lire depuis la console est une cle qu'un script injecte peut
 * lire aussi.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { obtenirCles, enHex, clesChargees, type PaireDeCles } from "@/lib/crypto/keys";
import { ouvrir, sceller, nouvelleCleDeGroupe, type Scelle } from "@/lib/crypto/sealed";
import { chiffrer, dechiffrer, type MessageChiffre } from "@/lib/crypto/messages";
import { adresseConnectee, demanderConnexion, signer } from "@/lib/web3/signer";

export interface Conversation {
  id: string;
  kind: "group" | "direct";
  title_enc: MessageChiffre | null;
  last_at: string;
  created_at: string;
  keySealed: Scelle;
  role: "owner" | "member";
  /** Dechiffre a l'ouverture ; absent tant que la cle n'est pas ouverte. */
  titre?: string;
}

export interface Message {
  id: string;
  author_id: string;
  created_at: string;
  /** `null` quand le message ne s'ouvre pas : cle renouvelee, ou
   *  contenu altere. Une ligne illisible ne doit pas cacher les autres. */
  texte: string | null;
}

export interface Membre {
  id: string;
  pseudonym: string;
  e2e_public_key: string;
}

/** Donnees associees du titre d'un groupe. Constante parce que le titre
 *  est chiffre avant que la conversation ait un identifiant. */
const TITRE_AAD = "hoodlrz-title";

export function useE2E() {
  const [pret, setPret] = useState(clesChargees());
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const cles = useRef<PaireDeCles | null>(null);
  /** conversationId -> cle du groupe, en clair, en memoire seulement. */
  const clesDeGroupe = useRef(new Map<string, Uint8Array>());

  /**
   * Deverrouille : une signature, puis publication de la cle publique.
   *
   * La publication est faite a chaque deverrouillage et non une seule
   * fois : elle est idempotente, et elle rattrape le cas d'un compte
   * cree avant que la messagerie existe.
   */
  const deverrouiller = useCallback(async () => {
    setErreur(null);
    setOccupe(true);
    try {
      const adresse = (await adresseConnectee()) ?? (await demanderConnexion());
      if (!adresse) throw new Error("Aucun wallet connecte.");

      const paire = await obtenirCles(adresse, signer);
      cles.current = paire;

      await fetch("/api/messaging/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicKey: enHex(paire.publique) }),
      });

      setPret(true);
    } catch (e) {
      const m = (e as Error).message ?? "";
      setErreur(
        /reject|denied|cancel|4001/i.test(m)
          ? "Signature refusee dans le wallet."
          : m || "Deverrouillage impossible.",
      );
    } finally {
      setOccupe(false);
    }
  }, []);

  /** Charge les conversations et ouvre la cle de chacune. */
  const charger = useCallback(async () => {
    if (!cles.current) return;
    const r = await fetch("/api/messaging/conversations");
    if (!r.ok) {
      setErreur("Conversations illisibles.");
      return;
    }
    const { conversations: liste } = (await r.json()) as { conversations: Conversation[] };

    const ouvertes: Conversation[] = [];
    for (const c of liste) {
      try {
        const cle = await ouvrir(c.keySealed, cles.current.privee);
        clesDeGroupe.current.set(c.id, cle);
        const titre = c.title_enc
          ? await dechiffrer(c.title_enc, cle, TITRE_AAD, TITRE_AAD)
          : null;
        ouvertes.push({ ...c, titre: titre ?? undefined });
      } catch {
        // Un groupe dont la cle ne s'ouvre pas reste visible, sans titre :
        // le masquer donnerait l'impression qu'il a disparu.
        ouvertes.push(c);
      }
    }
    setConversations(ouvertes);
  }, []);

  useEffect(() => {
    if (pret) void charger();
  }, [pret, charger]);

  /** Les messages d'une conversation, dechiffres. */
  const lireMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    const cle = clesDeGroupe.current.get(conversationId);
    const r = await fetch(`/api/messaging/messages?conversation=${conversationId}`);
    if (!r.ok) return [];
    const { messages } = (await r.json()) as {
      messages: { id: string; author_id: string; body_enc: MessageChiffre; created_at: string }[];
    };
    if (!cle) return messages.map((m) => ({ ...m, texte: null }));

    return Promise.all(
      messages.map(async (m) => ({
        id: m.id,
        author_id: m.author_id,
        created_at: m.created_at,
        texte: await dechiffrer(m.body_enc, cle, conversationId, m.author_id),
      })),
    );
  }, []);

  const envoyer = useCallback(
    async (conversationId: string, auteurId: string, texte: string) => {
      const cle = clesDeGroupe.current.get(conversationId);
      if (!cle) throw new Error("Cle du groupe indisponible.");
      const bodyEnc = await chiffrer(texte, cle, conversationId, auteurId);
      const r = await fetch("/api/messaging/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, bodyEnc }),
      });
      if (!r.ok) throw new Error("Envoi refuse.");
    },
    [],
  );

  /**
   * Cree un groupe.
   *
   * La cle est tiree ICI et scellee ici pour chaque membre : le serveur
   * ne la voit a aucun moment. C'est tout le point du chiffrement de
   * bout en bout, et c'est la ligne a ne jamais deplacer vers le serveur
   * pour simplifier.
   */
  const creerGroupe = useCallback(
    async (titre: string, membres: Membre[], moiId: string) => {
      if (!cles.current) throw new Error("Cles non deverrouillees.");
      const cle = nouvelleCleDeGroupe();

      const destinataires = membres.some((m) => m.id === moiId)
        ? membres
        : [...membres, { id: moiId, pseudonym: "", e2e_public_key: enHex(cles.current.publique) }];

      const scelles = await Promise.all(
        destinataires.map(async (m) => ({
          accountId: m.id,
          keySealed: await sceller(cle, hexVersOctets(m.e2e_public_key)),
        })),
      );

      // Le titre est chiffre comme un message : « Insider calls » en clair
      // dans une base volee en dit deja long sur ce qui s'echange.
      //
      // Ses donnees associees sont une constante et NON l'identifiant de
      // la conversation : au moment de chiffrer, cet identifiant n'existe
      // pas encore - il est attribue par la base. Le lier a un
      // identifiant invente rendrait le titre indechiffrable a jamais.
      const titleEnc = titre ? await chiffrer(titre, cle, TITRE_AAD, TITRE_AAD) : null;

      const r = await fetch("/api/messaging/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "group", titleEnc, members: scelles }),
      });
      if (!r.ok) throw new Error("Creation refusee.");
      const { id } = (await r.json()) as { id: string };

      clesDeGroupe.current.set(id, cle);
      await charger();
      return id;
    },
    [charger],
  );

  return {
    pret,
    occupe,
    erreur,
    conversations,
    deverrouiller,
    charger,
    lireMessages,
    envoyer,
    creerGroupe,
  };
}

function hexVersOctets(h: string): Uint8Array {
  const o = new Uint8Array(h.length / 2);
  for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16);
  return o;
}
