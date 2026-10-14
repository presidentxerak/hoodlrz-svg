/**
 * Les pieces reellement detenues par un wallet, avec leurs images.
 *
 * DEUX CHAINES, DEUX FACONS DE LIRE
 *
 * Gen Kids vit sur Robinhood Chain, en 3 333 pieces numerotees de 0 a
 * 3 332. Aucun indexeur ne couvre cette chaine : on lit donc la chaine
 * elle-meme. `balanceOf` donne le nombre, puis `tokenOfOwnerByIndex` -
 * si le contrat l'expose - donne les numeros ; sinon on balaie. Le
 * balayage de 3 333 `ownerOf` est trop lourd pour une page, donc il est
 * borne : voir MAX_BALAYAGE.
 *
 * OG Hoodlrz vit sur Ethereum, ou l'API NFT d'Alchemy repond en un appel
 * avec les images. On s'en sert quand la cle est posee, et on se rabat
 * sur la chaine sinon.
 *
 * CE MODULE NE FAIT JAMAIS CONFIANCE AU CLIENT. Il est appele cote
 * serveur avec l'adresse lue dans la session, jamais avec celle qu'un
 * navigateur envoie.
 */

import { JsonRpcProvider, Contract } from "ethers";
import { HOODLRZ_STREET_ADDRESS } from "@/lib/web3/config";
import kidsConfig from "../../../kids/config.json";

export interface Piece {
  /** Contrat, en minuscules. */
  contract: string;
  tokenId: number;
  /** Nom de la collection, pour l'affichage. */
  collection: string;
  image: string;
}

const ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

/** Au-dela, on renonce au balayage : mille lectures RPC pour afficher une
 *  grille d'avatars n'est pas un compromis acceptable. Le cas ne se pose
 *  que pour un wallet qui detiendrait enormement de pieces sans que le
 *  contrat expose l'enumeration. */
const MAX_BALAYAGE = 400;

function kids() {
  const d = (kidsConfig as { deployments?: Record<string, { nft?: string; imageBase?: string }> })
    .deployments?.["4663"];
  return d?.nft ? { adresse: d.nft, base: d.imageBase ?? "https://www.hoodlrz.com/kids/img/" } : null;
}

function rpcRobinhood() {
  const cle = process.env.ALCHEMY_API_KEY;
  return (
    process.env.RH_MAINNET_RPC ||
    (cle ? `https://robinhood-mainnet.g.alchemy.com/v2/${cle}` : "https://rpc.mainnet.chain.robinhood.com")
  );
}

/** Les Gen Kids d'un wallet, lus sur la chaine. */
async function genKids(adresse: string): Promise<Piece[]> {
  const k = kids();
  if (!k) return [];

  try {
    const provider = new JsonRpcProvider(rpcRobinhood(), 4663, { staticNetwork: true });
    const nft = new Contract(k.adresse, ABI, provider);
    const solde = Number(await nft.balanceOf(adresse));
    if (solde === 0) return [];

    // Chemin rapide : le contrat enumere lui-meme les pieces d'un
    // proprietaire. Une lecture par piece, et aucune sur les autres.
    const ids: number[] = [];
    try {
      const lots = await Promise.all(
        Array.from({ length: Math.min(solde, MAX_BALAYAGE) }, (_, i) =>
          nft.tokenOfOwnerByIndex(adresse, i),
        ),
      );
      lots.forEach((v) => ids.push(Number(v)));
    } catch {
      // Le contrat n'expose pas l'enumeration : on balaie, par lots, en
      // s'arretant des qu'on a trouve le compte annonce par balanceOf.
      const total = Number(await nft.totalSupply().catch(() => 3333));
      const borne = Math.min(total, MAX_BALAYAGE * 10);
      for (let i = 0; i < borne && ids.length < solde; i += 50) {
        const lot = await Promise.all(
          Array.from({ length: Math.min(50, borne - i) }, (_, j) =>
            nft.ownerOf(i + j).catch(() => null),
          ),
        );
        lot.forEach((o, j) => {
          if (o && String(o).toLowerCase() === adresse.toLowerCase()) ids.push(i + j);
        });
      }
    }

    return ids.map((id) => ({
      contract: k.adresse.toLowerCase(),
      tokenId: id,
      collection: "Hoodlrz Gen Kids",
      image: `${k.base}${id}.png`,
    }));
  } catch {
    return [];
  }
}

/** Les OG Hoodlrz d'un wallet, via Alchemy quand la cle est posee. */
async function ogHoodlrz(adresse: string): Promise<Piece[]> {
  const cle = process.env.ALCHEMY_API_KEY;
  if (!cle || !HOODLRZ_STREET_ADDRESS) return [];

  try {
    const u = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${cle}/getNFTsForOwner`);
    u.searchParams.set("owner", adresse);
    u.searchParams.append("contractAddresses[]", HOODLRZ_STREET_ADDRESS);
    u.searchParams.set("withMetadata", "true");
    u.searchParams.set("pageSize", "100");

    const r = await fetch(u, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const j = (await r.json()) as {
      ownedNfts?: {
        tokenId: string;
        name?: string;
        image?: { cachedUrl?: string; originalUrl?: string; thumbnailUrl?: string };
      }[];
    };

    return (j.ownedNfts ?? [])
      .map((n) => {
        // La vignette d'abord : c'est une grille d'avatars, pas une
        // galerie. L'originale peut peser plusieurs megaoctets.
        const img = n.image?.thumbnailUrl ?? n.image?.cachedUrl ?? n.image?.originalUrl ?? "";
        return {
          contract: HOODLRZ_STREET_ADDRESS.toLowerCase(),
          tokenId: Number(n.tokenId),
          collection: "OG Hoodlrz",
          image: img,
        };
      })
      .filter((p) => p.image && Number.isFinite(p.tokenId));
  } catch {
    return [];
  }
}

/** Tout ce que le wallet detient, les deux chaines confondues. */
export async function piecesDe(adresse: string): Promise<Piece[]> {
  const [k, o] = await Promise.all([genKids(adresse), ogHoodlrz(adresse)]);
  return [...k, ...o];
}

/**
 * Ce wallet detient-il CETTE piece ?
 *
 * Verification ciblee, faite au moment de poser un avatar. Lire la liste
 * entiere pour en verifier une seule couterait des centaines d'appels
 * RPC a chaque changement de photo.
 */
export async function detientPiece(
  adresse: string,
  contrat: string,
  tokenId: number,
): Promise<boolean> {
  const k = kids();
  const connus = [k?.adresse, HOODLRZ_STREET_ADDRESS].filter(Boolean).map((a) => a!.toLowerCase());
  // Un contrat inconnu est refuse sans meme etre interroge : sinon
  // n'importe quelle adresse de contrat devient un avatar possible.
  if (!connus.includes(contrat.toLowerCase())) return false;

  const surKids = k && contrat.toLowerCase() === k.adresse.toLowerCase();
  const rpc = surKids
    ? rpcRobinhood()
    : process.env.ETH_MAINNET_RPC ||
      (process.env.ALCHEMY_API_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "https://eth.llamarpc.com");

  try {
    const provider = new JsonRpcProvider(rpc, surKids ? 4663 : 1, { staticNetwork: true });
    const nft = new Contract(contrat, ABI, provider);
    const proprietaire = (await nft.ownerOf(tokenId)) as string;
    return proprietaire.toLowerCase() === adresse.toLowerCase();
  } catch {
    // Une lecture en echec n'est pas une preuve de non-detention, mais
    // poser un avatar n'est pas urgent : on refuse, et le membre
    // reessaie.
    return false;
  }
}

/** L'URL d'image d'une piece, recalculee et jamais recue du client. */
export function imageDe(contrat: string, tokenId: number, repli = ""): string {
  const k = kids();
  if (k && contrat.toLowerCase() === k.adresse.toLowerCase()) {
    return `${k.base}${tokenId}.png`;
  }
  return repli;
}
