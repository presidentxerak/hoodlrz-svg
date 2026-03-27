import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { tokenId, recipientEmail } = body as {
      tokenId?: string;
      recipientEmail?: string;
    };

    if (!tokenId || !recipientEmail) {
      return NextResponse.json(
        { error: "tokenId and recipientEmail are required." },
        { status: 400 }
      );
    }

    // Fetch token and verify ownership
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", tokenId)
      .single();

    if (tokenError || !token) {
      return NextResponse.json(
        { error: "Token not found." },
        { status: 404 }
      );
    }

    if (token.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this token." },
        { status: 403 }
      );
    }

    if (token.is_listed) {
      return NextResponse.json(
        { error: "Cannot transfer a listed token. Unlist it first." },
        { status: 409 }
      );
    }

    // Find recipient account by email, or create a placeholder
    let recipientId: string;

    const { data: existingAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("email", recipientEmail)
      .single();

    if (existingAccount) {
      recipientId = existingAccount.id;
    } else {
      // Create a placeholder account for the recipient
      // They will claim it when they sign up with this email
      const newId = crypto.randomUUID();
      const { data: newAccount, error: createError } = await supabase
        .from("accounts")
        .insert({
          id: newId,
          email: recipientEmail,
          pseudonym: recipientEmail.split("@")[0],
          onboarding_complete: false,
        })
        .select()
        .single();

      if (createError || !newAccount) {
        console.error("[transfer] Failed to create recipient:", createError?.message);
        return NextResponse.json(
          { error: "Failed to create recipient account." },
          { status: 500 }
        );
      }

      recipientId = newAccount.id;
    }

    // Cannot transfer to yourself
    if (recipientId === user.id) {
      return NextResponse.json(
        { error: "Cannot transfer a token to yourself." },
        { status: 400 }
      );
    }

    // Transfer ownership
    const { error: transferError } = await supabase
      .from("tokens")
      .update({ owner_id: recipientId })
      .eq("id", tokenId);

    if (transferError) {
      console.error("[transfer] Update error:", transferError.message);
      return NextResponse.json(
        { error: "Failed to transfer token." },
        { status: 500 }
      );
    }

    // Create ownership_event
    await supabase.from("ownership_events").insert({
      token_id: tokenId,
      from_account_id: user.id,
      to_account_id: recipientId,
      event_type: "transfer",
    });

    return NextResponse.json({
      success: true,
      recipientId,
    });
  } catch (err) {
    console.error("[transfer] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
