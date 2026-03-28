"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

// TODO: Replace with Supabase query
const DEMO_COLLECTIONS = [
  { id: "1", name: "Genesis Hoodlrz", slug: "genesis-hoodlrz", supply: 500, minted: 312, status: "Live" },
  { id: "2", name: "Street Legends", slug: "street-legends", supply: 1000, minted: 687, status: "Live" },
  { id: "3", name: "Cyber Hoods", slug: "cyber-hoods", supply: 2000, minted: 1455, status: "Live" },
  { id: "4", name: "Neon Nights", slug: "neon-nights", supply: 750, minted: 0, status: "Upcoming" },
  { id: "5", name: "Hood Royalty", slug: "hood-royalty", supply: 250, minted: 250, status: "Sold Out" },
  { id: "6", name: "Glitch Series", slug: "glitch-series", supply: 500, minted: 0, status: "Draft" },
];

const STATUS_COLORS: Record<string, string> = {
  Live: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  Upcoming: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  "Sold Out": "text-violet-400 bg-violet-500/10 border-violet-500/30",
  Draft: "text-muted bg-[var(--surface)] border-[var(--border)]",
};

export default function AdminCollections() {
  const [collections] = useState(DEMO_COLLECTIONS);

  const handleAdd = () => {
    // TODO: Open modal / navigate to create collection form
    alert("Add collection (placeholder)");
  };

  const handleEdit = (id: string) => {
    // TODO: Open edit modal or navigate to edit page
    alert(`Edit collection ${id} (placeholder)`);
  };

  const handleDelete = (id: string) => {
    // TODO: Confirm and delete via Supabase
    alert(`Delete collection ${id} (placeholder)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
            Collections
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted mt-1">
            Manage drops & supply
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-accent-red to-accent-magenta text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:scale-[1.03] transition-transform"
        >
          <Plus size={14} />
          Add Collection
        </button>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["Name", "Slug", "Supply", "Minted", "Status", "Actions"].map(
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
            {collections.map((c) => {
              const pct = c.supply > 0 ? Math.round((c.minted / c.supply) * 100) : 0;
              return (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-bold text-foreground">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground font-mono">
                    {c.supply.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground">
                        {c.minted.toLocaleString()}
                      </span>
                      <div className="w-16 h-1.5 bg-[var(--border)]">
                        <div
                          className="h-full bg-gradient-to-r from-accent-red to-accent-magenta"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        STATUS_COLORS[c.status] ?? "text-muted border-[var(--border)]",
                      ].join(" ")}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(c.id)}
                        className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent-red transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
