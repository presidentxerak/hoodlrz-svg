import {
  Users,
  Layers,
  ShoppingCart,
  Tag,
  DollarSign,
} from "lucide-react";

// TODO: Fetch real stats from Supabase
const STATS = [
  { label: "Total Users", value: "1,284", icon: Users, change: "+12%" },
  { label: "Total Collections", value: "6", icon: Layers, change: "+1" },
  { label: "Total Orders", value: "842", icon: ShoppingCart, change: "+38" },
  { label: "Active Listings", value: "127", icon: Tag, change: "+5" },
  { label: "Total Revenue", value: "$48,320", icon: DollarSign, change: "+8.2%" },
] as const;

// TODO: Replace with Supabase query
const RECENT_ORDERS = [
  { id: "ORD-0091", user: "xd_phantom@pm.me", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-26" },
  { id: "ORD-0090", user: "nightcoder42@gmail.com", collection: "Street Legends", amount: "$85", status: "Pending", date: "2026-03-25" },
  { id: "ORD-0089", user: "block_maven@proton.me", collection: "Genesis Hoodlrz", amount: "$120", status: "Completed", date: "2026-03-24" },
  { id: "ORD-0088", user: "hood_dev@outlook.com", collection: "Cyber Hoods", amount: "$65", status: "Refunded", date: "2026-03-23" },
];

// TODO: Replace with Supabase query
const RECENT_USERS = [
  { email: "newuser1@pm.me", pseudonym: "ShadowMint", joined: "2026-03-27" },
  { email: "freshface@gmail.com", pseudonym: "PixelHood", joined: "2026-03-26" },
  { email: "joinedtoday@proton.me", pseudonym: "ChainGhost", joined: "2026-03-25" },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  Pending: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  Refunded: "text-red-500 bg-red-500/10 border-red-500/30",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Admin Panel
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted mt-1">
          Overview & Quick Stats
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map(({ label, value, icon: Icon, change }) => (
          <div
            key={label}
            className="bg-[var(--surface)] border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon size={18} className="text-muted" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                {change}
              </span>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4">
          Recent Orders
        </h2>
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
              {RECENT_ORDERS.map((order) => (
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

      {/* Recent registrations */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4">
          Recent Registrations
        </h2>
        <div className="border border-[var(--border)] overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                {["Email", "Pseudonym", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_USERS.map((user) => (
                <tr
                  key={user.email}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)] transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted">{user.email}</td>
                  <td className="px-4 py-3 text-xs font-bold text-foreground">
                    {user.pseudonym}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {user.joined}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
