export interface Track {
  videoId: string;
  title: string;
  artist: string;
  thumbnail?: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  currentTrack: Track;
  queue: Track[];
  currentTrackIndex: number;
  isShuffle: boolean;
  isRepeat: boolean;
}
