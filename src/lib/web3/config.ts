/**
 * Ethereum / Web3 configuration for Hoodlrz On-Chain.
 *
 * Set these env vars in Vercel / .env.local:
 *   NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS — deployed HoodlrzOnChain contract address
 *   NEXT_PUBLIC_HOODLRZ_CHAIN_ID    — 1 (mainnet) or 11155111 (Sepolia)
 */

export const HOODLRZ_NFT_ADDRESS =
  process.env.NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS ?? "";

export const HOODLRZ_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_HOODLRZ_CHAIN_ID ?? "11155111" // default Sepolia
);

export const CHAIN_CONFIG: Record<number, { name: string; rpcUrl: string; rpcFallbacks: string[]; explorerUrl: string; currency: string }> = {
  1: {
    name: "Ethereum Mainnet",
    rpcUrl: "https://cloudflare-eth.com",
    rpcFallbacks: [
      "https://rpc.ankr.com/eth",
      "https://eth.llamarpc.com",
      "https://1rpc.io/eth",
    ],
    explorerUrl: "https://etherscan.io",
    currency: "ETH",
  },
  11155111: {
    name: "Sepolia Testnet",
    rpcUrl: "https://rpc.sepolia.org",
    rpcFallbacks: [
      "https://rpc.ankr.com/eth_sepolia",
    ],
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "SepoliaETH",
  },
};

export const CURRENT_CHAIN = CHAIN_CONFIG[HOODLRZ_CHAIN_ID] ?? CHAIN_CONFIG[11155111];

export const isMainnet = HOODLRZ_CHAIN_ID === 1;
