import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy LayerStore
  console.log("\n1/3 — Deploying HoodlrzLayerStore...");
  const LayerStore = await ethers.getContractFactory("HoodlrzLayerStore");
  const layerStore = await LayerStore.deploy();
  await layerStore.waitForDeployment();
  const layerStoreAddr = await layerStore.getAddress();
  console.log("   LayerStore:", layerStoreAddr);

  // 2. Deploy main NFT contract
  const mintPrice = ethers.parseEther("0.007");
  console.log("\n2/3 — Deploying HoodlrzOnChain (mint price:", ethers.formatEther(mintPrice), "ETH)...");
  const NFT = await ethers.getContractFactory("HoodlrzOnChain");
  // Deploy with a temporary renderer address (will update after renderer is deployed)
  const nft = await NFT.deploy(mintPrice, ethers.ZeroAddress);
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("   HoodlrzOnChain:", nftAddr);

  // 3. Deploy Renderer
  console.log("\n3/3 — Deploying HoodlrzRenderer...");
  const Renderer = await ethers.getContractFactory("HoodlrzRenderer");
  const renderer = await Renderer.deploy(nftAddr, layerStoreAddr);
  await renderer.waitForDeployment();
  const rendererAddr = await renderer.getAddress();
  console.log("   HoodlrzRenderer:", rendererAddr);

  // 4. Wire renderer to NFT
  console.log("\nWiring renderer to NFT...");
  await nft.setRenderer(rendererAddr);
  console.log("   Done.");

  // Summary
  console.log("\n══════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("══════════════════════════════════════");
  console.log("  LayerStore:  ", layerStoreAddr);
  console.log("  NFT:         ", nftAddr);
  console.log("  Renderer:    ", rendererAddr);
  console.log("  Mint Price:  ", ethers.formatEther(mintPrice), "ETH");
  console.log("══════════════════════════════════════");
  console.log("\nNext steps:");
  console.log("  1. Upload SVG layers: npx hardhat run scripts/upload-layers.ts --network <network>");
  console.log("  2. Lock layer store:  call layerStore.lock()");
  console.log("  3. Toggle mint:       call nft.toggleMint(true)");
  console.log("\nAdd to .env.local:");
  console.log(`  NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS=${nftAddr}`);
  console.log(`  NEXT_PUBLIC_HOODLRZ_CHAIN_ID=<chain-id>`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
