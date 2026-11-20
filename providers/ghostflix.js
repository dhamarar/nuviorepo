/**
 * ghostflix - Built from src/ghostflix/
 * Generated: 2026-11-20T08:53:09.727Z
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

// src/ghostflix/constants.js
var PROVIDER_NAME = "Ghostflix";
var PLAYER_URL = "https://vidbolt.st";
var TSDB_BASE = "https://api.thesubtitledb.org/v1";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
var PLAYER_HEADERS = {
  "User-Agent": USER_AGENT,
  "Referer": `${PLAYER_URL}/`,
  "Origin": PLAYER_URL,
  "Accept": "application/json, text/plain, */*"
};
var STREAM_HEADERS = {
  "User-Agent": USER_AGENT,
  "Referer": `${PLAYER_URL}/`,
  "Origin": PLAYER_URL
};
var SERVERS = [
  { id: "orion", name: "Orion" },
  { id: "callisto", name: "Callisto" },
  { id: "luna", name: "Luna" },
  { id: "vega", name: "Vega" },
  { id: "quantum", name: "Quantum" },
  { id: "quasar", name: "Quasar" }
];
var SERVER_LABELS = {
  orion: "Orion",
  callisto: "Callisto",
  luna: "Luna",
  vega: "Vega",
  quantum: "Quantum",
  quasar: "Quasar"
};
var SUBTITLE_LANGUAGE_MAP = {
  "id": { code: "id", name: "Indonesian" },
  "ind": { code: "id", name: "Indonesian" },
  "indonesian": { code: "id", name: "Indonesian" },
  "bahasa": { code: "id", name: "Indonesian" },
  "bahasa indonesia": { code: "id", name: "Indonesian" },
  "en": { code: "en", name: "English" },
  "eng": { code: "en", name: "English" },
  "english": { code: "en", name: "English" }
};
var QUALITY_WEIGHTS = {
  "4K": 100,
  "2160p": 100,
  "1440p": 80,
  "1080p": 60,
  "720p": 40,
  "480p": 20,
  "360p": 10,
  "Auto": 50
};

// src/ghostflix/subtitles.js
function filterAllowedLanguage(langStr) {
  if (!langStr)
    return null;
  const clean = String(langStr).trim().toLowerCase();
  if (SUBTITLE_LANGUAGE_MAP[clean]) {
    return SUBTITLE_LANGUAGE_MAP[clean];
  }
  if (clean.indexOf("indonesian") !== -1) {
    return SUBTITLE_LANGUAGE_MAP.id;
  }
  if (clean.indexOf("english") !== -1) {
    return SUBTITLE_LANGUAGE_MAP.en;
  }
  return null;
}
function fetchTsdbByLang(tmdbPath, langCode, maxPerLang) {
  return __async(this, null, function* () {
    var _a;
    const allowed = filterAllowedLanguage(langCode);
    if (!allowed)
      return [];
    const url = `${TSDB_BASE}/by-tmdb/${tmdbPath}?lang=${encodeURIComponent(allowed.code)}&limit=50`;
    try {
      const res = yield fetch(url, { headers: PLAYER_HEADERS });
      if (!res.ok)
        return [];
      const data = yield res.json();
      const items = Array.isArray((_a = data == null ? void 0 : data.subtitles) == null ? void 0 : _a.items) ? data.subtitles.items : [];
      if (items.length === 0)
        return [];
      const validItems = items.filter((item) => {
        if (!item || !item.download_url)
          return false;
        return Boolean(filterAllowedLanguage(item.language));
      });
      validItems.sort((a, b) => {
        const aiDiff = (a.ai_transcribed ? 1 : 0) - (b.ai_transcribed ? 1 : 0);
        if (aiDiff !== 0)
          return aiDiff;
        return (a.hearing_impaired ? 1 : 0) - (b.hearing_impaired ? 1 : 0);
      });
      const limit = maxPerLang > 0 ? Math.min(maxPerLang, validItems.length) : validItems.length;
      const tracks = [];
      for (let i = 0; i < limit; i++) {
        const item = validItems[i];
        const suffixParts = [];
        if (item.hearing_impaired)
          suffixParts.push("SDH");
        if (item.ai_transcribed)
          suffixParts.push("AI");
        const suffix = suffixParts.length > 0 ? ` [${suffixParts.join(", ")}]` : "";
        const countLabel = limit > 1 && i > 0 ? ` #${i + 1}` : "";
        tracks.push({
          url: item.download_url,
          language: allowed.code,
          name: `${allowed.name}${countLabel}${suffix}`,
          headers: STREAM_HEADERS
        });
      }
      return tracks;
    } catch (e) {
      console.warn(`[Ghostflix] Gagal mengambil subtitle TSDB (${allowed.code}): ${e.message}`);
      return [];
    }
  });
}
function fetchTsdbSubtitles(tmdbId, isTv, season, episode, maxPerLang = 3) {
  return __async(this, null, function* () {
    const tmdbPath = isTv ? `tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}/episode/${encodeURIComponent(episode)}` : `movie/${encodeURIComponent(tmdbId)}`;
    const [idSubs, enSubs] = yield Promise.all([
      fetchTsdbByLang(tmdbPath, "id", maxPerLang),
      fetchTsdbByLang(tmdbPath, "en", maxPerLang)
    ]);
    return [...idSubs, ...enSubs];
  });
}
function filterStreamSubtitles(rawSubs) {
  if (!Array.isArray(rawSubs))
    return [];
  const results = [];
  for (let i = 0; i < rawSubs.length; i++) {
    const sub = rawSubs[i];
    if (!sub || !sub.url)
      continue;
    const allowed = filterAllowedLanguage(sub.lang || sub.language || sub.label);
    if (!allowed)
      continue;
    results.push({
      url: sub.url,
      language: allowed.code,
      name: allowed.name,
      headers: STREAM_HEADERS
    });
  }
  return results;
}
function mergeSubtitles(tsdbSubs = [], streamSubs = []) {
  const seenUrls = /* @__PURE__ */ new Set();
  const merged = [];
  for (const sub of [...tsdbSubs, ...streamSubs]) {
    if (!sub || !sub.url || seenUrls.has(sub.url))
      continue;
    const allowed = filterAllowedLanguage(sub.language || sub.name);
    if (!allowed)
      continue;
    seenUrls.add(sub.url);
    merged.push({
      url: sub.url,
      language: allowed.code,
      name: sub.name || allowed.name,
      headers: sub.headers || STREAM_HEADERS
    });
  }
  merged.sort((a, b) => {
    if (a.language === "id" && b.language !== "id")
      return -1;
    if (b.language === "id" && a.language !== "id")
      return 1;
    return 0;
  });
  return merged;
}

// src/ghostflix/extractor.js
function normalizeQuality(qualityStr, masterText) {
  if (qualityStr) {
    const q = String(qualityStr).trim().toLowerCase();
    if (q.indexOf("2160") !== -1 || q.indexOf("4k") !== -1 || q.indexOf("uhd") !== -1)
      return "4K";
    if (q.indexOf("1440") !== -1 || q.indexOf("2k") !== -1)
      return "1440p";
    if (q.indexOf("1080") !== -1 || q.indexOf("fhd") !== -1)
      return "1080p";
    if (q.indexOf("720") !== -1 || q.indexOf("hd") !== -1)
      return "720p";
    if (q.indexOf("480") !== -1 || q.indexOf("sd") !== -1)
      return "480p";
    if (q.indexOf("360") !== -1)
      return "360p";
  }
  if (masterText && typeof masterText === "string") {
    const resMatches = masterText.match(/RESOLUTION=\d+x(\d+)/gi) || [];
    let maxH = 0;
    for (let i = 0; i < resMatches.length; i++) {
      const h = parseInt(resMatches[i].split("x")[1], 10) || 0;
      if (h > maxH)
        maxH = h;
    }
    if (maxH >= 2160)
      return "4K";
    if (maxH >= 1440)
      return "1440p";
    if (maxH >= 1080)
      return "1080p";
    if (maxH >= 720)
      return "720p";
    if (maxH >= 480)
      return "480p";
    if (maxH >= 360)
      return "360p";
  }
  return "Auto";
}
function classifySourceLanguage(langStr) {
  if (!langStr)
    return { isPreferred: true, label: "" };
  const clean = String(langStr).trim();
  const lower = clean.toLowerCase();
  if (lower.indexOf("indonesian") !== -1 || lower === "id" || lower === "ind") {
    return { isPreferred: true, label: clean };
  }
  if (lower.indexOf("english") !== -1 || lower === "en" || lower === "eng") {
    return { isPreferred: true, label: clean };
  }
  return { isPreferred: false, label: clean };
}
function buildResolveUrl(tmdbId, isTv, season, episode, serverId) {
  const parts = [
    `type=${isTv ? "tv" : "movie"}`,
    `id=${encodeURIComponent(tmdbId)}`
  ];
  if (isTv) {
    parts.push(`season=${encodeURIComponent(season)}`);
    parts.push(`episode=${encodeURIComponent(episode)}`);
  }
  if (serverId) {
    parts.push(`only=${encodeURIComponent(serverId)}`);
  }
  return `${PLAYER_URL}/api/resolve?${parts.join("&")}`;
}
function resolveServer(tmdbId, isTv, season, episode, serverId = null) {
  return __async(this, null, function* () {
    const url = buildResolveUrl(tmdbId, isTv, season, episode, serverId);
    try {
      const res = yield fetch(url, { headers: PLAYER_HEADERS });
      if (!res.ok)
        return null;
      const data = yield res.json();
      const stream = data && data.stream;
      if (!stream || !Array.isArray(stream.sources) || stream.sources.length === 0) {
        return null;
      }
      return stream;
    } catch (e) {
      console.warn(`[Ghostflix] Error resolve (${serverId || "auto"}): ${e.message}`);
      return null;
    }
  });
}
function buildStreamsFromResolved(resolvedStream, centralSubtitles, includeAllLanguages = false) {
  if (!resolvedStream || !Array.isArray(resolvedStream.sources))
    return [];
  const serverId = resolvedStream.server || "auto";
  const serverName = SERVER_LABELS[serverId] || serverId;
  const serverSubs = filterStreamSubtitles(resolvedStream.subtitles);
  const mergedSubtitles = mergeSubtitles(centralSubtitles, serverSubs);
  const requestHeaders = resolvedStream.headers && typeof resolvedStream.headers === "object" ? __spreadValues(__spreadValues({}, STREAM_HEADERS), resolvedStream.headers) : STREAM_HEADERS;
  const results = [];
  const seenUrls = /* @__PURE__ */ new Set();
  for (let i = 0; i < resolvedStream.sources.length; i++) {
    const src = resolvedStream.sources[i];
    if (!src || !src.url || seenUrls.has(src.url))
      continue;
    const langInfo = classifySourceLanguage(src.language);
    if (!includeAllLanguages && !langInfo.isPreferred) {
      continue;
    }
    seenUrls.add(src.url);
    const quality = normalizeQuality(src.quality, src.master);
    const format = String(src.kind || "").toLowerCase() === "mp4" ? "mp4" : "m3u8";
    const langSuffix = langInfo.label ? ` - ${langInfo.label}` : "";
    const formatTag = format === "mp4" ? " [MP4]" : "";
    results.push({
      name: `${PROVIDER_NAME} | ${serverName} (${quality})`,
      title: `${PROVIDER_NAME} - ${serverName} (${quality}${langSuffix})${formatTag}`,
      url: src.url,
      quality,
      format,
      headers: requestHeaders,
      subtitles: mergedSubtitles
    });
  }
  return results;
}
function fetchAllStreams(_0, _1, _2, _3, _4) {
  return __async(this, arguments, function* (tmdbId, isTv, season, episode, centralSubtitles, options = {}) {
    const serverMode = options.serverMode || "all";
    const includeAllLanguages = Boolean(options.includeAllLanguages);
    let resolvedList = [];
    if (serverMode === "auto") {
      const [autoStream, orionStream, callistoStream] = yield Promise.all([
        resolveServer(tmdbId, isTv, season, episode, null),
        resolveServer(tmdbId, isTv, season, episode, "orion"),
        resolveServer(tmdbId, isTv, season, episode, "callisto")
      ]);
      resolvedList = [orionStream, callistoStream, autoStream];
    } else if (SERVER_LABELS[serverMode]) {
      const single = yield resolveServer(tmdbId, isTv, season, episode, serverMode);
      resolvedList = [single];
    } else {
      resolvedList = yield Promise.all(
        SERVERS.map((srv) => resolveServer(tmdbId, isTv, season, episode, srv.id))
      );
    }
    const seenServerIds = /* @__PURE__ */ new Set();
    const seenStreamUrls = /* @__PURE__ */ new Set();
    const allStreams = [];
    for (let i = 0; i < resolvedList.length; i++) {
      const item = resolvedList[i];
      if (!item)
        continue;
      if (item.server && seenServerIds.has(item.server)) {
        continue;
      }
      if (item.server) {
        seenServerIds.add(item.server);
      }
      const built = buildStreamsFromResolved(item, centralSubtitles, includeAllLanguages);
      for (let j = 0; j < built.length; j++) {
        const st = built[j];
        if (!st || !st.url || seenStreamUrls.has(st.url))
          continue;
        seenStreamUrls.add(st.url);
        allStreams.push(st);
      }
    }
    if (allStreams.length === 0 && !includeAllLanguages) {
      for (let i = 0; i < resolvedList.length; i++) {
        const item = resolvedList[i];
        if (!item)
          continue;
        const built = buildStreamsFromResolved(item, centralSubtitles, true);
        for (let j = 0; j < built.length; j++) {
          const st = built[j];
          if (!st || !st.url || seenStreamUrls.has(st.url))
            continue;
          seenStreamUrls.add(st.url);
          allStreams.push(st);
        }
      }
    }
    allStreams.sort((a, b) => {
      const wa = QUALITY_WEIGHTS[a.quality] || 0;
      const wb = QUALITY_WEIGHTS[b.quality] || 0;
      if (wb !== wa)
        return wb - wa;
      if (a.format === "m3u8" && b.format !== "m3u8")
        return -1;
      if (b.format === "m3u8" && a.format !== "m3u8")
        return 1;
      return 0;
    });
    return allStreams;
  });
}

// src/ghostflix/index.js
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Ghostflix Configuration" },
      {
        type: "select",
        key: "serverMode",
        label: "Mode Server",
        description: "Pilih server VidBolt yang akan digunakan (default: Semua Server).",
        options: [
          { label: "Semua Server (Orion, Callisto, Luna, Vega, Quantum, Quasar)", value: "all" },
          { label: "Otomatis (Orion + Callisto)", value: "auto" },
          { label: "Hanya Orion", value: "orion" },
          { label: "Hanya Callisto", value: "callisto" },
          { label: "Hanya Luna", value: "luna" },
          { label: "Hanya Vega", value: "vega" },
          { label: "Hanya Quantum", value: "quantum" },
          { label: "Hanya Quasar", value: "quasar" }
        ],
        defaultValue: "all"
      },
      {
        type: "select",
        key: "maxSubtitlesPerLanguage",
        label: "Maksimal Subtitle per Bahasa (ID & EN)",
        description: "Batas jumlah trek subtitle Indonesia & Inggris per episode/film.",
        options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3 (Default)", value: "3" },
          { label: "5", value: "5" },
          { label: "Semua", value: "0" }
        ],
        defaultValue: "3"
      },
      {
        type: "toggle",
        key: "includeAllSourceLanguages",
        label: "Tampilkan Semua Bahasa Audio/Hardsub",
        description: "Jika dimatikan, hanya menampilkan stream English, Indonesian, atau Original.",
        defaultValue: false
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
      console.warn("[Ghostflix] Invalid TMDB ID provided:", tmdbId);
      return [];
    }
    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const serverMode = settings.serverMode || "all";
    const maxSubVal = parseInt(settings.maxSubtitlesPerLanguage, 10);
    const maxPerLang = isNaN(maxSubVal) ? 3 : maxSubVal;
    const includeAllLanguages = settings.includeAllSourceLanguages === true || settings.includeAllSourceLanguages === "true";
    const label = isTv ? `tv/${cleanTmdb}/${cleanSeason}/${cleanEpisode}` : `movie/${cleanTmdb}`;
    console.log(`[Ghostflix] Fetching streams for: ${label}`);
    try {
      const centralSubtitles = yield fetchTsdbSubtitles(
        cleanTmdb,
        isTv,
        cleanSeason,
        cleanEpisode,
        maxPerLang
      );
      const streams = yield fetchAllStreams(
        cleanTmdb,
        isTv,
        cleanSeason,
        cleanEpisode,
        centralSubtitles,
        { serverMode, includeAllLanguages }
      );
      return streams;
    } catch (err) {
      console.error(`[Ghostflix] Error in getStreams: ${err.message}`);
      return [];
    }
  });
}
module.exports = { getStreams, onSettings };
