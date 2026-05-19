"use client";

import { useEffect, useState } from "react";

interface Props {
  usd: number;
  className?: string;
  /** Hide the leading "≈" symbol */
  bare?: boolean;
}

interface RatePayload {
  usdPerEth: number | null;
}

/**
 * Inline component that fetches the live ETH/USD rate and displays the
 * supplied USD amount converted into ETH (e.g. "≈ 0.0028 ETH").
 *
 * The rate is fetched from /api/eth-price which caches CoinGecko for 60 s.
 */
export default function UsdToEth({ usd, className = "", bare = false }: Props) {
  const [usdPerEth, setUsdPerEth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/eth-price")
      .then((r) => r.json() as Promise<RatePayload>)
      .then((data) => {
        if (!cancelled) {
          setUsdPerEth(data.usdPerEth);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <span className={className}>{bare ? "…" : "≈ … ETH"}</span>;
  }

  if (!usdPerEth) {
    return <span className={className}>{bare ? "—" : "≈ — ETH"}</span>;
  }

  const eth = usd / usdPerEth;
  // 4 significant figures, but never more than 6 decimals for tiny amounts.
  const formatted = eth >= 1
    ? eth.toFixed(3)
    : eth >= 0.01
      ? eth.toFixed(4)
      : eth.toPrecision(3);

  return (
    <span className={className}>
      {bare ? `${formatted} ETH` : `≈ ${formatted} ETH`}
    </span>
  );
}
