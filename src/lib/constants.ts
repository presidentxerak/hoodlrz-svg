export const SITE_NAME = "Hoodlrz";

export const SITE_DESCRIPTION =
  "Collect, trade, and own unique on-chain SVG NFTs on Ethereum.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hoodlrz.com";

export const PLATFORM_FEE_PERCENT = 10;

export const CURRENCY = "usd";

export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/hoodlrz",
  discord: "https://discord.gg/hoodlrz",
  instagram: "https://instagram.com/hoodlrz",
} as const;

export const NAV_LINKS = [
  { label: "Collection", href: "/collection/hoodlrz" },
  { label: "Vinyl", href: "/genesis" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "My Collection", href: "/my-collection" },
] as const;

export const GENESIS_COLLECTION_SLUG = "genesis";

export const MAX_FILE_SIZE_MB = 10;

export const SUPPORTED_IMAGE_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const PAGINATION_DEFAULT_LIMIT = 24;

export const THEME_STORAGE_KEY = "hoodlrz-theme";

export const AUTH_COOKIE_NAME = "hoodlrz-auth";
