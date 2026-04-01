import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServer } from "@/lib/stripe";
import { getVinylById } from "@/lib/genesis";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      vinylId,
      firstName,
      lastName,
      email,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      country,
    } = body as {
      vinylId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };

    // Validate required fields
    if (
      !vinylId ||
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !address1 ||
      !city ||
      !state ||
      !zip ||
      !country
    ) {
      return NextResponse.json(
        { error: "All required fields must be provided." },
        { status: 400 }
      );
    }

    // Look up vinyl
    const vinyl = getVinylById(vinylId);
    if (!vinyl) {
      return NextResponse.json(
        { error: "Vinyl not found." },
        { status: 404 }
      );
    }

    // Use admin client for DB operations
    const admin = createAdminClient();

    // Look up or auto-create account
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    let accountId: string;

    if (accountError || !account) {
      const { data: newAccount, error: createError } = await admin
        .from("accounts")
        .insert({
          auth_id: user.id,
          email: user.email ?? "",
          pseudonym: `Collector#${user.id.substring(0, 6)}`,
        })
        .select("id")
        .single();

      if (createError || !newAccount) {
        console.error("[genesis/checkout] Failed to create account:", createError);
        return NextResponse.json(
          { error: "Failed to create account." },
          { status: 500 }
        );
      }

      accountId = newAccount.id;
    } else {
      accountId = account.id;
    }

    // Build shipping info for metadata
    const shippingInfo = JSON.stringify({
      firstName,
      lastName,
      email,
      phone,
      address1,
      address2: address2 || "",
      city,
      state,
      zip,
      country,
    });

    // Create Stripe checkout session
    const origin = new URL(request.url).origin;

    const checkoutSession = await getStripeServer().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: vinyl.name,
              description:
                "Hand-crafted vinyl artwork from the Hoodlrz Genesis collection. Free worldwide shipping.",
            },
            unit_amount: vinyl.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "genesis_sale",
        vinylId,
        accountId,
        shipping: shippingInfo,
      },
      success_url: `${origin}/success?type=genesis&vinyl=${vinylId}`,
      cancel_url: `${origin}/genesis/${vinylId}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[genesis/checkout] Unexpected error:", message, err);
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}
