/**
 * Ethereum / Web3 configuration for Hoodlrz On-Chain.
 *
 * Set these env vars in Vercel / .env.local:
 *   NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS       - deployed full-on-chain HoodlrzOnChain contract address
 *   NEXT_PUBLIC_HOODLRZ_STREET_ADDRESS    - deployed standard ERC-721 Hoodlrz collection address
 *   NEXT_PUBLIC_HOODLRZ_CHAIN_ID          - 1 (mainnet) or 11155111 (Sepolia)
 *   NEXT_PUBLIC_HOODLRZ_TREASURY_ADDRESS  - wallet holding the 200 reserved tokens given out as game rewards
 *   HOODLRZ_TREASURY_PRIVATE_KEY          - SERVER-ONLY. Private key of the treasury wallet so /api/city/claim can sign transfers
 */

export const HOODLRZ_NFT_ADDRESS =
  process.env.NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS ?? "";

/**
 * Standard ERC-721 Hoodlrz collection on Ethereum mainnet.
 * The home page gallery fetches its tokens + metadata from this address.
 */
export const HOODLRZ_STREET_ADDRESS =
  process.env.NEXT_PUBLIC_HOODLRZ_STREET_ADDRESS ??
  "0xdde5f965f9d80da49c5cb2951d046156f26ebfa2";

export const HOODLRZ_STREET_CHAIN_ID = 1; // mainnet

/**
 * Collection OG Hoodlrz sur OpenSea.
 *
 * L'URL par contrat marche toujours et ne demande rien a configurer.
 * Une URL de collection (opensea.io/collection/<slug>) est plus belle et
 * montre la banniere et les statistiques : la renseigner via
 * NEXT_PUBLIC_HOODLRZ_OPENSEA_URL des qu'on connait le slug.
 */
export const HOODLRZ_OPENSEA_URL =
  process.env.NEXT_PUBLIC_HOODLRZ_OPENSEA_URL ??
  `https://opensea.io/assets/ethereum/${HOODLRZ_STREET_ADDRESS}`;

export const HOODLRZ_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_HOODLRZ_CHAIN_ID ?? "11155111" // default Sepolia
);

/**
 * Wallet that holds the 200 reserved Hoodlrz On-Chain NFTs given out as
 * game rewards. The /api/city/claim endpoint reads ownership against
 * this address and signs safeTransferFrom out of it using
 * HOODLRZ_TREASURY_PRIVATE_KEY (server-only env var).
 */
export const HOODLRZ_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_HOODLRZ_TREASURY_ADDRESS ?? "";

/**
 * Wallet that receives ETH payments for Genesis vinyls.
 * Set NEXT_PUBLIC_VINYL_ETH_ADDRESS in env. If empty, the ETH
 * payment button stays disabled.
 */
export const VINYL_ETH_ADDRESS =
  process.env.NEXT_PUBLIC_VINYL_ETH_ADDRESS ?? "";

export const CHAIN_CONFIG: Record<number, { name: string; rpcUrl: string; explorerUrl: string; currency: string; alchemyNetwork: string }> = {
  1: {
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    currency: "ETH",
    alchemyNetwork: "eth-mainnet",
  },
  11155111: {
    name: "Sepolia Testnet",
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "SepoliaETH",
    alchemyNetwork: "eth-sepolia",
  },
};

export const CURRENT_CHAIN = CHAIN_CONFIG[HOODLRZ_CHAIN_ID] ?? CHAIN_CONFIG[11155111];

export const isMainnet = HOODLRZ_CHAIN_ID === 1;
