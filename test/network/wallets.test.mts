/**
 * La detection des wallets.
 *
 * CE QUE CE TEST DEFEND
 * Le bug qui vient de se produire : l'application annoncait « aucun
 * wallet detecte » et proposait des liens de telechargement a des gens
 * qui avaient deja MetaMask. La cause etait une lecture de
 * `window.ethereum` pendant le rendu, c'est-a-dire AVANT que l'extension
 * ait fini de s'injecter.
 *
 * Les trois verifications ci-dessous reproduisent les trois situations
 * reelles : une extension qui s'annonce, une extension qui s'injecte en
 * retard, et plusieurs extensions a la fois.
 *
 * Lancement : npm run net:wallets
 */

// Une fenetre minimale, posee AVANT l'import du module : il s'abonne a
// `window` des son premier appel.
class FausseFenetre extends EventTarget {}
const fenetre = new FausseFenetre() as unknown as Window & typeof globalThis;
(globalThis as unknown as { window: unknown }).window = fenetre;

const { attendreWallets, attendreStabilite, surWallets } = await import(
  "../../src/lib/web3/providers"
);

let echecs = 0;
function verifier(nom: string, condition: boolean) {
  console.log(`  ${condition ? "ok   " : "ECHEC"}  ${nom}`);
  if (!condition) echecs++;
}

const faux = (nom: string) => ({
  request: async () => ["0x0000000000000000000000000000000000000001"],
  _nom: nom,
});

/**
 * Une extension conforme a EIP-6963 : elle ecoute la demande et repond
 * par une annonce. C'est exactement ce que fait MetaMask depuis 2024.
 */
function brancherExtension(nom: string, rdns: string, retardMs = 0) {
  const annoncer = () => {
    setTimeout(() => {
      fenetre.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: { uuid: rdns, name: nom, icon: `data:image/svg+xml,<svg/>`, rdns },
            provider: faux(nom),
          },
        }),
      );
    }, retardMs);
  };
  fenetre.addEventListener("eip6963:requestProvider", annoncer);
  // Les extensions annoncent aussi d'elles-memes au chargement.
  annoncer();
}

console.log("\nDetection des wallets\n");

/* 1. Une extension qui repond tout de suite ---------------------------- */
brancherExtension("MetaMask", "io.metamask");
{
  const liste = await attendreWallets(500);
  verifier("une extension conforme est trouvee", liste.length === 1);
  verifier("elle porte son nom", liste[0]?.nom === "MetaMask");
  verifier("et son icone en data: URI", liste[0]?.icone?.startsWith("data:") === true);
}

/* 2. Une extension qui arrive en retard -------------------------------- */
// C'est le coeur du bug : au premier rendu elle n'est pas la. Une lecture
// synchrone concluait « aucun wallet » ; l'attente la voit arriver.
brancherExtension("Rabby", "io.rabby", 250);
{
  // attendreStabilite et non attendreWallets : le second rend la main
  // des le premier wallet trouve, ce qui est exactement ce qu'il ne faut
  // PAS faire pour savoir combien il y en a.
  const liste = await attendreStabilite(300, 1500);
  const noms = liste.map((w) => w.nom).sort();
  verifier("une extension qui s'injecte en retard est vue", noms.includes("Rabby"));
  verifier("sans faire disparaitre la premiere", noms.includes("MetaMask"));
}

/* 3. Plusieurs extensions coexistent ----------------------------------- */
brancherExtension("Phantom", "app.phantom");
{
  const liste = await attendreStabilite(300, 1500);
  verifier("trois wallets coexistent sans s'ecraser", liste.length === 3);
  const ids = new Set(liste.map((w) => w.id));
  verifier("chacun garde un identifiant distinct", ids.size === 3);
}

/* 4. Une annonce repetee ne cree pas de doublon ------------------------ */
// Les extensions reannoncent a chaque demande ; sans garde, la liste
// doublerait a chaque appel de attendreWallets.
{
  fenetre.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((r) => setTimeout(r, 120));
  const liste = await attendreStabilite(200, 900);
  verifier("une annonce repetee ne duplique rien", liste.length === 3);
}

/* 5. Les abonnes sont prevenus ----------------------------------------- */
{
  let recu = 0;
  const stop = surWallets(() => recu++);
  verifier("un abonne recoit la liste immediatement", recu === 1);
  stop();
}

console.log(echecs === 0 ? "\nTout passe.\n" : `\n${echecs} verification(s) en echec.\n`);
process.exit(echecs === 0 ? 0 : 1);
