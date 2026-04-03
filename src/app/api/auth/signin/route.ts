import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find existing account
    const { data: existingAccount } = await admin
      .from("accounts")
      .select("auth_id")
      .eq("email", email.toLowerCase())
      .single();

    if (!existingAccount?.auth_id) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 404 }
      );
    }

    // Set a random password for this session
    const password = crypto.randomBytes(32).toString("hex");
    await admin.auth.admin.updateUserById(existingAccount.auth_id, { password });

    // Create session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const cookieStore = cookies();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // May fail in certain contexts
          }
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("[auth/signin] Sign in error:", signInError.message);
      return NextResponse.json({ error: "Sign in failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/signin] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
