"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PFPViewer from "@/components/ui/PFPViewer";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
  seed: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function TransferModal({
  isOpen,
  onClose,
  tokenId,
  seed,
}: TransferModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleTransfer() {
    if (!isValid) {
      setError("Enter a valid email address");
      return;
    }

    setStatus("loading");
    setError("");

    try {
<<<<<<< HEAD
      // TODO: Replace with actual API call
      // await fetch("/api/transfer", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ tokenId, recipientEmail: email }),
      // });
      await new Promise((r) => setTimeout(r, 1000));
=======
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, recipientEmail: email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Transfer failed (${res.status})`);
      }
>>>>>>> claude/build-hoodlrz-platform-7Ex6i
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Transfer failed. Please try again.");
    }
  }

  function handleClose() {
    setEmail("");
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
            Transfer
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
              Transferred to {email}
            </p>
            <p className="text-xs text-muted">
              The recipient will receive an email notification.
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

            {/* Warning */}
            <div className="border border-amber-500/40 bg-amber-500/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
                Warning
              </p>
              <p className="mt-1 text-xs text-muted">
                This action cannot be undone. The collectible will be
                permanently transferred to the recipient.
              </p>
            </div>

            {/* Recipient */}
            <Input
              label="Recipient Email"
              name="recipientEmail"
              type="email"
              placeholder="collector@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              error={error}
            />

            {/* Action */}
            <Button
              variant="primary"
              onClick={handleTransfer}
              disabled={status === "loading" || !email}
            >
              {status === "loading" ? "Transferring..." : "Transfer"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
