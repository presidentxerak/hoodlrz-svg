/**
 * Aller-retour du chiffrement de bout en bout.
 *
 * Ce test ne verifie pas que « le code tourne » : il verifie les trois
 * proprietes sur lesquelles repose la messagerie, et que rien dans
 * l'interface ne montrerait si elles cassaient.
 *
 *  1. Deux appareils du meme membre derivent LA MEME cle. Sans cela, un
 *     changement de telephone perd tout l'historique en silence.
 *  2. Un message lie a sa conversation et a son auteur ne se dechiffre
 *     PAS ailleurs. C'est ce qui empeche un serveur malveillant de
 *     recopier un message d'un fil vers un autre.
 *  3. Un chiffre modifie d'un seul bit est REFUSE, et ne rend pas des
 *     octets faux.
 *
 * Lancement : npx tsx test/network/crypto.test.mts
 */

import { deriverDepuisSignature, enHex } from "../../src/lib/crypto/keys";
import { sceller, ouvrir, nouvelleCleDeGroupe } from "../../src/lib/crypto/sealed";
import { chiffrer, dechiffrer } from "../../src/lib/crypto/messages";

let echecs = 0;
function verifier(nom: string, condition: boolean) {
  console.log(`  ${condition ? "ok  " : "ECHEC"}  ${nom}`);
  if (!condition) echecs++;
}

const SIGNATURE =
  "0x" + "a3".repeat(32) + "b7".repeat(32) + "1c";

console.log("\nChiffrement de bout en bout\n");

/* 1. Determinisme ------------------------------------------------------ */
const appareilA = deriverDepuisSignature(SIGNATURE);
const appareilB = deriverDepuisSignature(SIGNATURE);
verifier(
  "deux appareils, meme signature, meme cle publique",
  enHex(appareilA.publique) === enHex(appareilB.publique),
);

const autre = deriverDepuisSignature("0x" + "ff".repeat(65));
verifier(
  "une autre signature donne une autre cle",
  enHex(autre.publique) !== enHex(appareilA.publique),
);

/* 2. Sceau ------------------------------------------------------------- */
const cleGroupe = nouvelleCleDeGroupe();
const scelle = await sceller(cleGroupe, appareilA.publique);
const rendue = await ouvrir(scelle, appareilA.privee);
verifier("la cle de groupe scellee se rouvre a l'identique", enHex(rendue) === enHex(cleGroupe));

let refuseAutrui = false;
try {
  await ouvrir(scelle, autre.privee);
} catch {
  refuseAutrui = true;
}
verifier("un tiers ne peut pas ouvrir le sceau", refuseAutrui);

/* 3. Message ----------------------------------------------------------- */
const CONV = "11111111-1111-1111-1111-111111111111";
const AUTRE_CONV = "22222222-2222-2222-2222-222222222222";
const AUTEUR = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEXTE = "Le floor tient a 0,80 — on ne vend rien aujourd'hui.";

const chiffre = await chiffrer(TEXTE, cleGroupe, CONV, AUTEUR);
verifier("le texte clair n'apparait pas dans le chiffre", !chiffre.c.includes("floor"));

const clair = await dechiffrer(chiffre, cleGroupe, CONV, AUTEUR);
verifier("le message se relit a l'identique", clair === TEXTE);

const deplace = await dechiffrer(chiffre, cleGroupe, AUTRE_CONV, AUTEUR);
verifier("un message recopie dans une autre conversation ne s'ouvre pas", deplace === null);

const reattribue = await dechiffrer(chiffre, cleGroupe, CONV, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
verifier("un message attribue a un autre auteur ne s'ouvre pas", reattribue === null);

// Un seul bit retourne dans le chiffre.
const octets = chiffre.c.split("");
octets[0] = octets[0] === "0" ? "1" : "0";
const altere = await dechiffrer({ iv: chiffre.iv, c: octets.join("") }, cleGroupe, CONV, AUTEUR);
verifier("un chiffre modifie est refuse, pas rendu faux", altere === null);

const mauvaiseCle = await dechiffrer(chiffre, nouvelleCleDeGroupe(), CONV, AUTEUR);
verifier("une autre cle de groupe ne donne rien", mauvaiseCle === null);

/* Les IV ne se repetent pas --------------------------------------------- */
const vus = new Set<string>();
for (let i = 0; i < 200; i++) {
  vus.add((await chiffrer("x", cleGroupe, CONV, AUTEUR)).iv);
}
verifier("200 chiffrements, 200 vecteurs d'initialisation distincts", vus.size === 200);

console.log(
  echecs === 0
    ? "\nTout passe.\n"
    : `\n${echecs} verification(s) en echec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
