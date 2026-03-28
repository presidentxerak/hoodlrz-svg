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

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          How It Works
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <span className="text-3xl font-bold text-foreground font-hoodlrz">01</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Collect
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              Choose a collection and collect a unique artwork. Each piece is
              generated from 7 hand-drawn layers, making every combination
              one-of-a-kind.
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-3xl font-bold text-foreground font-hoodlrz">02</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Own
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              Your collectible is yours. Download it, use it as your identity,
              or showcase it in your collection. Every piece has a unique serial
              number and rarity score.
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-3xl font-bold text-foreground font-hoodlrz">03</span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Trade
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              List your collectibles for sale on the marketplace, transfer them
              to friends, or hold and earn Hoodz rewards toward free drops.
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

      {/* Collections */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Collections
        </h2>
        <div className="mt-8 space-y-8">
          <div className="border border-[var(--border)] p-6 space-y-3">
            <h3 className="font-hoodlrz text-2xl font-bold text-foreground">
              Hoodlrz
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              The flagship collection. 10,000 unique hooded identities, each
              composed of 7 hand-drawn SVG layers — walls, graffiti, hoodies,
              eyes, mouths, accessories, and foregrounds. Available in light and
              dark variants.
            </p>
            <div className="flex gap-6 text-xs text-muted">
              <span><strong className="text-foreground">10,000</strong> supply</span>
              <span><strong className="text-foreground">7</strong> layer categories</span>
              <span><strong className="text-foreground">2</strong> variants</span>
            </div>
          </div>

          <div className="border border-[var(--border)] p-6 space-y-3">
            <h3 className="font-hoodlrz text-2xl font-bold text-foreground">
              Genesis
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              25 exclusive hand-crafted pieces reserved for top collectors.
              Genesis access is earned, not bought — it unlocks based on your
              collection activity and loyalty.
            </p>
            <div className="flex gap-6 text-xs text-muted">
              <span><strong className="text-foreground">25</strong> pieces</span>
              <span><strong className="text-foreground">Exclusive</strong> access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layers */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          The Layers
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every Hoodlrz artwork is built from 7 layers stacked in order:
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: "Wall", count: 10, desc: "The background" },
            { name: "Graffiti", count: "23+", desc: "Street art behind the character" },
            { name: "Hoodie", count: 12, desc: "The character body" },
            { name: "Eyes", count: 21, desc: "Expression and style" },
            { name: "Mouth", count: 20, desc: "Attitude and mood" },
            { name: "Accessory", count: 17, desc: "Headphones, caps, gear" },
            { name: "Foreground", count: 11, desc: "Decorative overlay" },
          ].map((layer) => (
            <div
              key={layer.name}
              className="border border-[var(--border)] p-3 space-y-1"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                {layer.name}
              </p>
              <p className="text-xl font-bold text-foreground">{layer.count}</p>
              <p className="text-[11px] text-muted">{layer.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rarity */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Rarity System
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Each trait has a rarity weight. Combined, they determine your
          collectible&apos;s overall rarity tier.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { tier: "Common", color: "#9ca3af", desc: "Score 0-24" },
            { tier: "Uncommon", color: "#1b9c85", desc: "Score 25-44" },
            { tier: "Rare", color: "#e94560", desc: "Score 45-69" },
            { tier: "Legendary", color: "#f0c929", desc: "Score 70-100" },
          ].map((r) => (
            <div
              key={r.tier}
              className="flex items-center gap-2 border border-[var(--border)] px-4 py-2"
            >
              <span
                className="w-3 h-3"
                style={{ backgroundColor: r.color }}
              />
              <span className="text-sm font-bold text-foreground">{r.tier}</span>
              <span className="text-xs text-muted">{r.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Hoodz Rewards */}
      <section className="mt-16">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Hoodz Rewards
        </h2>
        <div className="mt-4 border border-[var(--border)] p-6 space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            Every time you collect, you earn <strong className="text-foreground">Hoodz</strong> — our
            loyalty points. Hoodz are non-transferable and tied to your account.
          </p>
          <ul className="text-sm text-muted space-y-2">
            <li>+1 Hoodz per collectible purchased</li>
            <li>10 Hoodz = 1 free collectible from the next drop</li>
            <li>Top Hoodz holders unlock Genesis access</li>
          </ul>
        </div>
      </section>

      {/* Philosophy */}
      <section className="mt-16 mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Philosophy
        </h2>
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
        </div>
      </section>
    </div>
  );
}
