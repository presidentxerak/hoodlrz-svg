"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

// TODO: Replace with Supabase query
const DEMO_USERS = [
  { id: "1", email: "xd_phantom@pm.me", pseudonym: "xd_phantom", tokensOwned: 14, hoodzBalance: 2340, joined: "2025-12-01" },
  { id: "2", email: "nightcoder42@gmail.com", pseudonym: "NightCoder", tokensOwned: 8, hoodzBalance: 1120, joined: "2025-12-15" },
  { id: "3", email: "block_maven@proton.me", pseudonym: "BlockMaven", tokensOwned: 22, hoodzBalance: 5800, joined: "2026-01-03" },
  { id: "4", email: "hood_dev@outlook.com", pseudonym: "HoodDev", tokensOwned: 3, hoodzBalance: 450, joined: "2026-01-20" },
  { id: "5", email: "pixel_queen@pm.me", pseudonym: "PixelQueen", tokensOwned: 31, hoodzBalance: 8900, joined: "2026-02-05" },
  { id: "6", email: "chain_ghost@gmail.com", pseudonym: "ChainGhost", tokensOwned: 6, hoodzBalance: 780, joined: "2026-02-18" },
  { id: "7", email: "freshface@gmail.com", pseudonym: "PixelHood", tokensOwned: 1, hoodzBalance: 100, joined: "2026-03-26" },
  { id: "8", email: "newuser1@pm.me", pseudonym: "ShadowMint", tokensOwned: 0, hoodzBalance: 0, joined: "2026-03-27" },
];

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return DEMO_USERS;
    const q = search.toLowerCase();
    return DEMO_USERS.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.pseudonym.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
            Users
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted mt-1">
            {DEMO_USERS.length} registered users
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search email or pseudonym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[var(--border)] bg-transparent pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent-red transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["Email", "Pseudonym", "Tokens Owned", "Hoodz Balance", "Joined"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-xs uppercase tracking-widest text-muted"
                >
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted">{user.email}</td>
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    {user.pseudonym}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">
                    {user.tokensOwned}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">
                    {user.hoodzBalance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {user.joined}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
