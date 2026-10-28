/**
 * movy - Built from src/movy/
 * Generated: 2026-10-28T05:04:45.951Z
 */
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

// src/movy/constants.js
var STREAM_API_URL = "https://api.wecollege.net";
var SUBTITLES_API_URL = "https://subtitles.vidy.st";
var TMDB_PROXY_URL = "https://db.wecollege.net/3";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "8476a7ab80ad76f0936744df0430e67c";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.movy.sx/",
  "Origin": "https://www.movy.sx",
  "Accept": "application/json, text/plain, */*"
};
var ALL_SERVERS = [
  { id: "miami", name: "Miami", note: "Original audio / 4K", lang: "en", group: "en" },
  { id: "boise", name: "Boise", note: "Original audio / 4K", lang: "en", group: "en" },
  { id: "vegas", name: "Vegas", note: "Original audio", lang: "en", group: "en" },
  { id: "chicago", name: "Chicago", note: "Original audio", lang: "en", group: "en" },
  { id: "reno", name: "Reno", note: "Original audio", lang: "en", group: "en" },
  { id: "oakland", name: "Oakland", note: "Original audio", lang: "en", group: "en" },
  { id: "seattle", name: "Seattle", note: "Original audio", lang: "en", group: "en" },
  { id: "phoenix", name: "Phoenix", note: "Original audio", lang: "en", group: "en" },
  { id: "atlanta", name: "Atlanta", note: "Original audio", lang: "en", group: "en" },
  { id: "portland", name: "Portland", note: "Original audio", lang: "en", group: "en" },
  { id: "austin", name: "Austin", note: "Original audio", lang: "en", group: "en", filter: (s) => s.quality === "English" },
  { id: "dallas", name: "Dallas", note: "Original audio", lang: "en", group: "en" },
  { id: "munich", name: "Munich", note: "German audio", lang: "de", group: "multi", extraParams: { language: "german" } },
  { id: "berlin", name: "Berlin", note: "German audio", lang: "de", group: "multi", altTitleKey: "titleGerman" },
  { id: "paris", name: "Paris", note: "French audio", lang: "fr", group: "multi" },
  { id: "delhi", name: "Delhi", note: "Hindi audio", lang: "hi", group: "multi", filter: (s) => s.quality === "Hindi" },
  { id: "cancun", name: "Cancun", note: "Spanish audio", lang: "es", group: "multi" }
];
var LANGUAGE_MAP = {
  english: "en",
  indonesian: "id",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  hindi: "hi",
  arabic: "ar",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  turkish: "tr",
  dutch: "nl",
  polish: "pl",
  vietnamese: "vi",
  thai: "th",
  greek: "el",
  bulgarian: "bg",
  croatian: "hr",
  czech: "cs",
  danish: "da",
  finnish: "fi",
  hebrew: "he",
  hungarian: "hu",
  norwegian: "no",
  persian: "fa",
  romanian: "ro",
  serbian: "sr",
  slovak: "sk",
  slovenian: "sl",
  swedish: "sv",
  ukrainian: "uk",
  malay: "ms",
  tagalog: "tl"
};

// src/movy/crypto.js
var D_CONSTANTS = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580
];
var MAGIC_HEADER = [109, 118, 109, 49];
function r(e) {
  return (e * (e + 1) & 1) === 0;
}
function o(e) {
  e >>>= 0;
  e ^= e >>> 16;
  e = Math.imul(e, 2246822507) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 3266489909) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}
function u(e, a) {
  e >>>= 0;
  if ((a &= 31) === 0)
    return e >>> 0;
  return (e << a | e >>> 32 - a) >>> 0;
}
function base64ToBytes(b64) {
  if (!b64)
    return new Uint8Array(0);
  let clean = String(b64).replace(/-/g, "+").replace(/_/g, "/");
  while (clean.length % 4 !== 0) {
    clean += "=";
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(clean, "base64"));
  }
  if (typeof atob !== "undefined") {
    const bin = atob(clean);
    const bytes2 = new Uint8Array(bin.length);
    for (let j2 = 0; j2 < bin.length; j2++) {
      bytes2[j2] = bin.charCodeAt(j2);
    }
    return bytes2;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let k = 0; k < chars.length; k++) {
    lookup[chars.charCodeAt(k)] = k;
  }
  const len = clean.length;
  const placeHolders = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array(len * 3 / 4 - placeHolders);
  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    bytes[j++] = a << 2 | b >> 4;
    if (j < bytes.length)
      bytes[j++] = (b & 15) << 4 | c >> 2;
    if (j < bytes.length)
      bytes[j++] = (c & 3) << 6 | d & 63;
  }
  return bytes;
}
function decodeUtf8(bytes) {
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) {
    }
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("utf8");
  }
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
}
function getKeyStream(seedStr, tLen, sLen) {
  const n = function(seedStr2, tLen2) {
    let t;
    if (((t = seedStr2.length) * (t + 1) & 1) === 1) {
      return {
        S: function(str) {
          const arr = Array(256);
          for (let k = 0; k < 256; k++)
            arr[k] = k;
          let t2 = 0;
          for (let n2 = 0; n2 < 256; n2++) {
            t2 = t2 + arr[n2] + str.charCodeAt(n2 % str.length) & 255;
            const temp = arr[n2];
            arr[n2] = arr[t2];
            arr[t2] = temp;
          }
          return arr;
        }(seedStr2),
        acc: function(str) {
          let acc = 1732584193;
          for (let k = 0; k < str.length; k++) {
            acc = u((acc ^ Math.imul(str.charCodeAt(k), D_CONSTANTS[15 & k])) >>> 0, 5);
          }
          return o(acc);
        }(seedStr2)
      };
    }
    const arr61 = Array(61);
    let sHash = o(
      function(str) {
        let h = 2166136261;
        for (let k = 0; k < str.length; k++) {
          h = Math.imul(h ^ str.charCodeAt(k), 16777619) >>> 0;
        }
        return o(h);
      }(seedStr2) ^ o(tLen2 >>> 0 ^ 2654435769)
    ) >>> 0;
    for (let k = 0; k < 8; k++) {
      if (r(k)) {
        const aIdx = sHash % 61;
        sHash = u(sHash + 2654435769 >>> 0, 7 + (7 & k));
        arr61[aIdx] = (sHash ^ o(sHash)) >>> 0;
        sHash = o(sHash + aIdx >>> 0);
      } else {
        arr61[k] = D_CONSTANTS[15 & k];
      }
    }
    return {
      S: arr61,
      acc: o(2779096485 ^ sHash) >>> 0
    };
  }(seedStr, tLen);
  const keyBytes = new Uint8Array(sLen);
  let lCounter = 0;
  for (let e = 0; e < sLen; ) {
    const aVal = function(ctx, counter) {
      const S = ctx.S;
      let acc = ctx.acc;
      const dIdx = acc % 61;
      const iFlag = 0 - Number(dIdx in S);
      const rVal = S[dIdx] >>> 0;
      const cVal = Math.imul(2654435769, counter + 1) >>> 0;
      const tVal = acc;
      const nVal = (rVal ^ cVal) >>> 0;
      const bVal = ((tVal ^ nVal) >>> 0 | (tVal & nVal & iFlag) >>> 0) >>> 0;
      acc = o(
        ((u(bVal + acc >>> 0, 31 & dIdx) ^ u(acc, 31 & Math.imul(dIdx, 7))) >>> 0) + 2654435769 >>> 0
      );
      S[dIdx] = acc >>> 0;
      ctx.acc = acc;
      return acc >>> 0;
    }(n, lCounter++);
    keyBytes[e++] = 255 & aVal;
    if (e < sLen)
      keyBytes[e++] = aVal >>> 8 & 255;
    if (e < sLen)
      keyBytes[e++] = aVal >>> 16 & 255;
    if (e < sLen)
      keyBytes[e++] = aVal >>> 24 & 255;
  }
  return keyBytes;
}
function decodePayload(payload, seed, tmdbId) {
  if (!payload || typeof payload !== "string") {
    throw new Error("Invalid payload: string expected");
  }
  const s = base64ToBytes(payload);
  const numId = Number(tmdbId) || 0;
  const lKey = getKeyStream(seed, numId, s.length);
  for (let k = 0; k < s.length; k++) {
    s[k] ^= lKey[k];
  }
  for (let k = 0; k < MAGIC_HEADER.length; k++) {
    if (s[k] !== MAGIC_HEADER[k]) {
      throw new Error("decrypt failed: bad seed or tampered payload");
    }
  }
  const plain = s.subarray(MAGIC_HEADER.length);
  return decodeUtf8(plain);
}
var seedCache = /* @__PURE__ */ new Map();
var pendingSeedPromises = /* @__PURE__ */ new Map();
function fetchSeed(mediaId, force = false) {
  return __async(this, null, function* () {
    const cleanId = String(mediaId || "");
    const now = Date.now();
    const cached = seedCache.get(cleanId);
    if (!force && cached && cached.expiresAt > now) {
      return cached.seed;
    }
    if (!force && pendingSeedPromises.has(cleanId)) {
      return yield pendingSeedPromises.get(cleanId);
    }
    const promise = (() => __async(this, null, function* () {
      try {
        const url = `${STREAM_API_URL}/seed?mediaId=${encodeURIComponent(cleanId)}`;
        const res = yield fetch(url, { headers: HEADERS });
        if (!res.ok) {
          throw new Error(`Failed to fetch seed: HTTP ${res.status}`);
        }
        const data = yield res.json();
        const seed = data.seed;
        const ttl = (Number(data.ttlMs) || 3e4) - 5e3;
        seedCache.set(cleanId, {
          seed,
          expiresAt: Date.now() + Math.max(ttl, 1e4)
        });
        return seed;
      } finally {
        pendingSeedPromises.delete(cleanId);
      }
    }))();
    pendingSeedPromises.set(cleanId, promise);
    return yield promise;
  });
}
function fetchServerSources(serverId, params, tmdbId, existingSeed = null) {
  return __async(this, null, function* () {
    let seed = existingSeed || (yield fetchSeed(tmdbId));
    const queryParams = new URLSearchParams();
    for (const key of Object.keys(params)) {
      if (params[key] !== void 0 && params[key] !== null) {
        queryParams.set(key, String(params[key]));
      }
    }
    queryParams.set("enc", "2");
    queryParams.set("seed", seed);
    const url = `${STREAM_API_URL}/${serverId}/sources?${queryParams.toString()}`;
    let res = yield fetch(url, { headers: HEADERS });
    if (res.status === 401) {
      seedCache.delete(String(tmdbId));
      seed = yield fetchSeed(tmdbId, true);
      queryParams.set("seed", seed);
      const retryUrl = `${STREAM_API_URL}/${serverId}/sources?${queryParams.toString()}`;
      res = yield fetch(retryUrl, { headers: HEADERS });
    }
    if (!res.ok) {
      return null;
    }
    const rawPayload = yield res.text();
    const decryptedJson = decodePayload(rawPayload, seed, tmdbId);
    return JSON.parse(decryptedJson);
  });
}

// src/movy/subtitles.js
function resolveLanguageCode(langStr) {
  if (!langStr)
    return "en";
  const clean = String(langStr).trim().toLowerCase();
  if (LANGUAGE_MAP[clean]) {
    return LANGUAGE_MAP[clean];
  }
  if (clean.length === 2 || clean.length === 3) {
    return clean;
  }
  for (const [name, code] of Object.entries(LANGUAGE_MAP)) {
    if (clean.includes(name) || name.includes(clean)) {
      return code;
    }
  }
  return "en";
}
function fetchCentralSubtitles(tmdbId, isTv, season, episode, maxPerLang = 3) {
  return __async(this, null, function* () {
    try {
      let url = `${SUBTITLES_API_URL}/search?id=${encodeURIComponent(tmdbId)}`;
      if (isTv) {
        url += `&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
      }
      const res = yield fetch(url, { headers: HEADERS });
      if (!res.ok)
        return [];
      const list = yield res.json();
      if (!Array.isArray(list))
        return [];
      const languageCounts = {};
      const results = [];
      for (const item of list) {
        if (!item || !item.url)
          continue;
        const langCode = resolveLanguageCode(item.language || item.display);
        const currentCount = languageCounts[langCode] || 0;
        if (maxPerLang > 0 && currentCount >= maxPerLang) {
          continue;
        }
        let displayName = item.display || item.language || "Subtitle";
        if (item.isHearingImpaired) {
          displayName += " [CC]";
        }
        results.push({
          url: item.url,
          language: langCode,
          name: displayName,
          headers: {
            "Referer": "https://www.movy.sx/",
            "User-Agent": HEADERS["User-Agent"]
          }
        });
        languageCounts[langCode] = currentCount + 1;
      }
      return results;
    } catch (e) {
      console.warn("[Movy] Failed to fetch central subtitles:", e.message);
      return [];
    }
  });
}
function formatServerSubtitles(rawSubs) {
  if (!Array.isArray(rawSubs))
    return [];
  const results = [];
  for (const sub of rawSubs) {
    if (!sub || !sub.url)
      continue;
    const langName = sub.language || sub.lang || "Unknown";
    const langCode = resolveLanguageCode(langName);
    results.push({
      url: sub.url,
      language: langCode,
      name: langName,
      headers: {
        "Referer": "https://www.movy.sx/",
        "User-Agent": HEADERS["User-Agent"]
      }
    });
  }
  return results;
}
function mergeSubtitles(centralSubs = [], serverSubs = []) {
  const seenUrls = /* @__PURE__ */ new Set();
  const merged = [];
  for (const s of serverSubs) {
    if (s && s.url && !seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      merged.push(s);
    }
  }
  for (const s of centralSubs) {
    if (s && s.url && !seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      merged.push(s);
    }
  }
  return merged;
}

// src/movy/utils.js
function getTmdbDetails(tmdbId, mediaType = "movie") {
  return __async(this, null, function* () {
    var _a, _b;
    const isTv = mediaType === "tv" || mediaType === "series";
    const type = isTv ? "tv" : "movie";
    try {
      const proxyUrl = `${TMDB_PROXY_URL}/${type}/${encodeURIComponent(tmdbId)}?append_to_response=external_ids`;
      const res = yield fetch(proxyUrl, { headers: HEADERS });
      if (res.ok) {
        const data = yield res.json();
        const title = data.title || data.name || "";
        const originalTitle = data.original_title || data.original_name || "";
        const dateStr = data.release_date || data.first_air_date || "";
        const year = dateStr.slice(0, 4) || "";
        const imdbId = ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || data.imdb_id || "";
        const totalSeasons = Number(data.number_of_seasons) || 1;
        return {
          title,
          originalTitle,
          year,
          imdbId,
          totalSeasons,
          titleGerman: title,
          titleSpanish: title,
          titleFrench: title
        };
      }
    } catch (e) {
    }
    try {
      const tmdbUrl = `${TMDB_BASE_URL}/${type}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield fetch(tmdbUrl, { headers: HEADERS });
      if (res.ok) {
        const data = yield res.json();
        const title = data.title || data.name || "";
        const originalTitle = data.original_title || data.original_name || "";
        const dateStr = data.release_date || data.first_air_date || "";
        const year = dateStr.slice(0, 4) || "";
        const imdbId = ((_b = data.external_ids) == null ? void 0 : _b.imdb_id) || data.imdb_id || "";
        const totalSeasons = Number(data.number_of_seasons) || 1;
        return {
          title,
          originalTitle,
          year,
          imdbId,
          totalSeasons,
          titleGerman: title,
          titleSpanish: title,
          titleFrench: title
        };
      }
    } catch (e) {
    }
    return null;
  });
}
function normalizeQuality(rawQuality) {
  const str = String(rawQuality || "").toLowerCase().trim();
  if (str.includes("2160") || str.includes("4k"))
    return "4K";
  if (str.includes("1440") || str.includes("2k"))
    return "1440p";
  if (str.includes("1080") || str.includes("fhd"))
    return "1080p";
  if (str.includes("720") || str.includes("hd"))
    return "720p";
  if (str.includes("480") || str.includes("sd"))
    return "480p";
  if (str.includes("360"))
    return "360p";
  return "Auto";
}
function qualityLabel(q) {
  const badge = normalizeQuality(q);
  if (badge === "4K")
    return "4K (2160p)";
  if (badge === "Auto")
    return "Auto (Adaptive)";
  return badge;
}
function streamLabel(serverName, label) {
  return `Movy - ${serverName} - ${label}`;
}

// src/movy/index.js
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Movy Configuration" },
      {
        type: "select",
        key: "serverGroup",
        label: "Server Filter",
        description: "Choose which server regions to query (default: All servers).",
        options: [
          { label: "All Servers (17 servers)", value: "all" },
          { label: "English / Original Audio Only (12 servers)", value: "en" },
          { label: "International Dubbed Audio (DE, FR, HI, ES)", value: "multi" }
        ],
        defaultValue: "all"
      },
      {
        type: "select",
        key: "maxSubtitlesPerLanguage",
        label: "Max subtitles per language",
        description: "Maximum subtitle tracks to keep per language (default: 3).",
        options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "5", value: "5" },
          { label: "All", value: "0" }
        ],
        defaultValue: "3"
      }
    ];
  });
}
var QUALITY_WEIGHTS = {
  "4K": 100,
  "1440p": 80,
  "1080p": 60,
  "720p": 40,
  "480p": 20,
  "360p": 10,
  "Auto": 50
};
var BATCH_SIZE = 4;
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
      console.warn("[Movy] Invalid TMDB ID provided:", tmdbId);
      return [];
    }
    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;
    console.log(`[Movy] Fetching streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const serverGroup = settings.serverGroup || "all";
    let maxSubsPerLang = 3;
    if (settings.maxSubtitlesPerLanguage !== void 0) {
      const parsed = Number(settings.maxSubtitlesPerLanguage);
      if (!isNaN(parsed) && parsed >= 0)
        maxSubsPerLang = parsed;
    }
    const [tmdbInfo, centralSubs, sharedSeed] = yield Promise.all([
      getTmdbDetails(cleanTmdb, cleanMediaType),
      fetchCentralSubtitles(cleanTmdb, isTv, cleanSeason, cleanEpisode, maxSubsPerLang),
      fetchSeed(cleanTmdb).catch(() => null)
    ]);
    const titleEnglish = (tmdbInfo == null ? void 0 : tmdbInfo.title) || "";
    const titleOriginal = (tmdbInfo == null ? void 0 : tmdbInfo.originalTitle) || "";
    const year = (tmdbInfo == null ? void 0 : tmdbInfo.year) || "";
    const imdbId = (tmdbInfo == null ? void 0 : tmdbInfo.imdbId) || "";
    const totalSeasons = (tmdbInfo == null ? void 0 : tmdbInfo.totalSeasons) || 1;
    const targetServers = ALL_SERVERS.filter((srv) => {
      if (serverGroup === "all")
        return true;
      return srv.group === serverGroup;
    });
    console.log(`[Movy] Querying ${targetServers.length} servers in batches of ${BATCH_SIZE} for "${titleEnglish}" (${year})`);
    const allStreams = [];
    for (let i = 0; i < targetServers.length; i += BATCH_SIZE) {
      const batch = targetServers.slice(i, i + BATCH_SIZE);
      const settled = yield Promise.allSettled(batch.map((server) => __async(this, null, function* () {
        try {
          const params = {
            title: encodeURIComponent(titleEnglish),
            mediaType: isTv ? "tv" : "movie",
            year,
            totalSeasons,
            episodeId: cleanEpisode,
            seasonId: cleanSeason,
            tmdbId: cleanTmdb,
            imdbId
          };
          if (server.id === "chicago") {
            const altTitle = titleOriginal && titleOriginal !== titleEnglish ? titleOriginal : void 0;
            if (altTitle)
              params.altTitle = encodeURIComponent(altTitle);
          } else if (server.id === "berlin") {
            const altTitle = (tmdbInfo == null ? void 0 : tmdbInfo.titleGerman) || titleEnglish;
            if (altTitle)
              params.altTitle = encodeURIComponent(altTitle);
          }
          if (server.extraParams) {
            Object.assign(params, server.extraParams);
          }
          const data = yield fetchServerSources(server.id, params, cleanTmdb, sharedSeed);
          if (!data || !Array.isArray(data.sources) || data.sources.length === 0) {
            return [];
          }
          let validSources = data.sources.filter((s2) => s2 && s2.url);
          if (server.filter) {
            validSources = validSources.filter(server.filter);
          }
          if (validSources.length === 0) {
            return [];
          }
          const serverSubs = formatServerSubtitles(data.subtitles);
          const combinedSubtitles = mergeSubtitles(centralSubs, serverSubs);
          const streamResults = [];
          for (const src of validSources) {
            const qBadge = normalizeQuality(src.quality);
            const qText = qualityLabel(src.quality);
            const label = streamLabel(server.name, qText);
            streamResults.push({
              name: label,
              title: label,
              url: src.url,
              quality: qBadge,
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://www.movy.sx/",
                "Origin": "https://www.movy.sx"
              },
              subtitles: combinedSubtitles
            });
          }
          return streamResults;
        } catch (e) {
          console.warn(`[Movy] Server ${server.name} error:`, e.message);
          return [];
        }
      })));
      for (const res of settled) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          allStreams.push(...res.value);
        }
      }
    }
    allStreams.sort((a, b) => {
      const wa = QUALITY_WEIGHTS[a.quality] || 0;
      const wb = QUALITY_WEIGHTS[b.quality] || 0;
      return wb - wa;
    });
    console.log(`[Movy] Successfully found ${allStreams.length} stream(s) across servers`);
    return allStreams;
  });
}
module.exports = { getStreams, onSettings };
