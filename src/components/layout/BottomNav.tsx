"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, Disc3, User, Building2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  beta?: boolean;
}

const items: NavItem[] = [
  { icon: <Home size={20} />, label: "Collection", href: "/" },
  { icon: <Sparkles size={20} />, label: "Kids", href: "/kids" },
  { icon: <Disc3 size={20} />, label: "Vinyl", href: "/genesis" },
  { icon: <Building2 size={20} />, label: "City", href: "/city", beta: true },
  { icon: <Info size={20} />, label: "About", href: "/about" },
  { icon: <User size={20} />, label: "Profile", href: "/my-collection" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // The hOodlrz CITY game needs the full mobile viewport; the BottomNav
  // would chop ~64px off the bottom of the iframe otherwise.
  if (pathname?.startsWith("/city")) return null;

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
            {item.beta && (
              <span className="absolute top-1 right-1/4 translate-x-1/2 border border-[#ff2db5]/60 text-[#ff2db5] text-[7px] font-bold uppercase tracking-widest px-0.5 leading-none">
                Beta
              </span>
            )}
            {item.icon}
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
