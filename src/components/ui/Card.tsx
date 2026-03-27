"use client";

import type { ReactNode, MouseEventHandler } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "bg-white dark:bg-[var(--surface)]",
        "border border-[var(--border)]",
        "p-5",
        "transition-transform transition-shadow duration-200",
        "hover:-translate-y-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_24px_rgba(255,255,255,0.04)]",
        onClick ? "cursor-pointer" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
