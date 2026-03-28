"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Users,
  ShoppingCart,
  Tag,
  Shield,
  Gem,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Collections", href: "/admin/collections", icon: Layers },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Listings", href: "/admin/listings", icon: Tag },
  { label: "Whitelist", href: "/admin/whitelist", icon: Shield },
  { label: "Genesis", href: "/admin/genesis", icon: Gem },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // TODO: Replace with real auth check from Supabase
  const isAdmin = true;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm uppercase tracking-widest text-muted">
          Access denied
        </p>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[var(--border)] bg-[var(--surface)] min-h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-[var(--border)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-red">
            Admin Panel
          </h2>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-5 py-2.5 text-xs uppercase tracking-widest transition-colors duration-150",
                isActive(href)
                  ? "text-accent-red bg-accent-red/5 border-r-2 border-accent-red"
                  : "text-muted hover:text-foreground hover:bg-[var(--surface-alt)]",
              ].join(" ")}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-red">
            Admin
          </h2>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-8 h-8 flex items-center justify-center text-foreground"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="border-t border-[var(--border)] bg-[var(--surface)] pb-2">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={[
                  "flex items-center gap-3 px-5 py-2.5 text-xs uppercase tracking-widest transition-colors duration-150",
                  isActive(href)
                    ? "text-accent-red bg-accent-red/5"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
