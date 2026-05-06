import PFPViewer from "@/components/ui/PFPViewer";

const SHOWCASE_SEEDS = [
  "hoodlrz-about-1",
  "hoodlrz-about-2",
  "hoodlrz-about-3",
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Title */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[56px]">
        About
      </h1>

      {/* Intro */}
      <section className="mt-12 space-y-6">
        <p className="text-lg leading-relaxed text-foreground">
          Hoodlrz is a premium digital collectible project created entirely by{" "}
          <a
            href="https://xerak.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#627eea] font-bold hover:underline"
          >
            XERAK
          </a>
          , a crypto artist active in the NFT space since 2019. Every artwork,
          every layer, every line — hand-drawn and brought to life on-chain.
        </p>
        <p className="text-base leading-relaxed text-muted">
          1,337 unique ERC-721 NFTs. 7 hand-drawn SVG layers per artwork.
          Every layer stored directly on the blockchain using SSTORE2.
          No IPFS, no external hosting. On-chain forever.
        </p>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* ON-CHAIN ARCHITECTURE                    */}
      {/* ════════════════════════════════════════ */}

      <section className="mt-20">
        <div className="border-t border-[var(--border)] pt-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
            Technical Overview
          </span>
          <h2 className="mt-4 font-hoodlrz text-[28px] font-bold leading-none tracking-wider text-foreground sm:text-[40px]">
            On-Chain Architecture
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Every Hoodlrz lives entirely on Ethereum. The smart contract generates
            each SVG artwork deterministically from a unique seed — no off-chain
            dependencies, no centralized storage.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          01 — How It Works
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            When you collect a Hoodlrz, the smart contract generates a unique seed
            for your token. This seed determines which of the 7 SVG layers are
            selected and composed into your one-of-a-kind artwork — all computed
            on-chain at the moment of minting.
          </p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">01</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Deterministic Generation
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              Each artwork is generated from a unique seed using FNV-1a hashing
              and Mulberry32 PRNG. The same seed always produces the same artwork.
              7 hand-drawn SVG layers compose the final piece.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">02</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              SSTORE2 Storage
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              Every SVG layer is stored directly on the Ethereum blockchain using
              SSTORE2 — a gas-efficient pattern that stores data as contract
              bytecode. No IPFS, no Arweave, no external hosting.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">03</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              On-Chain Rendering
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              The Renderer contract composes the full SVG from stored layers and
              generates ERC-721 metadata as a data URI. Your tokenURI returns a
              complete base64-encoded JSON with the SVG image embedded.
            </p>
          </div>
        </div>
      </section>

      {/* Smart Contract Architecture */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          02 — Smart Contracts
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The system is composed of three interconnected smart contracts
            deployed on Ethereum:
          </p>
        </div>
        <div className="mt-6 space-y-0">
          {[
            { name: "HoodlrzLayerStore", desc: "Stores all 227 SVG layers on-chain using SSTORE2. Supports chunked storage for layers exceeding the 24KB EIP-170 limit. Lockable after upload." },
            { name: "HoodlrzOnChain", desc: "ERC-721 NFT contract with ERC-2981 royalties (10%). Handles minting, seed generation (FNV-1a + Mulberry32), and ownership. Max supply: 1,337." },
            { name: "HoodlrzRenderer", desc: "Composes full on-chain SVG from stored layers. Generates ERC-721 compliant metadata as base64-encoded data URIs. Computes rarity scores and trait names." },
          ].map((item) => (
            <div key={item.name} className="flex gap-4 border-b border-[var(--border)] py-4">
              <code className="text-xs font-bold text-[#627eea] w-44 flex-shrink-0 pt-0.5 font-mono">
                {item.name}
              </code>
              <p className="text-[12px] leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Token Anatomy */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          03 — Anatomy of a Token
        </h3>
        <div className="mt-4 text-sm leading-relaxed text-muted">
          <p>Each Hoodlrz NFT contains:</p>
        </div>
        <div className="mt-6 border border-[var(--border)] divide-y divide-[var(--border)]">
          {[
            { field: "tokenId", desc: "Unique token identifier on the ERC-721 contract" },
            { field: "tokenSeed", desc: "Unique seed that deterministically generates the artwork via FNV-1a + Mulberry32" },
            { field: "7 traits", desc: "Wall, graffiti, hoodie, eyes, mouth, accessory, foreground — each selected by the PRNG" },
            { field: "tokenURI", desc: "Base64-encoded JSON metadata with embedded SVG image, traits, and rarity score" },
            { field: "royaltyInfo", desc: "10% royalties via ERC-2981 standard" },
          ].map((item) => (
            <div key={item.field} className="flex gap-4 px-4 py-3">
              <code className="text-xs font-bold text-foreground w-32 flex-shrink-0 font-mono">
                {item.field}
              </code>
              <p className="text-[12px] text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="mt-16">
        <div className="grid grid-cols-3 gap-4">
          {SHOWCASE_SEEDS.map((seed) => (
            <PFPViewer
              key={seed}
              seed={seed}
              size={400}
              className="aspect-square w-full"
              example
            />
          ))}
        </div>
      </section>

      {/* Economics */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          04 — Economics
        </h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="border border-[var(--border)] border-l-2 border-l-[#627eea] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#627eea]">Collect Price</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">0.007 ETH</p>
            <p className="text-[12px] text-muted">
              Fixed price per NFT. Pay in ETH via MetaMask. Gas fees apply.
              Full on-chain ERC-721 stored on Ethereum forever.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Royalties</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">10%</p>
            <p className="text-[12px] text-muted">
              ERC-2981 on-chain royalties. Enforced by marketplaces that support the standard.
              Supports the artist and continued development.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Secondary Market</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">OpenSea & more</p>
            <p className="text-[12px] text-muted">
              Trade on any ERC-721 compatible marketplace — OpenSea, Blur, LooksRare.
              Standard Ethereum NFT, no platform lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* Supply */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          05 — Supply
        </h3>
        <div className="mt-6 space-y-6">
          <div className="border border-[var(--border)] border-l-2 border-l-[#627eea] p-6 space-y-3">
            <h4 className="font-hoodlrz text-2xl font-bold text-foreground">
              Hoodlrz Collection
            </h4>
            <p className="text-sm leading-relaxed text-muted">
              1,337 unique hooded identities, each composed of 7 hand-drawn
              SVG layers — walls, graffiti, hoodies, eyes, mouths, accessories,
              and foregrounds. Stored fully on-chain on Ethereum as ERC-721 NFTs.
              Available in light and dark variants.
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-muted">
              <span><strong className="text-foreground">1,337</strong> supply</span>
              <span><strong className="text-foreground">7</strong> layer categories</span>
              <span><strong className="text-foreground">2</strong> variants</span>
              <span><strong className="text-[#627eea]">0.007 ETH</strong> per mint</span>
              <span><strong className="text-foreground">ERC-721</strong> standard</span>
            </div>
          </div>

          <div className="border border-[var(--border)] p-6 space-y-3">
            <h4 className="font-hoodlrz text-2xl font-bold text-foreground">
              Genesis Vinyl Collection
            </h4>
            <p className="text-sm leading-relaxed text-muted">
              25 exclusive hand-crafted vinyl artworks across three editions:
              Black (10), White (5), and Craft (10). Each piece features a unique
              hand-drawn sleeve and a custom pressed disc — you choose your 4 tracks
              from the Hoodlrz catalog and arrange them on Side A and Side B.
              Shipped worldwide with a certificate of authenticity.
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-muted">
              <span><strong className="text-foreground">25</strong> pieces</span>
              <span><strong className="text-foreground">3</strong> editions</span>
              <span><strong className="text-foreground">4</strong> tracks per vinyl</span>
              <span><strong className="text-foreground">€500</strong> per vinyl</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layers */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          06 — The Layer System
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every Hoodlrz artwork is built from 7 layers stacked in precise order.
          Each layer is a hand-drawn SVG file stored on-chain via SSTORE2. The combination
          is determined by the token&apos;s seed, making each piece unique and reproducible.
        </p>
        <div className="mt-6 space-y-0">
          {[
            { order: "1", name: "Wall", count: 10, desc: "The background — brick patterns, decay, abstract textures" },
            { order: "2", name: "Graffiti", count: "23+", desc: "Street art behind the character — tags, murals, stencils" },
            { order: "3", name: "Hoodie", count: 12, desc: "The character body — the iconic hooded silhouette" },
            { order: "4", name: "Eyes", count: 21, desc: "Expression and style — from minimal dots to cyber visors" },
            { order: "5", name: "Mouth", count: 20, desc: "Attitude and mood — smirks, stitches, fangs" },
            { order: "6", name: "Accessory", count: 17, desc: "Headphones, caps, goggles, crowns — the finishing touch" },
            { order: "7", name: "Foreground", count: 11, desc: "Decorative overlay — the final layer on top of everything" },
          ].map((layer) => (
            <div key={layer.name} className="flex items-center gap-4 border-b border-[var(--border)] py-3">
              <span className="font-hoodlrz text-lg font-bold text-foreground w-6">{layer.order}</span>
              <span className="text-sm font-bold uppercase tracking-widest text-foreground w-28 flex-shrink-0">{layer.name}</span>
              <span className="text-xs text-muted flex-1">{layer.desc}</span>
              <span className="text-sm font-bold text-foreground">{layer.count}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          Total possible combinations: 10 x 23 x 12 x 21 x 20 x 17 x 11 x 2 = <strong className="text-foreground">over 200 million</strong> unique artworks.
          Only 1,337 will ever exist.
        </p>
      </section>

      {/* Rarity */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          07 — Rarity System
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Each trait has a rarity weight. Combined, they determine your
          collectible&apos;s overall rarity tier. Multiple rare traits compound
          into bonus scoring. Rarity is computed on-chain in the Renderer contract.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { tier: "Common", color: "#9ca3af", range: "0-24", pct: "~45%" },
            { tier: "Uncommon", color: "#1b9c85", range: "25-44", pct: "~30%" },
            { tier: "Rare", color: "#e94560", range: "45-69", pct: "~20%" },
            { tier: "Legendary", color: "#f0c929", range: "70-100", pct: "~5%" },
          ].map((r) => (
            <div
              key={r.tier}
              className="flex items-center gap-3 border border-[var(--border)] px-4 py-3"
            >
              <span
                className="w-3 h-3 flex-shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <div>
                <span className="text-sm font-bold text-foreground">{r.tier}</span>
                <span className="ml-2 text-xs text-muted">Score {r.range}</span>
                <span className="ml-2 text-xs text-muted">{r.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          08 — Hoodlrz vs Traditional NFTs
        </h3>
        <div className="mt-6 border border-[var(--border)] divide-y divide-[var(--border)] overflow-x-auto">
          <div className="grid grid-cols-3 gap-0 min-w-[500px]">
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-muted">Feature</div>
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-muted border-l border-[var(--border)]">Traditional NFT</div>
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-[#627eea] border-l border-[var(--border)]">Hoodlrz On-Chain</div>
          </div>
          {[
            { feature: "Art storage", trad: "IPFS / Arweave", hoodlrz: "Full on-chain SVG (SSTORE2)" },
            { feature: "Mint price", trad: "Variable", hoodlrz: "0.007 ETH (fixed)" },
            { feature: "Standard", trad: "ERC-721", hoodlrz: "ERC-721 + ERC-2981" },
            { feature: "Royalties", trad: "Off-chain / optional", hoodlrz: "10% on-chain (ERC-2981)" },
            { feature: "Dependencies", trad: "IPFS gateway required", hoodlrz: "Zero — fully self-contained" },
            { feature: "Generation", trad: "Pre-generated images", hoodlrz: "Deterministic on-chain (FNV-1a + Mulberry32)" },
            { feature: "Verification", trad: "Blockchain explorer", hoodlrz: "On-chain tokenURI + Etherscan" },
            { feature: "Secondary market", trad: "OpenSea, etc.", hoodlrz: "OpenSea, Blur, any marketplace" },
            { feature: "Longevity", trad: "Depends on IPFS pinning", hoodlrz: "Permanent — on Ethereum forever" },
          ].map((row) => (
            <div key={row.feature} className="grid grid-cols-3 gap-0 border-t border-[var(--border)] min-w-[500px]">
              <div className="p-3 text-xs font-semibold text-foreground">{row.feature}</div>
              <div className="p-3 text-xs text-muted border-l border-[var(--border)]">{row.trad}</div>
              <div className="p-3 text-xs font-semibold text-[#627eea] border-l border-[var(--border)]">{row.hoodlrz}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The Artist */}
      <section className="mt-16">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          09 — The Artist
        </h3>
        <div className="mt-6 border border-[var(--border)] border-l-2 border-l-[#627eea] p-6 space-y-4">
          <h4 className="font-hoodlrz text-2xl font-bold text-foreground">
            XERAK
          </h4>
          <p className="text-sm leading-relaxed text-muted">
            Hoodlrz was created entirely by{" "}
            <a
              href="https://xerak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#627eea] font-bold hover:underline"
            >
              XERAK
            </a>
            {" "}— a crypto artist, musician, and builder active in the NFT space
            since 2019. From the hand-drawn SVG layers to the smart contracts, the
            music, and the Genesis vinyl sleeves — every element of the Hoodlrz
            universe is designed and produced by XERAK.
          </p>
          <a
            href="https://xerak.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#627eea] hover:underline"
          >
            xerak.com &rarr;
          </a>
        </div>
      </section>

      {/* Philosophy */}
      <section className="mt-16 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          Philosophy
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            We believe digital art should live where it was born — on-chain.
            No external servers, no broken links, no dependencies that can
            disappear. Your art, your wallet, forever on Ethereum.
          </p>
          <p>
            Every feature we build must increase desire, trust, or permanence.
            If it doesn&apos;t, we remove it. Clarity over features. Emotion over
            technology.
          </p>
          <p className="text-foreground font-semibold">
            Own the identity. Collect the culture. On-chain forever.
          </p>
        </div>
      </section>
    </div>
  );
}
