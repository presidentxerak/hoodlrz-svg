"use client";

/**
 * Obtenir une signature du wallet injecte.
 *
 * Isole ici parce que deux endroits en ont besoin pour des raisons
 * differentes - la connexion, et la derivation de la cle de chiffrement -
 * et qu'aucun des deux ne doit connaitre les details de l'injection.
 *
 * `personal_sign` et non `eth_sign` : le premier prefixe le message avec
 * « \x19Ethereum Signed Message », ce qui rend impossible de faire signer
 * une transaction deguisee en texte. Le second signe des octets bruts et
 * est desactive par la plupart des wallets, a juste titre.
 */

interface Injecte {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: Injecte[];
  isMetaMask?: boolean;
}

function fournisseur(): Injecte | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Injecte; phantom?: { ethereum?: Injecte } };
  const eth = w.ethereum;
  if (eth) {
    // Plusieurs wallets installes s'empilent dans `providers` ; sans
    // choix explicite, on prend le premier, qui est celui que le
    // navigateur a mis en avant.
    return eth.providers?.[0] ?? eth;
  }
  return w.phantom?.ethereum ?? null;
}

export function walletDisponible(): boolean {
  return fournisseur() !== null;
}

/** L'adresse deja autorisee, sans ouvrir de fenetre. Renvoie null si le
 *  site n'a pas encore ete autorise : demander la connexion est une
 *  decision de l'interface, pas de cette fonction. */
export async function adresseConnectee(): Promise<string | null> {
  const p = fournisseur();
  if (!p) return null;
  try {
    const comptes = (await p.request({ method: "eth_accounts" })) as string[];
    return comptes?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function demanderConnexion(): Promise<string | null> {
  const p = fournisseur();
  if (!p) return null;
  const comptes = (await p.request({ method: "eth_requestAccounts" })) as string[];
  return comptes?.[0] ?? null;
}

export async function signer(message: string, adresse: string): Promise<string> {
  const p = fournisseur();
  if (!p) throw new Error("Aucun wallet detecte dans ce navigateur.");
  const signature = (await p.request({
    method: "personal_sign",
    params: [message, adresse],
  })) as string;
  return signature;
}
