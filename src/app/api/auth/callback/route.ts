import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/access?error=missing_code", requestUrl.origin)
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`/access?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  // Ensure account record exists (created on first sign-up via magic link)
  if (data.user) {
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("accounts")
        .select("id")
        .eq("auth_id", data.user.id)
        .single();

      if (!existing) {
        const pseudo =
          data.user.user_metadata?.pseudonym ||
          `Collector#${data.user.id.substring(0, 6)}`;
        await admin.from("accounts").insert({
          auth_id: data.user.id,
          email: data.user.email ?? "",
          pseudonym: pseudo,
        });
      }
    } catch (err) {
      console.error("[auth/callback] Account creation error:", err);
    }
  }

  // Always redirect to My Collection after email confirmation
  return NextResponse.redirect(new URL("/my-collection", requestUrl.origin));
}
