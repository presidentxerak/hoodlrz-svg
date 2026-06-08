import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider } from "ethers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVinylById } from "@/lib/genesis/vinyls";
import { VINYL_ETH_ADDRESS, HOODLRZ_CHAIN_ID } from "@/lib/web3/config";
import { computeCanonicalHash } from "@/lib/pfp/hash";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const VINYL_PRICE_EUR = 500;
// Accept a payment that is at least (1 - tolerance) of the server-side quote,
// to absorb ETH/EUR drift between the buyer's quote and confirmation.
const PRICE_TOLERANCE = 0.08;

const RPC_URLS: Record<number, string[]> = {
  1: [
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
    "https://eth.llamarpc.com",
    "https://1rpc.io/eth",
  ],
  11155111: [
    "https://rpc.sepolia.org",
    "https://rpc.ankr.com/eth_sepolia",
  ],
};

interface Shipping {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

async function getProvider(chainId: number): Promise<JsonRpcProvider> {
  const urls = RPC_URLS[chainId] ?? RPC_URLS[1];
  for (const url of urls) {
    try {
      const provider = new JsonRpcProvider(url);
      await provider.getBlockNumber();
      return provider;
    } catch {
      // try next
    }
  }
  throw new Error(`No working RPC for chain ${chainId}`);
}

async function fetchEurPerEth(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur",
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data: { ethereum?: { eur?: number } } = await res.json();
  const eur = data.ethereum?.eur;
  if (typeof eur !== "number" || eur <= 0) throw new Error("Bad rate payload");
  return eur;
}

function isValidShipping(s: unknown): s is Shipping {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.fullName === "string" && o.fullName.trim().length > 1 &&
    typeof o.address === "string" && o.address.trim().length > 3 &&
    typeof o.city === "string" && o.city.trim().length > 1 &&
    typeof o.postalCode === "string" && o.postalCode.trim().length > 1 &&
    typeof o.country === "string" && o.country.trim().length > 1
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!VINYL_ETH_ADDRESS) {
      return NextResponse.json(
        { error: "ETH payments are not configured." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      vinylId,
      txHash,
      chainId,
      payerAddress,
      email,
      shipping,
      trackSelection,
    } = body as {
      vinylId?: string;
      txHash?: string;
      chainId?: number;
      payerAddress?: string;
      email?: string;
      shipping?: unknown;
      trackSelection?: { sideA: string[]; sideB: string[] };
    };

    // ── Input validation ──
    if (!vinylId || !getVinylById(vinylId)) {
      return NextResponse.json({ error: "Invalid vinyl." }, { status: 400 });
    }
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Invalid transaction hash." }, { status: 400 });
    }
    if (chainId !== HOODLRZ_CHAIN_ID) {
      return NextResponse.json(
        { error: "Payment on unexpected network." },
        { status: 400 },
      );
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!isValidShipping(shipping)) {
      return NextResponse.json({ error: "Complete shipping address is required." }, { status: 400 });
    }
    if (
      !trackSelection ||
      !Array.isArray(trackSelection.sideA) || trackSelection.sideA.length !== 2 ||
      !Array.isArray(trackSelection.sideB) || trackSelection.sideB.length !== 2
    ) {
      return NextResponse.json({ error: "Please select 4 tracks (2 per side)." }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── Idempotency: this tx already recorded? ──
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existingOrder) {
      return NextResponse.json({ ok: true, alreadyRecorded: true });
    }

    // ── Double-sale guard ──
    const { data: existingToken } = await admin
      .from("tokens")
      .select("id")
      .eq("seed", vinylId)
      .maybeSingle();
    if (existingToken) {
      return NextResponse.json(
        { error: "This vinyl has already been collected." },
        { status: 409 },
      );
    }

    // ── On-chain verification ──
    const provider = await getProvider(chainId);
    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
    ]);

    if (!receipt || !tx) {
      return NextResponse.json({ error: "Transaction not found on-chain yet." }, { status: 400 });
    }
    if (receipt.status !== 1) {
      return NextResponse.json({ error: "Transaction failed on-chain." }, { status: 400 });
    }
    if ((tx.to ?? "").toLowerCase() !== VINYL_ETH_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: "Payment sent to the wrong address." }, { status: 400 });
    }
    if (payerAddress && tx.from.toLowerCase() !== payerAddress.toLowerCase()) {
      return NextResponse.json({ error: "Payer mismatch." }, { status: 400 });
    }

    // Expected wei = €500 / (EUR per ETH), with tolerance.
    const eurPerEth = await fetchEurPerEth();
    const expectedEth = VINYL_PRICE_EUR / eurPerEth;
    const minWei = BigInt(Math.floor(expectedEth * (1 - PRICE_TOLERANCE) * 1e18));
    if (tx.value < minWei) {
      return NextResponse.json(
        { error: "Insufficient payment amount." },
        { status: 400 },
      );
    }

    // ── Resolve / create account ──
    let accountId: string;
    const { data: account } = await admin
      .from("accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (account) {
      accountId = account.id;
    } else {
      const { data: newAccount, error: createErr } = await admin
        .from("accounts")
        .insert({
          email,
          pseudonym: `Collector#${email.split("@")[0].substring(0, 8)}`,
        })
        .select("id")
        .single();
      if (createErr || !newAccount) {
        console.error("[vinyl/eth-order] account create failed", createErr);
        return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      }
      accountId = newAccount.id;
    }

    // ── Resolve genesis collection ──
    const { data: collection, error: collErr } = await admin
      .from("collections")
      .select("*")
      .eq("slug", "genesis")
      .single();
    if (collErr || !collection) {
      return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    }

    const serialNumber = collection.minted_count + 1;
    const canonicalHash = await computeCanonicalHash(vinylId);

    // ── Insert token (seed = vinylId, same convention as the card flow) ──
    const { data: token, error: tokenErr } = await admin
      .from("tokens")
      .insert({
        collection_id: collection.id,
        owner_id: accountId,
        serial_number: serialNumber,
        seed: vinylId,
        traits_json: {},
        canonical_hash: canonicalHash,
      })
      .select("id")
      .single();
    if (tokenErr || !token) {
      console.error("[vinyl/eth-order] token insert failed", tokenErr);
      return NextResponse.json({ error: "Failed to record token." }, { status: 500 });
    }

    // ── Insert order with on-chain reference + shipping/tracks metadata ──
    // Spelt out as an object literal so TS sees each leaf as a primitive
    // string (the strict `Json` index-signature requirement rejects the
    // nominal `Shipping` interface otherwise).
    const orderMetadata: Json = {
      vinylId,
      payerAddress: tx.from,
      valueWei: tx.value.toString(),
      email,
      shipping: {
        fullName: shipping.fullName,
        address: shipping.address,
        city: shipping.city,
        postalCode: shipping.postalCode,
        country: shipping.country,
      },
      trackSelection: {
        sideA: trackSelection.sideA,
        sideB: trackSelection.sideB,
      },
    };

    const { error: orderErr } = await admin.from("orders").insert({
      account_id: accountId,
      collection_id: collection.id,
      token_id: token.id,
      amount_cents: VINYL_PRICE_EUR * 100,
      currency: "eth",
      status: "completed",
      order_type: "collect",
      tx_hash: txHash,
      chain_id: chainId,
      metadata: orderMetadata,
    });
    if (orderErr) {
      console.error("[vinyl/eth-order] order insert failed", orderErr);
      return NextResponse.json({ error: "Failed to record order." }, { status: 500 });
    }

    // ── Bump minted_count + mark vinyl sold (best-effort) ──
    await admin
      .from("collections")
      .update({ minted_count: serialNumber })
      .eq("id", collection.id);

    await admin
      .from("genesis_vinyls")
      .update({ sold: true, sold_at: new Date().toISOString() })
      .eq("id", vinylId);

    return NextResponse.json({ ok: true, tokenId: token.id });
  } catch (err) {
    console.error("[vinyl/eth-order] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
