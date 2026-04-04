/**
 * Available tracks for Genesis vinyl pressing.
 * The collector picks 4 from this list and assigns them to Side A / Side B.
 */

export interface VinylTrack {
  id: string;
  title: string;
  artist: string;
}

export const AVAILABLE_TRACKS: VinylTrack[] = [
  { id: "1", title: "Acid Teddy Bear", artist: "XERAK" },
  { id: "2", title: "Dolphins Are Not Your Friends", artist: "XERAK" },
  { id: "3", title: "Go Go Godzilla", artist: "XERAK" },
  { id: "4", title: "Hello Bitcoins", artist: "XERAK" },
  { id: "5", title: "Kill Your Computer", artist: "XERAK" },
  { id: "6", title: "Make Some Noise", artist: "XERAK" },
  { id: "7", title: "On Your Face", artist: "XERAK" },
  { id: "8", title: "Rich Frog", artist: "XERAK" },
  { id: "9", title: "Tetsuo Techno", artist: "XERAK" },
];

export const TRACKS_PER_SIDE = 2;
export const TOTAL_TRACKS = TRACKS_PER_SIDE * 2; // 4
