import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    // Create user with random password (no magic link needed)
    const password = crypto.randomBytes(32).toString("hex");

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { pseudonym: trimmedPseudo, auth_method: "email" },
    });

    if (createError || !newUser?.user) {
      console.error("[auth/signup] Create user error:", createError);
      // Handle "user already registered" from Supabase auth
      if (createError?.message?.includes("already")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    // Create account record
    await admin.from("accounts").upsert(
      {
        auth_id: newUser.user.id,
        email: email.toLowerCase(),
        pseudonym: trimmedPseudo,
      },
      { onConflict: "auth_id" }
    );

    // Create session immediately
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
      console.error("[auth/signup] Sign in error:", signInError.message);
      return NextResponse.json({ error: "Account created but sign-in failed. Please sign in." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/signup] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
