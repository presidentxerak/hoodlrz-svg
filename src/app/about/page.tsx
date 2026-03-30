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
          Hoodlrz is a premium digital collectible platform. We create unique
          hooded characters — each one generated from layered artwork, each one
          truly yours.
        </p>
        <p className="text-base leading-relaxed text-muted">
          No wallets. No gas fees. No complexity. Just collect, own, and
          showcase rare digital art.
        </p>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* WHITEPAPER: THE HOODLRZ PROTOCOL        */}
      {/* ════════════════════════════════════════ */}

      <section className="mt-20">
        <div className="border-t border-[var(--border)] pt-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
            Whitepaper v1.0
          </span>
          <h2 className="mt-4 font-hoodlrz text-[28px] font-bold leading-none tracking-wider text-foreground sm:text-[40px]">
            The Hoodlrz Protocol
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            A new standard for collecting digital art. No blockchain. No wallet.
            No gas fees. Just ownership.
          </p>
        </div>
      </section>

      {/* Abstract */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          Abstract
        </h3>
        <div className="mt-4 border-l-2 border-[var(--cta-from)] pl-6 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The Hoodlrz Protocol introduces a new approach to digital art
            ownership. Instead of relying on blockchain networks, gas fees, and
            cryptocurrency wallets, we use a deterministic generation system
            combined with server-side proof of ownership.
          </p>
          <p>
            Each artwork is generated on-demand from a unique seed, verified by a
            canonical hash, and owned through a secure account system. The result
            is a collecting experience that is instant, affordable, and
            accessible to everyone.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          01 — The Problem
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Traditional digital collectible platforms require users to set up a
            cryptocurrency wallet, purchase tokens on an exchange, pay
            unpredictable gas fees, and navigate complex blockchain interfaces.
            This creates a barrier that excludes 99% of potential collectors.
          </p>
          <p>The result:</p>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            {[
              { label: "Wallet setup", problem: "Seed phrases, browser extensions, security risks" },
              { label: "Gas fees", problem: "Unpredictable costs, sometimes exceeding the art itself" },
              { label: "Volatility", problem: "Paying in crypto means the price changes every second" },
              { label: "Complexity", problem: "Approvals, confirmations, failed transactions" },
            ].map((item) => (
              <div key={item.label} className="border border-[var(--border)] p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground">{item.label}</p>
                <p className="text-[12px] text-muted">{item.problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          02 — The Solution
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The Hoodlrz Protocol removes every layer of friction between the
            collector and the art. Our system is built on three pillars:
          </p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">01</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Deterministic Generation
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              Each artwork is generated from a unique seed using 7 hand-drawn
              SVG layers. The same seed always produces the same artwork.
              Nothing is stored as a static image — everything is computed
              on-demand, making the system lightweight and verifiable.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">02</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Canonical Hashing
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              Every generated artwork is verified by a SHA-256 canonical hash.
              This hash acts as a fingerprint — it proves the artwork is
              authentic and has not been altered. The hash is stored alongside
              the seed and traits, creating an immutable record of provenance.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-3">
            <span className="font-hoodlrz text-2xl font-bold text-foreground">03</span>
            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Secure Ownership
            </h4>
            <p className="text-[12px] leading-relaxed text-muted">
              Ownership is tracked in a secure database with row-level security
              policies. Every transfer, sale, and collection event is recorded
              in an immutable ownership ledger. Your account is your wallet —
              authenticated via email, no seed phrases required.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          03 — Architecture
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The protocol operates through a layered architecture designed for
            performance, security, and cost efficiency:
          </p>
        </div>
        <div className="mt-6 space-y-0">
          {[
            { layer: "Layer 1", name: "Generation Engine", desc: "Deterministic SVG composition from seed + 7 trait categories. No stored images. ~2KB per artwork." },
            { layer: "Layer 2", name: "Verification", desc: "SHA-256 canonical hashing. Each artwork has a unique fingerprint stored on creation." },
            { layer: "Layer 3", name: "Ownership Ledger", desc: "PostgreSQL with row-level security. Every ownership event is recorded: collect, transfer, sale." },
            { layer: "Layer 4", name: "Authentication", desc: "Email-based magic link auth. No passwords, no wallets, no seed phrases." },
            { layer: "Layer 5", name: "Payments", desc: "Stripe integration. Pay in fiat currency (USD). No crypto, no gas fees, no exchange rate risk." },
            { layer: "Layer 6", name: "Marketplace", desc: "Built-in secondary market. List, buy, and transfer — all within the platform." },
          ].map((item) => (
            <div key={item.layer} className="flex gap-4 border-b border-[var(--border)] py-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted w-16 flex-shrink-0 pt-0.5">
                {item.layer}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{item.name}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Token Anatomy */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          04 — Anatomy of a Token
        </h3>
        <div className="mt-4 text-sm leading-relaxed text-muted">
          <p>Each Hoodlrz token contains:</p>
        </div>
        <div className="mt-6 border border-[var(--border)] divide-y divide-[var(--border)]">
          {[
            { field: "seed", desc: "Unique identifier that deterministically generates the artwork" },
            { field: "traits_json", desc: "The 7 traits (wall, graffiti, hoodie, eyes, mouth, accessory, foreground) with their variant" },
            { field: "canonical_hash", desc: "SHA-256 hash of the generated SVG — the artwork's fingerprint" },
            { field: "serial_number", desc: "Sequential number within the collection (e.g. #0042 of 10,000)" },
            { field: "owner_id", desc: "Current owner's account ID — transfers update this field" },
            { field: "collection_id", desc: "Which collection this token belongs to" },
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

      {/* Economics */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          05 — Economics
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The Hoodlrz economy is designed for simplicity and fairness:
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Primary Market</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">$9.99</p>
            <p className="text-[12px] text-muted">
              Fixed price per collectible. No auctions, no gas fees, no hidden costs.
              The price you see is the price you pay. Period.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Secondary Market</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">Seller sets price</p>
            <p className="text-[12px] text-muted">
              Fixed price listings only. No auctions, no bids, no offers.
              Buy now or move on. Clean, simple, liquid.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Transfers</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">Free</p>
            <p className="text-[12px] text-muted">
              Transfer any unlisted collectible to any email address.
              If the recipient doesn&apos;t have an account, one is created automatically.
            </p>
          </div>
          <div className="border border-[var(--border)] p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Hoodz Rewards</p>
            <p className="font-hoodlrz text-2xl font-bold text-foreground">+1 per collect</p>
            <p className="text-[12px] text-muted">
              Non-transferable loyalty points. 10 Hoodz = 1 free collectible.
              Top holders unlock Genesis access.
            </p>
          </div>
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
            />
          ))}
        </div>
      </section>

      {/* Supply */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          06 — Supply
        </h3>
        <div className="mt-6 space-y-6">
          <div className="border border-[var(--border)] p-6 space-y-3">
            <h4 className="font-hoodlrz text-2xl font-bold text-foreground">
              Hoodlrz Collection
            </h4>
            <p className="text-sm leading-relaxed text-muted">
              10,000 unique hooded identities, each composed of 7 hand-drawn
              SVG layers — walls, graffiti, hoodies, eyes, mouths, accessories,
              and foregrounds. Available in light and dark variants.
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-muted">
              <span><strong className="text-foreground">10,000</strong> supply</span>
              <span><strong className="text-foreground">7</strong> layer categories</span>
              <span><strong className="text-foreground">2</strong> variants</span>
              <span><strong className="text-foreground">$9.99</strong> per piece</span>
              <span><strong className="text-foreground">0</strong> gas fees</span>
            </div>
          </div>

          <div className="border border-[var(--border)] p-6 space-y-3">
            <h4 className="font-hoodlrz text-2xl font-bold text-foreground">
              Genesis Collection
            </h4>
            <p className="text-sm leading-relaxed text-muted">
              25 exclusive hand-crafted vinyl artworks across three editions:
              Black (10), White (5), and Craft (10). Reserved for top collectors.
              Genesis access is earned through collection activity and Hoodz
              accumulation — not purchased directly.
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-muted">
              <span><strong className="text-foreground">25</strong> pieces</span>
              <span><strong className="text-foreground">3</strong> editions</span>
              <span><strong className="text-foreground">Earned</strong> access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layers */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          07 — The Layer System
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every Hoodlrz artwork is built from 7 layers stacked in precise order.
          Each layer is a hand-drawn SVG file. The combination is determined by
          the token&apos;s seed, making each piece unique and reproducible.
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
          Only 10,000 will ever exist.
        </p>
      </section>

      {/* Rarity */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          08 — Rarity System
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Each trait has a rarity weight. Combined, they determine your
          collectible&apos;s overall rarity tier. Multiple rare traits compound
          into bonus scoring.
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

      {/* Security */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          09 — Security Model
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The Hoodlrz Protocol is designed with security at every layer:
          </p>
        </div>
        <div className="mt-6 space-y-3">
          {[
            { title: "Row-Level Security", desc: "Every database table is protected by granular access policies. Users can only read their own data. Admin access is verified at the middleware level." },
            { title: "Magic Link Auth", desc: "No passwords to steal, no seed phrases to lose. Authentication is done via one-time email links, eliminating the most common attack vectors." },
            { title: "Stripe Payments", desc: "All payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We never store credit card data." },
            { title: "Webhook Verification", desc: "Every Stripe event is verified using cryptographic signatures before processing. Replay attacks are impossible." },
            { title: "Canonical Hashing", desc: "Every artwork's integrity can be independently verified by regenerating the SVG from the seed and comparing the SHA-256 hash." },
          ].map((item) => (
            <div key={item.title} className="border border-[var(--border)] p-4 space-y-1">
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="text-[12px] leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          10 — Hoodlrz vs Traditional NFTs
        </h3>
        <div className="mt-6 border border-[var(--border)] divide-y divide-[var(--border)]">
          <div className="grid grid-cols-3 gap-0">
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-muted">Feature</div>
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-muted border-l border-[var(--border)]">Traditional NFT</div>
            <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-foreground border-l border-[var(--border)]">Hoodlrz Protocol</div>
          </div>
          {[
            { feature: "Wallet required", trad: "Yes (MetaMask, etc.)", hoodlrz: "No — email only" },
            { feature: "Gas fees", trad: "$2 - $50+", hoodlrz: "$0 — always" },
            { feature: "Payment", trad: "Cryptocurrency", hoodlrz: "Credit card (USD)" },
            { feature: "Transaction time", trad: "30s - 5min", hoodlrz: "Instant" },
            { feature: "Failed transactions", trad: "Common", hoodlrz: "Impossible" },
            { feature: "Art storage", trad: "IPFS / Arweave", hoodlrz: "Deterministic SVG" },
            { feature: "Transfer cost", trad: "Gas fee", hoodlrz: "Free" },
            { feature: "Verification", trad: "Blockchain explorer", hoodlrz: "SHA-256 hash" },
          ].map((row) => (
            <div key={row.feature} className="grid grid-cols-3 gap-0 border-t border-[var(--border)]">
              <div className="p-3 text-xs font-semibold text-foreground">{row.feature}</div>
              <div className="p-3 text-xs text-muted border-l border-[var(--border)]">{row.trad}</div>
              <div className="p-3 text-xs font-semibold text-foreground border-l border-[var(--border)]">{row.hoodlrz}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="mt-16 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
          Philosophy
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            We believe digital art should be accessible. No wallets, no seed
            phrases, no gas fees. Just art you can collect, own, and share.
          </p>
          <p>
            Every feature we build must increase desire, trust, or liquidity.
            If it doesn&apos;t, we remove it. Clarity over features. Emotion over
            technology.
          </p>
          <p className="text-foreground font-semibold">
            The future of digital art ownership is not on a blockchain. It&apos;s in
            a better experience.
          </p>
        </div>
      </section>
    </div>
  );
}
