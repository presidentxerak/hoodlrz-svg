"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CountdownTimer from "@/components/ui/CountdownTimer";

interface HeaderProps {
  showCountdown?: boolean;
  targetDate?: string | Date;
  countdownLabel?: string;
}

const navLinks = [
  { href: "/collections", label: "Collections" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/my-collection", label: "My Collection" },
];

export default function Header({
  showCountdown,
  targetDate,
  countdownLabel,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-hoodlrz.svg"
            alt="Hoodlrz"
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
          <span className="font-hoodlrz text-xl font-bold tracking-wider text-foreground sm:text-2xl">
            HOODLRZ
          </span>
        </Link>

        {/* Center: countdown ticker (optional, hidden on mobile) */}
        {showCountdown && targetDate && (
          <div className="hidden items-center gap-2 sm:flex">
            {countdownLabel && (
              <span className="text-xs font-medium uppercase tracking-widest text-muted">
                {countdownLabel}
              </span>
            )}
            <CountdownTimer targetDate={targetDate} />
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-4">
          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
