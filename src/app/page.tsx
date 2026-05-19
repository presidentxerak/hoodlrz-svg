"use client";

import { useState } from "react";
import Countdown from "@/components/ui/Countdown";
import UsdToEth from "@/components/ui/UsdToEth";

const STREET_DROP_DATE = "2026-06-15T18:00:00Z";
const STREET_WHITELIST_DATE = "2026-06-12T18:00:00Z";
const STREET_SUPPLY = 1337;
const STREET_PRICE_USD = 10;

const WHITELIST_URL = "https://forms.gle/ugVMdtzV2JMbZ745A";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What is Hoodlrz Street?",
    a: "Hoodlrz Street is the public chapter of the Hoodlrz universe — a 1,337-piece collection of hand-drawn hooded identities released as standard ERC-721 NFTs on Ethereum. Each token is a unique character; the artwork lives off-chain on decentralised storage while ownership and provenance are anchored on Ethereum.",
  },
  {
    q: "What's the supply and price?",
    a: "1,337 NFTs total. $10 per mint (paid in ETH using the live exchange rate at the moment you mint).",
  },
  {
    q: "When does it drop?",
    a: "Whitelist opens June 12, 2026 at 18:00 UTC. Public mint opens June 15, 2026 at 18:00 UTC. The countdown on this page is the source of truth.",
  },
  {
    q: "How is this different from the full on-chain Hoodlrz?",
    a: "Hoodlrz Street uses a standard ERC-721 contract — fast, cheap to mint, and supported by every wallet and marketplace. The original full on-chain Hoodlrz (where each SVG layer is stored directly on Ethereum via SSTORE2) is a separate, premium artefact for collectors who care about that level of permanence.",
  },
  {
    q: "How do I mint?",
    a: "Connect an Ethereum wallet (MetaMask, Rainbow, WalletConnect…), pick a quantity, and confirm the transaction. The button on this page will activate the moment the public mint window opens.",
  },
  {
    q: "What about whitelist?",
    a: "Join the whitelist via the button at the top of the page. Whitelisted wallets get a 3-day head start before public mint.",
  },
  {
    q: "Are there royalties?",
    a: "Yes — 10% on-chain royalties via ERC-2981, enforced by marketplaces that respect the standard. Supports the artist and continued development of the universe.",
  },
  {
    q: "Where can I trade after mint?",
    a: "OpenSea, Blur, LooksRare, or any ERC-721-compatible marketplace. Hoodlrz Street is a standard NFT — no platform lock-in.",
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="flex flex-col items-center">
      {/* ── Hero with video background + 70% overlay ── */}
      <section className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden min-h-[85vh]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hoodlrz-banner-1.mp4" type="video/mp4" />
        </video>

        {/* 70% transparency overlay → 70% opacity black layer */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl text-center">
          <h1 className="font-hoodlrz text-[40px] font-bold leading-none tracking-wider text-white sm:text-[72px]">
            HOODLRZ
          </h1>
          <p className="max-w-md text-center text-sm leading-relaxed text-white/80 sm:text-base">
            Own the identity. Collect the culture.
          </p>

          {/* Collection summary */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <p className="text-white/90 font-hoodlrz text-xl tracking-wider sm:text-2xl">
              Hoodlrz Street
            </p>
            <p className="text-white/70 text-sm sm:text-base">
              {STREET_SUPPLY.toLocaleString()} NFTs · ${STREET_PRICE_USD}{" "}
              <span className="text-white/50">
                (<UsdToEth usd={STREET_PRICE_USD} bare />)
              </span>{" "}
              · ERC-721 on Ethereum
            </p>
          </div>

          {/* Drop date + countdown */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              Public Drop
            </span>
            <p className="font-hoodlrz text-2xl font-bold tracking-wider text-white sm:text-3xl">
              JUNE 15, 2026
            </p>
            <div className="mt-2 [&_span]:!text-white [&_.text-muted]:!text-white/50 [&_.text-foreground]:!text-white">
              <Countdown targetDate={STREET_DROP_DATE} />
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a
              href={WHITELIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white border border-white/30 hover:border-white hover:bg-white/10 transition-all duration-150 select-none"
            >
              Join Whitelist
            </a>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white cta-gradient opacity-50 cursor-not-allowed select-none"
            >
              Mint · Coming Soon
            </button>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            Whitelist opens June 12, 2026 · public mint June 15
          </span>
        </div>
      </section>

      {/* ── Collection details ── */}
      <section className="w-full bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="font-hoodlrz text-center text-[28px] font-bold tracking-wider text-foreground sm:text-[36px]">
            The Drop
          </h2>
          <p className="mt-3 mx-auto max-w-lg text-center text-sm leading-relaxed text-muted">
            A standard ERC-721 collection on Ethereum, hand-drawn by XERAK.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Stat label="Supply" value={STREET_SUPPLY.toLocaleString()} />
            <Stat
              label="Price"
              value={`$${STREET_PRICE_USD}`}
              sub={<UsdToEth usd={STREET_PRICE_USD} />}
            />
            <Stat label="Royalties" value="10%" sub="ERC-2981" />
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <Card title="Standard ERC-721" body="One of the most widely supported NFT standards on Ethereum. Compatible with every wallet and marketplace — OpenSea, Blur, LooksRare, Rainbow, MetaMask, Ledger." />
            <Card title="Hand-drawn art" body="Every layer is hand-illustrated by XERAK. Walls, graffiti, hoodies, eyes, mouths, accessories, foregrounds — combined into 1,337 unique hooded identities." />
            <Card title="Live USD pricing" body={`Each mint costs $${STREET_PRICE_USD} converted to ETH at the live exchange rate. The on-page price updates automatically.`} />
            <Card title="On-chain ownership" body="Ownership, transfers, and royalties (10%) are enforced on Ethereum. Artwork is hosted on decentralised storage and referenced via tokenURI." />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="w-full py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="font-hoodlrz text-center text-[28px] font-bold tracking-wider text-foreground sm:text-[36px]">
            How to Mint
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Step
              n={1}
              title="Connect"
              body="Connect any Ethereum wallet — MetaMask, Rainbow, WalletConnect-compatible."
            />
            <Step
              n={2}
              title="Pick quantity"
              body="Choose how many you want (max 10 per transaction). Pay in ETH at the live USD rate."
            />
            <Step
              n={3}
              title="Mint"
              body="Confirm the transaction. Your Hoodlrz Street NFT arrives in your wallet within a block."
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="w-full bg-[var(--surface)] py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-hoodlrz text-center text-[28px] font-bold tracking-wider text-foreground sm:text-[36px]">
            FAQ
          </h2>
          <p className="mt-3 mx-auto max-w-lg text-center text-sm leading-relaxed text-muted">
            Everything you need to know before minting.
          </p>

          <div className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex flex-col gap-2 py-5 text-left transition-colors hover:bg-background/40"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                      {item.q}
                    </span>
                    <span
                      className={`text-muted text-lg transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                      aria-hidden
                    >
                      +
                    </span>
                  </div>
                  {open && (
                    <p className="text-sm leading-relaxed text-muted pr-8">
                      {item.a}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="w-full py-16">
        <div className="mx-auto max-w-3xl px-4 flex flex-col items-center gap-4 text-center">
          <p className="font-hoodlrz text-2xl font-bold tracking-wider text-foreground sm:text-3xl">
            Be ready for the drop.
          </p>
          <span className="text-[10px] uppercase tracking-widest text-muted">
            Whitelist opens {formatDate(STREET_WHITELIST_DATE)} · Public mint {formatDate(STREET_DROP_DATE)}
          </span>
          <a
            href={WHITELIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white cta-gradient hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(229,62,62,0.5),0_0_48px_rgba(213,63,140,0.3)] active:scale-[0.98] transition-transform duration-150 select-none"
          >
            Join Whitelist
          </a>
        </div>
      </section>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 border border-[var(--border)] bg-[var(--background)] p-6 text-center">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="font-hoodlrz text-3xl font-bold text-foreground sm:text-4xl">
        {value}
      </span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--background)] p-6 flex flex-col gap-2">
      <p className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="border border-[var(--border)] p-6 flex flex-col gap-3">
      <span className="flex items-center justify-center w-9 h-9 border border-accent-red text-accent-red font-hoodlrz text-base font-bold">
        {n}
      </span>
      <p className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
