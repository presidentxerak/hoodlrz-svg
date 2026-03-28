"use client";

import Link from "next/link";
import type { ReactNode, MouseEventHandler } from "react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string;
}

const sizeMap = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
} as const;

const variantMap = {
  primary: [
    "cta-gradient",
    "text-white font-bold uppercase tracking-widest",
    "hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(229,62,62,0.5),0_0_48px_rgba(213,63,140,0.3)]",
    "active:scale-[0.98]",
  ].join(" "),
  secondary: [
    "border border-[var(--border)] bg-transparent text-foreground",
    "font-semibold uppercase tracking-widest",
    "hover:border-accent-red hover:text-accent-red",
    "active:scale-[0.98]",
    "transition-colors duration-150",
  ].join(" "),
  ghost: [
    "bg-transparent text-foreground",
    "font-medium tracking-wide",
    "hover:text-accent-red hover:bg-[var(--surface)]",
    "active:scale-[0.98]",
    "transition-colors duration-150",
  ].join(" "),
} as const;

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled = false,
  onClick,
  href,
}: ButtonProps) {
  const base = [
    "inline-flex items-center justify-center rounded-none select-none",
    "transition-transform duration-150",
    "disabled:pointer-events-none disabled:opacity-40",
    sizeMap[size],
    variantMap[variant],
    className,
  ].join(" ");

  if (href && !disabled) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}
