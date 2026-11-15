import type { MusicErrorCode } from "@/types/musicConfig";
export interface FloatingMusicLabels {
  title: string; close: string; play: string; pause: string; previous: string; next: string;
  volume: string; progress: string; empty: string; loading: string; playlist: string;
  hidePlaylist: string; mute: string; unmute: string; playbackMode: string;
  modeSequence: string; modeRepeatOne: string; modeShuffle: string;
  errors: Record<MusicErrorCode, string>;
}
