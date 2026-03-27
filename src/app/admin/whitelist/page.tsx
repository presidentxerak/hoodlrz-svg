"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

// TODO: Replace with Supabase query
const INITIAL_WHITELIST = [
  { id: "1", email: "xd_phantom@pm.me", collection: "Genesis Hoodlrz", addedDate: "2026-02-10", status: "Active" },
  { id: "2", email: "nightcoder42@gmail.com", collection: "Neon Nights", addedDate: "2026-02-15", status: "Active" },
  { id: "3", email: "block_maven@proton.me", collection: "Genesis Hoodlrz", addedDate: "2026-03-01", status: "Claimed" },
  { id: "4", email: "pixel_queen@pm.me", collection: "Neon Nights", addedDate: "2026-03-05", status: "Active" },
  { id: "5", email: "hood_dev@outlook.com", collection: "Genesis Hoodlrz", addedDate: "2026-03-10", status: "Expired" },
  { id: "6", email: "chain_ghost@gmail.com", collection: "Neon Nights", addedDate: "2026-03-15", status: "Active" },
];

const STATUS_COLORS: Record<string, string> = {
  Active: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  Claimed: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  Expired: "text-muted bg-[var(--surface)] border-[var(--border)]",
};

export default function AdminWhitelist() {
  const [entries, setEntries] = useState(INITIAL_WHITELIST);
  const [newEmail, setNewEmail] = useState("");
  const [newCollection, setNewCollection] = useState("Genesis Hoodlrz");

  const handleAdd = () => {
    if (!newEmail.trim()) return;
    // TODO: Add to Supabase
    const entry = {
      id: String(Date.now()),
      email: newEmail.trim(),
      collection: newCollection,
      addedDate: new Date().toISOString().split("T")[0],
      status: "Active",
    };
    setEntries((prev) => [entry, ...prev]);
    setNewEmail("");
  };

  const handleRemove = (id: string) => {
    // TODO: Remove from Supabase
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Whitelist
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          Manage early access spots
        </p>
      </div>

      {/* Add form */}
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
          Add to Whitelist
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 border border-[var(--border)] bg-transparent px-4 py-2.5 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent-red transition-colors"
          />
          <select
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            className="border border-[var(--border)] bg-transparent px-4 py-2.5 text-xs text-foreground outline-none focus:border-accent-red transition-colors"
          >
            <option value="Genesis Hoodlrz">Genesis Hoodlrz</option>
            <option value="Neon Nights">Neon Nights</option>
            <option value="Street Legends">Street Legends</option>
            <option value="Cyber Hoods">Cyber Hoods</option>
          </select>
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent-red to-accent-magenta text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:scale-[1.03] transition-transform"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["Email", "Collection", "Added Date", "Status", ""].map((h) => (
                <th
                  key={h || "actions"}
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-xs uppercase tracking-widest text-muted"
                >
                  Whitelist is empty
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted">{entry.email}</td>
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    {entry.collection}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {entry.addedDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        STATUS_COLORS[entry.status] ?? "text-muted border-[var(--border)]",
                      ].join(" ")}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent-red transition-colors"
                      aria-label="Remove from whitelist"
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
