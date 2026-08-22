/**
 * Deploiement sur une chaine reelle.
 *
 * Sequence, identique a celle validee sur EVM locale par
 * test/kids/e2e.test.mjs :
 *
 *   1. deploie le moteur, le renderer, le NFT
 *   2. televerse les morceaux du moteur, une transaction chacun
 *   3. relit le document depuis la chaine et le compare a l'artefact local
 *   4. scelle le moteur   <- IRREVERSIBLE
 *   5. mint la reserve
 *
 * REPRISE
 * Un televersement, c'est six transactions de 24 Ko sur un RPC que la
 * documentation Robinhood dit rate-limited. L'interruption n'est pas une
 * hypothese d'ecole. Relancer betement redeploierait trois contrats et
 * abandonnerait les precedents, moteur a moitie ecrit compris.
 *
 * Ce script reprend donc ou il s'est arrete, et il lit son avancement
 * SUR LA CHAINE - chunkCounts(), sealed_(), reserveMinted() - et non
 * dans un fichier local qui pourrait mentir. Le fichier de deploiement
 * ne sert qu'a retrouver les adresses.
 *
 * Volontairement, ce script ne fixe PAS les phases de mint et n'appelle
 * PAS lockRenderer(). Ces deux gestes se font a la main, apres avoir
 * verifie le rendu depuis la chaine.
 *
 * Usage :
 *   npx hardhat run scripts/kids/deploy.ts --network rhTestnet
 *   npx hardhat run scripts/kids/deploy.ts --network rhMainnet
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { ethers } from "hardhat";

/** Chain IDs confirmes sur docs.robinhood.com/chain le 22/08/2026. */
const KNOWN_CHAINS: Record<number, string> = {
  46630: "Robinhood Chain Testnet",
  4663: "Robinhood Chain",
};

async function main() {
  const config = JSON.parse(readFileSync("kids/config.json", "utf8"));
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const stateFile = `kids/build/deployment-${chainId}.json`;

  /* ---- 0. Verifications prealables ----------------------------------- */
  // Tout ce qui suit depense du gas et devient irreversible a l'etape 4.
  // Mieux vaut dix lignes de controle ici qu'un contrat oublie sur la
  // mauvaise chaine, ou 300 pieces envoyees au mauvais wallet.

  const chainName = KNOWN_CHAINS[chainId];
  if (!chainName) {
    throw new Error(
      `Chain ID ${chainId} inconnu.\n` +
      `  Attendu 46630 (testnet) ou 4663 (mainnet).\n` +
      `  Verifier l'option --network et le RPC dans .env.local.`
    );
  }

  const expected = config.addresses?.deployer ?? "";
  if (expected && deployer.address.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      `La cle signe avec ${deployer.address},\n` +
      `  or kids/config.json declare ${expected} comme deployeur.\n` +
      `  Les contrats appartiendraient a une adresse non declaree.`
    );
  }

  const royaltyTo = process.env.ROYALTY_RECEIVER || "";
  const reserveTo = process.env.RESERVE_RECEIVER || "";
  // Pas de repli silencieux sur l'adresse du deployeur : ce serait
  // envoyer 300 pieces sur le wallet chaud sans que personne ne l'ait
  // demande.
  if (!ethers.isAddress(royaltyTo)) throw new Error("ROYALTY_RECEIVER absent ou invalide dans .env.local  ->  npm run kids:sync-env");
  if (!ethers.isAddress(reserveTo)) throw new Error("RESERVE_RECEIVER absent ou invalide dans .env.local  ->  npm run kids:sync-env");

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`\nDeploiement Hoodlrz Kids`);
  console.log(`  reseau     ${chainName}  (chainId ${chainId})`);
  console.log(`  deployeur  ${deployer.address}`);
  console.log(`  solde      ${ethers.formatEther(balance)} ETH`);
  console.log(`  reserve -> ${reserveTo}`);
  console.log(`  royalties  ${royaltyTo}\n`);

  if (balance === 0n) {
    throw new Error("Solde nul. Alimenter le wallet avant de continuer.");
  }

  const manifest = JSON.parse(readFileSync("kids/build/engine-manifest.json", "utf8"));
  const preChunks: string[] = JSON.parse(readFileSync("kids/build/engine-pre.json", "utf8"));
  const postChunks: string[] = JSON.parse(readFileSync("kids/build/engine-post.json", "utf8"));
  const artifactSha = "0x" + readFileSync("kids/build/engine.sha256", "utf8").split(" ")[0];

  /* ---- 1. Deploiement, ou reprise ------------------------------------ */
  const prev = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : null;
  if (prev) {
    console.log(`Deploiement precedent trouve dans ${stateFile} - reprise\n`);
  }

  const save = (extra: Record<string, unknown>) => {
    const merged = { ...(prev ?? {}), chainId, ...extra };
    writeFileSync(stateFile, JSON.stringify(merged, null, 2) + "\n");
    Object.assign(prev ?? {}, merged);
    return merged;
  };

  let engine, renderer, kids;

  if (prev?.engine) {
    engine = await ethers.getContractAt("HoodlrzKidsEngine", prev.engine);
    console.log(`Moteur   ${prev.engine}   (deja deploye)`);
  } else {
    const Engine = await ethers.getContractFactory("HoodlrzKidsEngine");
    engine = await Engine.deploy();
    await engine.waitForDeployment();
    console.log(`Moteur   ${await engine.getAddress()}`);
    save({ engine: await engine.getAddress(), deployedAt: new Date().toISOString() });
  }

  if (prev?.renderer) {
    renderer = await ethers.getContractAt("HoodlrzKidsRenderer", prev.renderer);
    console.log(`Renderer ${prev.renderer}   (deja deploye)`);
  } else {
    const Renderer = await ethers.getContractFactory("HoodlrzKidsRenderer");
    renderer = await Renderer.deploy(await engine.getAddress());
    await renderer.waitForDeployment();
    console.log(`Renderer ${await renderer.getAddress()}`);
    save({ renderer: await renderer.getAddress() });
  }

  if (prev?.nft) {
    kids = await ethers.getContractAt("HoodlrzKids", prev.nft);
    console.log(`NFT      ${prev.nft}   (deja deploye)`);
  } else {
    const Kids = await ethers.getContractFactory("HoodlrzKids");
    kids = await Kids.deploy(await renderer.getAddress(), royaltyTo);
    await kids.waitForDeployment();
    console.log(`NFT      ${await kids.getAddress()}`);
    save({ nft: await kids.getAddress(), royaltyReceiver: royaltyTo });
  }
  console.log("");

  /* ---- 2. Televersement ---------------------------------------------- */
  // L'avancement se lit sur la chaine. Un fichier local dirait ce qu'on
  // croit avoir fait ; chunkCounts() dit ce qui y est vraiment.
  const [donePre, donePost] = await engine.chunkCounts();
  const already = Number(donePre) + Number(donePost);
  const total = preChunks.length + postChunks.length;

  if (already) console.log(`${already}/${total} morceaux deja sur la chaine`);
  if (already < total) {
    console.log(`Televersement de ${manifest.storedBytes.toLocaleString("fr")} o en ${total} morceaux`);
  }

  let gasTotal = 0n;
  const send = async (isPre: boolean, data: string, label: string) => {
    const tx = await engine.appendChunk(isPre, data);
    const rc = await tx.wait();
    gasTotal += rc!.gasUsed;
    console.log(`  ${label}  ${((data.length - 2) / 2).toLocaleString("fr")} o  gas ${rc!.gasUsed.toLocaleString("fr")}`);
  };
  for (let i = Number(donePre); i < preChunks.length; i++) await send(true, preChunks[i], `pre  ${i}`);
  for (let i = Number(donePost); i < postChunks.length; i++) await send(false, postChunks[i], `post ${i}`);
  if (gasTotal > 0n) console.log(`  gas total ${(Number(gasTotal) / 1e6).toFixed(1)} M\n`);

  /* ---- 3. Verification AVANT scellement ------------------------------ */
  // Le scellement est irreversible. On relit d'abord ce que la chaine
  // renvoie reellement et on le compare a l'artefact local.
  const probe = "0x" + "ab".repeat(32);
  const onChain: string = await engine.documentFor(probe);
  const local = readFileSync("kids/engine/frozen.html", "utf8").replace("__HASH__", probe);
  if (onChain !== local) {
    throw new Error(
      `Le document reconstitue differe de l'artefact local ` +
      `(${onChain.length} vs ${local.length} caracteres). ARRET AVANT SCELLEMENT.`
    );
  }
  console.log("Document reconstitue identique a l'artefact gele");

  /* ---- 4. Scellement -------------------------------------------------- */
  if (await engine.sealed_()) {
    console.log(`Moteur deja scelle\n`);
  } else {
    await (await engine.seal(artifactSha)).wait();
    console.log(`Moteur scelle   sha256 ${artifactSha}\n`);
    save({ artifactSha256: artifactSha, storedBytes: manifest.storedBytes });
  }

  /* ---- 5. Reserve ----------------------------------------------------- */
  const RESERVE = Number(await kids.RESERVE());
  const LOT = 50;   // lots courts : une reprise coute moins cher qu'un gros lot perdu
  let minted = Number(await kids.reserveMinted());
  if (minted >= RESERVE) {
    console.log(`Reserve deja mintee   ${minted}/${RESERVE}`);
  } else {
    while (minted < RESERVE) {
      const qty = Math.min(LOT, RESERVE - minted);
      await (await kids.mintReserve(reserveTo, qty)).wait();
      minted += qty;
      console.log(`  reserve ${minted}/${RESERVE} -> ${reserveTo}`);
    }
  }
  save({ reserveReceiver: reserveTo });

  console.log(`\nEcrit -> ${stateFile}`);
  console.log(`
Reste a faire, a la main et dans cet ordre :
  1. verifier les 3 contrats sur l'explorateur
  2. npm run kids:verify-chain    (comparaison octet a octet depuis la chaine)
  3. ouvrir le tokenURI d'un token reserve sur une marketplace et
     controler vignette, animation et attributs
  4. setAllowlistRoot(<racine du snapshot>)
  5. setPhases(<allowlist>, <public>, <fin>)      npm run kids:phases
  6. lockRenderer()   <- seulement une fois le rendu valide
  7. apres le sold-out ou la fin de fenetre : revealSeed()
`);
}

main().catch((e) => {
  console.error("\n  ECHEC\n  " + String(e.message).split("\n").join("\n  ") + "\n");
  process.exitCode = 1;
});
