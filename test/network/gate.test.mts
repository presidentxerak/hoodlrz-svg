/**
 * La porte ne doit jamais degrader un detenteur sur une panne.
 *
 * CE QUE CE TEST DEFEND
 * Le bug observe en production : la chaine annonce 11 pieces, le membre
 * lit « vous etes dedans », et la seconde d'apres il se fait refuser a
 * la porte. La cause etait une lecture de chaine qui echouait, rendait
 * un total de zero, et ecrivait « ce wallet ne detient rien » en base.
 *
 * La regle qui manquait : un total nul alors qu'une source n'a pas
 * repondu ne veut pas dire « non », il veut dire « je ne sais pas ».
 * C'est ce que porte `fiable`, et c'est ce qu'on verifie ici.
 *
 * Le conteneur ou tourne ce test n'a le droit de joindre aucune chaine :
 * TOUTES les sources echouent. C'est precisement le cas a verifier, et
 * la seule chose qu'on puisse y verifier honnetement - un « oui » exige
 * un vrai RPC. Le cas « oui » est couvert par npm run market:check et
 * par la verification manuelle d'un wallet connu.
 *
 * Lancement : npm run net:gate
 */

import { verifierDetention } from "../../src/lib/security/gate";

let echecs = 0;
function verifier(nom: string, condition: boolean) {
  console.log(`  ${condition ? "ok   " : "ECHEC"}  ${nom}`);
  if (!condition) echecs++;
}

console.log("\nLa porte des detenteurs\n");

const ADRESSE = "0x1178808a1a8d46f498d7b5e1314fe146bada92ed";

console.log("  (toutes les chaines sont injoignables depuis ce conteneur)\n");
const v = await verifierDetention(ADRESSE);

verifier("une lecture impossible est signalee comme partielle", v.partiel === true);
verifier("le total est nul", Object.values(v.pieces).reduce((n, x) => n + x, 0) === 0);
verifier("le verdict n'est PAS detenteur", v.detenteur === false);

// Le coeur du correctif : ce « non » ne doit pas etre inscriptible.
verifier("et surtout : ce « non » n'est pas fiable", v.fiable === false);

verifier("l'horodatage est pose", typeof v.verifieA === "string" && v.verifieA.length > 10);

console.log(
  echecs === 0
    ? "\nTout passe. Un detenteur ne peut plus etre degrade par une panne de fournisseur.\n"
    : `\n${echecs} verification(s) en echec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
