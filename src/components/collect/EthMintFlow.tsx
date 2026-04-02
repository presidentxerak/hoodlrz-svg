"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID, CURRENT_CHAIN } from "@/lib/web3/config";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";

/* ── Types ── */
type FlowState = "idle" | "connecting" | "ready" | "quantity" | "minting" | "success" | "error";

interface EthMintFlowProps {
  disabled?: boolean;
}

/* ── Helpers to avoid bundling ethers.js at module level ── */
async function getProvider() {
  if (typeof window === "undefined" || !(window as { ethereum?: unknown }).ethereum) return null;
  const { BrowserProvider } = await import("ethers");
  return new BrowserProvider((window as { ethereum?: unknown }).ethereum as import("ethers").Eip1193Provider);
}

async function getContract(signer: import("ethers").Signer) {
  const { Contract } = await import("ethers");
  return new Contract(HOODLRZ_NFT_ADDRESS, HOODLRZ_NFT_ABI, signer);
}

export default function EthMintFlow({ disabled = false }: EthMintFlowProps) {
  const [state, setState] = useState<FlowState>("idle");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mintPrice, setMintPrice] = useState<bigint>(BigInt(0));
  const [totalSupply, setTotalSupply] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [mintedIds, setMintedIds] = useState<number[]>([]);

  // Check if wallet is already connected
  useEffect(() => {
    (async () => {
      const provider = await getProvider();
      if (!provider) return;
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address);
        }
      } catch {
        // Not connected yet
      }
    })();
  }, []);

  /* ── Connect Wallet ── */
  const connectWallet = useCallback(async () => {
    setState("connecting");
    setError("");

    const provider = await getProvider();
    if (!provider) {
      setError("No Ethereum wallet detected. Install MetaMask.");
      setState("error");
      return;
    }

    try {
      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts.length) throw new Error("No accounts");

      // Check chain
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== HOODLRZ_CHAIN_ID) {
        try {
          await provider.send("wallet_switchEthereumChain", [
            { chainId: "0x" + HOODLRZ_CHAIN_ID.toString(16) },
          ]);
        } catch {
          setError(`Please switch to ${CURRENT_CHAIN.name} in your wallet.`);
          setState("error");
          return;
        }
      }

      // Fetch contract state
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      const [price, supply] = await Promise.all([
        contract.mintPrice(),
        contract.totalSupply(),
      ]);

      setWalletAddress(accounts[0]);
      setMintPrice(price);
      setTotalSupply(Number(supply));
      setState("quantity");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg.includes("user rejected") ? "Connection cancelled." : msg);
      setState("error");
    }
  }, []);

  /* ── Mint ── */
  const handleMint = useCallback(async () => {
    setState("minting");
    setError("");

    try {
      const provider = await getProvider();
      if (!provider) throw new Error("Wallet not found");

      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      const { formatEther } = await import("ethers");

      const totalCost = mintPrice * BigInt(quantity);
      console.log(`[eth-mint] Minting ${quantity} for ${formatEther(totalCost)} ETH`);

      const tx = await contract.mint(quantity, { value: totalCost });
      setTxHash(tx.hash);
      console.log(`[eth-mint] TX submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`[eth-mint] TX confirmed in block ${receipt.blockNumber}`);

      // Extract minted token IDs from Transfer events
      const ids: number[] = [];
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === "Transfer") {
            ids.push(Number(parsed.args.tokenId));
          }
        } catch {
          // skip non-matching logs
        }
      }
      setMintedIds(ids);
      setTotalSupply((s) => s + quantity);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mint failed";
      if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED")) {
        setError("Transaction cancelled.");
      } else if (msg.includes("insufficient funds")) {
        setError("Insufficient ETH balance.");
      } else if (msg.includes("Minting not active")) {
        setError("Minting is not active yet.");
      } else {
        setError("Transaction failed. Please try again.");
      }
      setState("error");
    }
  }, [quantity, mintPrice]);

  /* ── Format price ── */
  const formatPrice = useCallback(
    (qty: number) => {
      if (mintPrice === BigInt(0)) return "...";
      const total = mintPrice * BigInt(qty);
      // Simple formatting without importing ethers
      const str = total.toString();
      const eth = str.length <= 18
        ? "0." + str.padStart(18, "0").replace(/0+$/, "") || "0"
        : str.slice(0, str.length - 18) + "." + str.slice(str.length - 18).replace(/0+$/, "");
      return eth.endsWith(".") ? eth + "0" : eth;
    },
    [mintPrice]
  );

  const CloseBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors text-xl leading-none"
      aria-label="Close"
    >
      &times;
    </button>
  );

  /* ── No contract configured ── */
  if (!HOODLRZ_NFT_ADDRESS) return null;

  return (
    <>
      {/* Mint button */}
      {(state === "idle" || state === "error" || state === "success") && (
        <button
          onClick={connectWallet}
          disabled={disabled}
          className={[
            "relative inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm",
            "font-bold uppercase tracking-widest text-white select-none",
            "border border-[#627eea] bg-[#627eea]/10 backdrop-blur-sm",
            "hover:bg-[#627eea]/20 hover:border-[#627eea]/80",
            "active:scale-[0.98] transition-all duration-150",
            disabled ? "opacity-40 pointer-events-none" : "",
          ].join(" ")}
        >
          <svg width="16" height="16" viewBox="0 0 784 784" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="#627eea" fillOpacity="0.8"/>
            <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="#627eea"/>
            <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="#627eea" fillOpacity="0.8"/>
            <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="#627eea"/>
          </svg>
          Mint on Ethereum
        </button>
      )}

      {/* Quantity Modal */}
      <Modal isOpen={state === "quantity"} onClose={() => setState("idle")}>
        <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <CloseBtn onClick={() => setState("idle")} />

          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 784 784" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="#627eea" fillOpacity="0.8"/>
              <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="#627eea"/>
              <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="#627eea" fillOpacity="0.8"/>
              <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="#627eea"/>
            </svg>
            <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
              Mint On-Chain
            </h2>
          </div>

          <p className="text-sm text-center text-muted">
            Full on-chain SVG NFT on Ethereum. Same identity, forever on the blockchain.
          </p>

          <div className="text-xs text-center text-muted">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>

          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 border border-[var(--border)] text-foreground font-bold text-lg hover:bg-[var(--surface)] transition-colors"
            >
              -
            </button>
            <span className="font-hoodlrz text-3xl font-bold text-foreground w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="w-10 h-10 border border-[var(--border)] text-foreground font-bold text-lg hover:bg-[var(--surface)] transition-colors"
            >
              +
            </button>
          </div>

          {/* Price summary */}
          <div className="w-full border border-[var(--border)] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Price per piece</span>
              <span className="text-foreground font-semibold">{formatPrice(1)} ETH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Quantity</span>
              <span className="text-foreground font-semibold">{quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Supply</span>
              <span className="text-foreground font-semibold">{totalSupply} / 10,000</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 flex justify-between text-sm">
              <span className="text-foreground font-bold">Total</span>
              <span className="text-foreground font-bold font-hoodlrz text-lg">
                {formatPrice(quantity)} ETH
              </span>
            </div>
          </div>

          <button
            onClick={handleMint}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold uppercase tracking-widest text-white bg-[#627eea] hover:bg-[#4c6ce0] active:scale-[0.98] transition-all duration-150"
          >
            Mint {quantity} for {formatPrice(quantity)} ETH
          </button>

          <p className="text-[10px] text-muted text-center">
            Transaction on {CURRENT_CHAIN.name}. Gas fees apply.
          </p>
        </div>
      </Modal>

      {/* Minting Modal */}
      <Modal isOpen={state === "minting"} onClose={() => {}}>
        <div className="flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <div className="w-12 h-12 border-4 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
          <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
            Minting...
          </h2>
          <p className="text-sm text-center text-muted">
            Confirm the transaction in your wallet and wait for blockchain confirmation.
          </p>
          {txHash && (
            <a
              href={`${CURRENT_CHAIN.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#627eea] hover:underline"
            >
              View on {CURRENT_CHAIN.name === "Ethereum Mainnet" ? "Etherscan" : "Explorer"} &rarr;
            </a>
          )}
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={state === "success"} onClose={() => setState("idle")}>
        <div className="relative flex flex-col items-center gap-6 p-6 max-w-sm mx-auto bg-[var(--background)] border border-[var(--border)]">
          <CloseBtn onClick={() => setState("idle")} />
          <div className="w-16 h-16 flex items-center justify-center bg-green-500/10 rounded-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground">
            Minted!
          </h2>
          <p className="text-sm text-center text-muted">
            {mintedIds.length > 0
              ? `Token${mintedIds.length > 1 ? "s" : ""} #${mintedIds.join(", #")} minted successfully on Ethereum.`
              : "Your Hoodlrz are now on the blockchain forever."}
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
          <Button variant="secondary" onClick={() => setState("idle")}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Error display */}
      {state === "error" && error && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
    </>
  );
}
