"use client";

import { useState, useCallback } from "react";
import { AVAILABLE_TRACKS, TRACKS_PER_SIDE, TOTAL_TRACKS, type VinylTrack } from "@/lib/genesis/tracks";

export interface TrackSelection {
  sideA: VinylTrack[];
  sideB: VinylTrack[];
}

interface TrackSelectorProps {
  onSelectionComplete: (selection: TrackSelection | null) => void;
  disabled?: boolean;
}

export default function TrackSelector({ onSelectionComplete, disabled }: TrackSelectorProps) {
  const [sideA, setSideA] = useState<VinylTrack[]>([]);
  const [sideB, setSideB] = useState<VinylTrack[]>([]);

  const selectedIds = new Set([...sideA.map((t) => t.id), ...sideB.map((t) => t.id)]);
  const totalSelected = sideA.length + sideB.length;
  const isComplete = sideA.length === TRACKS_PER_SIDE && sideB.length === TRACKS_PER_SIDE;

  const addTrack = useCallback(
    (track: VinylTrack) => {
      if (selectedIds.has(track.id) || totalSelected >= TOTAL_TRACKS) return;
      if (sideA.length < TRACKS_PER_SIDE) {
        const next = [...sideA, track];
        setSideA(next);
        if (next.length === TRACKS_PER_SIDE && sideB.length === TRACKS_PER_SIDE) {
          onSelectionComplete({ sideA: next, sideB });
        }
      } else if (sideB.length < TRACKS_PER_SIDE) {
        const next = [...sideB, track];
        setSideB(next);
        if (sideA.length === TRACKS_PER_SIDE && next.length === TRACKS_PER_SIDE) {
          onSelectionComplete({ sideA, sideB: next });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideA, sideB, selectedIds, totalSelected]
  );

  const removeTrack = useCallback(
    (side: "A" | "B", index: number) => {
      if (side === "A") {
        setSideA(sideA.filter((_, i) => i !== index));
      } else {
        setSideB(sideB.filter((_, i) => i !== index));
      }
      onSelectionComplete(null);
    },
    [sideA, sideB, onSelectionComplete]
  );

  const swapOrder = useCallback(
    (side: "A" | "B") => {
      if (side === "A" && sideA.length === 2) {
        const swapped = [sideA[1], sideA[0]];
        setSideA(swapped);
        if (sideB.length === TRACKS_PER_SIDE) {
          onSelectionComplete({ sideA: swapped, sideB });
        }
      } else if (side === "B" && sideB.length === 2) {
        const swapped = [sideB[1], sideB[0]];
        setSideB(swapped);
        if (sideA.length === TRACKS_PER_SIDE) {
          onSelectionComplete({ sideA, sideB: swapped });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideA, sideB]
  );

  const reset = useCallback(() => {
    setSideA([]);
    setSideB([]);
    onSelectionComplete(null);
  }, [onSelectionComplete]);

  return (
    <div className={`space-y-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          Choose Your 4 Tracks
        </p>
        {totalSelected > 0 && (
          <button
            onClick={reset}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Select {TOTAL_TRACKS} tracks from the catalog below. The first {TRACKS_PER_SIDE} go to <strong className="text-foreground">Side A</strong>, the next {TRACKS_PER_SIDE} to <strong className="text-foreground">Side B</strong>. You can swap the order within each side.
      </p>

      {/* Side A & Side B */}
      <div className="grid grid-cols-2 gap-3">
        {/* Side A */}
        <div className="border border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Side A
            </span>
            {sideA.length === 2 && (
              <button
                onClick={() => swapOrder("A")}
                className="text-[10px] uppercase tracking-widest text-muted hover:text-accent-red transition-colors"
                title="Swap order"
              >
                Swap
              </button>
            )}
          </div>
          {Array.from({ length: TRACKS_PER_SIDE }).map((_, i) => (
            <div
              key={`a-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs border ${
                sideA[i]
                  ? "border-accent-red/30 bg-accent-red/5 text-foreground"
                  : "border-dashed border-[var(--border)] text-muted"
              }`}
            >
              <span className="text-[10px] text-muted w-4 shrink-0">A{i + 1}</span>
              {sideA[i] ? (
                <>
                  <span className="truncate flex-1">{sideA[i].title}</span>
                  <button
                    onClick={() => removeTrack("A", i)}
                    className="text-muted hover:text-accent-red shrink-0 text-sm leading-none"
                  >
                    &times;
                  </button>
                </>
              ) : (
                <span className="italic">Empty</span>
              )}
            </div>
          ))}
        </div>

        {/* Side B */}
        <div className="border border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Side B
            </span>
            {sideB.length === 2 && (
              <button
                onClick={() => swapOrder("B")}
                className="text-[10px] uppercase tracking-widest text-muted hover:text-accent-red transition-colors"
                title="Swap order"
              >
                Swap
              </button>
            )}
          </div>
          {Array.from({ length: TRACKS_PER_SIDE }).map((_, i) => (
            <div
              key={`b-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs border ${
                sideB[i]
                  ? "border-accent-red/30 bg-accent-red/5 text-foreground"
                  : "border-dashed border-[var(--border)] text-muted"
              }`}
            >
              <span className="text-[10px] text-muted w-4 shrink-0">B{i + 1}</span>
              {sideB[i] ? (
                <>
                  <span className="truncate flex-1">{sideB[i].title}</span>
                  <button
                    onClick={() => removeTrack("B", i)}
                    className="text-muted hover:text-accent-red shrink-0 text-sm leading-none"
                  >
                    &times;
                  </button>
                </>
              ) : (
                <span className="italic">Empty</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Track catalog */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted mb-2">
          Catalog — tap to add ({totalSelected}/{TOTAL_TRACKS} selected)
        </p>
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {AVAILABLE_TRACKS.map((track) => {
            const isSelected = selectedIds.has(track.id);
            return (
              <button
                key={track.id}
                onClick={() => addTrack(track)}
                disabled={isSelected || totalSelected >= TOTAL_TRACKS}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "opacity-30 cursor-not-allowed"
                    : totalSelected >= TOTAL_TRACKS
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-[var(--surface)] cursor-pointer"
                }`}
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center border border-[var(--border)] text-[10px] text-muted">
                  {isSelected ? "+" : track.id}
                </span>
                <span className={`flex-1 truncate ${isSelected ? "line-through text-muted" : "text-foreground"}`}>
                  {track.title}
                </span>
                <span className="text-[10px] text-muted">{track.artist}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      {isComplete && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <span>&#10003;</span>
          <span>Your vinyl tracklist is ready.</span>
        </div>
      )}
    </div>
  );
}
