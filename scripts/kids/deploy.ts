/**
 * Phase 4 - Deploiement sur une chaine reelle.
 *
 * NON EXECUTE dans cet environnement : il n'y a ni cle privee, ni acces
 * reseau au testnet Robinhood Chain. Le script est ecrit, la sequence est
 * celle validee sur EVM locale (test/kids/e2e.test.mjs, 40/40), mais il
 * reste a le lancer pour de vrai.
 *
 * Prerequis :
 *   .env.local  ->  DEPLOYER_PRIVATE_KEY, RPC_URL, ROYALTY_RECEIVER
 *   kids/build/ ->  produit par `node scripts/kids/freeze-engine.mjs`
 *
 * Sequence :
 *   1. deploie le moteur, le renderer, le NFT
 *   2. televerse les 6 morceaux du moteur (une transaction chacun)
 *   3. verifie que le document reconstitue est identique a l'artefact gele
 *   4. scelle le moteur   <- irreversible
 *   5. mint la reserve de 300
 *
 * Volontairement, ce script NE fixe PAS les phases de mint et n'appelle
 * PAS lockRenderer() : ces deux gestes se font a la main, apres avoir
 * verifie le rendu depuis la chaine sur une marketplace.
 *
 * Usage : npx hardhat run scripts/kids/deploy.ts --network rhTestnet
 */

import { readFileSync, writeFileSync } from "fs";
import { ethers } from "hardhat";

const RESERVE_TO = process.env.RESERVE_RECEIVER || "";
const ROYALTY_TO = process.env.ROYALTY_RECEIVER || "";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Reseau   chainId ${net.chainId}`);
  console.log(`Deployeur ${deployer.address}`);
  console.log(`Solde     ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  if (!ROYALTY_TO) throw new Error("ROYALTY_RECEIVER manquant dans .env.local");
  const reserveTo = RESERVE_TO || deployer.address;

  const manifest = JSON.parse(readFileSync("kids/build/engine-manifest.json", "utf8"));
  const preChunks: string[] = JSON.parse(readFileSync("kids/build/engine-pre.json", "utf8"));
  const postChunks: string[] = JSON.parse(readFileSync("kids/build/engine-post.json", "utf8"));
  const artifactSha = "0x" + readFileSync("kids/build/engine.sha256", "utf8").split(" ")[0];

  /* ---- 1. Deploiement ------------------------------------------------ */
  const Engine = await ethers.getContractFactory("HoodlrzKidsEngine");
  const engine = await Engine.deploy();
  await engine.waitForDeployment();
  console.log(`Moteur   ${await engine.getAddress()}`);

  const Renderer = await ethers.getContractFactory("HoodlrzKidsRenderer");
  const renderer = await Renderer.deploy(await engine.getAddress());
  await renderer.waitForDeployment();
  console.log(`Renderer ${await renderer.getAddress()}`);

  const Kids = await ethers.getContractFactory("HoodlrzKids");
  const kids = await Kids.deploy(await renderer.getAddress(), ROYALTY_TO);
  await kids.waitForDeployment();
  console.log(`NFT      ${await kids.getAddress()}\n`);

  /* ---- 2. Televersement ---------------------------------------------- */
  console.log(`Televersement de ${manifest.storedBytes.toLocaleString("fr")} o en ` +
              `${preChunks.length + postChunks.length} morceaux`);
  let gasTotal = 0n;
  const send = async (isPre: boolean, data: string, label: string) => {
    const tx = await engine.appendChunk(isPre, data);
    const rc = await tx.wait();
    gasTotal += rc!.gasUsed;
    console.log(`  ${label}  ${((data.length - 2) / 2).toLocaleString("fr")} o  ` +
                `gas ${rc!.gasUsed.toLocaleString("fr")}`);
  };
  for (let i = 0; i < preChunks.length; i++) await send(true, preChunks[i], `pre  ${i}`);
  for (let i = 0; i < postChunks.length; i++) await send(false, postChunks[i], `post ${i}`);
  console.log(`  gas total ${(Number(gasTotal) / 1e6).toFixed(1)} M\n`);

  /* ---- 3. Verification AVANT scellement ------------------------------ */
  // Le scellement est irreversible : on relit d'abord ce que la chaine
  // renvoie reellement et on le compare octet a octet a l'artefact local.
  const probe = "0x" + "ab".repeat(32);
  const onChain: string = await engine.documentFor(probe);
  const local = readFileSync("kids/engine/frozen.html", "utf8").replace("__HASH__", probe);
  if (onChain !== local) {
    throw new Error(
      `Le document reconstitue differe de l'artefact local ` +
      `(${onChain.length} vs ${local.length} caracteres). ARRET AVANT SCELLEMENT.`
    );
  }
  console.log("Document reconstitue identique a l'artefact gele\n");

  /* ---- 4. Scellement -------------------------------------------------- */
  await (await engine.seal(artifactSha)).wait();
  console.log(`Moteur scelle   sha256 ${artifactSha}\n`);

  /* ---- 5. Reserve ----------------------------------------------------- */
  // Decoupee en lots de 100 pour rester loin de la limite de gas du bloc.
  for (let i = 0; i < 3; i++) {
    const tx = await kids.mintReserve(reserveTo, 100);
    await tx.wait();
    console.log(`  reserve ${(i + 1) * 100}/300 -> ${reserveTo}`);
  }

  const out = {
    chainId: Number(net.chainId),
    deployedAt: new Date().toISOString(),
    engine: await engine.getAddress(),
    renderer: await renderer.getAddress(),
    nft: await kids.getAddress(),
    artifactSha256: artifactSha,
    storedBytes: manifest.storedBytes,
    reserveReceiver: reserveTo,
    royaltyReceiver: ROYALTY_TO,
  };
  writeFileSync(`kids/build/deployment-${net.chainId}.json`, JSON.stringify(out, null, 2));

  console.log(`\nEcrit -> kids/build/deployment-${net.chainId}.json`);
  console.log(`
Reste a faire, a la main et dans cet ordre :
  1. verifier les 3 contrats sur l'explorateur
  2. ouvrir le tokenURI d'un token reserve sur OpenSea et controler
     vignette, animation et attributs
  3. setAllowlistRoot(<racine du snapshot>)
  4. setPhases(<allowlist>, <public>, <fin>)
  5. lockRenderer()   <- seulement une fois le rendu valide
  6. apres la fin du mint : revealSeed()
`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
