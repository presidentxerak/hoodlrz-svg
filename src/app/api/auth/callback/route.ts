import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
<<<<<<< HEAD
      new URL("/login?error=missing_code", requestUrl.origin)
=======
      new URL("/access?error=missing_code", requestUrl.origin)
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Exchange failed:", error.message);
    return NextResponse.redirect(
<<<<<<< HEAD
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
=======
      new URL(`/access?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
    );
  }

  return NextResponse.redirect(new URL("/my-collection", requestUrl.origin));
}
