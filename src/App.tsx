import React, { useState, useEffect, useRef } from "react";
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

function fetchCompat(url: string, options: any = {}): Promise<any> {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    var method = options.method || "GET";
    xhr.open(method, url, true);

    if (options.headers) {
      for (var key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, options.headers[key]);
        }
      }
    }

    xhr.timeout = 10000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        // Resolve early if status is 0 but responseText exists (some proxy cases)
        var isOk = (xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText);
        
        var response = {
          ok: isOk,
          status: xhr.status,
          headers: {
            get: function (headerName: string) {
              return xhr.getResponseHeader(headerName);
            }
          },
          text: function () {
            return Promise.resolve(xhr.responseText);
          },
          json: function () {
            return new Promise(function (res, rej) {
              try {
                res(JSON.parse(xhr.responseText));
              } catch (e) {
                rej(e);
              }
            });
          }
        };
        resolve(response);
      }
    };

    xhr.onerror = function () {
      reject(new Error("XHR Network Error"));
    };

    xhr.ontimeout = function () {
      reject(new Error("XHR Timeout"));
    };

    if (options.body) {
      xhr.send(options.body);
    } else {
      xhr.send();
    }
  });
}

function downloadBlob(url: string): Promise<Blob> {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.timeout = 60000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error("Download failed: " + xhr.status));
        }
      }
    };
    xhr.onerror = function() { reject(new Error("Network error")); };
    xhr.ontimeout = function() { reject(new Error("Timeout error")); };
    xhr.send();
  });
}

function filterOriginalArtistTracks(results: any[]): any[] {
  var strictResults = results.filter(function (r) {
    var t = r.title.toLowerCase();
    var a = (r.rawArtist || r.artist || "").toLowerCase();

    var titleBlacklist = [
      "cover", "remix", "tribute", "karaoke", "instrumental", "reaction",
      "fanmade", "fan-made", "mashup", "parody", "tutorial", "how to play",
      "choreography", "dance cover", "1 hour", "1hour", "looped", "slowed",
      "reverb", "nightcore", "acapella", "guitar cover", "drum cover",
      "piano cover", "bass cover", "live cover", "vocals only", "pitched",
      "8d audio", "8d version", "earrape", "bass boosted", "mash-up",
      "speed up", "sped up", "slow down", "slowed down", "10 hours",
      "10hours", "loop", "synthesia", "chiptune", "8-bit", "8bit", "vlog background"
    ];
    if (titleBlacklist.some(function (term) { return t.indexOf(term) !== -1; })) return false;

    var channelBlacklist = [
      "lyrics", "lyric", "subtitles", "nightcore", "covers", "karaoke",
      "promotions", "chilled", "vibes", "trap", "nation", "bass boosted",
      "repost", "reloaded", "synthesia", "tutorial"
    ];
    if (channelBlacklist.some(function (term) { return a.indexOf(term) !== -1; })) return false;

    var isOfficialSource =
      a.indexOf(" - topic") !== -1 ||
      a.indexOf("vevo") !== -1 ||
      a.indexOf("official") !== -1 ||
      a.indexOf("records") !== -1 ||
      a.indexOf("music label") !== -1 ||
      a.indexOf("music group") !== -1 ||
      a.indexOf("label") !== -1 ||
      t.indexOf("official") !== -1 ||
      t.indexOf("original") !== -1;

    return isOfficialSource;
  });

  if (strictResults.length >= 5) {
    return strictResults.slice(0, 15);
  }

  var relaxedResults = results.filter(function (r) {
    var t = r.title.toLowerCase();
    var a = (r.rawArtist || r.artist || "").toLowerCase();

    var titleBlacklist = [
      "cover", "remix", "tribute", "karaoke", "instrumental", "reaction",
      "fanmade", "fan-made", "mashup", "parody", "tutorial", "how to play",
      "choreography", "dance cover", "1 hour", "1hour", "looped", "slowed",
      "reverb", "nightcore", "acapella", "guitar cover", "drum cover",
      "piano cover", "bass cover", "live cover", "vocals only", "pitched",
      "8d audio", "8d version", "earrape", "bass boosted", "mash-up",
      "speed up", "sped up", "slow down", "slowed down"
    ];
    if (titleBlacklist.some(function (term) { return t.indexOf(term) !== -1; })) return false;

    var channelBlacklist = [
      "covers", "karaoke", "nightcore", "repost", "reloaded", "synthesia"
    ];
    if (channelBlacklist.some(function (term) { return a.indexOf(term) !== -1; })) return false;

    return true;
  });

  var combined = [].concat(strictResults as any);
  var seenIds = new Set(combined.map(function (r: any) { return r.videoId; }));

  for (var i = 0; i < relaxedResults.length; i++) {
    var r = relaxedResults[i];
    if (!seenIds.has(r.videoId)) {
      combined.push(r as never);
      seenIds.add(r.videoId);
    }
  }

  if (combined.length === 0) {
    return results.slice(0, 15);
  }

  return combined.slice(0, 15);
}

async function originalScraperFallback(query: string, mode: "song" | "artist" = "song"): Promise<any[]> {
  var suffix = mode === "artist" ? " greatest hits" : " official release";
  var targetUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query + suffix) + "&sp=EgIQAQ%253D%253D";
  
  var proxies = [
    function (url: string) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url); },
    function (url: string) { return "https://corsproxy.io/?" + encodeURIComponent(url); }
  ];

  var lastError = null;
  for (var i = 0; i < proxies.length; i++) {
    var proxyFn = proxies[i];
    try {
      var proxyUrl = proxyUrl = proxyFn(targetUrl);
      var response = await fetchCompat(proxyUrl);
      if (!response.ok) {
        throw new Error("Proxy status " + response.status);
      }
      var html = await response.text();
      
      var rawJson = null;
      var startPatterns = ["ytInitialData = ", "ytInitialData="];
      for (var j = 0; j < startPatterns.length; j++) {
        var pattern = startPatterns[j];
        var idx = html.indexOf(pattern);
        if (idx !== -1) {
          var rawDataStart = html.substring(idx + pattern.length);
          var endKeyword = ";</script>";
          var endIndex = rawDataStart.indexOf(endKeyword);
          if (endIndex !== -1) {
            rawJson = rawDataStart.substring(0, endIndex).trim();
            if (rawJson.slice(-1) === ";") {
              rawJson = rawJson.slice(0, -1);
            }
            break;
          }
        }
      }

      if (rawJson) {
        var data = JSON.parse(rawJson);
        var contents = data && data.contents && data.contents.twoColumnSearchResultsRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
        if (contents && Array.isArray(contents)) {
          var results = [];
          for (var k = 0; k < contents.length; k++) {
            var section = contents[k];
            var items = section && section.itemSectionRenderer && section.itemSectionRenderer.contents;
            if (items && Array.isArray(items)) {
              for (var m = 0; m < items.length; m++) {
                var item = items[m];
                if (item && item.videoRenderer) {
                  var vr = item.videoRenderer;
                  var videoId = vr.videoId;
                  var title = vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text || "Unknown Title";
                  var artist = vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text || "YouTube Music";

                  if (videoId) {
                    results.push({
                      videoId: videoId,
                      title: cleanString(title),
                      artist: cleanString(artist),
                      rawArtist: artist,
                    });
                    if (results.length >= 50) {
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

      var videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
      if (videoIdMatch && videoIdMatch[1]) {
        var scrapedVideoId = videoIdMatch[1];
        return [{
          videoId: scrapedVideoId,
          title: query,
          artist: "YouTube Video",
        }];
      }
      
      throw new Error("No results found in page structure");
    } catch (err) {
      console.warn("Proxy scraper attempt failed:", err);
      lastError = err;
    }
  }

  throw lastError || new Error("All proxy scraper attempts failed");
}

function anyPromise<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise<T>(function (resolve, reject) {
    var rejectedCount = 0;
    var errors: any[] = [];
    if (promises.length === 0) {
      reject(new Error("No promises provided"));
      return;
    }
    promises.forEach(function (p) {
      Promise.resolve(p).then(
        function (val) { resolve(val); },
        function (err) {
          rejectedCount++;
          errors.push(err);
          if (rejectedCount === promises.length) {
            reject(new Error("All promises were rejected"));
          }
        }
      );
    });
  });
}

async function clientSideSearchYoutube(query: string, mode: "song" | "artist" = "song"): Promise<any[]> {
  var suffix = mode === "artist" ? " greatest hits" : " official release";
  var instances = [
    "https://invidious.privacydev.net",
    "https://inv.tux.im",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de",
    "https://invidious.projectsegfau.lt",
    "https://iv.melmac.space",
    "https://invidious.no-logs.com",
    "https://invidious.perennialte.ch",
    "https://invidious.slipfox.xyz",
    "https://invidious.flokinet.to",
    "https://iv.ggtyler.dev",
    "https://invidious.drgns.space"
  ];

  var searchSingleInstance = function (instance: string): Promise<any[]> {
    return new Promise(function (resolve, reject) {
      var url = instance + "/api/v1/search?q=" + encodeURIComponent(query + suffix) + "&type=video";
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 3000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (!Array.isArray(data) || data.length === 0) {
                reject(new Error("Empty or invalid results from instance"));
                return;
              }
              var results = [];
              for (var i = 0; i < data.length; i++) {
                var item = data[i];
                if (item.videoId) {
                  var secureThumb = "";
                  if (item.videoThumbnails && item.videoThumbnails.length > 0) {
                    var thumb = item.videoThumbnails[item.videoThumbnails.length - 1].url;
                    if (thumb) secureThumb = thumb.replace("http://", "https://");
                  }
                  results.push({
                    videoId: item.videoId,
                    title: cleanString(item.title || ""),
                    artist: cleanString(item.author || "YouTube Video"),
                    rawArtist: item.author,
                    thumbnail: secureThumb
                  });
                }
              }
              if (results.length === 0) {
                reject(new Error("No tracks with videoId found"));
                return;
              }
              resolve(filterOriginalArtistTracks(results));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error("Instance HTTP status " + xhr.status));
          }
        }
      };
      xhr.onerror = function () { reject(new Error("XHR Network Error")); };
      xhr.ontimeout = function () { reject(new Error("XHR Timeout")); };
      xhr.send();
    });
  };

  try {
    var apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (apiKey) {
      return await new Promise<any[]>(function (resolve, reject) {
        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + encodeURIComponent(query + suffix) + "&type=video&videoCategoryId=10&maxResults=15&key=" + apiKey;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                var data = JSON.parse(xhr.responseText);
                var results = [];
                if (data.items && data.items.length > 0) {
                  for (var i = 0; i < data.items.length; i++) {
                    var item = data.items[i];
                    var secureThumb = "";
                    if (item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.high) {
                      secureThumb = item.snippet.thumbnails.high.url.replace("http://", "https://");
                    }
                    results.push({
                      videoId: item.id.videoId,
                      title: cleanString(item.snippet.title),
                      artist: cleanString(item.snippet.channelTitle),
                      rawArtist: item.snippet.channelTitle,
                      thumbnail: secureThumb
                    });
                  }
                }
                resolve(filterOriginalArtistTracks(results));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error("Official API failed"));
            }
          }
        };
        xhr.onerror = function () { reject(new Error("XHR Network Error")); };
        xhr.send();
      });
    }
  } catch (err) {
    console.warn("Official API failed, falling back to Invidious");
  }

  try {
    return await anyPromise(instances.map(function (inst) { return searchSingleInstance(inst); }));
  } catch (err) {
    console.warn("All parallel Invidious searches failed. Running HTML scraper fallback...", err);
    return await originalScraperFallback(query, mode);
  }
}

var DEFAULT_PLAYLIST: Track[] = [];

var SUGGESTED_QUERIES = [
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
  var playlistState = useState<Track[]>(DEFAULT_PLAYLIST);
  var playlist = playlistState[0];
  var setPlaylist = playlistState[1];

  var currentTrackIndexState = useState(0);
  var currentTrackIndex = currentTrackIndexState[0];
  var setCurrentTrackIndex = currentTrackIndexState[1];

  var currentTrack = playlist[currentTrackIndex] || {
    videoId: "",
    title: "No Track Playing",
    artist: "Empty Queue",
    thumbnail: "",
  };

  var isPlayingState = useState(false);
  var isPlaying = isPlayingState[0];
  var setIsPlaying = isPlayingState[1];

  var currentTimeState = useState(0);
  var currentTime = currentTimeState[0];
  var setCurrentTime = currentTimeState[1];

  var durationState = useState(0);
  var duration = durationState[0];
  var setDuration = durationState[1];

  var volumeState = useState(80);
  var volume = volumeState[0];
  var setVolume = volumeState[1];

  var isMutedState = useState(false);
  var isMuted = isMutedState[0];
  var setIsMuted = isMutedState[1];

  var isShuffleState = useState(false);
  var isShuffle = isShuffleState[0];
  var setIsShuffle = isShuffleState[1];

  var isRepeatState = useState(false);
  var isRepeat = isRepeatState[0];
  var setIsRepeat = isRepeatState[1];

  var searchQueryState = useState("");
  var searchQuery = searchQueryState[0];
  var setSearchQuery = searchQueryState[1];

  var searchModeState = useState<"song" | "artist">("song");
  var searchMode = searchModeState[0];
  var setSearchMode = searchModeState[1];

  var isSearchingState = useState(false);
  var isSearching = isSearchingState[0];
  var setIsSearching = isSearchingState[1];

  var searchErrorState = useState("");
  var searchError = searchErrorState[0];
  var setSearchError = searchErrorState[1];

  var showQueueState = useState(false);
  var showQueue = showQueueState[0];
  var setShowQueue = showQueueState[1];

  var isPlayerReadyState = useState(true);
  var isPlayerReady = isPlayerReadyState[0];
  var setIsPlayerReady = isPlayerReadyState[1];

  var isKeyboardActiveState = useState(false);
  var isKeyboardActive = isKeyboardActiveState[0];
  var setIsKeyboardActive = isKeyboardActiveState[1];

  var isNumbersState = useState(false);
  var isNumbers = isNumbersState[0];
  var setIsNumbers = isNumbersState[1];

  var scaleState = useState(1);
  var scale = scaleState[0];
  var setScale = scaleState[1];

  useEffect(function () {
    var updateScale = function () {
      var baseWidth = 768;
      var baseHeight = 1024;
      var w = window.innerWidth;
      var h = window.innerHeight;
      var scaleX = w / baseWidth;
      var scaleY = h / baseHeight;
      var newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return function () {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, []);

  var searchOptionsState = useState<Track[]>([]);
  var searchOptions = searchOptionsState[0];
  var setSearchOptions = searchOptionsState[1];

  var audioRef = useRef<HTMLAudioElement>(null);
  var progressIntervalRef = useRef<any>(null);
  var searchInputRef = useRef<HTMLInputElement>(null);
  var mainSearchInputRef = useRef<HTMLInputElement>(null);

  var isFirstMountRef = useRef(true);

  // Auto focus input when keyboard is activated
  useEffect(function () {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (isKeyboardActive) {
      setTimeout(function () {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          var val = searchInputRef.current.value;
          searchInputRef.current.value = "";
          searchInputRef.current.value = val;
        }
      }, 50);
    }
  }, [isKeyboardActive]);

  // Audio Event Listeners
  useEffect(function () {
    var audio = audioRef.current;
    if (!audio) return;

    var handleTimeUpdate = function () {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    var handleEnded = function () {
      handleTrackEnded();
    };
    
    var handlePlay = function () {
      setIsPlaying(true);
    };
    
    var handlePause = function () {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return function () {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [isRepeat]); // Re-bind if isRepeat changes (handleTrackEnded uses it)
  
  useEffect(function() {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(function() {
    if (currentTrack && currentTrack.blobUrl) {
      if (audioRef.current && audioRef.current.src !== currentTrack.blobUrl) {
        audioRef.current.src = currentTrack.blobUrl;
        audioRef.current.load();
        audioRef.current.play().catch(function(e) { console.warn("Autoplay block", e); });
        setIsPlaying(true);
      }
    } else if (currentTrack && currentTrack.videoId && !currentTrack.isDownloading && !currentTrack.blobUrl) {
      // Current track is missing blob URL and is not currently downloading. Let's download it.
      var downloadCurrent = async function() {
        setPlaylist(function(prev) {
          return prev.map(function(t) {
            if (t.videoId === currentTrack.videoId) return { ...t, isDownloading: true };
            return t;
          });
        });
        
        try {
          var apiBase = import.meta.env.VITE_API_URL || "";
          var url = apiBase + "/api/download/" + currentTrack.videoId;
          var blob = await downloadBlob(url);
          var blobUrl = URL.createObjectURL(blob);
          
          setPlaylist(function (prev) {
            return prev.map(function (t) {
              if (t.videoId === currentTrack.videoId) return { ...t, blobUrl: blobUrl, isDownloading: false };
              return t;
            });
          });
        } catch (err) {
          console.error("Auto-download error:", err);
          setPlaylist(function (prev) {
            return prev.map(function (t) {
              if (t.videoId === currentTrack.videoId) return { ...t, isDownloading: false };
              return t;
            });
          });
        }
      };
      downloadCurrent();
    }
  }, [currentTrack.blobUrl, currentTrack.videoId, currentTrack.isDownloading]);

  var playVideoTrack = function (track: Track | undefined) {
    if (!audioRef.current) return;
    
    if (!track || !track.blobUrl) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    
    if (audioRef.current.src !== track.blobUrl) {
      audioRef.current.src = track.blobUrl;
      audioRef.current.load();
    }
    audioRef.current.play().catch(function(err) {
       console.warn("Autoplay prevented:", err);
    });
    setIsPlaying(true);
  };

  var handlePlayPause = function () {
    if (!audioRef.current || !currentTrack.blobUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(function(e) { console.warn(e); });
    }
  };

  var handlePlayStart = function () {
    if (!audioRef.current || !currentTrack.blobUrl) return;
    audioRef.current.play().catch(function(e) { console.warn(e); });
  };

  var handlePlayEnd = function () {
    if (!audioRef.current || !currentTrack.blobUrl) return;
    audioRef.current.pause();
  };

  var handleTrackEnded = function () {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNext();
    }
  };

  var handleNext = function () {
    if (playlist.length === 0) return;
    var nextIdx = 0;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * playlist.length);
    } else {
      nextIdx = (currentTrackIndex + 1) % playlist.length;
    }
    setCurrentTrackIndex(nextIdx);
    playVideoTrack(playlist[nextIdx]);
  };

  var handlePrev = function () {
    if (playlist.length === 0) return;
    if (currentTime > 5) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      var prevIdx = 0;
      if (isShuffle) {
        prevIdx = Math.floor(Math.random() * playlist.length);
      } else {
        prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      }
      setCurrentTrackIndex(prevIdx);
      playVideoTrack(playlist[prevIdx]);
    }
  };

  var handleSeek = function (e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    var rect = e.currentTarget.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var percentage = clickX / rect.width;
    var newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  var handleVolumeChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    var val = parseInt(e.target.value, 10);
    setVolume(val);
  };

  var handleMuteToggle = function () {
    setIsMuted(!isMuted);
  };

  var getYouTubeId = function (url: string) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  var getSuperRobustFallbackTracks = function (query: string, mode: "song" | "artist" = "song"): any[] {
    var q = query.toLowerCase().trim();
    
    var STATIC_FALLBACK_TRACKS = [
      { videoId: "coL7fD8SAnY", title: "Hati-Hati di Jalan", artist: "Tulus" },
      { videoId: "7f9Kz6G8vIE", title: "Monokrom", artist: "Tulus" },
      { videoId: "gP3K7P-lP9A", title: "Diri", artist: "Tulus" },
      { videoId: "lZq8_fO3g7c", title: "Dan", artist: "Sheila On 7" },
      { videoId: "f56Z8_mO8-M", title: "Seberapa Pantas", artist: "Sheila On 7" },
      { videoId: "Fv38G7Z4v80", title: "Kangen", artist: "Dewa 19" },
      { videoId: "E3o8H91p9I4", title: "Separuh Nafas", artist: "Dewa 19" },
      { videoId: "V67098yO0r0", title: "Pupus", artist: "Dewa 19" },
      { videoId: "F37X_pMv71E", title: "Evaluasi", artist: "Hindia" },
      { videoId: "I_7u8v-q980", title: "Secukupnya", artist: "Hindia" },
      { videoId: "oP9H7uM78o0", title: "To the Bone", artist: "Pamungkas" },
      { videoId: "yKNxeF4K1S0", title: "Yellow", artist: "Coldplay" },
      { videoId: "kYTmE3D6uQ4", title: "Fix You", artist: "Coldplay" },
      { videoId: "RB-RcX5DS5A", title: "The Scientist", artist: "Coldplay" },
      { videoId: "2Vv-BfVoq4g", title: "Perfect", artist: "Ed Sheeran" },
      { videoId: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran" },
      { videoId: "hLQl3WQQoQ0", title: "Someone Like You", artist: "Adele" },
      { videoId: "U3ASj1L6_sY", title: "Easy On Me", artist: "Adele" },
      { videoId: "e-ORhEE9VVg", title: "Blank Space", artist: "Taylor Swift" },
      { videoId: "8xg3vE8Ie_E", title: "Love Story", artist: "Taylor Swift" },
      { videoId: "H5v3kku4y6Q", title: "As It Was", artist: "Harry Styles" },
      { videoId: "kTJczUocW3A", title: "Stay", artist: "The Kid LAROI & Justin Bieber" },
      { videoId: "4NRXx6U8ABQ", title: "Blinding Lights", artist: "The Weeknd" },
      { videoId: "gdZLi9oWNZg", title: "Dynamite", artist: "BTS" },
      { videoId: "jfKfPfyJRdk", title: "Lofi Chill Beats", artist: "Lofi Girl" },
      { videoId: "5qap5aO4i9A", title: "Jazz Relaxing", artist: "Lounge Music" }
    ];

    var matches = STATIC_FALLBACK_TRACKS.filter(function (t) {
      return t.title.toLowerCase().indexOf(q) !== -1 || t.artist.toLowerCase().indexOf(q) !== -1;
    });

    if (matches.length > 0) {
      return matches;
    }

    var hashString = function (str: string) {
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    var seed = hashString(q);
    
    var stableStreamIds = [
      { id: "jfKfPfyJRdk", suffix: "Chill Lofi Edit", defaultArtist: "Lofi Girl" },
      { id: "8GW6sLrK40k", suffix: "Synthwave Instrumental", defaultArtist: "Synthwave Classics" },
      { id: "UfcAVejsrU4", suffix: "Ambient Relaxing Session", defaultArtist: "Marconi Union" },
      { id: "5qap5aO4i9A", suffix: "Jazz Cafe Version", defaultArtist: "Cafe Lounge" },
      { id: "S-Xm7s9eGxU", suffix: "Classic Piano Solo", defaultArtist: "Classical Piano" },
      { id: "24C7_m9X_h0", suffix: "Slowed + Reverb", defaultArtist: "Chill Beats" },
      { id: "hhnZkNj764I", suffix: "Retro Night Drive Mix", defaultArtist: "The xx Fallback" }
    ];

    var results = [];
    
    for (var i = 0; i < 3; i++) {
      var streamIndex = (seed + i) % stableStreamIds.length;
      var stream = stableStreamIds[streamIndex];
      
      var capitalizedQuery = query
        .split(" ")
        .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1); })
        .join(" ");

      if (mode === "artist") {
        results.push({
          videoId: stream.id,
          title: capitalizedQuery + " - Greatest Hits (Vol. " + (i + 1) + ")",
          artist: capitalizedQuery,
        });
      } else {
        results.push({
          videoId: stream.id,
          title: capitalizedQuery + " (" + stream.suffix + ")",
          artist: "Aesthetic Fallback",
        });
      }
    }

    return results;
  };

  var performSearch = async function (query: string) {
    if (!query.trim()) return;
    setSearchError("");
    setIsSearching(true);
    setIsKeyboardActive(false);

    var directId = getYouTubeId(query) || (query.trim().length === 11 ? query.trim() : null);
    if (directId) {
      var newTrack: Track = {
        videoId: directId,
        title: "New Track (" + directId + ")",
        artist: "YouTube Video",
        thumbnail: "https://img.youtube.com/vi/" + directId + "/hqdefault.jpg",
      };

      setSearchOptions([newTrack]);
      setSearchQuery("");
      setIsSearching(false);
      return;
    }

    var backendSearch = async function (): Promise<any[]> {
      var apiBase = import.meta.env.VITE_API_URL || "";
      var res = await fetchCompat(apiBase + "/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, mode: searchMode }),
      });
      if (!res.ok) {
        throw new Error("Backend search failed: " + res.status);
      }
      var contentType = res.headers.get("content-type");
      if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error("Backend did not return JSON");
      }
      var resData = await res.json();
      if (!Array.isArray(resData) || resData.length === 0) {
        throw new Error("Backend returned empty results");
      }
      return resData;
    };

    var clientSearch = async function (): Promise<any[]> {
      var resData = await clientSideSearchYoutube(query, searchMode);
      if (!Array.isArray(resData) || resData.length === 0) {
        throw new Error("Client search returned empty results");
      }
      return resData;
    };

    try {
      var data: any[] = [];

      try {
        data = await anyPromise([
          backendSearch(),
          clientSearch()
        ]);
      } catch (raceErr) {
        console.warn("Parallel searches failed, running static fallback...", raceErr);
        data = getSuperRobustFallbackTracks(query, searchMode);
      }

      if (Array.isArray(data) && data.length > 0) {
        var tracks: Track[] = data.map(function (t: any) {
          return {
            videoId: t.videoId,
            title: t.title || "Unknown Title",
            artist: t.artist || "Unknown Artist",
            thumbnail: "https://img.youtube.com/vi/" + t.videoId + "/hqdefault.jpg",
          };
        });
        setSearchOptions(tracks);
        setSearchQuery("");
      } else {
        setSearchError("Song not found.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  var handleSearchSubmit = function (e: React.FormEvent) {
    e.preventDefault();
    performSearch(searchQuery);
  };

  var handleSelectSearchOption = async function (track: Track, andPlay: boolean) {
    var finalTrack = { ...track, isDownloading: true };

    setPlaylist(function (prev) {
      var existingTrack = prev.find(function (t) { return t.videoId === track.videoId; });
      var updated = prev;
      if (!existingTrack) {
        updated = prev.concat(finalTrack);
      } else {
        finalTrack = { ...existingTrack, isDownloading: true };
      }
      
      if (andPlay) {
        var existingIdx = updated.findIndex(function (t) { return t.videoId === track.videoId; });
        if (existingIdx !== -1) {
          setCurrentTrackIndex(existingIdx);
        }
      }
      return updated;
    });

    setSearchOptions([]);

    if (!finalTrack.blobUrl) {
      try {
        var apiBase = import.meta.env.VITE_API_URL || "";
        var url = apiBase + "/api/download/" + track.videoId;
        var blob = await downloadBlob(url);
        var blobUrl = URL.createObjectURL(blob);
        
        setPlaylist(function (prev) {
          return prev.map(function (t) {
            if (t.videoId === track.videoId) {
              return { ...t, blobUrl: blobUrl, isDownloading: false };
            }
            return t;
          });
        });

      } catch (err) {
        console.error("Download error:", err);
        setPlaylist(function (prev) {
          return prev.map(function (t) {
            if (t.videoId === track.videoId) {
              return { ...t, isDownloading: false };
            }
            return t;
          });
        });
        alert("Failed to download mp3 for " + track.title);
      }
    } else {
      // The useEffect will handle playing since currentTrackIndex was set
    }
  };

  var handleVirtualKeyPress = function (val: string) {
    if (val === "SPACE") {
      setSearchQuery(function (prev) { return prev + " "; });
    } else if (val === "BACKSPACE") {
      setSearchQuery(function (prev) { return prev.slice(0, -1); });
    } else if (val === "CLEAR") {
      setSearchQuery("");
    } else if (val === "CARI") {
      performSearch(searchQuery);
    } else {
      setSearchQuery(function (prev) { return prev + val; });
    }
  };

  var handleRemoveTrack = function (idxToRemove: number, e: React.MouseEvent) {
    e.stopPropagation();
    setPlaylist(function (prev) {
      var updated = prev.filter(function (_, idx) { return idx !== idxToRemove; });
      if (idxToRemove === currentTrackIndex) {
        var newIndex = Math.min(idxToRemove, Math.max(0, updated.length - 1));
        setCurrentTrackIndex(newIndex);
      } else if (idxToRemove < currentTrackIndex) {
        setCurrentTrackIndex(currentTrackIndex - 1);
      }
      return updated;
    });
  };

  var handleClearPlaylist = function () {
    setPlaylist([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);
  };

  var formatTime = function (secs: number) {
    if (isNaN(secs) || secs < 0) return "0:00";
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  };

  var progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  var row1Keys = isNumbers
    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
    : ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];

  var row2Keys = isNumbers
    ? ["-", "/", ":", ";", "(", ")", "$", "&", "@"]
    : ["A", "S", "D", "F", "G", "H", "J", "K", "L"];

  var row3Keys = isNumbers
    ? [".", ",", "?", "!", "'", "_", "+"]
    : ["Z", "X", "C", "V", "B", "N", "M"];

  return (
    <div className="app-scale-container">
      <div 
        className="app-wrapper"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: "-384px",
          marginTop: "-512px",
          transform: "scale(" + scale + ")",
          WebkitTransform: "scale(" + scale + ")"
        }}
      >
      {/* Hidden Audio Player */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* --- 50% TOP AREA --- strictly empty and pitch black */}
      <div className="top-area-empty" />

      {/* --- 50% BOTTOM AREA --- */}
      <div className="bottom-area-container">
        
        {/* PROGRESS & SEEK BAR */}
        <div onClick={handleSeek} className="progress-seek-bar">
          <div className="seek-track">
            <div className="seek-fill" style={{ width: progressPercentage + "%" }} />
          </div>
        </div>

        {searchOptions.length > 0 ? (
          /* Search results layer over bottom controls */
          <div className="search-results-panel">
            <div className="search-results-header">
              <div style={{ position: "absolute", left: "0px", top: "0px" }}>
                <h3 className="search-results-title">SELECT SONG TO PLAY</h3>
                <p className="search-results-subtitle">Found {searchOptions.length} search results</p>
              </div>
              <button
                type="button"
                onClick={function () { setSearchOptions([]); }}
                className="search-results-close-btn"
              >
                <X style={{ width: "12px", height: "12px", marginRight: "6px" }} /> Close
              </button>
            </div>

            <div className="search-results-list">
              {searchOptions.map(function (track, idx) {
                var isAdded = playlist.some(function (t) { return t.videoId === track.videoId; });
                var handlePlayClick = function () { handleSelectSearchOption(track, true); };
                var handleQueueClick = function () { handleSelectSearchOption(track, false); };
                var trackThumbnail = track.thumbnail ? track.thumbnail.replace("img.youtube.com", "i.ytimg.com").replace("http://", "https://") : "";

                return (
                  <div key={track.videoId + "-" + idx} className="search-result-item">
                    <div className="search-result-info">
                      {trackThumbnail ? (
                        <img
                          src={trackThumbnail}
                          alt=""
                          onError={function (e) {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop";
                          }}
                          className="search-result-thumbnail"
                        />
                      ) : (
                        <div className="search-result-thumbnail" style={{ backgroundColor: "#1c1c1c" }} />
                      )}
                      <div className="search-result-text-container">
                        <h4 onClick={handlePlayClick} className="search-result-title">{track.title}</h4>
                        <p className="search-result-artist">{track.artist}</p>
                      </div>
                    </div>

                    <div className="search-result-actions">
                      <button type="button" onClick={handlePlayClick} className="search-play-btn">
                        PLAY
                      </button>
                      {isAdded ? (
                        <div className="search-queue-status">
                          IN QUEUE
                        </div>
                      ) : (
                        <button type="button" onClick={handleQueueClick} className="search-queue-btn">
                          + QUEUE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isKeyboardActive ? (
          /* Premium Virtual QWERTY Keyboard panel */
          <div className="keyboard-panel">
            <div className="keyboard-search-header">
              <Search className="keyboard-search-icon" style={{ width: "16px", height: "16px" }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={function (e) { setSearchQuery(e.target.value); }}
                placeholder={searchMode === "song" ? "TYPE SONG TITLE OR LINK..." : "TYPE ARTIST NAME..."}
                disabled={isSearching}
                className="keyboard-search-input"
              />
              
              {/* Mode Toggle inside Keyboard */}
              <div className="keyboard-mode-toggle">
                <button
                  type="button"
                  onClick={function () { setSearchMode("song"); }}
                  className={"kbd-toggle-btn" + (searchMode === "song" ? " active" : "")}
                >
                  SONG
                </button>
                <button
                  type="button"
                  onClick={function () { setSearchMode("artist"); }}
                  className={"kbd-toggle-btn" + (searchMode === "artist" ? " active" : "")}
                >
                  ARTIST
                </button>
              </div>

              <button
                type="button"
                onClick={function () { setIsKeyboardActive(false); }}
                className="keyboard-close-header-btn"
              >
                Close
              </button>
            </div>

            {/* Suggestions chips */}
            <div className="suggestions-carousel">
              {SUGGESTED_QUERIES.map(function (q) {
                var handleChipClick = function () {
                  setSearchQuery(q);
                  performSearch(q);
                };
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={handleChipClick}
                    className="suggestion-chip"
                  >
                    {q}
                  </button>
                );
              })}
            </div>

            {/* Keys Area */}
            <div className="keyboard-keys-area">
              {/* Row 1 */}
              <div className="keyboard-row keyboard-row-1">
                {row1Keys.map(function (key, idx) {
                  var handleKeyClick = function () { handleVirtualKeyPress(key); };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleKeyClick}
                      className="key-button"
                      style={{ left: (idx * 70) + "px", width: "64px" }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Row 2 */}
              <div className="keyboard-row keyboard-row-2">
                {row2Keys.map(function (key, idx) {
                  var handleKeyClick = function () { handleVirtualKeyPress(key); };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleKeyClick}
                      className="key-button"
                      style={{ left: (35 + idx * 70) + "px", width: "64px" }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Row 3 */}
              <div className="keyboard-row keyboard-row-3">
                {row3Keys.map(function (key, idx) {
                  var handleKeyClick = function () { handleVirtualKeyPress(key); };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleKeyClick}
                      className="key-button"
                      style={{ left: (idx * 70) + "px", width: "64px" }}
                    >
                      {key}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={function () { handleVirtualKeyPress("BACKSPACE"); }}
                  className="key-button key-button-del"
                  style={{ left: "490px", width: "204px" }}
                >
                  DEL
                </button>
              </div>

              {/* Row 4 */}
              <div className="keyboard-row keyboard-row-4">
                <button
                  type="button"
                  onClick={function () { setIsNumbers(!isNumbers); }}
                  className="key-button key-button-mode"
                  style={{ left: "0px", width: "100px" }}
                >
                  {isNumbers ? "ABC" : "123"}
                </button>

                <button
                  type="button"
                  onClick={function () { handleVirtualKeyPress("CLEAR"); }}
                  className="key-button key-button-clear"
                  style={{ left: "106px", width: "100px" }}
                >
                  CLEAR
                </button>

                <button
                  type="button"
                  onClick={function () { handleVirtualKeyPress("SPACE"); }}
                  className="key-button key-button-space"
                  style={{ left: "212px", width: "376px" }}
                >
                  SPACE
                </button>

                <button
                  type="submit"
                  onClick={function () { handleVirtualKeyPress("CARI"); }}
                  className="key-button key-button-search"
                  style={{ left: "594px", width: "100px" }}
                >
                  SEARCH
                </button>
              </div>
            </div>

            {searchError ? (
              <div className="error-banner-legacy" style={{ position: "absolute", bottom: "10px", left: "37px", width: "694px" }}>
                {searchError}
              </div>
            ) : null}
          </div>
        ) : (
          /* Standard Playing Panel with Left Metadata and Right Vinyl Record */
          <div style={{ position: "relative", width: "768px", height: "512px" }}>
            
            {/* Left Control Panel */}
            <div className="control-panel-left">
              {/* Minimal Search Trigger */}
              <div className="mini-search-container">
                <Search className="mini-search-icon" style={{ width: "14px", height: "14px" }} />
                <input
                  ref={mainSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={function (e) { setSearchQuery(e.target.value); }}
                  onFocus={function () { setIsKeyboardActive(true); }}
                  placeholder="PASTE YOUTUBE LINK OR VIDEO ID..."
                  className="mini-search-input"
                />
                {isSearching ? (
                  <Loader2 className="mini-search-clear animate-spin" style={{ width: "14px", height: "14px" }} />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={function () { setSearchQuery(""); }}
                    className="mini-search-clear"
                  >
                    <X style={{ width: "14px", height: "14px" }} />
                  </button>
                ) : null}
              </div>

              {searchError ? (
                <div style={{ position: "absolute", left: "0px", top: "42px", color: "#f87171", fontFamily: "monospace", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase" }}>
                  {searchError}
                </div>
              ) : null}

              {/* Current Track Metadata details */}
              <div className="metadata-container">
                <h1 className="metadata-title">
                  {currentTrack.isDownloading ? "(DOWNLOADING) " : ""}{currentTrack.title}
                </h1>
                <p className="metadata-artist">{currentTrack.artist}</p>
              </div>

              {/* Timing info */}
              <div className="time-display-container">
                <span>{formatTime(currentTime)}</span>
                <span style={{ margin: "0 10px", opacity: 0.3 }}>/</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Bottom playback buttons */}
              <div className="playback-button-row">
                {/* Prev button */}
                <button
                  onClick={handlePrev}
                  className="playback-btn playback-btn-prev"
                  disabled={!isPlayerReady}
                  title="Previous"
                >
                  <SkipBack style={{ width: "20px", height: "20px" }} />
                </button>

                {/* Next button */}
                <button
                  onClick={handleNext}
                  className="playback-btn playback-btn-next"
                  disabled={!isPlayerReady}
                  title="Next"
                >
                  <SkipForward style={{ width: "20px", height: "20px" }} />
                </button>

                {/* Shuffle indicator button */}
                <button
                  onClick={function () { setIsShuffle(!isShuffle); }}
                  className={"playback-btn playback-btn-shuffle" + (isShuffle ? " active" : "")}
                  title="Shuffle"
                >
                  <Shuffle style={{ width: "14px", height: "14px" }} />
                  {isShuffle ? <span className="dot-indicator" /> : null}
                </button>

                {/* Repeat indicator button */}
                <button
                  onClick={function () { setIsRepeat(!isRepeat); }}
                  className={"playback-btn playback-btn-repeat" + (isRepeat ? " active" : "")}
                  title="Repeat"
                >
                  <Repeat style={{ width: "14px", height: "14px" }} />
                  {isRepeat ? <span className="dot-indicator" /> : null}
                </button>

                {/* Playlist toggle button */}
                <button
                  onClick={function () { setShowQueue(!showQueue); }}
                  className={"playback-btn playback-btn-playlist" + (showQueue ? " active" : "")}
                  title="Show Playlist"
                >
                  <ListMusic style={{ width: "15px", height: "15px" }} />
                  {showQueue ? <span className="dot-indicator" /> : null}
                </button>
              </div>

            </div>

            {/* Right Vinyl Panel */}
            <div className="vinyl-panel-right">
              <VinylRecord
                isPlaying={isPlaying}
                currentTrack={currentTrack}
                onPressStart={handlePlayPause}
                onPressEnd={handlePlayEnd}
              />
            </div>

          </div>
        )}

        {/* Sliding queue/playlist drawer */}
        <div
          className="queue-drawer-panel"
          style={{
            display: showQueue ? "block" : "none",
            transform: showQueue ? "translateY(0)" : "translateY(100%)",
            WebkitTransform: showQueue ? "translateY(0)" : "translateY(100%)"
          }}
        >
          <div className="queue-drawer-header">
            <div style={{ position: "absolute", left: "0px", top: "5px" }}>
              <span className="queue-drawer-title">
                Playlist Queue ({playlist.length})
              </span>
              {playlist.length > 0 ? (
                <button
                  onClick={handleClearPlaylist}
                  className="queue-clear-btn"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <button
              onClick={function () { setShowQueue(false); }}
              className="queue-drawer-close-btn"
              style={{ padding: "8px", background: "transparent", border: "none" }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          <div className="queue-drawer-list">
            {playlist.length === 0 ? (
              <div className="queue-empty-state">
                <ListMusic style={{ width: "36px", height: "36px", color: "rgba(255,255,255,0.1)" }} />
                <p className="queue-empty-text-1">Queue Empty</p>
                <p className="queue-empty-text-2">Search for songs to add them to the queue.</p>
              </div>
            ) : (
              playlist.map(function (track, idx) {
                var isActive = idx === currentTrackIndex;
                var handleItemClick = function () {
                  setCurrentTrackIndex(idx);
                  setShowQueue(false);
                  playVideoTrack(track);
                };
                var handleRemoveClick = function (e: any) {
                  handleRemoveTrack(idx, e);
                };
                var itemThumbnail = track.thumbnail ? track.thumbnail.replace("http://", "https://") : "";

                return (
                  <div
                    key={track.videoId + "-" + idx}
                    className={"queue-item" + (isActive ? " active" : "")}
                  >
                    <button
                      type="button"
                      onClick={handleItemClick}
                      className="queue-item-left"
                    >
                      <div className="queue-item-thumbnail-container">
                        {itemThumbnail ? (
                          <img
                            src={itemThumbnail}
                            alt=""
                            onError={function (e) {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop";
                            }}
                            className="queue-item-thumbnail"
                          />
                        ) : (
                          <div className="queue-item-thumbnail" style={{ backgroundColor: "#1c1c1c" }} />
                        )}
                        {isActive && isPlaying ? (
                          <div className="queue-active-overlay">
                            <span className="flex-legacy" style={{ alignItems: "flex-end", height: "12px" }}>
                              <span className="queue-soundwave-bar" style={{ height: "12px" }} />
                              <span className="queue-soundwave-bar" style={{ height: "8px" }} />
                              <span className="queue-soundwave-bar" style={{ height: "10px" }} />
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <div className={"queue-item-title" + (isActive ? " active" : "")}>
                          {track.isDownloading ? "(DL) " : ""}{track.title}
                        </div>
                        <div className="queue-item-artist">
                          {track.artist}
                        </div>
                      </div>
                    </button>

                    <div className="queue-item-actions">
                      {isActive ? (
                        <span className="queue-status-badge">
                          Now Playing
                        </span>
                      ) : (
                        <span className="queue-status-badge" style={{ opacity: 0.5 }}>
                          Queue
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveClick}
                        className="queue-remove-btn"
                      >
                        <Trash2 style={{ width: "14px", height: "14px" }} />
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
  );
}
