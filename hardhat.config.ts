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
    // Valeurs confirmées le 22/08/2026 sur docs.robinhood.com/chain,
    // page « Connecting to Robinhood Chain ».
    //
    // Les endpoints publics existent mais la doc les dit rate-limited et
    // déconseillés en production. Un déploiement, c'est une trentaine de
    // transactions dont six qui poussent 24 Ko de moteur : exactement le
    // profil qui se fait limiter au pire moment. On passe donc par
    // Alchemy quand la clé est là — c'est le fournisseur recommandé par
    // Robinhood — et on garde le public en secours.
    rhTestnet: {
      type: "http",
      chainId: 46630,
      url: process.env.RH_TESTNET_RPC || (ALCHEMY_API_KEY
        ? `https://robinhood-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        : "https://rpc.testnet.chain.robinhood.com"),
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    rhMainnet: {
      type: "http",
      chainId: 4663,
      url: process.env.RH_MAINNET_RPC || (ALCHEMY_API_KEY
        ? `https://robinhood-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        : "https://rpc.mainnet.chain.robinhood.com"),
      accounts: hasKey ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
