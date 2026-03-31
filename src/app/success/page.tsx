"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";

/* ── Inner component that reads search params ── */
function SuccessContent() {
  const searchParams = useSearchParams();

  // TODO: read real token data from search params / Supabase
  const tokenSeed = searchParams.get("seed") || "hoodlrz-token-0042";
  const tokenId = searchParams.get("id") || "hoodlrz-42";
  const collectionSlug = searchParams.get("collection") || "hoodlrz";
  const username = searchParams.get("user") || "phantom_42";

  const serialParts = tokenId.split("-");
  const tokenNumber = serialParts[serialParts.length - 1];

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8 animate-fade-in-up">
        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[44px]">
            Welcome to the Club
          </h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            Your identity has been claimed.
          </p>
        </div>

        {/* PFP */}
        <div className="w-full max-w-xs">
          <PFPViewer
            seed={tokenSeed}
            size={400}
            className="aspect-square w-full"
          />
        </div>

        {/* Info */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted">
            Collected by{" "}
            <span className="font-semibold text-foreground">{username}</span>
          </p>
          <p className="text-xs uppercase tracking-widest text-muted">
            Serial #{tokenNumber}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            href={`/collection/${collectionSlug}`}
          >
            Collect Again
          </Button>
          <Button
            variant="secondary"
            size="md"
            href="/my-collection"
          >
            View My Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-sm text-muted">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
