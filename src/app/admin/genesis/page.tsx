"use client";

import { useState } from "react";
import { Gem, Plus, Trash2 } from "lucide-react";

// TODO: Replace with Supabase query
const INITIAL_ACCESS = [
  { id: "1", email: "pixel_queen@pm.me", pseudonym: "PixelQueen", tokensOwned: 31, grantedDate: "2026-03-10", tier: "Legendary" },
  { id: "2", email: "block_maven@proton.me", pseudonym: "BlockMaven", tokensOwned: 22, grantedDate: "2026-03-12", tier: "Elite" },
  { id: "3", email: "xd_phantom@pm.me", pseudonym: "xd_phantom", tokensOwned: 14, grantedDate: "2026-03-15", tier: "Elite" },
  { id: "4", email: "nightcoder42@gmail.com", pseudonym: "NightCoder", tokensOwned: 8, grantedDate: "2026-03-20", tier: "Core" },
];

// TODO: Replace with Supabase user lookup
const AVAILABLE_USERS = [
  { email: "hood_dev@outlook.com", pseudonym: "HoodDev" },
  { email: "chain_ghost@gmail.com", pseudonym: "ChainGhost" },
  { email: "freshface@gmail.com", pseudonym: "PixelHood" },
];

const TIER_COLORS: Record<string, string> = {
  Legendary: "text-accent-red bg-accent-red/10 border-accent-red/30",
  Elite: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  Core: "text-amber-500 bg-amber-500/10 border-amber-500/30",
};

export default function AdminGenesis() {
  const [accessList, setAccessList] = useState(INITIAL_ACCESS);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedTier, setSelectedTier] = useState("Core");

  const handleGrant = () => {
    if (!selectedUser) return;
    const user = AVAILABLE_USERS.find((u) => u.email === selectedUser);
    if (!user) return;

    // TODO: Grant access via Supabase
    const entry = {
      id: String(Date.now()),
      email: user.email,
      pseudonym: user.pseudonym,
      tokensOwned: 0,
      grantedDate: new Date().toISOString().split("T")[0],
      tier: selectedTier,
    };
    setAccessList((prev) => [entry, ...prev]);
    setSelectedUser("");
  };

  const handleRevoke = (id: string) => {
    // TODO: Revoke access via Supabase
    setAccessList((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Genesis
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          Exclusive access management
        </p>
      </div>

      {/* Genesis banner */}
      <div className="border border-accent-red/20 bg-gradient-to-r from-accent-red/5 to-accent-magenta/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-accent-red to-accent-magenta flex items-center justify-center flex-shrink-0">
            <Gem size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground mb-1">
              Genesis Access Program
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Top collectors unlock exclusive access to Genesis works. Grant or revoke
              access to curated members based on their collection activity and
              community standing.
            </p>
          </div>
        </div>
      </div>

      {/* Grant access form */}
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
          Grant Access
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 border border-[var(--border)] bg-transparent px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent-red transition-colors"
          >
            <option value="">Select a user...</option>
            {AVAILABLE_USERS.map((u) => (
              <option key={u.email} value={u.email}>
                {u.pseudonym} ({u.email})
              </option>
            ))}
          </select>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="border border-[var(--border)] bg-transparent px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent-red transition-colors"
          >
            <option value="Core">Core</option>
            <option value="Elite">Elite</option>
            <option value="Legendary">Legendary</option>
          </select>
          <button
            onClick={handleGrant}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent-red to-accent-magenta text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:scale-[1.03] transition-transform"
          >
            <Plus size={14} />
            Grant
          </button>
        </div>
      </div>

      {/* Access table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["Pseudonym", "Email", "Tokens Owned", "Tier", "Granted", ""].map(
                (h) => (
                  <th
                    key={h || "actions"}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {accessList.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-xs uppercase tracking-widest text-muted"
                >
                  No genesis access granted
                </td>
              </tr>
            ) : (
              accessList.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    {entry.pseudonym}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{entry.email}</td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">
                    {entry.tokensOwned}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        TIER_COLORS[entry.tier] ?? "text-muted border-[var(--border)]",
                      ].join(" ")}
                    >
                      {entry.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {entry.grantedDate}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRevoke(entry.id)}
                      className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent-red transition-colors"
                      aria-label="Revoke access"
                    >
                      <Trash2 size={14} />
                    </button>
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
