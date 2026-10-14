/**
 * Ranger un article dans une des trois rubriques.
 *
 * POURQUOI PAS UN MODELE DE LANGAGE
 * Il ne s'agit plus d'ecrire, seulement de trier des titres entre
 * « crypto », « NFT » et « meme coin ». Des mots-cles font ce travail en
 * une milliseconde, sans cle d'API, sans facture et sans dependance
 * exterieure qui tombe un lundi matin. Un titre mal range est une gene ;
 * une rubrique vide parce qu'un service repond 500 en est une autre.
 *
 * L'ORDRE DES TESTS COMPTE. « Meme coin » est teste avant « NFT », qui
 * est teste avant « crypto » : un titre sur un NFT de chien passerait
 * sinon en NFT alors que son sujet est le meme coin, et presque tout
 * article parle de crypto d'une maniere ou d'une autre.
 */

export type Rubrique = "crypto" | "nft" | "memecoin";

/** Les mots sont cherches avec des bornes de mot : sans elles, « ape »
 *  attrape « escape » et « bonk » attrape « bonkers ». */
const MEMECOIN = [
  "meme coin", "memecoin", "memecoins", "dogecoin", "doge", "shiba", "shib",
  "pepe", "bonk", "wif", "dogwifhat", "floki", "pump\\.fun", "trump coin",
];

const NFT = [
  "nft", "nfts", "pfp", "opensea", "blur", "punks", "cryptopunks", "bored ape",
  "azuki", "pudgy", "art blocks", "generative art", "on-chain art", "ordinals",
  "inscriptions", "collectible", "collectibles", "mint", "minting",
];

function contient(texte: string, mots: string[]): boolean {
  return mots.some((m) => new RegExp(`\\b${m}\\b`, "i").test(texte));
}

export function classer(titre: string, resume = ""): Rubrique {
  // Le titre pese plus que le resume : un resume evoque souvent des
  // sujets voisins que le titre ne traite pas. On le lit quand meme,
  // mais seulement si le titre n'a rien tranche.
  if (contient(titre, MEMECOIN)) return "memecoin";
  if (contient(titre, NFT)) return "nft";
  if (contient(resume, MEMECOIN)) return "memecoin";
  if (contient(resume, NFT)) return "nft";
  return "crypto";
}
