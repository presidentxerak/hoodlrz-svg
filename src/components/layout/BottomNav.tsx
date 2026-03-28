"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ImageIcon, User } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
}

const items: NavItem[] = [
  { icon: <Home size={20} />, label: "Home", href: "/" },
  { icon: <Grid3X3 size={20} />, label: "Collections", href: "/collections" },
  { icon: <ImageIcon size={20} />, label: "Gallery", href: "/gallery" },
  { icon: <User size={20} />, label: "Profile", href: "/my-collection" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[var(--border)] bg-background/90 backdrop-blur-md md:hidden">
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-icon relative flex-1 ${
              isActive ? "active" : "text-muted"
            }`}
          >
            {/* Active indicator bar */}
            <span
              className={`absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 bg-accent-red transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
            {item.icon}
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
