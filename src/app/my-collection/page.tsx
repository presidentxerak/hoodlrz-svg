"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PFPViewer from "@/components/ui/PFPViewer";
import { createClient } from "@/lib/supabase/client";
import { getVinylImageSrc, getVinylById } from "@/lib/genesis/vinyls";
import { HOODLRZ_NFT_ADDRESS, HOODLRZ_CHAIN_ID, CURRENT_CHAIN } from "@/lib/web3/config";
import { HOODLRZ_NFT_ABI } from "@/lib/web3/abi";

interface Token {
  id: string;
  seed: string;
  serial_number: number;
  collection_id: string;
  collection_slug: string | null;
  is_listed: boolean;
  created_at: string;
}

interface AccountInfo {
  id: string;
  pseudonym: string;
  rewardsBalance: number;
}

interface EthNft {
  tokenId: number;
}

export default function MyCollectionPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [ethNfts, setEthNfts] = useState<EthNft[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

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

  /* ── Fetch tokens ── */
  useEffect(() => {
    if (!authed) return;

    fetch("/api/token/my-tokens")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data) => {
        setTokens(data.tokens || []);
        setAccount(data.account || null);
      })
      .catch(() => {
        // silently fail, show empty state
      })
      .finally(() => setLoading(false));
  }, [authed]);

  /* ── Fetch ETH NFTs from on-chain ── */
  useEffect(() => {
    if (!HOODLRZ_NFT_ADDRESS) return;
    (async () => {
      try {
        const eth = (window as { ethereum?: unknown }).ethereum;
        if (!eth) return;
        const { BrowserProvider, Contract } = await import("ethers");
        const provider = new BrowserProvider(eth as import("ethers").Eip1193Provider);
        const accounts = await provider.listAccounts();
        if (accounts.length === 0) return;
        const addr = accounts[0].address;

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
        // Verify still owned (could have been transferred out)
        const verified: EthNft[] = [];
        const uniqueIds = Array.from(new Set(ownedIds));
        for (const tokenId of uniqueIds) {
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === addr.toLowerCase()) {
              verified.push({ tokenId });
            }
          } catch { /* token may not exist */ }
        }
        setEthNfts(verified);
      } catch {
        // No wallet or wrong chain — skip silently
      }
    })();
  }, []);

  /* Loading / redirect */
  if (authed === null || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
          My Collection
        </h1>
        {account && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {account.pseudonym}
            </span>
            <span className="text-xs text-muted border border-[var(--border)] px-2 py-1">
              {account.rewardsBalance ?? 0} Hoodz
            </span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      {(tokens.length > 0 || ethNfts.length > 0) && (
        <div className="mt-6 flex flex-wrap gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Protocol
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {tokens.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              On-Chain (ETH)
            </span>
            <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
              {ethNfts.length}
            </span>
          </div>
          {tokens.filter((t) => t.is_listed).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Listed
              </span>
              <span className="font-hoodlrz text-2xl font-bold leading-none text-foreground">
                {tokens.filter((t) => t.is_listed).length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Token Grid ── */}
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
                <div className="relative aspect-square bg-[var(--surface)] flex items-center justify-center border border-[#627eea]/20">
                  <div className="text-center">
                    <span className="font-hoodlrz text-3xl font-bold text-[#627eea]">#{nft.tokenId}</span>
                    <p className="text-[10px] text-muted mt-1">On-Chain SVG</p>
                  </div>
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

      {/* ── Protocol Tokens ── */}
      {tokens.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6">
          {tokens.map((token) => {
            const isGenesis = token.collection_slug === "genesis";
            const vinylSrc = isGenesis ? getVinylImageSrc(token.seed) : null;
            const vinyl = isGenesis ? getVinylById(token.seed) : null;

            return (
              <a
                key={token.id}
                href={isGenesis ? `/genesis/${token.seed}` : `/token/${token.id}`}
                className="group flex flex-col gap-2 transition-transform hover:scale-[1.02]"
              >
                <div className="relative">
                  {isGenesis && vinylSrc ? (
                    <div className="aspect-square overflow-hidden bg-[var(--surface)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vinylSrc}
                        alt={vinyl ? `Genesis ${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}` : "Genesis Vinyl"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <PFPViewer
                      seed={token.seed}
                      size={400}
                      className="aspect-square w-full"
                    />
                  )}
                  {token.is_listed && (
                    <span className="absolute bottom-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                      Listed
                    </span>
                  )}
                  {isGenesis && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                      Genesis
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted">
                    {isGenesis && vinyl
                      ? `${vinyl.edition} #${String(vinyl.number).padStart(2, "0")}`
                      : `#${String(token.serial_number).padStart(4, "0")}`}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : ethNfts.length === 0 ? (
        /* ── Empty state ── */
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
            unique, generated from 7 hand-drawn layers.
          </p>

          <Button variant="primary" size="lg" href="/collection/hoodlrz">
            Start Collecting
          </Button>
        </div>
      ) : null}
    </div>
  );
}
