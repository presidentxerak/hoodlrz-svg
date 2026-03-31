import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

// Server-side Stripe instance (lazy to avoid build errors without env vars)
let _stripe: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return _stripe;
}

<<<<<<< HEAD
// Backwards compat export
export const stripe = typeof process !== "undefined" && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : (null as unknown as Stripe);

=======
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
// Client-side Stripe singleton
let stripePromise: Promise<StripeClient | null> | null = null;

export function getStripe(): Promise<StripeClient | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripePromise;
}
