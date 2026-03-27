import { create } from "zustand";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  coverUrl?: string;
  duration?: number;
}

interface AudioState {
  playing: boolean;
  currentTrack: Track | null;
  tracks: Track[];
  volume: number;
  progress: number;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  setTrack: (track: Track) => void;
  setTracks: (tracks: Track[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
}

export const useAudioStore = create<AudioState>()((set, get) => ({
  playing: false,
  currentTrack: null,
  tracks: [],
  volume: 0.8,
  progress: 0,

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set((s) => ({ playing: !s.playing })),

  setTrack: (track) => set({ currentTrack: track, playing: true, progress: 0 }),

  setTracks: (tracks) => set({ tracks }),

  nextTrack: () => {
    const { tracks, currentTrack } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack?.id);
    const next = tracks[(idx + 1) % tracks.length];
    set({ currentTrack: next, playing: true, progress: 0 });
  },

  prevTrack: () => {
    const { tracks, currentTrack } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack?.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    set({ currentTrack: prev, playing: true, progress: 0 });
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setProgress: (progress) => set({ progress }),
}));
