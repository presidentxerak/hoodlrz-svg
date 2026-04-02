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
  List,
} from "lucide-react";
import { useAudioStore, type Track } from "@/store/audio";

const DEMO_TRACKS: Track[] = [
  { id: "1", title: "Acid Teddy Bear", artist: "XERAK", src: "/audio/Hoodlrz-Acid-Teddy-Bear-by-XERAK.mp3" },
  { id: "2", title: "Dolphins Are Not Your Friends", artist: "XERAK", src: "/audio/Hoodlrz-Dolphins-Are-Not-Your-Friends.mp3" },
  { id: "3", title: "Go Go Godzilla", artist: "XERAK", src: "/audio/Hoodlrz-Go-Go-Godzilla-by-XERAK.mp3" },
  { id: "4", title: "Hello Bitcoins", artist: "XERAK", src: "/audio/Hoodlrz-Hello-Bitcoins-by-XERAK.mp3" },
  { id: "5", title: "Kill Your Computer", artist: "XERAK", src: "/audio/Hoodlrz-Kill-Your-Computer-Internet-Kids-Assault-by-XERAK.mp3" },
  { id: "6", title: "Make Some Noise", artist: "XERAK", src: "/audio/Hoodlrz-Make-Some-Noise-by-XERAK.mp3" },
  { id: "7", title: "On Your Face", artist: "XERAK", src: "/audio/Hoodlrz-On-Your-Face-by-XERAK.mp3" },
  { id: "8", title: "Rich Frog", artist: "XERAK", src: "/audio/Hoodlrz-Rich-Frog-by-XERAK.mp3" },
  { id: "9", title: "Tetsuo Techno", artist: "XERAK", src: "/audio/Hoodlrz-Testuo-Techno-by-XERAK.mp3" },
];

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
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
        {/* Playlist panel */}
        {showPlaylist && !collapsed && (
          <div className="bg-[var(--surface)] border-t border-x border-[var(--border)] max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Playlist
              </span>
              <a
                href="https://xerak.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
              >
                music by <span className="text-foreground font-bold">xerak.com</span>
              </a>
            </div>
            {tracks.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => setTrack(track)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-alt)] ${
                    isActive ? "bg-[var(--surface-alt)]" : ""
                  }`}
                >
                  <span className="w-6 text-right text-[10px] font-mono text-muted flex-shrink-0">
                    {isActive && playing ? (
                      <span className="text-accent-red">
                        <Pause size={12} />
                      </span>
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold uppercase tracking-widest truncate ${
                        isActive ? "text-accent-red" : "text-foreground"
                      }`}
                    >
                      {track.title}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted uppercase tracking-widest flex-shrink-0">
                    {track.artist}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
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
                  onClick={() => { setCollapsed(false); setShowPlaylist(false); }}
                  className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Expanded view */
            <div className="px-4 py-3 space-y-2">
              {/* Top row: track info + playlist toggle + collapse */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Music size={16} className="text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-widest truncate text-foreground">
                      {currentTrack?.title ?? "Select a track"}
                    </p>
                    <a
                      href="https://xerak.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
                    >
                      {currentTrack?.artist ?? "XERAK"}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowPlaylist((p) => !p)}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${
                      showPlaylist
                        ? "text-accent-red"
                        : "text-muted hover:text-foreground"
                    }`}
                    aria-label="Toggle playlist"
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => { setCollapsed(true); setShowPlaylist(false); }}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
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

                {/* Credit */}
                <a
                  href="https://xerak.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted uppercase tracking-widest hover:text-foreground transition-colors hidden sm:block"
                >
                  music by <span className="font-bold">xerak.com</span>
                </a>

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
