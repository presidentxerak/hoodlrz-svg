"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";
import { createClient } from "@/lib/supabase/client";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID, CURRENT_CHAIN, isMainnet } from "@/lib/web3/config";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";

interface AccountInfo {
  id: string;
  pseudonym: string;
  rewardsBalance: number;
  email: string;
}

interface EthNft {
  tokenId: number;
  seed?: string; // tokenSeed from contract (for PFPViewer)
}

export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [ethNfts, setEthNfts] = useState<EthNft[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethAddress, setEthAddress] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Auth check ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/access");
      } else {
        setAuthed(true);
      }
    });
  }, [router]);

  /* ── Fetch account info ── */
  useEffect(() => {
    if (!authed) return;

    fetch("/api/token/my-tokens")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setAccount(data.account || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  // Track wrong-chain state
  const [wrongChain, setWrongChain] = useState(false);

  /* ── Fetch ETH NFTs from on-chain ── */
  const fetchEthNfts = useCallback(async (isRefresh = false) => {
    if (!HOODLRZ_NFT_ADDRESS) return;
    if (isRefresh) setRefreshing(true);
    setWrongChain(false);

    try {
      if (!isRefresh) setEthLoading(true);

      const eth = (window as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      if (!eth) { setEthLoading(false); return; }

      const accounts: string[] = await eth.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) { setEthLoading(false); return; }
      const addr = accounts[0];

      // For wallet accounts, verify the browser wallet matches the account
      if (account?.email?.endsWith("@wallet.hoodlrz.com")) {
        const walletAddr = account.email.replace("@wallet.hoodlrz.com", "");
        if (addr.toLowerCase() !== walletAddr.toLowerCase()) {
          setEthLoading(false);
          return;
        }
      }

      setEthAddress(addr);

      const { BrowserProvider, Contract } = await import("ethers");
      // Use "any" to prevent NETWORK_ERROR if chain was recently switched
      const provider = new BrowserProvider(eth as import("ethers").Eip1193Provider, "any");

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== HOODLRZ_CHAIN_ID) {
        setWrongChain(true);
        setEthNfts([]);
        return;
      }

      const contract = new Contract(HOODLRZ_NFT_ADDRESS, HOODLRZ_NFT_ABI, provider);
      const balance = Number(await contract.balanceOf(addr));
      if (balance === 0) {
        setEthNfts([]);
        return;
      }

      // Scan Transfer events to find owned token IDs
      const filter = contract.filters.Transfer(null, addr);
      const events = await contract.queryFilter(filter, 0, "latest");
      const ownedIds: number[] = [];
      for (const evt of events) {
        const parsed = contract.interface.parseLog({ topics: [...evt.topics], data: evt.data });
        if (parsed) ownedIds.push(Number(parsed.args.tokenId));
      }

      // Verify ownership and fetch seeds (same as EthMintFlow reveal)
      const verified: EthNft[] = [];
      const uniqueIds = Array.from(new Set(ownedIds));
      for (const tokenId of uniqueIds) {
        try {
          const owner: string = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() === addr.toLowerCase()) {
            verified.push({ tokenId });
          }
        } catch { /* token may not exist */ }
      }
      setEthNfts([...verified]);

      // Fetch tokenSeed for each NFT (fast, single read per token — same as reveal modal)
      for (let i = 0; i < verified.length; i++) {
        try {
          const seed: bigint = await contract.tokenSeed(verified[i].tokenId);
          verified[i] = { ...verified[i], seed: seed.toString() };
          setEthNfts([...verified]);
        } catch { /* tokenSeed may fail */ }
      }
    } catch {
      // No wallet or wrong chain — skip silently
    } finally {
      setEthLoading(false);
      setRefreshing(false);
    }
  }, [account]);

  // Load ETH NFTs when authed (don't require account — wallet-only users can see their NFTs)
  useEffect(() => {
    if (!HOODLRZ_NFT_ADDRESS || !authed) return;
    const timer = setTimeout(() => fetchEthNfts(false), 300);
    return () => clearTimeout(timer);
  }, [fetchEthNfts, authed]);

  /* Loading / redirect */
  if (authed === null || loading || ethLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
        <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
          My Collection
        </h1>
        {/* Loading skeleton */}
        <div className="mt-8 border border-[var(--border)] bg-[var(--surface)] p-6 animate-pulse">
          <div className="h-4 w-20 bg-[var(--border)] rounded" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-10 bg-[var(--border)] rounded" />
            <div className="h-10 bg-[var(--border)] rounded" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-square bg-[var(--surface)] border border-[#627eea]/20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
              </div>
              <div className="h-3 w-24 bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted text-center animate-pulse">
          Loading your on-chain collectibles...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Header ── */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        My Collection
      </h1>

      {/* ── Profile Card ── */}
      <div className="mt-8 border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Profile
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pseudonym */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Pseudo
            </span>
            <p className="text-sm font-bold text-foreground">
              {account?.pseudonym || "—"}
            </p>
          </div>

          {/* ETH Address or Email */}
          <div className="space-y-1">
            {account?.email?.endsWith("@wallet.hoodlrz.com") ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Ethereum Address
                </span>
                {ethAddress ? (
                  <a
                    href={`${CURRENT_CHAIN.explorerUrl}/address/${ethAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#627eea] hover:underline font-mono block truncate"
                  >
                    {ethAddress}
                  </a>
                ) : (
                  <p className="text-sm text-muted">Connect your wallet to view</p>
                )}
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Email
                </span>
                <p className="text-sm text-foreground">
                  {account?.email || "—"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              On-Chain NFTs
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {ethNfts.length}
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchEthNfts(true)}
            disabled={refreshing}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest",
              "border border-[var(--border)] text-muted hover:text-foreground hover:border-[#627eea]",
              "transition-all duration-150",
              refreshing ? "opacity-50 pointer-events-none" : "",
            ].join(" ")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? "animate-spin" : ""}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── ETH On-Chain NFTs ── */}
      {ethNfts.length > 0 && (
        <>
          <h2 className="mt-10 font-hoodlrz text-xl font-bold tracking-wider text-foreground flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 784 784" fill="none">
              <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="#627eea" fillOpacity="0.8"/>
              <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="#627eea"/>
              <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="#627eea" fillOpacity="0.8"/>
              <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="#627eea"/>
            </svg>
            On-Chain (Ethereum)
          </h2>

          {/* Blockchain lag info */}
          <p className="mt-2 text-xs text-muted">
            Recently collected NFTs may take a few moments to appear. The blockchain needs time to index your transaction. Use Refresh if needed.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6">
            {ethNfts.map((nft) => (
              <a
                key={nft.tokenId}
                href={`${CURRENT_CHAIN.explorerUrl}/token/${HOODLRZ_NFT_ADDRESS}?a=${nft.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]"
              >
                <div className="relative aspect-square bg-[var(--surface)] overflow-hidden border border-[#627eea]/20">
                  {nft.seed ? (
                    <PFPViewer
                      seed={nft.seed}
                      size={400}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#627eea]/30 border-t-[#627eea] rounded-full animate-spin" />
                      <span className="font-hoodlrz text-lg font-bold text-[#627eea]">#{nft.tokenId}</span>
                      <span className="text-[10px] text-muted">Loading...</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-[#627eea] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                    ETH
                  </span>
                  {!isMainnet && (
                    <span className="absolute bottom-0 left-0 right-0 bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider text-center py-0.5">
                      Testnet
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  Hoodlrz #{String(nft.tokenId).padStart(4, "0")}
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* ── Wrong chain warning ── */}
      {wrongChain && (
        <div className="mt-10 border border-amber-500/40 bg-amber-500/10 p-4 text-center">
          <p className="text-sm font-bold text-amber-400">
            Wrong network detected
          </p>
          <p className="text-xs text-muted mt-1">
            Your wallet is connected to a different chain. Please switch to{" "}
            <strong className="text-foreground">{CURRENT_CHAIN.name}</strong>{" "}
            in MetaMask to see your Hoodlrz NFTs, then click Refresh.
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {ethNfts.length === 0 && !wrongChain && (
        <div className="mt-20 flex flex-col items-center gap-6 text-center">
          <div className="w-20 h-20 border border-[var(--border)] flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted"
            >
              <path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z" />
              <path d="M6 2h12" />
              <path d="M6 22h12" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-foreground">
            No collectibles yet
          </h2>

          <p className="max-w-md text-sm leading-relaxed text-muted">
            Start collecting to build your Hoodlrz identity. Each piece is
            unique, generated from 7 hand-drawn layers, stored on-chain forever.
          </p>

          <p className="text-xs text-muted">
            Just collected? It may take a few moments for the blockchain to confirm your transaction.
          </p>

          <div className="flex gap-3">
            <Button variant="primary" size="lg" href="/collection/hoodlrz">
              Start Collecting
            </Button>
            <button
              onClick={() => fetchEthNfts(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest border border-[var(--border)] text-muted hover:text-foreground hover:border-[#627eea] transition-all duration-150"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
