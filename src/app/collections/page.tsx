"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function CollectionsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Header */}
      <h1 className="font-hoodlrz text-[36px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
        Collections
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Explore drops from the Hoodlrz universe. Each collection is a unique
        world of digital identity.
      </p>

      {/* Grid */}
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {/* Hoodlrz Street Collection */}
        <Link href="/">
          <Card className="group flex flex-col gap-0 p-0 overflow-hidden">
            <div className="relative w-full aspect-square overflow-hidden bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/hoodlrz-banner-1.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-hoodlrz text-3xl font-bold tracking-wider text-white sm:text-4xl">
                  HOODLRZ
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <Badge variant="success">ERC-721</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 784 784" fill="none">
                  <path d="M392 0L387.5 15.3V536.2L392 540.7L631.5 400.5L392 0Z" fill="#627eea" fillOpacity="0.8"/>
                  <path d="M392 0L152.5 400.5L392 540.7V289.6V0Z" fill="#627eea"/>
                  <path d="M392 586.3L389.5 589.3V776.7L392 784L631.7 446.2L392 586.3Z" fill="#627eea" fillOpacity="0.8"/>
                  <path d="M392 784V586.3L152.5 446.2L392 784Z" fill="#627eea"/>
                </svg>
                <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                  Hoodlrz Street
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted line-clamp-2">
                1,337 unique hooded identities on Ethereum. Standard ERC-721.
                Hand-drawn by XERAK.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                <span>
                  <span className="font-bold text-foreground">1,337</span> supply
                </span>
                <span className="font-bold text-[#627eea]">ERC-721</span>
              </div>
            </div>
          </Card>
        </Link>

        {/* Genesis Vinyl Collection */}
        <Link href="/genesis">
          <Card className="group flex flex-col gap-0 p-0 overflow-hidden">
            <div className="relative w-full aspect-square overflow-hidden bg-[var(--surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/genesis/black/01-black.png"
                alt="Genesis vinyl"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Badge variant="legendary">Genesis</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <h2 className="font-hoodlrz text-xl font-bold tracking-wider text-foreground">
                Genesis Vinyl
              </h2>
              <p className="text-sm leading-relaxed text-muted line-clamp-2">
                25 unique hand-drawn sleeves with custom pressed discs. Choose
                your 4 tracks on Side A &amp; Side B. Three editions.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                <span>
                  <span className="font-bold text-foreground">25</span> pieces
                </span>
                <span>
                  <span className="font-bold text-foreground">3</span> editions
                </span>
                <span className="font-bold text-foreground">€500</span>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
