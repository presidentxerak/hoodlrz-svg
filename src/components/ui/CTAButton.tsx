"use client";

import Link from "next/link";
import type { ReactNode, MouseEventHandler } from "react";

interface CTAButtonProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string;
  className?: string;
}

export default function CTAButton({
  children,
  onClick,
  href,
  className = "",
}: CTAButtonProps) {
  const base = `cta-gradient inline-flex items-center justify-center px-6 py-3 text-sm tracking-widest ${className}`;

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={base}>
      {children}
    </button>
  );
}
