// POST /api/city/claim
//
// Free-mint endpoint for the city game. When a player unlocks a secret
// soul or a vault they can claim ONE Hoodlrz On-Chain NFT from the
// treasury's reserved stock. One reward per wallet, ever — enforced by
// the city_claims primary key.
//
// Flow:
//   1. Client sends { wallet, rewardId, message, signature }
//   2. We verify the signature proves wallet ownership AND the message
//      embeds a fresh-enough timestamp (replay protection)
//   3. DB unique check: wallet already claimed? -> 409
//   4. Pick the next unclaimed tokenId the treasury still owns (via
//      Alchemy getNFTsForOwner against the on-chain contract)
//   5. Sign + broadcast safeTransferFrom(treasury -> wallet, tokenId)
//      from HOODLRZ_TREASURY_PRIVATE_KEY
//   6. Write the claim row, return { tokenId, txHash, explorerUrl }
//
// Required env vars:
//   ALCHEMY_KEY                          - read treasury inventory + tx RPC
//   HOODLRZ_TREASURY_PRIVATE_KEY         - signs the safeTransferFrom
//   NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS      - the on-chain HoodlrzOnChain contract
//   NEXT_PUBLIC_HOODLRZ_TREASURY_ADDRESS - the wallet holding the 200 reserved tokens
//   NEXT_PUBLIC_HOODLRZ_CHAIN_ID         - 1 (mainnet) or 11155111 (sepolia)

import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract, verifyMessage, getAddress } from "ethers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  HOODLRZ_NFT_ADDRESS,
  HOODLRZ_TREASURY_ADDRESS,
  HOODLRZ_CHAIN_ID,
  CHAIN_CONFIG,
  CURRENT_CHAIN,
} from "@/lib/web3/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ERC721_TRANSFER_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MESSAGE_TTL_MS = 5 * 60 * 1000;          // accept a signed message at most 5 min old
const CLAIM_PREFIX = "Hoodlrz CITY reward claim";

interface ClaimBody {
  wallet?: string;
  rewardId?: string;
  message?: string;
  signature?: string;
}

function rpcUrl(): string {
  const key = process.env.ALCHEMY_KEY ?? process.env.ALCHEMY_API_KEY;
  const cfg = CHAIN_CONFIG[HOODLRZ_CHAIN_ID] ?? CURRENT_CHAIN;
  if (key) return `https://${cfg.alchemyNetwork}.g.alchemy.com/v2/${key}`;
  return cfg.rpcUrl;
}

async function nextAvailableTokenId(): Promise<number | null> {
  const key = process.env.ALCHEMY_KEY ?? process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  const cfg = CHAIN_CONFIG[HOODLRZ_CHAIN_ID] ?? CURRENT_CHAIN;
  const admin = createAdminClient();
  const { data: claimed } = await admin.from("city_claims").select("token_id");
  const claimedSet = new Set((claimed ?? []).map((r) => r.token_id as number));

  let pageKey: string | undefined;
  for (let page = 0; page < 10; page++) {
    const u = new URL(`https://${cfg.alchemyNetwork}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
    u.searchParams.set("owner", HOODLRZ_TREASURY_ADDRESS);
    u.searchParams.append("contractAddresses[]", HOODLRZ_NFT_ADDRESS);
    u.searchParams.set("pageSize", "100");
    u.searchParams.set("withMetadata", "false");
    if (pageKey) u.searchParams.set("pageKey", pageKey);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ownedNfts?: { tokenId?: string }[]; pageKey?: string };
    // Sort by tokenId so we hand them out deterministically.
    const ids = (data.ownedNfts ?? [])
      .map((n) => {
        const raw = String(n.tokenId ?? "");
        return parseInt(raw, raw.startsWith("0x") ? 16 : 10);
      })
      .filter((n) => Number.isFinite(n) && !claimedSet.has(n))
      .sort((a, b) => a - b);
    if (ids.length > 0) return ids[0];
    pageKey = data.pageKey;
    if (!pageKey) break;
  }
  return null;
}

export async function POST(request: NextRequest) {
  // ── 0. Config / env checks ──────────────────────────────────────────────
  if (!HOODLRZ_NFT_ADDRESS || !HOODLRZ_TREASURY_ADDRESS) {
    return NextResponse.json(
      { error: "Contract / treasury env vars not configured" },
      { status: 500 },
    );
  }
  const treasuryKey = process.env.HOODLRZ_TREASURY_PRIVATE_KEY;
  if (!treasuryKey) {
    return NextResponse.json(
      { error: "HOODLRZ_TREASURY_PRIVATE_KEY is not set on the server" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as ClaimBody;
  const wallet = (body.wallet || "").trim();
  const rewardId = (body.rewardId || "").trim().slice(0, 32);
  const message = body.message || "";
  const signature = body.signature || "";

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }
  if (!message || !signature) {
    return NextResponse.json({ error: "Missing message / signature" }, { status: 400 });
  }
  if (!message.startsWith(CLAIM_PREFIX)) {
    return NextResponse.json({ error: "Bad message format" }, { status: 400 });
  }
  // The signed message must embed wallet + reward + timestamp so signatures
  // can't be replayed across wallets / rewards / time.
  if (!message.includes(`Wallet: ${wallet.toLowerCase()}`)) {
    return NextResponse.json({ error: "Wallet mismatch in message" }, { status: 400 });
  }
  const tsMatch = message.match(/Timestamp: (\d+)/);
  if (!tsMatch) return NextResponse.json({ error: "Missing timestamp" }, { status: 400 });
  const ts = parseInt(tsMatch[1], 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MESSAGE_TTL_MS) {
    return NextResponse.json({ error: "Stale signature, refresh and try again" }, { status: 400 });
  }

  // ── 1. Verify signature ────────────────────────────────────────────────
  let recovered: string;
  try {
    recovered = verifyMessage(message, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match wallet" }, { status: 400 });
  }

  const lower = wallet.toLowerCase();
  const admin = createAdminClient();

  // ── 2. One reward per wallet ───────────────────────────────────────────
  const { data: existing } = await admin
    .from("city_claims")
    .select("token_id, tx_hash")
    .eq("wallet", lower)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: "This wallet already claimed a reward",
        tokenId: existing.token_id,
        txHash: existing.tx_hash,
        explorerUrl: `${CURRENT_CHAIN.explorerUrl}/tx/${existing.tx_hash}`,
      },
      { status: 409 },
    );
  }

  // ── 3. Pick next available token in treasury ───────────────────────────
  const tokenId = await nextAvailableTokenId();
  if (tokenId === null) {
    return NextResponse.json(
      { error: "No reserved tokens left in the treasury" },
      { status: 410 },
    );
  }

  // ── 4. Sign + broadcast safeTransferFrom ───────────────────────────────
  let txHash: string;
  try {
    const provider = new JsonRpcProvider(rpcUrl(), HOODLRZ_CHAIN_ID);
    const signer = new Wallet(treasuryKey, provider);
    if (signer.address.toLowerCase() !== HOODLRZ_TREASURY_ADDRESS.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Treasury private key does not match NEXT_PUBLIC_HOODLRZ_TREASURY_ADDRESS",
        },
        { status: 500 },
      );
    }
    // Double-check the treasury still owns this token right before we send -
    // covers the case where it was transferred out of band.
    const contract = new Contract(HOODLRZ_NFT_ADDRESS, ERC721_TRANSFER_ABI, signer);
    const currentOwner: string = await contract.ownerOf(tokenId);
    if (getAddress(currentOwner) !== getAddress(HOODLRZ_TREASURY_ADDRESS)) {
      return NextResponse.json(
        { error: "Selected token is no longer owned by the treasury, please retry" },
        { status: 409 },
      );
    }
    const tx = await contract.safeTransferFrom(
      HOODLRZ_TREASURY_ADDRESS,
      getAddress(wallet),
      tokenId,
    );
    // Wait one confirmation so we don't write the row before the tx is on-chain.
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: "Transfer reverted on-chain" }, { status: 502 });
    }
    txHash = receipt.hash;
  } catch (err) {
    const e = err as { code?: string; shortMessage?: string; message?: string };
    console.error("[city/claim] transfer failed:", e);
    return NextResponse.json(
      { error: e.shortMessage || e.message || "Transfer failed" },
      { status: 502 },
    );
  }

  // ── 5. Record the claim ────────────────────────────────────────────────
  const { error: insertErr } = await admin.from("city_claims").insert({
    wallet: lower,
    token_id: tokenId,
    tx_hash: txHash,
    reward_id: rewardId || null,
  });
  if (insertErr) {
    // Token already sent on-chain. Log + still return success to the player.
    console.error("[city/claim] db insert failed (token already transferred):", insertErr);
  }

  return NextResponse.json({
    ok: true,
    tokenId,
    txHash,
    explorerUrl: `${CURRENT_CHAIN.explorerUrl}/tx/${txHash}`,
    openseaUrl:
      HOODLRZ_CHAIN_ID === 1
        ? `https://opensea.io/assets/ethereum/${HOODLRZ_NFT_ADDRESS}/${tokenId}`
        : `https://testnets.opensea.io/assets/sepolia/${HOODLRZ_NFT_ADDRESS}/${tokenId}`,
  });
}

// Read-only helper the game can poll to know if a wallet has already claimed.
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ claimed: false }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("city_claims")
    .select("token_id, tx_hash, claimed_at")
    .eq("wallet", wallet.toLowerCase())
    .maybeSingle();
  if (!data) return NextResponse.json({ claimed: false });
  return NextResponse.json({
    claimed: true,
    tokenId: data.token_id,
    txHash: data.tx_hash,
    claimedAt: data.claimed_at,
    explorerUrl: `${CURRENT_CHAIN.explorerUrl}/tx/${data.tx_hash}`,
    openseaUrl:
      HOODLRZ_CHAIN_ID === 1
        ? `https://opensea.io/assets/ethereum/${HOODLRZ_NFT_ADDRESS}/${data.token_id}`
        : `https://testnets.opensea.io/assets/sepolia/${HOODLRZ_NFT_ADDRESS}/${data.token_id}`,
  });
}
