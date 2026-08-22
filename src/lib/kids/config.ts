/**
 * Configuration Hoodlrz Kids exposee au navigateur.
 *
 * Les parametres de collection et les dates viennent de kids/config.json,
 * source unique partagee avec les scripts de deploiement : une date
 * changee la-bas se propage ici sans recopie.
 *
 * Les adresses de contrats passent par des variables d'environnement
 * parce qu'elles ne sont connues qu'apres deploiement, et qu'elles
 * different entre testnet et mainnet.
 */

import raw from "../../../kids/config.json";

export const KIDS = {
  name: raw.collection.name,
  symbol: raw.collection.symbol,
  maxSupply: raw.collection.maxSupply,
  reserve: raw.collection.reserve,
  maxPerWallet: raw.collection.maxPerWallet,
  royaltyBps: raw.collection.royaltyBps,
  /** Disponible au public = supply totale moins la reserve createur. */
  publicSupply: raw.collection.maxSupply - raw.collection.reserve,
} as const;

/** Timestamps UNIX (secondes), comme les attend le contrat. */
const ts = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

export const PHASES = {
  snapshot: ts(raw.phases.snapshotParis),
  allowlistStart: ts(raw.phases.allowlistStartParis),
  publicStart: ts(raw.phases.publicStartParis),
  mintEnd: ts(raw.phases.mintEndParis),
} as const;

export type Phase = "avant" | "allowlist" | "public" | "termine";

export function phaseAt(nowSeconds: number): Phase {
  if (nowSeconds < PHASES.allowlistStart) return "avant";
  if (nowSeconds < PHASES.publicStart) return "allowlist";
  if (nowSeconds < PHASES.mintEnd) return "public";
  return "termine";
}

/**
 * Dates telles qu'annoncees au public, en heure de Paris.
 *
 * Le fuseau est force plutot que laisse au navigateur : la page est
 * prerendue, et un formatage dependant du fuseau donnerait un HTML
 * serveur different du premier rendu client - donc une erreur
 * d'hydratation. Toutes les heures affichees sont donc celles de Paris,
 * et le libelle le dit.
 */
export const PARIS = "Europe/Paris";

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: PARIS, day: "numeric", month: "long", year: "numeric",
  });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: PARIS, day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " CET";
}

/** Chaines ISO d'origine, pour l'affichage. */
export const PHASE_ISO = {
  snapshot: raw.phases.snapshotParis,
  allowlistStart: raw.phases.allowlistStartParis,
  publicStart: raw.phases.publicStartParis,
  mintEnd: raw.phases.mintEndParis,
} as const;

/* ------------------------------------------------------------------ *
 *  Chaine
 * ------------------------------------------------------------------ */

/**
 * Robinhood Chain. Ces valeurs viennent de resumes de recherche et non
 * de la documentation lue directement : elles doivent etre confirmees
 * sur docs.robinhood.com/chain avant toute mise en production. Elles
 * sont surchargeables par variable d'environnement pour qu'une
 * correction ne demande pas un redeploiement du code.
 */
export const KIDS_CHAIN = {
  id: Number(process.env.NEXT_PUBLIC_KIDS_CHAIN_ID ?? "4663"),
  name: process.env.NEXT_PUBLIC_KIDS_CHAIN_NAME ?? "Robinhood Chain",
  rpcUrl: process.env.NEXT_PUBLIC_KIDS_RPC_URL ?? "",
  explorerUrl:
    process.env.NEXT_PUBLIC_KIDS_EXPLORER_URL ??
    "https://robinhoodchain.blockscout.com",
  currency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

/** Adresse du contrat. Vide tant que rien n'est deploye. */
export const KIDS_ADDRESS = process.env.NEXT_PUBLIC_KIDS_ADDRESS ?? "";

export const isDeployed = () => /^0x[a-fA-F0-9]{40}$/.test(KIDS_ADDRESS);

/** Parametres au format attendu par wallet_addEthereumChain. */
export function chainParams() {
  return {
    chainId: "0x" + KIDS_CHAIN.id.toString(16),
    chainName: KIDS_CHAIN.name,
    nativeCurrency: KIDS_CHAIN.currency,
    rpcUrls: KIDS_CHAIN.rpcUrl ? [KIDS_CHAIN.rpcUrl] : [],
    blockExplorerUrls: [KIDS_CHAIN.explorerUrl],
  };
}
