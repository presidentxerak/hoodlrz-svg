import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, pseudonym } = (await request.json()) as {
      email?: string;
      pseudonym?: string;
    };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!pseudonym || pseudonym.trim().length < 2) {
      return NextResponse.json({ error: "A pseudo (at least 2 characters) is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const trimmedPseudo = pseudonym.trim();

    // Check if user already exists
    const { data: existingAccount } = await admin
      .from("accounts")
      .select("auth_id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Send magic link to confirm email — account will be created on confirmation
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/api/auth/callback`,
        data: { pseudonym: trimmedPseudo, auth_method: "email" },
      },
    });

    if (error) {
      console.error("[auth/signup] OTP error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/signup] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
