"use client";

// TODO: Replace with Supabase query
const DEMO_ORDERS = [
  { id: "ORD-0091", user: "xd_phantom@pm.me", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-26" },
  { id: "ORD-0090", user: "nightcoder42@gmail.com", collection: "Street Legends", amount: "$85", status: "Pending", date: "2026-03-25" },
  { id: "ORD-0089", user: "block_maven@proton.me", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-24" },
  { id: "ORD-0088", user: "hood_dev@outlook.com", collection: "Cyber Hoods", amount: "$65", status: "Refunded", date: "2026-03-23" },
  { id: "ORD-0087", user: "pixel_queen@pm.me", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-22" },
  { id: "ORD-0086", user: "chain_ghost@gmail.com", collection: "Street Legends", amount: "$85", status: "Completed", date: "2026-03-21" },
  { id: "ORD-0085", user: "pixel_queen@pm.me", collection: "Cyber Hoods", amount: "$65", status: "Pending", date: "2026-03-20" },
  { id: "ORD-0084", user: "nightcoder42@gmail.com", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-19" },
  { id: "ORD-0083", user: "xd_phantom@pm.me", collection: "Street Legends", amount: "$85", status: "Refunded", date: "2026-03-18" },
  { id: "ORD-0082", user: "block_maven@proton.me", collection: "Cyber Hoods", amount: "$65", status: "Completed", date: "2026-03-17" },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  Pending: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  Refunded: "text-red-500 bg-red-500/10 border-red-500/30",
};

export default function AdminOrders() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Orders
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          {DEMO_ORDERS.length} total orders
        </p>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {["ID", "User", "Collection", "Amount", "Status", "Date"].map(
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
            {DEMO_ORDERS.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
              >
                <td className="px-4 py-3 text-xs font-mono text-foreground">
                  {order.id}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{order.user}</td>
                <td className="px-4 py-3 text-xs text-foreground">
                  {order.collection}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-foreground">
                  {order.amount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      STATUS_COLORS[order.status] ?? "text-muted border-[var(--border)]",
                    ].join(" ")}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted font-mono">
                  {order.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
