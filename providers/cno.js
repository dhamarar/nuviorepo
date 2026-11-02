/**
 * cno - Built from src/cno/
 * Generated: 2026-11-02T03:39:21.314Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/cno/constants.js
var PROVIDER_NAME = "Cno";
var BASE_URL = "https://beta.cno.to";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Referer": `${BASE_URL}/`,
  "Accept": "application/json, text/plain, */*"
};
var SUBTITLE_LANGUAGE_MAP = {
  "id": { code: "id", name: "Indonesian" },
  "ind": { code: "id", name: "Indonesian" },
  "indonesian": { code: "id", name: "Indonesian" },
  "bahasa": { code: "id", name: "Indonesian" },
  "en": { code: "en", name: "English" },
  "eng": { code: "en", name: "English" },
  "english": { code: "en", name: "English" }
};

// src/cno/subtitles.js
function filterAllowedLanguage(langStr) {
  if (!langStr)
    return null;
  const clean = String(langStr).trim().toLowerCase();
  return SUBTITLE_LANGUAGE_MAP[clean] || null;
}
function fetchSubtitles(path) {
  return __async(this, null, function* () {
    const subtitles = [];
    const seenLangs = /* @__PURE__ */ new Set();
    try {
      const listUrl = `${BASE_URL}/screen-api/subs/list/${path}`;
      const res = yield fetch(listUrl, { headers: HEADERS });
      if (res.ok) {
        const data = yield res.json();
        const files = Array.isArray(data == null ? void 0 : data.files) ? data.files : [];
        for (const file of files) {
          if (!file || !file.lang)
            continue;
          const allowed = filterAllowedLanguage(file.lang);
          if (!allowed) {
            continue;
          }
          if (!seenLangs.has(allowed.code)) {
            seenLangs.add(allowed.code);
            subtitles.push({
              url: `${BASE_URL}/screen/subs/${path}/${allowed.code}.vtt`,
              language: allowed.code,
              name: allowed.name,
              headers: {
                "Referer": `${BASE_URL}/`,
                "User-Agent": HEADERS["User-Agent"]
              }
            });
          }
          if (seenLangs.has("id") && seenLangs.has("en")) {
            break;
          }
        }
      }
    } catch (e) {
      console.warn(`[Cno] Gagal mengambil daftar subtitle: ${e.message}`);
    }
    subtitles.sort((a, b) => {
      if (a.language === "id")
        return -1;
      if (b.language === "id")
        return 1;
      return 0;
    });
    return subtitles;
  });
}

// src/cno/extractor.js
function getQualityBadge(height, width) {
  const h = Number(height) || 0;
  const w = Number(width) || 0;
  if (w >= 3800 || h >= 2160)
    return "4K";
  if (w >= 2500 || h >= 1440)
    return "1440p";
  if (w >= 1900 || h >= 1080)
    return "1080p";
  if (w >= 1200 || h >= 720)
    return "720p";
  if (h >= 480)
    return "480p";
  if (h >= 360)
    return "360p";
  return h ? `${h}p` : "Auto";
}
function parseHlsVariants(masterText, baseUrl) {
  const lines = masterText.split(/\r?\n/);
  const variants = [];
  let currentInf = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      currentInf = {
        width: resMatch ? parseInt(resMatch[1], 10) : 0,
        height: resMatch ? parseInt(resMatch[2], 10) : 0,
        bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0
      };
    } else if (line && !line.startsWith("#") && currentInf) {
      let streamUrl = line;
      if (!streamUrl.startsWith("http")) {
        if (streamUrl.startsWith("/")) {
          streamUrl = `${BASE_URL}${streamUrl}`;
        } else {
          streamUrl = new URL(streamUrl, baseUrl).toString();
        }
      }
      variants.push(__spreadProps(__spreadValues({}, currentInf), {
        url: streamUrl
      }));
      currentInf = null;
    }
  }
  variants.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0));
  return variants;
}
function fetchMasterStream(path) {
  return __async(this, null, function* () {
    const masterUrl = `${BASE_URL}/screen/master/${path}`;
    try {
      const res = yield fetch(masterUrl, { headers: HEADERS });
      if (!res.ok) {
        console.warn(`[Cno] Master playlist HTTP ${res.status} untuk ${path}`);
        return null;
      }
      const masterText = yield res.text();
      const variants = parseHlsVariants(masterText, masterUrl);
      return {
        masterUrl,
        masterText,
        variants
      };
    } catch (e) {
      console.error(`[Cno] Error mengambil master playlist: ${e.message}`);
      return null;
    }
  });
}

// src/cno/index.js
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Cno (Sky) Configuration" },
      {
        type: "select",
        key: "streamMode",
        label: "Mode Streaming",
        description: "Pilih format stream yang ditampilkan (Adaptive HLS atau Pilihan Resolusi).",
        options: [
          { label: "Semua Kualitas (Adaptive + Pilihan Resolusi)", value: "all" },
          { label: "Hanya Auto (Adaptive HLS)", value: "adaptive" },
          { label: "Hanya Resolusi Tetap (4K, 1080p, dll)", value: "variants" }
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
      console.warn("[Cno] Invalid TMDB ID provided:", tmdbId);
      return [];
    }
    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;
    const path = isTv ? `tv/${cleanTmdb}/${cleanSeason}/${cleanEpisode}` : `movie/${cleanTmdb}`;
    console.log(`[Cno] Fetching streams for: ${path}`);
    try {
      const [masterData, subtitles] = yield Promise.all([
        fetchMasterStream(path),
        fetchSubtitles(path)
      ]);
      if (!masterData || !masterData.masterUrl) {
        console.warn(`[Cno] Tidak ada master stream yang ditemukan untuk: ${path}`);
        return [];
      }
      const settings = globalThis.SCRAPER_SETTINGS || {};
      const streamMode = settings.streamMode || "all";
      const variants = masterData.variants || [];
      const topVariant = variants[0];
      const topBadge = topVariant ? getQualityBadge(topVariant.height, topVariant.width) : "Auto";
      const streams = [];
      if (streamMode === "all" || streamMode === "adaptive") {
        streams.push({
          name: `${PROVIDER_NAME} | Server 21 (Adaptive)`,
          title: `${PROVIDER_NAME} - Server 21 - Auto (Adaptive)`,
          url: masterData.masterUrl,
          quality: topBadge,
          format: "m3u8",
          headers: HEADERS,
          subtitles
        });
      }
      if (streamMode === "all" || streamMode === "variants") {
        const seenBadges = /* @__PURE__ */ new Set();
        for (const v of variants) {
          if (!v.url)
            continue;
          const badge = getQualityBadge(v.height, v.width);
          const resLabel = badge === "4K" ? "4K (UHD)" : v.height ? `${v.height}p` : badge;
          const uniqueKey = `${badge}-${v.height}`;
          if (seenBadges.has(uniqueKey))
            continue;
          seenBadges.add(uniqueKey);
          streams.push({
            name: `${PROVIDER_NAME} | Server 21 (${badge})`,
            title: `${PROVIDER_NAME} - Server 21 - ${resLabel}`,
            url: v.url,
            quality: badge,
            format: "m3u8",
            headers: HEADERS,
            subtitles
          });
        }
      }
      return streams;
    } catch (err) {
      console.error(`[Cno] Error in getStreams: ${err.message}`);
      return [];
    }
  });
}
module.exports = { getStreams, onSettings };
