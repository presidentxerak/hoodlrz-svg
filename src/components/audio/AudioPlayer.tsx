"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Music,
} from "lucide-react";
import { useAudioStore, type Track } from "@/store/audio";

const DEMO_TRACKS: Track[] = [
  { id: "1", title: "Hood Dreams", artist: "Hoodlrz", src: "/audio/track1.mp3" },
  { id: "2", title: "Night Code", artist: "Hoodlrz", src: "/audio/track2.mp3" },
  { id: "3", title: "Digital Rain", artist: "Hoodlrz", src: "/audio/track3.mp3" },
];

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const {
    playing,
    currentTrack,
    tracks,
    volume,
    progress,
    pause,
    toggle,
    setTrack,
    setTracks,
    nextTrack,
    prevTrack,
    setVolume,
    setProgress,
  } = useAudioStore();

  // Load demo tracks on mount
  useEffect(() => {
    if (tracks.length === 0) {
      setTracks(DEMO_TRACKS);
    }
  }, [tracks.length, setTracks]);

  // Sync play/pause with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (playing) {
      audio.play().catch(() => pause());
    } else {
      audio.pause();
    }
  }, [playing, currentTrack, pause]);

  // Load new track source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = currentTrack.src;
    audio.load();
    if (playing) {
      audio.play().catch(() => pause());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.currentTime / audio.duration);
  }, [setProgress]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  }, []);

  const handleEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setProgress(pct);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Don't render if no tracks
  if (tracks.length === 0) return null;

  const trackIndex = currentTrack
    ? tracks.findIndex((t) => t.id === currentTrack.id)
    : -1;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50">
        {/* Progress bar -- always visible as a thin line */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1 w-full bg-[var(--border)] cursor-pointer group"
        >
          <div
            className="h-full bg-gradient-to-r from-accent-red to-accent-magenta transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="bg-[var(--surface)] border-t border-[var(--border)] backdrop-blur-sm">
          {/* Collapsed view */}
          {collapsed ? (
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <Music size={14} className="text-muted" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest truncate text-foreground">
                  {currentTrack?.title ?? "Select a track"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (currentTrack ? toggle() : setTrack(tracks[0]))}
                  className="w-8 h-8 flex items-center justify-center text-foreground hover:text-accent-red transition-colors"
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => setCollapsed(false)}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Expanded view */
            <div className="px-4 py-3 space-y-2">
              {/* Top row: track info + collapse */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Music size={16} className="text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-widest truncate text-foreground">
                      {currentTrack?.title ?? "Select a track"}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-muted truncate">
                      {currentTrack?.artist ?? "Hoodlrz"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Time stamps */}
              <div className="flex items-center justify-between text-[10px] text-muted font-mono tracking-wide px-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                {/* Playback controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevTrack}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:text-accent-red transition-colors"
                    aria-label="Previous track"
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={() => (currentTrack ? toggle() : setTrack(tracks[0]))}
                    className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-accent-red to-accent-magenta text-white hover:scale-105 transition-transform"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={nextTrack}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:text-accent-red transition-colors"
                    aria-label="Next track"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Track counter */}
                <span className="text-[10px] text-muted uppercase tracking-widest">
                  {trackIndex >= 0 ? `${trackIndex + 1} / ${tracks.length}` : `${tracks.length} tracks`}
                </span>

                {/* Volume -- desktop only */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                    aria-label="Toggle mute"
                  >
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 appearance-none bg-[var(--border)] cursor-pointer accent-accent-red [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent-red [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
