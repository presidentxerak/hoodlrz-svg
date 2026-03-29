"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PFPViewer from "@/components/ui/PFPViewer";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
  seed: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function SellModal({
  isOpen,
  onClose,
  tokenId,
  seed,
}: SellModalProps) {
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const priceNum = parseFloat(price);
  const isValid = !isNaN(priceNum) && priceNum > 0;

  async function handleList() {
    if (!isValid) {
      setError("Price must be greater than 0");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, price: priceNum }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Listing failed (${res.status})`);
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Failed to list. Please try again.");
    }
  }

  function handleClose() {
    setPrice("");
    setStatus("idle");
    setError("");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-md bg-background border border-[var(--border)] p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
            List for Sale
          </h2>
          <button
            onClick={handleClose}
            className="text-muted hover:text-foreground transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 flex items-center justify-center border border-emerald-500/40 text-emerald-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-foreground font-semibold">
              Listed for ${priceNum.toFixed(2)}
            </p>
            <p className="text-xs text-muted">
              Your collectible is now live on the marketplace.
            </p>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="mx-auto w-48">
              <PFPViewer seed={seed} size={192} className="aspect-square w-full" />
            </div>

            <p className="text-xs text-muted text-center">
              Token #{tokenId}
            </p>

            {/* Price Input */}
            <Input
              label="Price (USD)"
              name="price"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError("");
              }}
              error={error}
            />

            {/* Action */}
            <Button
              variant="primary"
              onClick={handleList}
              disabled={status === "loading" || !price}
            >
              {status === "loading" ? "Listing..." : "List for Sale"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
