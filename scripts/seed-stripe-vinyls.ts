/**
 * Idempotently create one Stripe Product + Price per Genesis vinyl
 * and store the resulting IDs back in `public.genesis_vinyls`.
 *
 * Re-run any time:
 *   - newly added vinyls in the table get Stripe objects created
 *   - rows that already have stripe_price_id are skipped
 *   - rows whose product was deleted in Stripe will be re-created
 *
 * Required env (loaded from .env.local):
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run seed:stripe                       # uses VINYL_PRICE_EUR_CENTS or 50000
 *   VINYL_PRICE_EUR_CENTS=70000 npm run seed:stripe
 */

import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRICE_CENTS = Number(process.env.VINYL_PRICE_EUR_CENTS ?? 50000);
const CURRENCY = "eur";

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
if (!SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
if (!Number.isInteger(PRICE_CENTS) || PRICE_CENTS < 100) {
  throw new Error(`VINYL_PRICE_EUR_CENTS must be an integer >= 100 (got ${PRICE_CENTS})`);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface VinylRow {
  id: string;
  edition: string;
  number: number;
  name: string;
  image: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

async function findExistingProduct(vinylId: string): Promise<Stripe.Product | null> {
  const search = await stripe.products.search({
    query: `metadata['vinyl_id']:'${vinylId}' AND active:'true'`,
    limit: 1,
  });
  return search.data[0] ?? null;
}

async function findExistingPrice(productId: string): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });
  return (
    prices.data.find(
      (p) => p.currency === CURRENCY && p.unit_amount === PRICE_CENTS,
    ) ?? null
  );
}

async function ensureStripeFor(vinyl: VinylRow): Promise<{
  productId: string;
  priceId: string;
  changed: boolean;
}> {
  let changed = false;

  // ── Product ──
  let product: Stripe.Product | null = null;

  if (vinyl.stripe_product_id) {
    try {
      const existing = await stripe.products.retrieve(vinyl.stripe_product_id);
      if (existing && !existing.deleted && existing.active) {
        product = existing;
      }
    } catch {
      // product was deleted in Stripe — fall through and recreate
    }
  }

  if (!product) {
    product = await findExistingProduct(vinyl.id);
  }

  if (!product) {
    product = await stripe.products.create({
      name: `Hoodlrz Genesis — ${vinyl.name}`,
      description: `Hand-drawn 1-of-1 vinyl sleeve. ${vinyl.edition} edition #${String(vinyl.number).padStart(2, "0")}. Custom-pressed disc with the buyer's chosen tracks. Shipped worldwide.`,
      images: [], // intentionally empty; populate manually with a public CDN URL if desired
      metadata: {
        vinyl_id: vinyl.id,
        edition: vinyl.edition,
        number: String(vinyl.number),
        kind: "genesis_vinyl",
      },
    });
    changed = true;
    console.log(`  created product ${product.id} for ${vinyl.id}`);
  }

  // ── Price ──
  let price: Stripe.Price | null = null;

  if (vinyl.stripe_price_id) {
    try {
      const existing = await stripe.prices.retrieve(vinyl.stripe_price_id);
      if (
        existing &&
        existing.active &&
        existing.product === product.id &&
        existing.currency === CURRENCY &&
        existing.unit_amount === PRICE_CENTS
      ) {
        price = existing;
      }
    } catch {
      // price was deleted/archived — fall through
    }
  }

  if (!price) {
    price = await findExistingPrice(product.id);
  }

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: CURRENCY,
      unit_amount: PRICE_CENTS,
      metadata: { vinyl_id: vinyl.id },
    });
    changed = true;
    console.log(`  created price ${price.id} (${PRICE_CENTS / 100} ${CURRENCY.toUpperCase()}) for ${vinyl.id}`);
  }

  return { productId: product.id, priceId: price.id, changed };
}

async function main() {
  console.log(`Seeding Stripe catalog for Genesis vinyls (${PRICE_CENTS / 100} ${CURRENCY.toUpperCase()} each)…\n`);

  const { data: vinyls, error } = await supabase
    .from("genesis_vinyls")
    .select("id, edition, number, name, image, stripe_product_id, stripe_price_id")
    .order("edition", { ascending: true })
    .order("number", { ascending: true });

  if (error) throw error;
  if (!vinyls || vinyls.length === 0) {
    console.error("No vinyls found in genesis_vinyls. Did you run migration 003?");
    process.exit(1);
  }

  console.log(`Found ${vinyls.length} vinyls in Supabase.\n`);

  let created = 0;
  let unchanged = 0;
  let updated = 0;

  for (const vinyl of vinyls as VinylRow[]) {
    process.stdout.write(`▶ ${vinyl.id}\n`);

    const { productId, priceId, changed } = await ensureStripeFor(vinyl);

    const needsDbUpdate =
      vinyl.stripe_product_id !== productId ||
      vinyl.stripe_price_id !== priceId;

    if (needsDbUpdate) {
      const { error: updErr } = await supabase
        .from("genesis_vinyls")
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vinyl.id);
      if (updErr) {
        console.error(`  ✗ DB update failed: ${updErr.message}`);
        continue;
      }
      console.log(`  ✓ DB updated → product=${productId}, price=${priceId}`);
      updated++;
    }

    if (changed) created++;
    else if (!needsDbUpdate) unchanged++;
  }

  console.log(`\nDone. created/updated in Stripe: ${created}, DB rows updated: ${updated}, already up-to-date: ${unchanged}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
