"use client";

import { useState, useCallback } from "react";

interface CollectButtonProps {
  collectionSlug: string;
  disabled?: boolean;
  price: string;
  onCollect?: () => void;
}

export default function CollectButton({
  collectionSlug,
  disabled = false,
  price,
  onCollect,
}: CollectButtonProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setClicked(true);
    // Scale animation runs for 200ms, then fire the callback
    setTimeout(() => {
      setClicked(false);
      onCollect?.();
    }, 200);
  }, [disabled, onCollect]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Collect from ${collectionSlug} for ${price}`}
      className={[
        "collect-btn relative inline-flex items-center justify-center",
        "px-8 py-4 text-sm font-bold uppercase tracking-widest",
        "text-white overflow-hidden",
        "transition-all duration-150 ease-out",
        disabled
          ? "opacity-40 cursor-not-allowed grayscale"
          : "cursor-pointer",
        clicked ? "collect-btn--clicked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "linear-gradient(135deg, #E53E3E 0%, #D53F8C 100%)",
      }}
    >
      {/* Pulse ring */}
      {!disabled && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{ animation: "collect-pulse 2.5s ease-in-out infinite" }}
        />
      )}

      {/* Shimmer sweep */}
      {!disabled && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }}
        />
      )}

      <span className="relative z-10 flex items-center gap-3">
        <span>Collect</span>
        <span className="text-white/70 text-xs font-normal">{price}</span>
      </span>
    </button>
  );
}
