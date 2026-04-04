import { NextResponse } from "next/server";

// This generic checkout route is disabled for security.
// Use /api/mint for primary sales or /api/marketplace/buy for marketplace purchases.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is disabled. Use /api/mint or /api/marketplace/buy." },
    { status: 403 }
  );
}
