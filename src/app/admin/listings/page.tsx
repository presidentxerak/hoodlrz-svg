"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

// TODO: Replace with Supabase query
const DEMO_LISTINGS = [
  { id: "1", token: "Genesis Hoodlrz #042", seller: "xd_phantom@pm.me", price: "$145", listedDate: "2026-03-26" },
  { id: "2", token: "Street Legends #189", seller: "nightcoder42@gmail.com", price: "$92", listedDate: "2026-03-25" },
  { id: "3", token: "Cyber Hoods #711", seller: "block_maven@proton.me", price: "$78", listedDate: "2026-03-24" },
  { id: "4", token: "Genesis Hoodlrz #003", seller: "pixel_queen@pm.me", price: "$320", listedDate: "2026-03-23" },
  { id: "5", token: "Street Legends #455", seller: "chain_ghost@gmail.com", price: "$88", listedDate: "2026-03-22" },
  { id: "6", token: "Cyber Hoods #102", seller: "hood_dev@outlook.com", price: "$71", listedDate: "2026-03-21" },
  { id: "7", token: "Genesis Hoodlrz #117", seller: "pixel_queen@pm.me", price: "$200", listedDate: "2026-03-20" },
];

export default function AdminListings() {
  const [listings, setListings] = useState(DEMO_LISTINGS);

  const handleRemove = (id: string) => {
    // TODO: Remove listing via Supabase
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Listings
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          {listings.length} active listings
        </p>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["Token", "Seller", "Price", "Listed Date", "Actions"].map(
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
            {listings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-xs uppercase tracking-widest text-muted"
                >
                  No active listings
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    {listing.token}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {listing.seller}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold font-mono text-foreground">
                    {listing.price}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {listing.listedDate}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent-red transition-colors"
                      aria-label="Remove listing"
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
