import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const nft = new ethers.Contract(
    "0x66A3A05bbcf1716834C1e53BC872307936871222",
    [
      "function toggleMint(bool) external",
      "function mint(uint256) external payable",
      "function totalSupply() view returns (uint256)",
      "function tokenURI(uint256) view returns (string)",
      "function mintPrice() view returns (uint256)",
    ],
    wallet
  );

  console.log("Activating mint...");
  const tx1 = await nft.toggleMint(true);
  await tx1.wait();
  console.log("Mint activated!");

  console.log("Minting 1 NFT (0.007 ETH)...");
  const price = await nft.mintPrice();
  const tx2 = await nft.mint(1, { value: price, gasLimit: 500_000n });
  await tx2.wait();
  const supply = await nft.totalSupply();
  console.log("Minted! Total supply:", supply.toString());

  console.log("Fetching tokenURI(1)...");
  const uri = await nft.tokenURI(1);
  console.log("TokenURI length:", uri.length);
  console.log("Preview (first 300 chars):", uri.slice(0, 300));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
