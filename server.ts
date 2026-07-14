import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to clean up titles and channel names
function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/ - Topic$/i, "");
}

// Helper to filter results to ensure they are original/official artist releases only
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

    // Strict official indicators
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

  if (strictResults.length >= 5) {
    return strictResults.slice(0, 15);
  }

  // Tier 2: Moderately relaxed check (exclude covers, remixes, and explicit lyric channels, but allow original videos from other channels if not enough strict results)
  const relaxedResults = results.filter(r => {
    const t = r.title.toLowerCase();
    const a = (r.rawArtist || r.artist || "").toLowerCase();

    // Still exclude covers, remixes, etc. (essential for original artist filter)
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

    // Still exclude channels that are clearly fake/karaoke/covers/remixes
    const channelBlacklist = [
      "covers", "karaoke", "nightcore", "repost", "reloaded", "synthesia"
    ];
    if (channelBlacklist.some(term => a.includes(term))) return false;

    return true;
  });

  // Combine them, ensuring uniqueness by videoId
  const combined = [...strictResults];
  const seenIds = new Set(combined.map(r => r.videoId));

  for (const r of relaxedResults) {
    if (!seenIds.has(r.videoId)) {
      combined.push(r);
      seenIds.add(r.videoId);
    }
  }

  // Final fallback: if combined is empty, return the top raw results so search is never completely broken
  if (combined.length === 0) {
    return results.slice(0, 15);
  }

  return combined.slice(0, 15);
}

// Scraper function to search YouTube without an API key
async function searchYoutubeScraper(query: string, mode?: string) {
  const suffix = mode === "artist" ? " greatest hits" : " official release";
  // Ensure we search for videos only to avoid playlists
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + suffix)}&sp=EgIQAQ%253D%253D`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // Strict 2.5s timeout to prevent server hang

  let html = "";
  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to retrieve YouTube search page");
    }

    html = await response.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("Scraper fetch error:", err);
    throw new Error("Scraper request timed out or was blocked.");
  }

  // Try to extract ytInitialData JSON object containing structured search results
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
    try {
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
    } catch (jsonErr) {
      console.error("Gagal parse ytInitialData JSON, mencoba metode regex...", jsonErr);
    }
  }

  // Backup Regex Parser (if ytInitialData structure changes)
  // Match videoId, title and channel inside the page source
  const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
  if (videoIdMatch && videoIdMatch[1]) {
    const videoId = videoIdMatch[1];
    return [{
      videoId,
      title: query,
      artist: "YouTube Video",
    }];
  }

  throw new Error("Song not found.");
}

// API endpoint to search YouTube videos using YouTube Data API v3, with a robust scraper fallback (No AI, No Google Search Grounding)
app.post("/api/search", async (req, res) => {
  try {
    const { query, mode } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    const suffix = mode === "artist" ? " greatest hits" : " official release";
    const ytKey = process.env.YOUTUBE_API_KEY;

    if (ytKey && ytKey.trim() !== "") {
      console.log("Using official YouTube Data API v3 for search:", query, "mode:", mode);
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + suffix)}&type=video&maxResults=50&key=${ytKey.trim()}`;
      
      const ytResponse = await fetch(searchUrl);
      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        if (ytData.items && ytData.items.length > 0) {
          const results = ytData.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: cleanString(item.snippet.title || "Unknown Title"),
            artist: cleanString(item.snippet.channelTitle || "YouTube Music"),
            rawArtist: item.snippet.channelTitle || "YouTube Music",
          })).filter((item: any) => item.videoId);
          
          if (results.length > 0) {
            const filtered = filterOriginalArtistTracks(results);
            return res.json(filtered);
          }
        }
      } else {
        console.warn("YouTube API v3 call failed, falling back to clean scraping search...");
      }
    }

    // Direct search via clean scraping scraper
    console.log("Using scraper for search query:", query, "mode:", mode);
    const trackInfo = await searchYoutubeScraper(query, mode);
    res.json(Array.isArray(trackInfo) ? trackInfo : [trackInfo]);
  } catch (error: any) {
    console.error("Error in /api/search:", error);
    res.status(500).json({
      error: error.message || "Failed to search for song. Please try again.",
    });
  }
});

app.get("/api/download/:videoId", async (req, res) => {
  try {
    const videoId = req.params.videoId;
    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Default to webm for audio, although it might be m4a. We'll use webm as fallback.
    res.setHeader("Content-Disposition", `attachment; filename="${videoId}.webm"`);
    res.setHeader("Content-Type", "audio/webm");

    const ytDlpPath = path.join(process.cwd(), 'yt-dlp');
    const ytDlp = spawn(ytDlpPath, ['-f', 'bestaudio', '-o', '-', url]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
      console.log(`yt-dlp log: ${data}`);
    });
    
    ytDlp.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp process exited with code ${code}`);
      }
    });

  } catch (error: any) {
    console.error("Error in /api/download:", error);
    res.status(500).json({ error: "Failed to download audio" });
  }
});

// Setup Vite Dev server or Production static file serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupServer();
