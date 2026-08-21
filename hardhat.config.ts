import type { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";

const hasKey = DEPLOYER_PRIVATE_KEY !== "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      type: "http",
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    mainnet: {
      type: "http",
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    // ── Robinhood Chain (Hoodlrz Kids) ────────────────────────────────
    // Chain IDs et RPC issus de résumés de recherche, PAS de la doc lue
    // directement : à confirmer sur docs.robinhood.com/chain avant tout
    // déploiement. C'est le premier point de la checklist testnet.
    rhTestnet: {
      type: "http",
      chainId: 46630,
      url: process.env.RH_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com",
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    rhMainnet: {
      type: "http",
      chainId: 4663,
      url: process.env.RH_MAINNET_RPC || "",
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
