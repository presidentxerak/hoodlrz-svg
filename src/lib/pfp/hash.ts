// ── Hashing & Seed Utilities for Hoodlrz PFP ──

/**
 * Generate a random seed string. Works in both browser and Node.
 */
export function generateSeed(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: random hex string
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert a seed string to a 32-bit unsigned integer for PRNG seeding.
 * Uses a simple but effective string hashing (FNV-1a inspired).
 */
export function seedToNumber(seed: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0; // ensure unsigned
}

/**
 * Compute a SHA-256 hex digest of an SVG string for verification.
 * Works in browser (Web Crypto) and Node 18+.
 */
export async function computeCanonicalHash(svg: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(svg);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback: simple deterministic hash (not cryptographic)
  let hash = 0;
  for (let i = 0; i < svg.length; i++) {
    const char = svg.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
