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
    const { listingId } = body as { listingId?: string };

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 }
      );
    }

    // Fetch listing and verify ownership
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("is_active", true)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Active listing not found." },
        { status: 404 }
      );
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this listing." },
        { status: 403 }
      );
    }

    // Deactivate listing
    const { error: updateError } = await supabase
      .from("listings")
      .update({ is_active: false })
      .eq("id", listingId);

    if (updateError) {
      console.error("[marketplace/unlist] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to remove listing." },
        { status: 500 }
      );
    }

    // Update token listing status
    await supabase
      .from("tokens")
      .update({ is_listed: false })
      .eq("id", listing.token_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[marketplace/unlist] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
