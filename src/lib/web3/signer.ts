"use client";

/**
 * Connecter un wallet et lui faire signer.
 *
 * Isole ici parce que trois endroits en ont besoin pour des raisons
 * differentes - la page d'acces, le controle d'acces de la page
 * d'accueil, et la derivation de la cle de chiffrement - et qu'aucun ne
 * doit connaitre les details de l'injection.
 *
 * La DECOUVERTE des wallets vit dans providers.ts, qui ecoute EIP-6963.
 * Ce module ne fait que s'en servir.
 *
 * `personal_sign` et non `eth_sign` : le premier prefixe le message avec
 * « \x19Ethereum Signed Message », ce qui rend impossible de faire signer
 * une transaction deguisee en texte. Le second signe des octets bruts et
 * est desactive par la plupart des wallets, a juste titre.
 */

import {
  attendreStabilite,
  attendreWallets,
  walletsTrouves,
  type Fournisseur1193,
  type WalletDetecte,
} from "./providers";

export type { WalletDetecte } from "./providers";

/** Le wallet retenu pour la session. Choisi par l'utilisateur quand il y
 *  en a plusieurs, sinon le seul present. */
let choisi: Fournisseur1193 | null = null;

export function choisirWallet(w: WalletDetecte) {
  choisi = w.fournisseur;
  try {
    // Memorise le choix pour ne pas le redemander a chaque visite. Une
    // commodite par navigateur, rien de sensible : ce n'est qu'un nom.
    localStorage.setItem("hoodlrz-wallet", w.id);
  } catch {
    /* navigation privee : on redemandera, sans gravite */
  }
}

/**
 * Le fournisseur a utiliser.
 *
 * Cherche d'abord celui que l'utilisateur avait retenu, puis le seul
 * disponible. Avec plusieurs wallets et aucun choix memorise, rend
 * `null` : c'est a l'interface de faire choisir, pas a ce module de
 * decider pour l'utilisateur quelle extension signe.
 */
export async function fournisseurCourant(): Promise<Fournisseur1193 | null> {
  if (choisi) return choisi;

  // On attend que la liste CESSE de bouger, et pas seulement qu'un
  // premier wallet reponde. Les extensions ne s'annoncent pas en meme
  // temps : conclure « il n'y en a qu'un » a la premiere reponse revient
  // a choisir le signataire a la place de l'utilisateur, en silence, et
  // selon l'ordre de chargement du jour.
  const liste = await attendreStabilite();
  if (liste.length === 0) return null;

  try {
    const retenu = localStorage.getItem("hoodlrz-wallet");
    const trouve = retenu ? liste.find((w) => w.id === retenu) : null;
    if (trouve) {
      choisi = trouve.fournisseur;
      return choisi;
    }
  } catch {
    /* stockage indisponible */
  }

  if (liste.length === 1) {
    choisi = liste[0].fournisseur;
    return choisi;
  }
  return null;
}

/**
 * Y a-t-il un wallet ?
 *
 * Asynchrone a dessein. La version synchrone d'avant repondait « non »
 * avant meme que les extensions aient fini de s'injecter, et l'interface
 * proposait un lien de telechargement a des gens qui avaient deja le
 * wallet installe.
 */
export async function walletDisponible(): Promise<boolean> {
  return (await attendreWallets()).length > 0;
}

/** Sans attendre : utile pour un premier rendu, jamais pour conclure a
 *  l'absence de wallet. */
export function walletsConnus(): WalletDetecte[] {
  return walletsTrouves();
}

/** L'adresse deja autorisee, sans ouvrir de fenetre. Rend null si le site
 *  n'a pas encore ete autorise : demander la connexion est une decision
 *  de l'interface, pas de cette fonction. */
export async function adresseConnectee(): Promise<string | null> {
  const p = await fournisseurCourant();
  if (!p) return null;
  try {
    const comptes = (await p.request({ method: "eth_accounts" })) as string[];
    return comptes?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function demanderConnexion(): Promise<string | null> {
  const p = await fournisseurCourant();
  if (!p) return null;
  const comptes = (await p.request({ method: "eth_requestAccounts" })) as string[];
  return comptes?.[0] ?? null;
}

export async function signer(message: string, adresse: string): Promise<string> {
  const p = await fournisseurCourant();
  if (!p) throw new Error("Aucun wallet selectionne.");
  return (await p.request({
    method: "personal_sign",
    params: [message, adresse],
  })) as string;
}
