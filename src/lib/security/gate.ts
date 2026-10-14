/**
 * La porte : un wallet entre s'il detient une PFP Hoodlrz.
 *
 * CE QUE LA PORTE VERIFIE
 * Un solde non nul sur l'un des contrats du projet, lu sur la chaine au
 * moment ou on le demande. Pas une liste tenue a la main, pas un role
 * attribue par un administrateur : la seule source est le registre de
 * propriete, qui est aussi la seule que personne ne peut falsifier.
 *
 * DEUX CHAINES, DEUX LECTURES
 * OG Hoodlrz vit sur Ethereum, Gen Kids sur Robinhood Chain. Les deux
 * sont interrogees en parallele et il suffit qu'une reponde oui. Un
 * fournisseur qui tombe ne doit pas fermer la porte a ceux qui detiennent
 * sur l'autre chaine : une lecture en echec vaut « je ne sais pas », pas
 * « non » - voir `partiel` dans le resultat.
 *
 * POURQUOI LE RESULTAT EST MIS EN CACHE
 * Deux appels RPC par navigation seraient a la fois lents et couteux. Le
 * verdict est donc inscrit sur le compte et relu par le middleware ; il
 * est rafraichi a chaque connexion et par /api/auth/holder. La
 * consequence est assumee : quelqu'un qui vend sa derniere piece garde
 * l'acces jusqu'au prochain rafraichissement. C'est le bon compromis
 * pour un reseau social, ce ne le serait pas pour un coffre.
 */

import { JsonRpcProvider, Contract } from "ethers";
import { HOODLRZ_STREET_ADDRESS, HOODLRZ_NFT_ADDRESS } from "@/lib/web3/config";
import kidsConfig from "../../../kids/config.json";

/** Duree au-dela de laquelle un verdict est considere comme a revoir. */
export const FRAICHEUR_SECONDES = 6 * 60 * 60;

const BALANCE_OF = ["function balanceOf(address) view returns (uint256)"];

interface Source {
  nom: "og" | "onchain" | "kids";
  adresse: string;
  rpc: string;
  chainId: number;
}

/** Les contrats dont la detention ouvre le reseau. Un contrat sans
 *  adresse configuree est simplement absent de la liste : mieux vaut une
 *  source en moins qu'un appel RPC vers l'adresse nulle. */
function sources(): Source[] {
  const alchemy = process.env.ALCHEMY_API_KEY;
  const eth =
    process.env.ETH_MAINNET_RPC ||
    (alchemy ? `https://eth-mainnet.g.alchemy.com/v2/${alchemy}` : "https://eth.llamarpc.com");
  const rh =
    process.env.RH_MAINNET_RPC ||
    (alchemy
      ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemy}`
      : "https://rpc.mainnet.chain.robinhood.com");

  const kids = (kidsConfig as { deployments?: Record<string, { nft?: string; origin?: string }> })
    .deployments?.["4663"];

  const liste: Source[] = [];
  if (HOODLRZ_STREET_ADDRESS) {
    liste.push({ nom: "og", adresse: HOODLRZ_STREET_ADDRESS, rpc: eth, chainId: 1 });
  }
  if (HOODLRZ_NFT_ADDRESS) {
    liste.push({ nom: "onchain", adresse: HOODLRZ_NFT_ADDRESS, rpc: eth, chainId: 1 });
  }
  if (kids?.nft) {
    liste.push({ nom: "kids", adresse: kids.nft, rpc: rh, chainId: 4663 });
  }
  return liste;
}

export interface Verdict {
  /** Detient au moins une piece sur au moins un contrat. */
  detenteur: boolean;
  /** Nombre de pieces par contrat, pour l'affichage du profil. */
  pieces: Record<string, number>;
  /** Au moins une source n'a pas repondu. */
  partiel: boolean;
  /**
   * Le verdict peut-il etre inscrit en base ?
   *
   * Faux uniquement quand le total est nul ET qu'une source a manque :
   * c'est le seul cas ou « non » signifie en realite « je ne sais pas ».
   * Un « oui » est toujours fiable - une piece comptee est une piece
   * detenue, meme si une autre chaine n'a pas repondu.
   */
  fiable: boolean;
  verifieA: string;
}

/**
 * Interroge la chaine. Ne leve jamais : une porte qui plante est une
 * porte fermee, et fermer sur une panne de fournisseur punirait des
 * membres legitimes.
 */
export async function verifierDetention(adresse: string): Promise<Verdict> {
  const pieces: Record<string, number> = {};
  let partiel = false;

  const lectures = sources().map(async (s) => {
    // Trois essais, espaces. Un fournisseur RPC rend un echec passager
    // bien plus souvent qu'on ne le croit - limite de debit, noeud qui
    // bascule - et un seul essai transforme ce hoquet en « ce membre ne
    // detient rien ».
    for (let essai = 1; essai <= 3; essai++) {
      try {
        const provider = new JsonRpcProvider(s.rpc, s.chainId, { staticNetwork: true });
        const contrat = new Contract(s.adresse, BALANCE_OF, provider);
        const solde = await contrat.balanceOf(adresse);
        pieces[s.nom] = Number(solde);
        return;
      } catch {
        if (essai === 3) {
          partiel = true;
          return;
        }
        await new Promise((r) => setTimeout(r, 300 * essai));
      }
    }
  });

  await Promise.all(lectures);

  const total = Object.keys(pieces).reduce((n, k) => n + (pieces[k] ?? 0), 0);

  return {
    detenteur: total > 0,
    pieces,
    partiel,
    /**
     * LE POINT QUI COMPTE, ET QUI MANQUAIT.
     *
     * Ce drapeau dit si le « non » est digne de foi. Un total de zero
     * alors qu'une source n'a pas repondu ne veut pas dire « ce wallet
     * ne detient rien » : il veut dire « je ne sais pas ».
     *
     * Sans cette distinction, un hoquet de fournisseur suffisait a
     * degrader un detenteur en non-detenteur et a l'ecrire en base. Le
     * membre voyait « 11 pieces trouvees, vous etes dedans », puis se
     * faisait refuser a la porte dans la seconde qui suit. C'est
     * exactement ce qui s'est produit.
     *
     * Les appelants ne doivent JAMAIS inscrire is_holder = false quand
     * ce drapeau est faux.
     */
    fiable: total > 0 || !partiel,
    verifieA: new Date().toISOString(),
  };
}
