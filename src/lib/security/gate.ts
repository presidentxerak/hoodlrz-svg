/**
 * La porte : un wallet entre s'il detient une PFP Hoodlrz.
 *
 * CE QU'ELLE VERIFIE
 * La detention sur au moins un des contrats du projet, lue au moment ou
 * on le demande. Pas une liste tenue a la main, pas un role attribue par
 * un administrateur : la seule source est le registre de propriete.
 *
 * POURQUOI ELLE NE LIT PAS LES DEUX CHAINES DE LA MEME FACON
 *
 *  - OG Hoodlrz, sur Ethereum, passe par l'API NFT d'Alchemy VIA LE MEME
 *    MODULE que le reste du site. C'est le correctif central. La porte
 *    avait sa propre lecture, avec ses propres noms de variables
 *    d'environnement - ALCHEMY_API_KEY et
 *    NEXT_PUBLIC_HOODLRZ_STREET_ADDRESS - alors que le site lit
 *    ALCHEMY_KEY et HOODLRZ_CONTRACT. Deux configurations pour une seule
 *    chose : le site affichait les pieces d'un membre dans sa
 *    collection pendant que la porte en comptait zero pour le meme
 *    wallet.
 *
 *  - Gen Kids, sur Robinhood Chain, passe par un `balanceOf` direct :
 *    aucun indexeur ne couvre cette chaine.
 *
 * UNE LECTURE EN ECHEC VAUT « JE NE SAIS PAS », PAS « NON ». C'est ce
 * que porte `fiable` ; les appelants ne doivent jamais inscrire un refus
 * qui ne l'est pas.
 */

import { JsonRpcProvider, Contract } from "ethers";
import { compterNFTs, CONTRAT_OG } from "@/lib/hoodlrz/alchemy";
import kidsConfig from "../../../kids/config.json";

/** Duree au-dela de laquelle un verdict est considere comme a revoir. */
export const FRAICHEUR_SECONDES = 6 * 60 * 60;

const BALANCE_OF = ["function balanceOf(address) view returns (uint256)"];

/** Les deux noms de cle coexistent dans le projet. Les lire tous les
 *  deux evite de recreer l'ecart qui a cause la panne. */
function cleAlchemy() {
  return process.env.ALCHEMY_KEY ?? process.env.ALCHEMY_API_KEY ?? "";
}

function rpcRobinhood() {
  const cle = cleAlchemy();
  return (
    process.env.RH_MAINNET_RPC ||
    (cle
      ? `https://robinhood-mainnet.g.alchemy.com/v2/${cle}`
      : "https://rpc.mainnet.chain.robinhood.com")
  );
}

/** Ce qu'a donne UNE source, en clair. Sans ce detail, un verdict
 *  « zero piece » est indiscernable d'un mauvais contrat, d'une mauvaise
 *  chaine ou d'un fournisseur muet - et on cherche a l'aveugle. */
export interface DetailSource {
  nom: string;
  contrat: string;
  chainId: number;
  /** Hote interroge, sans la cle. */
  via: string;
  solde?: number;
  erreur?: string;
}

export interface Verdict {
  detenteur: boolean;
  pieces: Record<string, number>;
  partiel: boolean;
  /**
   * Le verdict peut-il etre inscrit en base ?
   *
   * Faux uniquement quand le total est nul ET qu'une source a manque :
   * le seul cas ou « non » signifie en realite « je ne sais pas ». Un
   * « oui » est toujours fiable - une piece comptee est une piece
   * detenue, meme si une autre chaine n'a pas repondu.
   */
  fiable: boolean;
  details: DetailSource[];
  verifieA: string;
}

/** Contrats ajoutes par configuration, au format « 0xadresse:chainId »
 *  separes par des virgules. Corriger une adresse devient une ligne dans
 *  les reglages de l'hebergeur au lieu d'un deploiement. */
function supplementaires(): { adresse: string; chainId: number }[] {
  return (process.env.HOODLRZ_EXTRA_CONTRACTS ?? "")
    .split(",")
    .map((brut) => {
      const [adresse, chaine] = brut.trim().split(":");
      const id = Number(chaine ?? 1);
      return { adresse: adresse ?? "", chainId: Number.isFinite(id) ? id : 1 };
    })
    .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s.adresse));
}

/** Un `balanceOf`, avec trois essais. Un fournisseur rend un echec
 *  passager bien plus souvent qu'on ne le croit, et un seul essai
 *  transforme ce hoquet en « ce membre ne detient rien ». */
async function soldeRpc(
  adresse: string,
  contrat: string,
  rpc: string,
  chainId: number,
): Promise<{ solde?: number; erreur?: string }> {
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const provider = new JsonRpcProvider(rpc, chainId, { staticNetwork: true });
      const nft = new Contract(contrat, BALANCE_OF, provider);
      return { solde: Number(await nft.balanceOf(adresse)) };
    } catch (e) {
      if (essai === 3) {
        // Le message est garde tel quel : « could not decode result
        // data » designe un contrat absent de cette chaine, un 401 une
        // cle sans acces. Les deux se corrigent, mais pas pareil.
        return { erreur: String((e as Error)?.message ?? e).slice(0, 160) };
      }
      await new Promise((r) => setTimeout(r, 300 * essai));
    }
  }
  return { erreur: "inconnu" };
}

function hote(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "inconnu";
  }
}

export async function verifierDetention(adresse: string): Promise<Verdict> {
  const details: DetailSource[] = [];
  const pieces: Record<string, number> = {};
  let partiel = false;

  const noter = (d: DetailSource) => {
    details.push(d);
    if (d.erreur) partiel = true;
    else pieces[d.nom] = d.solde ?? 0;
  };

  const travaux: Promise<void>[] = [];

  /* ── OG Hoodlrz, par le meme chemin que le reste du site ─────────── */
  travaux.push(
    (async () => {
      const r = await compterNFTs(adresse);
      noter({
        nom: "og",
        contrat: CONTRAT_OG,
        chainId: 1,
        via: r.via,
        solde: r.nombre,
        erreur: r.erreur,
      });
    })(),
  );

  /* ── Gen Kids, sur Robinhood Chain ───────────────────────────────── */
  const kids = (kidsConfig as { deployments?: Record<string, { nft?: string }> }).deployments?.[
    "4663"
  ];
  if (kids?.nft) {
    const adresseKids = kids.nft;
    const rpc = rpcRobinhood();
    travaux.push(
      (async () => {
        const r = await soldeRpc(adresse, adresseKids, rpc, 4663);
        noter({ nom: "kids", contrat: adresseKids, chainId: 4663, via: hote(rpc), ...r });
      })(),
    );
  }

  /* ── Contrats ajoutes par configuration ──────────────────────────── */
  for (const s of supplementaires()) {
    const cle = cleAlchemy();
    const rpc =
      s.chainId === 4663
        ? rpcRobinhood()
        : process.env.ETH_MAINNET_RPC ||
          (cle ? `https://eth-mainnet.g.alchemy.com/v2/${cle}` : "https://eth.llamarpc.com");
    travaux.push(
      (async () => {
        const r = await soldeRpc(adresse, s.adresse, rpc, s.chainId);
        noter({
          nom: `extra ${s.adresse.slice(0, 8)}`,
          contrat: s.adresse,
          chainId: s.chainId,
          via: hote(rpc),
          ...r,
        });
      })(),
    );
  }

  await Promise.all(travaux);

  const total = Object.keys(pieces).reduce((n, k) => n + (pieces[k] ?? 0), 0);

  return {
    detenteur: total > 0,
    pieces,
    partiel,
    fiable: total > 0 || !partiel,
    details,
    verifieA: new Date().toISOString(),
  };
}
