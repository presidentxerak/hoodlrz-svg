import type { Metadata } from "next";
import MarketClient from "@/components/market/MarketClient";

export const metadata: Metadata = {
  title: "Market — Hoodlrz",
  robots: { index: false, follow: false },
};

export default function MarketPage() {
  return <MarketClient />;
}
