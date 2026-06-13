"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import {
  VINYL_ETH_ADDRESS,
  HOODLRZ_CHAIN_ID,
  CURRENT_CHAIN,
} from "@/lib/web3/config";

const VINYL_PRICE_EUR = 500;

interface TrackSelection {
  sideA: { title: string }[];
  sideB: { title: string }[];
}

interface Props {
  vinylId: string;
  vinylName: string;
  trackSelection: TrackSelection | null;
}

type FlowState =
  | "idle"
  | "connecting"
  | "form"
  | "paying"
  | "confirming"
  | "recording"
  | "success"
  | "error";

interface Shipping {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

const EMPTY_SHIPPING: Shipping = {
  fullName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

async function getProvider(allowAnyNetwork = false) {
  if (typeof window === "undefined" || !(window as { ethereum?: unknown }).ethereum) return null;
  const { BrowserProvider } = await import("ethers");
  const eth = (window as { ethereum?: unknown }).ethereum as import("ethers").Eip1193Provider;
  return new BrowserProvider(eth, allowAnyNetwork ? "any" : undefined);
}

export default function EthVinylPayment({ vinylId, vinylName, trackSelection }: Props) {
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [eurPerEth, setEurPerEth] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);

  // Live EUR/ETH rate
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/eth-price")
        .then((r) => r.json())
        .then((d: { eurPerEth?: number | null }) => {
          if (!cancelled && d.eurPerEth) setEurPerEth(d.eurPerEth);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ethAmount = eurPerEth ? VINYL_PRICE_EUR / eurPerEth : null;
  const ethLabel = ethAmount
    ? ethAmount >= 0.01
      ? ethAmount.toFixed(4)
      : ethAmount.toPrecision(3)
    : "…";

  const notConfigured = !VINYL_ETH_ADDRESS;
  const noTracks = !trackSelection;

  const connect = useCallback(async () => {
    setError("");
    setState("connecting");

    const provider = await getProvider();
    if (!provider) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const dappUrl = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
        setState("idle");
        return;
      }
      setError("No Ethereum wallet detected. Install MetaMask.");
      setState("error");
      return;
    }

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts.length) throw new Error("No accounts");

      const chainIdHex = "0x" + HOODLRZ_CHAIN_ID.toString(16);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== HOODLRZ_CHAIN_ID) {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: chainIdHex }]);
        } catch (switchErr: unknown) {
          const code = (switchErr as { code?: number })?.code;
          if (code === 4902) {
            await provider.send("wallet_addEthereumChain", [{
              chainId: chainIdHex,
              chainName: CURRENT_CHAIN.name,
              rpcUrls: [CURRENT_CHAIN.rpcUrl],
              blockExplorerUrls: [CURRENT_CHAIN.explorerUrl],
              nativeCurrency: { name: CURRENT_CHAIN.currency, symbol: CURRENT_CHAIN.currency, decimals: 18 },
            }]);
          } else {
            setError(`Please switch to ${CURRENT_CHAIN.name} in your wallet.`);
            setState("error");
            return;
          }
        }
      }

      setWalletAddress(accounts[0]);
      setState("form");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg.includes("user rejected") ? "Connection cancelled." : msg);
      setState("error");
    }
  }, []);

  const shippingComplete =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
    shipping.fullName.trim().length > 1 &&
    shipping.address.trim().length > 3 &&
    shipping.city.trim().length > 1 &&
    shipping.postalCode.trim().length > 1 &&
    shipping.country.trim().length > 1;

  const pay = useCallback(async () => {
    if (!trackSelection || !ethAmount) return;
    setError("");
    setState("paying");

    try {
      const provider = await getProvider(true);
      if (!provider) throw new Error("Wallet not found");
      const signer = await provider.getSigner();
      const { parseEther } = await import("ethers");

      // Round to 6 decimals to keep the value readable in the wallet.
      const value = parseEther(ethAmount.toFixed(6));

      const tx = await signer.sendTransaction({
        to: VINYL_ETH_ADDRESS,
        value,
      });
      setTxHash(tx.hash);
      setState("confirming");

      await tx.wait();

      setState("recording");
      const res = await fetch("/api/vinyl/eth-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vinylId,
          txHash: tx.hash,
          chainId: HOODLRZ_CHAIN_ID,
          payerAddress: walletAddress,
          email,
          shipping,
          trackSelection: {
            sideA: trackSelection.sideA.map((t) => t.title),
            sideB: trackSelection.sideB.map((t) => t.title),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Payment succeeded but recording failed - surface tx so support can reconcile.
        throw new Error(
          (data.error || "Order recording failed") +
            ` Your payment went through (tx ${tx.hash.slice(0, 10)}…). Contact support with this hash.`,
        );
      }

      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED")) {
        setError("Transaction cancelled.");
      } else if (msg.includes("insufficient funds")) {
        setError("Insufficient ETH balance.");
      } else {
        setError(msg);
      }
      setState("error");
    }
  }, [trackSelection, ethAmount, vinylId, walletAddress, email, shipping]);

  const reset = () => {
    setState("idle");
    setError("");
    setTxHash("");
  };

  // ── Trigger button (replaces the old disabled placeholder) ──
  return (
    <>
      <button
        type="button"
        onClick={connect}
        disabled={notConfigured || noTracks || state === "connecting"}
        className={[
          "w-full px-8 py-4 text-sm font-bold uppercase tracking-widest",
          "border border-[#627eea] text-foreground bg-[#627eea]/10",
          "transition-all duration-150",
          notConfigured || noTracks
            ? "opacity-40 cursor-not-allowed grayscale"
            : "cursor-pointer hover:bg-[#627eea]/20",
        ].join(" ")}
      >
        <span className="flex items-center justify-center gap-3">
          <span>{state === "connecting" ? "Connecting…" : "Pay in ETH"}</span>
          <span className="text-muted text-xs font-normal normal-case tracking-normal">
            {notConfigured
              ? "Coming soon"
              : ethAmount
                ? `≈ ${ethLabel} ETH`
                : "…"}
          </span>
        </span>
      </button>

      {/* Shipping + confirm modal */}
      <Modal isOpen={state === "form"} onClose={reset}>
        <div className="relative flex flex-col gap-4 p-6 max-w-md w-full mx-auto bg-[var(--background)] border border-[var(--border)] max-h-[90vh] overflow-y-auto">
          <button
            onClick={reset}
            className="absolute top-3 right-3 text-muted hover:text-foreground text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>

          <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
            Pay in ETH
          </h2>
          <p className="text-sm text-muted">
            {vinylName} - €{VINYL_PRICE_EUR} (≈ {ethLabel} ETH at the current rate).
            Shipping details below; we send your vinyl worldwide.
          </p>

          <div className="text-xs text-muted">
            Wallet: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)} · {CURRENT_CHAIN.name}
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
            <Field label="Full name" value={shipping.fullName} onChange={(v) => setShipping((s) => ({ ...s, fullName: v }))} placeholder="Jane Doe" />
            <Field label="Address" value={shipping.address} onChange={(v) => setShipping((s) => ({ ...s, address: v }))} placeholder="123 Street, Apt 4" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={shipping.city} onChange={(v) => setShipping((s) => ({ ...s, city: v }))} placeholder="Paris" />
              <Field label="Postal code" value={shipping.postalCode} onChange={(v) => setShipping((s) => ({ ...s, postalCode: v }))} placeholder="75001" />
            </div>
            <Field label="Country" value={shipping.country} onChange={(v) => setShipping((s) => ({ ...s, country: v }))} placeholder="France" />
          </div>

          <button
            onClick={pay}
            disabled={!shippingComplete || !ethAmount}
            className={[
              "w-full px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white",
              "bg-[#627eea] transition-all duration-150",
              !shippingComplete || !ethAmount
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-[#4c6ce0] active:scale-[0.98]",
            ].join(" ")}
          >
            Pay {ethLabel} ETH
          </button>
          <p className="text-[10px] text-muted text-center">
            You pay the ETH equivalent of €{VINYL_PRICE_EUR} at the live rate. Gas fees apply.
          </p>
          {error && <p className="text-accent-red text-xs text-center">{error}</p>}
        </div>
      </Modal>

      {/* Paying / confirming / recording */}
      <Modal isOpen={state === "paying" || state === "confirming" || state === "recording"} onClose={() => {}}>
        <div className="flex flex-col items-center gap-5 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <div className="w-12 h-12 border-4 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
          <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
            {state === "paying"
              ? "Confirm in your wallet"
              : state === "confirming"
                ? "Confirming on-chain…"
                : "Finalising your order…"}
          </h2>
          <p className="text-sm text-center text-muted">
            {state === "paying"
              ? "Approve the transaction in your wallet."
              : state === "confirming"
                ? "Waiting for the transaction to be mined."
                : "Recording your vinyl order."}
          </p>
          {txHash && (
            <a
              href={`${CURRENT_CHAIN.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#627eea] hover:underline"
            >
              View transaction &rarr;
            </a>
          )}
        </div>
      </Modal>

      {/* Success */}
      <Modal isOpen={state === "success"} onClose={reset}>
        <div className="relative flex flex-col items-center gap-4 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)] text-center">
          <button
            onClick={reset}
            className="absolute top-3 right-3 text-muted hover:text-foreground text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
          <div className="text-emerald-500 text-4xl">&#10003;</div>
          <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
            Order confirmed!
          </h2>
          <p className="text-sm text-muted">
            {vinylName} is yours. We&apos;ll ship it to {shipping.fullName} and email a
            confirmation to {email}.
          </p>
          {txHash && (
            <a
              href={`${CURRENT_CHAIN.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#627eea] hover:underline"
            >
              View transaction &rarr;
            </a>
          )}
        </div>
      </Modal>

      {/* Error toast under the button */}
      {state === "error" && error && (
        <p className="text-accent-red text-xs text-center mt-1">{error}</p>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-[#627eea]"
      />
    </label>
  );
}
