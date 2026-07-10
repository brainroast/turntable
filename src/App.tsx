import React, { useState, useEffect, useRef, FormEvent, MouseEvent, ChangeEvent } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Search,
  ListMusic,
  Loader2,
  X,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { Track } from "./types";
import { VinylRecord } from "./components/VinylRecord";

// Declare global YT interface for TypeScript
declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: any;
  }
}

// Client-Side YouTube Scraper fallback for static environments like GitHub Pages
function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/ - Topic$/i, "");
}

function filterOriginalArtistTracks(results: any[]): any[] {
  // Tier 1: Strict original artist check
  const strictResults = results.filter(r => {
    const t = r.title.toLowerCase();
    const a = (r.rawArtist || r.artist || "").toLowerCase();

    // Blacklist check on title
    const titleBlacklist = [
      "cover", "remix", "tribute", "karaoke", "instrumental", "reaction",
      "fanmade", "fan-made", "mashup", "parody", "tutorial", "how to play",
      "choreography", "dance cover", "1 hour", "1hour", "looped", "slowed",
      "reverb", "nightcore", "acapella", "guitar cover", "drum cover",
      "piano cover", "bass cover", "live cover", "vocals only", "pitched",
      "8d audio", "8d version", "earrape", "bass boosted", "mash-up",
      "speed up", "sped up", "slow down", "slowed down", "10 hours",
      "10hours", "loop", "synthesia", "chiptune", "8-bit", "8bit", "vlog background"
    ];
    if (titleBlacklist.some(term => t.includes(term))) return false;

    // Blacklist check on channel name
    const channelBlacklist = [
      "lyrics", "lyric", "subtitles", "nightcore", "covers", "karaoke",
      "promotions", "chilled", "vibes", "trap", "nation", "bass boosted",
      "repost", "reloaded", "synthesia", "tutorial"
    ];
    if (channelBlacklist.some(term => a.includes(term))) return false;

    const isOfficialSource =
      a.endsWith(" - topic") ||
      a.includes("vevo") ||
      a.includes("official") ||
      a.includes("records") ||
      a.includes("music label") ||
      a.includes("music group") ||
      a.includes("label") ||
      t.includes("official") ||
      t.includes("original");

    return isOfficialSource;
  });

  if (strictResults.length >= 3) {
    return strictResults.slice(0, 5);
  }

  // Tier 2: Moderately relaxed check
  const relaxedResults = results.filter(r => {
    const t = r.title.toLowerCase();
    const a = (r.rawArtist || r.artist || "").toLowerCase();

    const titleBlacklist = [
      "cover", "remix", "tribute", "karaoke", "instrumental", "reaction",
      "fanmade", "fan-made", "mashup", "parody", "tutorial", "how to play",
      "choreography", "dance cover", "1 hour", "1hour", "looped", "slowed",
      "reverb", "nightcore", "acapella", "guitar cover", "drum cover",
      "piano cover", "bass cover", "live cover", "vocals only", "pitched",
      "8d audio", "8d version", "earrape", "bass boosted", "mash-up",
      "speed up", "sped up", "slow down", "slowed down"
    ];
    if (titleBlacklist.some(term => t.includes(term))) return false;

    const channelBlacklist = [
      "covers", "karaoke", "nightcore", "repost", "reloaded", "synthesia"
    ];
    if (channelBlacklist.some(term => a.includes(term))) return false;

    return true;
  });

  const combined = [...strictResults];
  const seenIds = new Set(combined.map(r => r.videoId));

  for (const r of relaxedResults) {
    if (!seenIds.has(r.videoId)) {
      combined.push(r);
      seenIds.add(r.videoId);
    }
  }

  if (combined.length === 0) {
    return results.slice(0, 5);
  }

  return combined.slice(0, 5);
}

async function clientSideSearchYoutube(query: string): Promise<any[]> {
  const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official release")}&sp=EgIQAQ%253D%253D`;
  
  // CORS-bypassing proxies
  const proxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  let lastError: any = null;
  for (const proxyFn of proxies) {
    try {
      const proxyUrl = proxyFn(targetUrl);
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy status ${response.status}`);
      }
      const html = await response.text();
      
      let rawJson: string | null = null;
      const startPatterns = ["ytInitialData = ", "ytInitialData="];
      for (const pattern of startPatterns) {
        const idx = html.indexOf(pattern);
        if (idx !== -1) {
          const rawDataStart = html.substring(idx + pattern.length);
          const endKeyword = ";</script>";
          const endIndex = rawDataStart.indexOf(endKeyword);
          if (endIndex !== -1) {
            rawJson = rawDataStart.substring(0, endIndex).trim();
            if (rawJson.endsWith(";")) {
              rawJson = rawJson.slice(0, -1);
            }
            break;
          }
        }
      }

      if (rawJson) {
        const data = JSON.parse(rawJson);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (contents && Array.isArray(contents)) {
          const results: any[] = [];
          for (const section of contents) {
            const items = section?.itemSectionRenderer?.contents;
            if (items && Array.isArray(items)) {
              for (const item of items) {
                if (item?.videoRenderer) {
                  const vr = item.videoRenderer;
                  const videoId = vr.videoId;
                  const title = vr.title?.runs?.[0]?.text || "Unknown Title";
                  const artist = vr.ownerText?.runs?.[0]?.text || "YouTube Music";

                  if (videoId) {
                    results.push({
                      videoId,
                      title: cleanString(title),
                      artist: cleanString(artist),
                      rawArtist: artist,
                    });
                    if (results.length >= 25) {
                      break;
                    }
                  }
                }
              }
            }
          }
          if (results.length > 0) {
            return filterOriginalArtistTracks(results);
          }
        }
      }

      // Backup Regex Parser
      const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        return [{
          videoId,
          title: query,
          artist: "YouTube Video",
        }];
      }
      
      throw new Error("No results found in page structure");
    } catch (err) {
      console.warn("Proxy attempt failed:", err);
      lastError = err;
    }
  }

  throw lastError || new Error("All client-side search attempts failed");
}

const DEFAULT_PLAYLIST: Track[] = [
  {
    videoId: "8GW6sLrK40k",
    title: "Resonance",
    artist: "HOME",
    thumbnail: "https://img.youtube.com/vi/8GW6sLrK40k/hqdefault.jpg",
  },
  {
    videoId: "UfcAVejsrU4",
    title: "Weightless",
    artist: "Marconi Union",
    thumbnail: "https://img.youtube.com/vi/UfcAVejsrU4/hqdefault.jpg",
  },
  {
    videoId: "S-Xm7s9eGxU",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    thumbnail: "https://img.youtube.com/vi/S-Xm7s9eGxU/hqdefault.jpg",
  },
  {
    videoId: "hhnZkNj764I",
    title: "Intro",
    artist: "The xx",
    thumbnail: "https://img.youtube.com/vi/hhnZkNj764I/hqdefault.jpg",
  },
  {
    videoId: "24C7_m9X_h0",
    title: "Snowman",
    artist: "WYS",
    thumbnail: "https://img.youtube.com/vi/24C7_m9X_h0/hqdefault.jpg",
  },
];

const SUGGESTED_QUERIES = [
  "HOME Resonance",
  "WYS Snowman",
  "Lofi Chill Beats",
  "Jazz Relaxing",
  "Erik Satie Gymnopédie",
  "Niki Indigo",
  "Marconi Union Weightless",
  "Synthwave Sunset",
  "Coldplay Yellow",
  "Piano Ghibli",
];

export default function App() {
  const [playlist, setPlaylist] = useState<Track[]>(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = playlist[currentTrackIndex] || {
    videoId: "",
    title: "No Track Playing",
    artist: "Empty Queue",
    thumbnail: "",
  };

  const handleRemoveTrack = (idxToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylist((prev) => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      if (idxToRemove === currentTrackIndex) {
        const newIndex = Math.min(idxToRemove, Math.max(0, updated.length - 1));
        setCurrentTrackIndex(newIndex);
      } else if (idxToRemove < currentTrackIndex) {
        setCurrentTrackIndex(currentTrackIndex - 1);
      }
      return updated;
    });
  };

  const handleClearPlaylist = () => {
    setPlaylist([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isNumbers, setIsNumbers] = useState(false);
  const [searchOptions, setSearchOptions] = useState<Track[]>([]);

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Setup YouTube player
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };

      if (!document.getElementById("youtube-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    };

    const initializePlayer = () => {
      playerRef.current = new window.YT.Player("youtube-player-element", {
        height: "1px",
        width: "1px",
        videoId: currentTrack.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
            playerRef.current.setVolume(isMuted ? 0 : volume);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: PLAYING (1), PAUSED (2), ENDED (0), BUFFERING (3)
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              handleTrackEnded();
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Sync state when track changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current && currentTrack.videoId) {
      playerRef.current.cueVideoById({
        videoId: currentTrack.videoId,
        startSeconds: 0,
      });
      setCurrentTime(0);
      setDuration(0);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    } else if (isPlayerReady && playerRef.current && !currentTrack.videoId) {
      if (typeof playerRef.current.stopVideo === "function") {
        playerRef.current.stopVideo();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentTrack.videoId, isPlayerReady]);

  // Handle time update intervals
  useEffect(() => {
    if (isPlaying && isPlayerReady && playerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          const current = playerRef.current.getCurrentTime();
          const total = playerRef.current.getDuration();
          setCurrentTime(current || 0);
          setDuration(total || 0);
        }
      }, 350);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isPlayerReady, currentTrack.videoId]);

  const handlePlayPause = () => {
    if (!isPlayerReady || !playerRef.current || !currentTrack.videoId) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handlePlayStart = () => {
    if (!isPlayerReady || !playerRef.current || !currentTrack.videoId) return;
    playerRef.current.playVideo();
    setIsPlaying(true);
  };

  const handlePlayEnd = () => {
    if (!isPlayerReady || !playerRef.current) return;
    playerRef.current.pauseVideo();
    setIsPlaying(false);
  };

  const handleTrackEnded = () => {
    if (isRepeat) {
      if (playerRef.current) {
        playerRef.current.seekTo(0);
        playerRef.current.playVideo();
      }
    } else {
      handleNext();
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    if (currentTime > 5) {
      // Seek to start if already playing for a bit
      if (playerRef.current) playerRef.current.seekTo(0);
      setCurrentTime(0);
    } else {
      if (isShuffle) {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        setCurrentTrackIndex(randomIndex);
      } else {
        setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
      }
    }
  };

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(isMuted ? 0 : val);
    }
  };

  const handleMuteToggle = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(newMuteState ? 0 : volume);
    }
  };

  // Extract YT video ID helper
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Reusable search function
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchError("");
    setIsSearching(true);
    // Hide virtual keyboard to let search options take over
    setIsKeyboardActive(false);

    // Direct link or 11-char ID support
    const directId = getYouTubeId(query) || (query.trim().length === 11 ? query.trim() : null);
    if (directId) {
      const newTrack: Track = {
        videoId: directId,
        title: `New Track (${directId})`,
        artist: "YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
      };

      setSearchOptions([newTrack]);
      setSearchQuery("");
      setIsSearching(false);
      return;
    }

    // Call server API for official video search results (returns up to 5 tracks)
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      let data: any[] = [];
      let fetchSuccess = false;

      try {
        const res = await fetch(`${apiBase}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await res.json();
            fetchSuccess = true;
          }
        }
      } catch (backendErr) {
        console.warn("Backend search failed or unreachable, trying client-side fallback...", backendErr);
      }

      // If backend search did not succeed, use client-side YouTube scraper fallback
      if (!fetchSuccess) {
        try {
          data = await clientSideSearchYoutube(query);
        } catch (clientErr: any) {
          console.error("Client-side fallback search also failed:", clientErr);
          throw new Error("Gagal melakukan pencarian lagu. Silakan coba kata kunci lain, atau masukkan langsung ID/Link YouTube.");
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const tracks: Track[] = data.map((t: any) => ({
          videoId: t.videoId,
          title: t.title || "Unknown Title",
          artist: t.artist || "Unknown Artist",
          thumbnail: `https://img.youtube.com/vi/${t.videoId}/hqdefault.jpg`,
        }));
        setSearchOptions(tracks);
        setSearchQuery("");
      } else {
        setSearchError("Song not found.");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Failed to find song. Try another keyword.");
      setTimeout(() => setSearchError(""), 5000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchOption = (track: Track, playNow: boolean = true) => {
    setPlaylist((prev) => {
      const existingIdx = prev.findIndex((t) => t.videoId === track.videoId);
      if (existingIdx !== -1) {
        if (playNow) {
          setCurrentTrackIndex(existingIdx);
          setIsPlaying(true);
        }
        return prev;
      }
      const updated = [...prev, track];
      if (playNow) {
        setCurrentTrackIndex(updated.length - 1);
        setIsPlaying(true);
      }
      return updated;
    });
    if (playNow) {
      setSearchOptions([]); // Clear list after selecting to play immediately
    }
  };

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleVirtualKeyPress = (val: string) => {
    if (val === "SPACE") {
      setSearchQuery((prev) => prev + " ");
    } else if (val === "BACKSPACE") {
      setSearchQuery((prev) => prev.slice(0, -1));
    } else if (val === "CLEAR") {
      setSearchQuery("");
    } else if (val === "CARI") {
      performSearch(searchQuery);
    } else {
      setSearchQuery((prev) => prev + val);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-screen h-screen bg-[#000000] flex items-center justify-center overflow-hidden font-sans text-white select-none">
      {/* Hidden YouTube Iframe Target */}
      <div className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none overflow-hidden">
        <div id="youtube-player-element"></div>
      </div>

      {/* Main Container - Truly fullscreen for vertical tablet screens */}
      <div className="w-full h-full bg-[#000000] flex flex-col relative overflow-hidden">
        
        {/* --- 50% TOP AREA ---
            MUST be kept strictly empty, pitch black, with absolutely no text, buttons, or elements at all. */}
        <div className="h-1/2 w-full bg-black select-none pointer-events-none" />

        {/* --- 50% BOTTOM AREA ---
            Sophisticated Dark theme container: all active playback controls, volume, seeking, metadata, and the vinyl are here. */}
        <div className="h-1/2 w-full bg-[#0a0a0a] flex flex-col justify-between p-6 sm:p-8 md:p-10 relative border-t border-white/5 overflow-hidden">
          
          {/* PROGRESS & SEEK BAR (Top-anchored active line with a glowing head) */}
          <div
            onClick={handleSeek}
            className="absolute top-0 left-0 w-full h-3 cursor-pointer z-20 group"
            title="Click to seek position"
          >
            <div className="w-full h-[2px] bg-white/5 relative group-hover:h-[4px] transition-all duration-200">
              <div
                className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-200"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {searchOptions.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between w-full h-full min-h-0 pt-3">
              {/* Header and Close */}
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-mono font-semibold tracking-[0.15em] text-white uppercase">
                    SELECT SONG TO PLAY
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono tracking-wider">
                    Found {searchOptions.length} search results
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOptions([])}
                  className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 uppercase transition-all"
                >
                  <X className="w-3 h-3" /> Close
                </button>
              </div>

              {/* List of Search Results */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[220px] sm:max-h-[280px] scrollbar-thin pr-1">
                {searchOptions.map((track, idx) => (
                  <div
                    key={`${track.videoId}-${idx}`}
                    className="group/item flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Thumbnail with custom overlay hover effect */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-white/5 group-hover/item:border-white/15 transition-all">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-80 group-hover/item:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4
                          onClick={() => handleSelectSearchOption(track, true)}
                          className="text-xs sm:text-sm font-medium text-white/90 group-hover/item:text-white truncate cursor-pointer transition-colors"
                        >
                          {track.title}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-white/40 truncate font-mono uppercase tracking-wider">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Actions on the right side */}
                    <div className="flex items-center gap-2 pl-3">
                      <button
                        type="button"
                        onClick={() => handleSelectSearchOption(track, true)}
                        className="px-3.5 py-1.5 text-[10px] font-mono font-bold tracking-widest text-black bg-white rounded-lg hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 uppercase shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" /> Play
                      </button>
                      {playlist.some((t) => t.videoId === track.videoId) ? (
                        <div className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-green-400 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-1.5 uppercase font-medium">
                          <Check className="w-3 h-3" /> In Queue
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectSearchOption(track, false)}
                          className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/10 active:scale-95 transition-all flex items-center gap-1.5 uppercase"
                          title="Add to Queue"
                        >
                          <Plus className="w-3 h-3" /> + Queue
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isKeyboardActive ? (
            <div className="flex-1 flex flex-col justify-between w-full h-full min-h-0 pt-3">
              {/* TOP: SEARCH BOX AND SUGGESTIONS CAROUSEL */}
              <div className="space-y-4">
                {/* Custom Search Form with Close (Tutup) button */}
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <Search className="absolute left-0 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="TYPE SONG TITLE OR PASTE LINK..."
                    disabled={isSearching}
                    inputMode="none"
                    className="w-full bg-transparent border-b border-white/10 text-white text-xs sm:text-sm font-mono tracking-[0.1em] py-2 pl-7 pr-24 focus:outline-none focus:border-white/30 transition-all disabled:opacity-50"
                  />
                  <div className="absolute right-0 flex items-center gap-2.5">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-white/30 hover:text-white/60 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsKeyboardActive(false)}
                      className="text-[9px] font-mono tracking-widest text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-white/10 uppercase"
                    >
                      Close
                    </button>
                  </div>
                </form>

                {/* Error Banner */}
                {searchError && (
                  <div className="text-[10px] sm:text-xs text-red-400 font-mono tracking-wider bg-red-950/30 border border-red-900/40 rounded-xl p-3 leading-relaxed whitespace-pre-line">
                    {searchError}
                  </div>
                )}

                {/* "PILIHAN YANG BISA DI PENCET" (Horizontal Carousel Suggestions) */}
                <div className="space-y-1.5 px-0.5">
                  <span className="text-[8px] font-mono tracking-[0.25em] text-white/20 uppercase block">
                    Popular Choices (Tap to search):
                  </span>
                  <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none snap-x touch-pan-x">
                    {SUGGESTED_QUERIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setSearchQuery(q);
                          performSearch(q);
                        }}
                        className="flex-shrink-0 snap-center px-3 py-1.5 text-[9px] font-mono tracking-wider bg-white/5 border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/10 hover:border-white/15 active:scale-95 transition-all uppercase"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>              {/* CENTER/BOTTOM: PREMIUM VIRTUAL QWERTY KEYBOARD */}
              <div className="w-full max-w-3xl mx-auto bg-black/50 border border-white/5 rounded-2xl p-3 sm:p-5 space-y-2 sm:space-y-3 shadow-2xl backdrop-blur-md flex-1 flex flex-col justify-center">
                {/* Row 1 */}
                <div className="flex justify-center gap-1 sm:gap-2 md:gap-2.5">
                  {(isNumbers
                    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
                    : ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleVirtualKeyPress(k)}
                      className="flex-1 max-w-[64px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 text-sm sm:text-base md:text-lg font-mono flex items-center justify-center hover:bg-[#1a1a1a] active:scale-95 transition-all text-white/90 font-medium"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Row 2 */}
                <div className="flex justify-center gap-1 sm:gap-2 md:gap-2.5 px-[4%]">
                  {(isNumbers
                    ? ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"']
                    : ["A", "S", "D", "F", "G", "H", "J", "K", "L"]
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleVirtualKeyPress(k)}
                      className="flex-1 max-w-[64px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 text-sm sm:text-base md:text-lg font-mono flex items-center justify-center hover:bg-[#1a1a1a] active:scale-95 transition-all text-white/90 font-medium"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Row 3 */}
                <div className="flex justify-center gap-1 sm:gap-2 md:gap-2.5">
                  {(isNumbers
                    ? [".", ",", "?", "!", "'", "_", "+"]
                    : ["Z", "X", "C", "V", "B", "N", "M"]
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleVirtualKeyPress(k)}
                      className="flex-1 max-w-[64px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 text-sm sm:text-base md:text-lg font-mono flex items-center justify-center hover:bg-[#1a1a1a] active:scale-95 transition-all text-white/90 font-medium"
                    >
                      {k}
                    </button>
                  ))}
                  {/* Backspace Button inside Row 3 */}
                  <button
                    type="button"
                    onClick={() => handleVirtualKeyPress("BACKSPACE")}
                    className="flex-1 max-w-[96px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#2e1414] border border-red-950 hover:border-red-900 text-xs sm:text-sm md:text-base font-mono flex items-center justify-center hover:bg-[#401c1c] active:scale-95 transition-all text-red-400 font-medium"
                    title="Delete character"
                  >
                    DEL
                  </button>
                </div>

                {/* Row 4 */}
                <div className="flex justify-center gap-1 sm:gap-2 md:gap-2.5">
                  {/* Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsNumbers(!isNumbers)}
                    className="flex-1 max-w-[96px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#1a1a1a] border border-white/10 hover:border-white/20 text-xs sm:text-sm md:text-base font-mono flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white font-medium"
                  >
                    {isNumbers ? "ABC" : "123"}
                  </button>

                  {/* Clear Button */}
                  <button
                    type="button"
                    onClick={() => handleVirtualKeyPress("CLEAR")}
                    className="flex-1 max-w-[96px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 text-xs sm:text-sm md:text-base font-mono flex items-center justify-center hover:bg-[#1e1e1e] active:scale-95 transition-all text-white/50 hover:text-white font-medium"
                  >
                    CLEAR
                  </button>

                  {/* Space Button */}
                  <button
                    type="button"
                    onClick={() => handleVirtualKeyPress("SPACE")}
                    className="flex-[3] max-w-[320px] h-11 sm:h-14 md:h-16 rounded-xl bg-[#141414] border border-white/5 hover:border-white/15 text-xs sm:text-sm md:text-base font-mono flex items-center justify-center hover:bg-[#1a1a1a] active:scale-95 transition-all text-white/60 font-medium"
                  >
                    SPACE
                  </button>

                  {/* Search / Submit Button */}
                  <button
                    type="submit"
                    onClick={() => handleVirtualKeyPress("CARI")}
                    className="flex-[2] max-w-[140px] h-11 sm:h-14 md:h-16 rounded-xl bg-white text-black text-xs sm:text-sm md:text-base font-mono font-bold flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                  >
                    SEARCH
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-row items-center justify-between gap-6 md:gap-12 w-full h-full min-h-0 pt-2">
              {/* LEFT SIDE: SEARCH, TITLE, METRIC & CONTROLS */}
              <div className="flex-1 flex flex-col justify-between h-full min-h-0 max-w-[50%] sm:max-w-[55%]">
                {/* SEARCH & TITLE LAYER */}
                <div className="space-y-4">
                  {/* Minimalist Premium Search Box */}
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <Search className="absolute left-0 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsKeyboardActive(true)}
                      onClick={() => setIsKeyboardActive(true)}
                      placeholder="PASTE YOUTUBE LINK OR VIDEO ID..."
                      disabled={isSearching}
                      inputMode="none"
                      className="w-full bg-transparent border-b border-white/5 text-white/70 placeholder-white/20 text-[10px] font-mono tracking-[0.15em] py-1.5 pl-6 pr-8 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
                    />
                    {isSearching ? (
                      <Loader2 className="absolute right-0 w-3.5 h-3.5 text-white/40 animate-spin" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-0 text-white/30 hover:text-white/60"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </form>

                  {/* Error Message banner */}
                  {searchError && (
                    <div className="text-[9px] text-red-400 font-mono tracking-widest uppercase animate-pulse">
                      {searchError}
                    </div>
                  )}

                  {/* Currently Playing Song Metadata */}
                  <div className="flex justify-between items-start pt-2">
                    <div className="space-y-1.5 max-w-[80%]">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-white line-clamp-2">
                        {currentTrack.title}
                      </h1>
                      <p className="text-xs md:text-sm text-white/40 tracking-[0.2em] font-light uppercase line-clamp-1">
                        {currentTrack.artist}
                      </p>
                    </div>

                    {/* Minimalist Playlist Toggle */}
                    <button
                      onClick={() => setShowQueue(!showQueue)}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        showQueue
                          ? "bg-white/10 text-white"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5"
                      }`}
                      title="Show Playlist"
                    >
                      <ListMusic className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* CONTROLS AREA */}
                <div className="space-y-4">
                  {/* Minimalist Time Indicators */}
                  <div className="flex gap-4 text-[10px] tracking-[0.25em] text-white/30 uppercase font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span className="opacity-20">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Playback Buttons Layout */}
                  <div className="flex items-center gap-4 md:gap-5 flex-wrap">
                    {/* Prev */}
                    <button
                      onClick={handlePrev}
                      className="text-white/40 hover:text-white transition-colors p-1"
                      disabled={!isPlayerReady}
                      title="Previous"
                    >
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>

                    {/* Next */}
                    <button
                      onClick={handleNext}
                      className="text-white/40 hover:text-white transition-colors p-1"
                      disabled={!isPlayerReady}
                      title="Next"
                    >
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>

                    {/* Shuffle mode */}
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`p-1 transition-colors relative ${
                        isShuffle ? "text-white" : "text-white/20 hover:text-white/40"
                      }`}
                      title="Shuffle"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      {isShuffle && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                      )}
                    </button>

                    {/* Repeat mode */}
                    <button
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={`p-1 transition-colors relative ${
                        isRepeat ? "text-white" : "text-white/20 hover:text-white/40"
                      }`}
                      title="Repeat"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      {isRepeat && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                      )}
                    </button>

                    {/* Mute/Volume controls */}
                    <div className="flex items-center gap-1.5 group/vol relative">
                      <button
                        onClick={handleMuteToggle}
                        className="text-white/20 hover:text-white/50 transition-colors p-1"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-12 md:w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white opacity-0 group-hover/vol:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: HUGE VINYL RECORD */}
              <div className="flex-1 flex-shrink-0 flex items-center justify-center h-full min-h-0 relative z-10">
                <div className="w-full h-full max-h-full flex items-center justify-center p-2">
                  <VinylRecord
                    isPlaying={isPlaying}
                    currentTrack={currentTrack}
                    onPressStart={handlePlayStart}
                    onPressEnd={handlePlayEnd}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SLIDING QUEUE / PLAYLIST DRAWER */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-[#070707] border-t border-white/5 transition-transform duration-300 ease-out z-30 shadow-2xl ${
              showQueue ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ height: "calc(100% - 12px)" }}
          >
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex justify-between items-center px-8 py-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">
                    Playlist Queue ({playlist.length})
                  </span>
                  {playlist.length > 0 && (
                    <button
                      onClick={handleClearPlaylist}
                      className="px-2.5 py-1 text-[9px] font-mono tracking-widest text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 rounded-md border border-red-950 transition-all uppercase font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowQueue(false)}
                  className="p-1 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Songs List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5 scrollbar-thin">
                {playlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
                    <ListMusic className="w-10 h-10 text-white/10" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-white/30 uppercase tracking-wider">Queue Empty</p>
                      <p className="text-[10px] text-white/20">Search for songs above to add them to the queue.</p>
                    </div>
                  </div>
                ) : (
                  playlist.map((track, idx) => {
                    const isActive = idx === currentTrackIndex;
                    return (
                      <div
                        key={`${track.videoId}-${idx}`}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-all border ${
                          isActive
                            ? "bg-white/5 border-white/10 text-white"
                            : "hover:bg-white/[0.02] border-transparent text-white/40 hover:text-white"
                        }`}
                      >
                        {/* Play Action / Title / Artist */}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTrackIndex(idx);
                            setShowQueue(false);
                            setIsPlaying(true);
                          }}
                          className="flex-1 flex items-center gap-4 text-left min-w-0"
                        >
                          <div className="relative flex-shrink-0">
                            {track.thumbnail ? (
                              <img
                                src={track.thumbnail}
                                alt=""
                                className="w-9 h-9 object-cover rounded-md bg-neutral-900 border border-white/5"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-neutral-900 rounded-md border border-white/5" />
                            )}
                            {isActive && isPlaying && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                <span className="flex gap-0.5 items-end h-3">
                                  <span className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite] h-full" />
                                  <span className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_200ms] h-[75%]" />
                                  <span className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_400ms] h-[50%]" />
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs tracking-tight truncate ${isActive ? "font-medium" : ""}`}>
                              {track.title}
                            </div>
                            <div className="text-[9px] font-mono text-white/30 mt-0.5 tracking-wider uppercase truncate">
                              {track.artist}
                            </div>
                          </div>
                        </button>

                        {/* Actions: Playing Status indicator and Delete Button */}
                        <div className="flex items-center gap-3 pl-3 flex-shrink-0">
                          {isActive ? (
                            <span className="text-[8px] font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider">
                              Now Playing
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest px-2 py-0.5">
                              Queue
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveTrack(idx, e)}
                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/15 transition-all"
                            title="Remove from Queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
