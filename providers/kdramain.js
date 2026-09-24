/**
 * kdramain - Built from src/kdramain/
 * Generated: 2026-09-24T04:02:39.560Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/kdramain/constants.js
var MAIN_URL = "https://k-drama.in";
var VIDSYNC_URL = "https://vidsync.pro";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  "Referer": `${MAIN_URL}/`,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};
var LANGUAGE_MAP = {
  "english": { code: "en", name: "English" },
  "indonesia": { code: "id", name: "Indonesian" },
  "indonesian": { code: "id", name: "Indonesian" },
  "hindi": { code: "hi", name: "Hindi" },
  "fran\xE7ais": { code: "fr", name: "French" },
  "francais": { code: "fr", name: "French" },
  "french": { code: "fr", name: "French" },
  "espa\xF1ola": { code: "es", name: "Spanish" },
  "espanola": { code: "es", name: "Spanish" },
  "spanish": { code: "es", name: "Spanish" },
  "spanish (latam)": { code: "es-419", name: "Spanish (Latin America)" },
  "portugu\xEAs": { code: "pt", name: "Portuguese" },
  "portugues": { code: "pt", name: "Portuguese" },
  "portuguese": { code: "pt", name: "Portuguese" },
  "portuguese (brazil)": { code: "pt-br", name: "Portuguese (Brazil)" },
  "arabic": { code: "ar", name: "Arabic" },
  "\u0627\u0644\u0639\u0631\u0628\u064A\u0629": { code: "ar", name: "Arabic" },
  "\u09AC\u09BE\u0982\u09B2\u09BE": { code: "bn", name: "Bengali" },
  "bengali": { code: "bn", name: "Bengali" },
  "deutsch": { code: "de", name: "German" },
  "german": { code: "de", name: "German" },
  "italian": { code: "it", name: "Italian" },
  "italiano": { code: "it", name: "Italian" },
  "melayu": { code: "ms", name: "Malay" },
  "malay": { code: "ms", name: "Malay" },
  "\u0440\u0443\u0441\u0441\u043A\u0438\u0439": { code: "ru", name: "Russian" },
  "russian": { code: "ru", name: "Russian" },
  "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22": { code: "th", name: "Thai" },
  "thai": { code: "th", name: "Thai" },
  "filipino": { code: "fil", name: "Filipino" },
  "tagalog": { code: "tl", name: "Tagalog" },
  "t\xFCrk": { code: "tr", name: "Turkish" },
  "t\xFCrk\xE7e": { code: "tr", name: "Turkish" },
  "turkish": { code: "tr", name: "Turkish" },
  "\u0627\u0631\u062F\u0648": { code: "ur", name: "Urdu" },
  "urdu": { code: "ur", name: "Urdu" },
  "ti\u1EBFng vi\u1EC7t": { code: "vi", name: "Vietnamese" },
  "tieng viet": { code: "vi", name: "Vietnamese" },
  "vietnamese": { code: "vi", name: "Vietnamese" },
  "\u4E2D\u6587": { code: "zh", name: "Chinese" },
  "chinese": { code: "zh", name: "Chinese" },
  "korean": { code: "ko", name: "Korean" },
  "\uD55C\uAD6D\uC5B4": { code: "ko", name: "Korean" },
  "japanese": { code: "ja", name: "Japanese" },
  "\u65E5\u672C\u8A9E": { code: "ja", name: "Japanese" },
  "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40": { code: "pa", name: "Punjabi" },
  "punjabi": { code: "pa", name: "Punjabi" },
  "\u1781\u17D2\u1798\u17C2\u179A": { code: "km", name: "Khmer" },
  "khmer": { code: "km", name: "Khmer" },
  "\u1019\u103C\u1014\u103A\u1019\u102C": { code: "my", name: "Burmese" },
  "burmese": { code: "my", name: "Burmese" }
};

// src/kdramain/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    const response = yield fetch(url, {
      headers: __spreadValues(__spreadValues({}, DEFAULT_HEADERS), customHeaders)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    const text = yield fetchText(url, customHeaders);
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse JSON from ${url}: ${e.message}`);
    }
  });
}
function parseSubtitles(rawSubs, defaultHeaders = {}) {
  if (!Array.isArray(rawSubs))
    return [];
  const mapped = [];
  const seen = /* @__PURE__ */ new Set();
  for (const sub of rawSubs) {
    const fileUrl = sub.file || sub.url;
    if (!fileUrl || !fileUrl.startsWith("http"))
      continue;
    const rawName = String(sub.name || sub.label || sub.language || "Unknown").trim();
    const lowerName = rawName.toLowerCase();
    const langInfo = LANGUAGE_MAP[lowerName] || {
      code: lowerName.slice(0, 2) || "und",
      name: rawName
    };
    const dedupeKey = `${langInfo.code}_${fileUrl}`;
    if (seen.has(dedupeKey))
      continue;
    seen.add(dedupeKey);
    mapped.push({
      url: fileUrl,
      language: langInfo.code,
      name: `${langInfo.name} (${rawName})`,
      headers: defaultHeaders
    });
  }
  return mapped;
}

// src/kdramain/servers/server1.js
function getServer1Streams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const params = new URLSearchParams({
      id: String(tmdbId),
      type: isTv ? "tv" : "movie"
    });
    if (isTv) {
      params.set("season", String(season || 1));
      params.set("episode", String(episode || 1));
    }
    const apiUrl = `${VIDSYNC_URL}/api/core/vidsrc?${params.toString()}`;
    const embedReferer = isTv ? `${VIDSYNC_URL}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}` : `${VIDSYNC_URL}/embed/movie/${tmdbId}`;
    console.log(`[KDrama] Server 1 requesting: ${apiUrl}`);
    const data = yield fetchJson(apiUrl, {
      "Referer": embedReferer,
      "Origin": VIDSYNC_URL
    });
    const sources = Array.isArray(data.sources) ? data.sources : [];
    if (sources.length === 0) {
      return [];
    }
    const subtitles = parseSubtitles(data.subtitles, {
      "User-Agent": USER_AGENT,
      "Referer": `${VIDSYNC_URL}/`
    });
    const streams = [];
    for (const s of sources) {
      let streamUrl = s.proxyUrl;
      if (streamUrl && !streamUrl.startsWith("http")) {
        streamUrl = `${VIDSYNC_URL}${streamUrl}`;
      }
      if (!streamUrl && s.url && s.url.startsWith("http")) {
        streamUrl = s.url;
      }
      if (!streamUrl)
        continue;
      const quality = s.quality || "Auto";
      const audio = s.audioTracks && s.audioTracks[0] ? ` [${s.audioTracks[0].label || s.audioTracks[0].language}]` : "";
      streams.push({
        name: "KDrama | Server 1 (Vidsync)",
        title: `Server 1 (Vidsync) - ${quality}${audio}`,
        url: streamUrl,
        quality,
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": embedReferer,
          "Origin": VIDSYNC_URL
        },
        subtitles
      });
    }
    return streams;
  });
}

// src/kdramain/servers/server2.js
function getServer2Streams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    const s = mediaType === "movie" ? 1 : season || 1;
    const e = mediaType === "movie" ? 1 : episode || 1;
    const targetUrl = `${MAIN_URL}/13.php/${tmdbId}/${s}/${e}`;
    console.log(`[KDrama] Server 2 requesting: ${targetUrl}`);
    const html = yield fetchText(targetUrl, {
      "Referer": `${MAIN_URL}/watch.php?id=${tmdbId}&type=${mediaType}`
    });
    const match = html.match(/playerData\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
      return [];
    }
    try {
      const pd = JSON.parse(match[1]);
      const sources = Array.isArray(pd.sources) ? pd.sources : [];
      if (sources.length === 0)
        return [];
      const streams = [];
      for (const src of sources) {
        if (!src.url || !src.url.startsWith("http"))
          continue;
        const lang = src.language || "Multi";
        const quality = src.quality || "1080p";
        streams.push({
          name: `KDrama | Server 2 (${lang})`,
          title: `Server 2 (Multi) - ${quality} [${lang}]`,
          url: src.url,
          quality,
          size: src.size || 0,
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${MAIN_URL}/`
          }
        });
      }
      return streams;
    } catch (err) {
      console.warn("[KDrama] Server 2: Failed to parse playerData:", err.message);
      return [];
    }
  });
}

// src/kdramain/servers/server3.js
function getServer3Streams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    const s = mediaType === "movie" ? 1 : season || 1;
    const e = mediaType === "movie" ? 1 : episode || 1;
    const targetUrl = `${MAIN_URL}/2.php/${tmdbId}/${s}/${e}`;
    console.log(`[KDrama] Server 3 requesting: ${targetUrl}`);
    const html = yield fetchText(targetUrl, {
      "Referer": `${MAIN_URL}/watch.php?id=${tmdbId}&type=${mediaType}`
    });
    const playerMatch = html.match(/src=["'](https?:\/\/[^"']*player\.html\?[^"']+)["']/i);
    if (!playerMatch) {
      console.warn("[KDrama] Server 3: player.html iframe not found in response");
      return [];
    }
    const cleanPlayerUrl = playerMatch[1].replace(/&amp;/g, "&");
    const parsedUrl = new URL(cleanPlayerUrl);
    const fileParam = parsedUrl.searchParams.get("file");
    const subParam = parsedUrl.searchParams.get("subtitle");
    let subtitles = [];
    if (subParam) {
      try {
        const rawSubs = JSON.parse(subParam);
        subtitles = parseSubtitles(rawSubs, {
          "User-Agent": USER_AGENT,
          "Referer": `${parsedUrl.origin}/`
        });
      } catch (err) {
        console.warn("[KDrama] Server 3: Failed to parse subtitles JSON:", err.message);
      }
    }
    if (!fileParam) {
      console.warn("[KDrama] Server 3: No file parameter in player URL");
      return [];
    }
    const streams = [];
    try {
      const files = JSON.parse(fileParam);
      for (const f of files) {
        if (!f.file || !f.file.startsWith("http"))
          continue;
        streams.push({
          name: "KDrama | Server 3 (HLS)",
          title: `Server 3 (HLS) - ${f.title || "Multi-Quality"}`,
          url: f.file,
          quality: "Auto",
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": `${parsedUrl.origin}/`
          },
          subtitles
        });
      }
    } catch (err) {
      console.warn("[KDrama] Server 3: Failed to parse files JSON:", err.message);
    }
    return streams;
  });
}

// src/kdramain/servers/server6.js
function getServer6Streams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    const s = mediaType === "movie" ? 1 : season || 1;
    const e = mediaType === "movie" ? 1 : episode || 1;
    const apiUrl = `${MAIN_URL}/yoy4.php?ajax=1&id=${tmdbId}&s=${s}&e=${e}`;
    console.log(`[KDrama] Server 6 requesting: ${apiUrl}`);
    let data;
    try {
      data = yield fetchJson(apiUrl, {
        "Referer": `${MAIN_URL}/yoy4.php?id=${tmdbId}&s=${s}&e=${e}`
      });
    } catch (e2) {
      return [];
    }
    if (!data || !data.success || !Array.isArray(data.servers)) {
      return [];
    }
    const streams = [];
    for (const server of data.servers) {
      if (!server.src || !server.src.startsWith("http"))
        continue;
      const serverName = server.name || "Fast Server";
      streams.push({
        name: `KDrama | Server 6 (${serverName})`,
        title: `Server 6 (YOY4) - ${serverName}`,
        url: server.src,
        quality: "Auto",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": `${MAIN_URL}/`
        }
      });
      if (server.src.includes("vidbasic.top/embed/")) {
        try {
          const embedHtml = yield fetchText(server.src, {
            "Referer": `${MAIN_URL}/`
          });
          const matches = [...embedHtml.matchAll(/<li[^>]*data-provider=["']([^"']+)["'][^>]*data-video=["']([^"']+)["']/gi)];
          for (const m of matches) {
            const provider = m[1];
            let videoUrl = m[2];
            if (videoUrl.startsWith("/")) {
              const parsed = new URL(server.src);
              videoUrl = `${parsed.origin}${videoUrl}`;
            }
            if (videoUrl.startsWith("http")) {
              streams.push({
                name: `KDrama | Server 6 (${provider})`,
                title: `Server 6 - ${provider}`,
                url: videoUrl,
                quality: "Auto",
                headers: {
                  "User-Agent": USER_AGENT,
                  "Referer": server.src
                }
              });
            }
          }
        } catch (err) {
          console.warn("[KDrama] Server 6: Error parsing vidbasic sub-servers:", err.message);
        }
      }
    }
    return streams;
  });
}

// src/kdramain/index.js
function onSettings() {
  return __async(this, null, function* () {
    return [
      {
        type: "header",
        label: "Server Configuration"
      },
      {
        type: "select",
        key: "preferredServer",
        label: "Pilihan Server Streaming",
        description: "Pilih server k-drama.in yang ingin digunakan. Pilihan 'Semua Server' akan memuat seluruh server yang tersedia secara simultan.",
        options: [
          { label: "Semua Server (Rekomendasi)", value: "all" },
          { label: "Server 3 (KDrama HLS & Multi Subtitle)", value: "3" },
          { label: "Server 1 (Vidsync Multi Lang)", value: "1" },
          { label: "Server 2 (Multi Audio & Dubbing)", value: "2" },
          { label: "Server 6 (YOY4 / Fast Server)", value: "6" }
        ],
        defaultValue: "all"
      }
    ];
  });
}
function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;
    if (typeof tmdbId === "object" && tmdbId !== null) {
      id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
      type = tmdbId.mediaType || tmdbId.type || type || "movie";
      s = tmdbId.season || season || 1;
      ep = tmdbId.episode || episode || 1;
    }
    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
      console.warn("[KDrama] Invalid TMDB ID provided:", tmdbId);
      return [];
    }
    const cleanType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanType === "tv" || cleanType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;
    console.log(`[KDrama] Querying streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const preferredServer = String(settings.preferredServer || "all").toLowerCase();
    const serverFetchers = {
      "3": () => getServer3Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
      "1": () => getServer1Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
      "2": () => getServer2Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
      "6": () => getServer6Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode)
    };
    if (preferredServer !== "all" && serverFetchers[preferredServer]) {
      try {
        console.log(`[KDrama] Fetching preferred server: ${preferredServer}`);
        const streams = yield serverFetchers[preferredServer]();
        if (streams.length > 0) {
          return streams;
        }
        console.log(`[KDrama] Preferred server ${preferredServer} returned no streams, falling back to all servers...`);
      } catch (err) {
        console.warn(`[KDrama] Preferred server ${preferredServer} error:`, err.message);
      }
    }
    const activeTasks = [
      serverFetchers["3"]().catch((err) => {
        console.warn("[KDrama] Server 3 error:", err.message);
        return [];
      }),
      serverFetchers["1"]().catch((err) => {
        console.warn("[KDrama] Server 1 error:", err.message);
        return [];
      }),
      serverFetchers["2"]().catch((err) => {
        console.warn("[KDrama] Server 2 error:", err.message);
        return [];
      }),
      serverFetchers["6"]().catch((err) => {
        console.warn("[KDrama] Server 6 error:", err.message);
        return [];
      })
    ];
    const results = yield Promise.allSettled(activeTasks);
    const allStreams = [];
    for (const res of results) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        allStreams.push(...res.value);
      }
    }
    console.log(`[KDrama] Total streams resolved: ${allStreams.length}`);
    return allStreams;
  });
}
module.exports = { getStreams, onSettings };
