"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID, CURRENT_CHAIN } from "@/lib/web3/config";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";

interface AccountInfo {
  id: string;
  pseudonym: string;
  rewardsBalance: number;
}

interface EthNft {
  tokenId: number;
  image?: string; // data:image/svg+xml;base64,...
}

export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [ethNfts, setEthNfts] = useState<EthNft[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ethLoading, setEthLoading] = useState(!!HOODLRZ_NFT_ADDRESS);
  const [ethAddress, setEthAddress] = useState<string>("");

  /* ── Auth check ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/access");
      } else {
        setAuthed(true);
        setUserEmail(data.user.email ?? "");
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
      .catch(() => {
        // silently fail
      })
      .finally(() => setLoading(false));
  }, [authed]);

  /* ── Fetch ETH NFTs from on-chain ── */
  useEffect(() => {
    if (!HOODLRZ_NFT_ADDRESS) return;

    const fetchEthNfts = async () => {
      try {
        const eth = (window as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        if (!eth) return;

        // Use eth_accounts (passive, no popup) to check if already connected
        const accounts: string[] = await eth.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) return;
        const addr = accounts[0];
        setEthAddress(addr);

        const { BrowserProvider, Contract } = await import("ethers");
        const provider = new BrowserProvider(eth as import("ethers").Eip1193Provider);

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== HOODLRZ_CHAIN_ID) return;

        const contract = new Contract(HOODLRZ_NFT_ADDRESS, HOODLRZ_NFT_ABI, provider);
        const balance = Number(await contract.balanceOf(addr));
        if (balance === 0) return;

        // Scan Transfer events to find owned token IDs
        const filter = contract.filters.Transfer(null, addr);
        const events = await contract.queryFilter(filter, 0, "latest");
        const ownedIds: number[] = [];
        for (const evt of events) {
          const parsed = contract.interface.parseLog({ topics: [...evt.topics], data: evt.data });
          if (parsed) ownedIds.push(Number(parsed.args.tokenId));
        }

        // Verify ownership first, show NFTs immediately (without images)
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

        // Then fetch images progressively (with delays to avoid rate limiting)
        for (let i = 0; i < verified.length; i++) {
          try {
            const uri: string = await contract.tokenURI(verified[i].tokenId);
            const jsonStr = atob(uri.split(",")[1]);
            const meta = JSON.parse(jsonStr);
            verified[i] = { ...verified[i], image: meta.image };
            setEthNfts([...verified]);
          } catch { /* tokenURI may fail for some tokens */ }
          // Small delay to avoid rate limiting
          if (i < verified.length - 1) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      } catch {
        // No wallet or wrong chain — skip silently
      } finally {
        setEthLoading(false);
      }
    };

    // Small delay to let MetaMask inject window.ethereum
    const timer = setTimeout(fetchEthNfts, 300);
    return () => clearTimeout(timer);
  }, []);

  /* Loading / redirect */
  if (authed === null || loading || ethLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted animate-pulse">Loading...</p>
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

          {/* Email */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Email
            </span>
            <p className="text-sm text-foreground truncate">
              {userEmail || "—"}
            </p>
          </div>

          {/* ETH Address */}
          <div className="space-y-1 sm:col-span-2">
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
              <p className="text-sm text-muted">Not connected</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8 border-t border-[var(--border)] pt-4 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              On-Chain NFTs
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {ethNfts.length}
            </span>
          </div>
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
                  {nft.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={nft.image} alt={`Hoodlrz #${nft.tokenId}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-hoodlrz text-3xl font-bold text-[#627eea]">#{nft.tokenId}</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-[#627eea] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                    ETH
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  Hoodlrz #{String(nft.tokenId).padStart(4, "0")}
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {ethNfts.length === 0 && (
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

          <Button variant="primary" size="lg" href="/collection/hoodlrz">
            Start Collecting
          </Button>
        </div>
      )}
    </div>
  );
}
