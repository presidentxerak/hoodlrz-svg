import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "rare" | "legendary";
}

const variantMap = {
  default: "border-[var(--border)] text-muted",
  success: "border-emerald-500/40 text-emerald-500 bg-emerald-500/10",
  warning: "border-amber-500/40 text-amber-500 bg-amber-500/10",
  rare: "border-violet-500/40 text-violet-400 bg-violet-500/10",
  legendary:
    "border-accent-red/40 text-accent-red bg-accent-red/10",
} as const;

export default function Badge({
  children,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center border px-2 py-0.5",
        "text-[10px] font-bold uppercase tracking-widest leading-none",
        variantMap[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
