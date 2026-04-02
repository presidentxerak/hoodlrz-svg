import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadArtifact(name: string) {
  const artifactPath = resolve(
    __dirname,
    `../artifacts/contracts/${name}.sol/${name}.json`
  );
  return JSON.parse(readFileSync(artifactPath, "utf-8"));
}

function loadNestedArtifact(folder: string, name: string) {
  const artifactPath = resolve(
    __dirname,
    `../artifacts/contracts/${folder}/${name}.sol/${name}.json`
  );
  return JSON.parse(readFileSync(artifactPath, "utf-8"));
}

async function main() {
  // Get provider and signer from Hardhat
  const provider = new ethers.BrowserProvider(hre.network.provider);
  const deployer = await provider.getSigner();

  console.log("Deploying with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await provider.getBalance(deployer.address)),
    "ETH"
  );

  // 1. Deploy LayerStore
  console.log("\n1/3 - Deploying HoodlrzLayerStore...");
  const layerStoreArtifact = loadArtifact("HoodlrzLayerStore");
  const LayerStoreFactory = new ethers.ContractFactory(
    layerStoreArtifact.abi,
    layerStoreArtifact.bytecode,
    deployer
  );
  const layerStore = await LayerStoreFactory.deploy();
  await layerStore.waitForDeployment();
  const layerStoreAddr = await layerStore.getAddress();
  console.log("   LayerStore:", layerStoreAddr);

  // 2. Deploy main NFT contract
  const mintPrice = ethers.parseEther("0.007");
  const royaltyReceiver = deployer.address;
  console.log(
    "\n2/3 - Deploying HoodlrzOnChain (mint price:",
    ethers.formatEther(mintPrice),
    "ETH, royalties: 10% to",
    royaltyReceiver,
    ")..."
  );
  const nftArtifact = loadArtifact("HoodlrzOnChain");
  const NFTFactory = new ethers.ContractFactory(
    nftArtifact.abi,
    nftArtifact.bytecode,
    deployer
  );
  const nft = await NFTFactory.deploy(mintPrice, ethers.ZeroAddress, royaltyReceiver);
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("   HoodlrzOnChain:", nftAddr);

  // 3. Deploy Renderer
  console.log("\n3/3 - Deploying HoodlrzRenderer...");
  const rendererArtifact = loadArtifact("HoodlrzRenderer");
  const RendererFactory = new ethers.ContractFactory(
    rendererArtifact.abi,
    rendererArtifact.bytecode,
    deployer
  );
  const renderer = await RendererFactory.deploy(nftAddr, layerStoreAddr);
  await renderer.waitForDeployment();
  const rendererAddr = await renderer.getAddress();
  console.log("   HoodlrzRenderer:", rendererAddr);

  // 4. Wire renderer to NFT
  console.log("\nWiring renderer to NFT...");
  const nftContract = new ethers.Contract(nftAddr, nftArtifact.abi, deployer);
  const tx = await nftContract.setRenderer(rendererAddr);
  await tx.wait();
  console.log("   Done.");

  // Summary
  console.log("\n======================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("======================================");
  console.log("  LayerStore:  ", layerStoreAddr);
  console.log("  NFT:         ", nftAddr);
  console.log("  Renderer:    ", rendererAddr);
  console.log("  Mint Price:  ", ethers.formatEther(mintPrice), "ETH");
  console.log("  Royalties:    10% to", royaltyReceiver);
  console.log("======================================");
  console.log("\nNext steps:");
  console.log(
    "  1. Upload SVG layers: LAYER_STORE_ADDRESS=" +
      layerStoreAddr +
      " npx hardhat run scripts/upload-layers.ts --network <network>"
  );
  console.log("  2. Lock layer store:  call layerStore.lock()");
  console.log("  3. Toggle mint:       call nft.toggleMint(true)");
  console.log("\nAdd to Vercel env vars:");
  console.log(`  NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS=${nftAddr}`);
  console.log(`  NEXT_PUBLIC_HOODLRZ_CHAIN_ID=11155111  (for Sepolia)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
