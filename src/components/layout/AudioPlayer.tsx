"use client";

import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";

export default function AudioPlayer() {
  const [playing, setPlaying] = useState(false);
  const [track] = useState("No track selected");

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex h-12 items-center justify-between border-t border-[var(--border)] bg-background/90 px-4 backdrop-blur-md sm:bottom-0">
      {/* Track title */}
      <span className="truncate text-xs font-medium text-muted sm:text-sm">
        {track}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Previous track"
          className="text-foreground transition-colors hover:text-accent-red"
        >
          <SkipBack size={16} />
        </button>

        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 items-center justify-center border border-[var(--border)] text-foreground transition-colors hover:text-accent-red"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          aria-label="Next track"
          className="text-foreground transition-colors hover:text-accent-red"
        >
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
}
