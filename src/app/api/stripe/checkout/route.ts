<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeServer } from "@/lib/stripe";

interface CheckoutBody {
  name: string;
  description?: string;
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CheckoutBody>;

    if (!body.name || typeof body.amountCents !== "number" || body.amountCents <= 0) {
      return NextResponse.json(
        { error: "name and a positive amountCents are required." },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: body.currency ?? "usd",
            product_data: {
              name: body.name,
              description: body.description ?? undefined,
            },
            unit_amount: body.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        ...body.metadata,
        accountId: user.id,
        type: "general",
      },
      success_url:
        body.successUrl ??
        `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl ?? `${origin}/checkout/cancelled`,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (err) {
    console.error("[stripe/checkout] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
=======
import { NextResponse } from "next/server";

// This generic checkout route is disabled for security.
// Use /api/collect for primary sales or /api/marketplace/buy for marketplace purchases.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is disabled. Use /api/collect or /api/marketplace/buy." },
    { status: 403 }
  );
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
}
