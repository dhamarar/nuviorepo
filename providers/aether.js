/**
 * aether - Built from src/aether/
 * Generated: 2026-09-21T07:29:45.454Z
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

// src/aether/constants.js
var PROVIDER_NAME = "Aether";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TMDB_BASE = "https://api.themoviedb.org/3";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
var FEM_ENDPOINTS = [
  { api: "https://fembox.aether.cx", site: "https://aether.st" },
  { api: "https://fembox.aether.cx", site: "https://aether.ist" },
  { api: "https://fembox.aether.mom", site: "https://aether.mom" }
];
var SPANISH_HOSTS = ["https://le.aether.cx"];
var SPANISH_LANGS = {
  sub: "Subtitled (ES)",
  esp: "Castellano",
  lat: "Latino"
};
var QUALITY_LABELS = {
  ORG: "ORG",
  "4K": "4K",
  "1080P": "1080p",
  "720P": "720p",
  "480P": "480p",
  "360P": "360p"
};
var QUALITY_RANK = {
  "4K": 6,
  ORG: 5,
  "1080p": 4,
  "720p": 3,
  "480p": 2,
  "360p": 1,
  Auto: 0
};
var REGION_MAP = {
  "new-york": "USA7",
  dallas: "USA5",
  kansas: "USA5",
  portland: "USA6",
  paris: "FR1",
  london: "UK1",
  "hong-kong": "HK1",
  singapore: "HK1",
  sydney: "AU1",
  mumbai: "IN1"
};
var REGION_HOST_SUFFIX = ".shegu.net";
var LANGUAGE_CODES = {
  english: "en",
  arabic: "ar",
  bosnian: "bs",
  bulgarian: "bg",
  croatian: "hr",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  german: "de",
  greek: "el",
  hebrew: "he",
  hindi: "hi",
  hungarian: "hu",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko",
  malay: "ms",
  norwegian: "no",
  persian: "fa",
  polish: "pl",
  portuguese: "pt",
  "portuguese (br)": "pt-br",
  protuguese: "pt",
  romanian: "ro",
  russian: "ru",
  serbian: "sr",
  slovene: "sl",
  slovenian: "sl",
  spanish: "es",
  swedish: "sv",
  tagalog: "tl",
  thai: "th",
  turkish: "tr",
  ukrainian: "uk",
  vietnamese: "vi",
  chinese: "zh",
  "chinese (simplified)": "zh",
  "chinese (traditional)": "zh-tw"
};
var LANGUAGE_NAMES = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  "pt-br": "Portuguese (BR)",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  id: "Indonesian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  "zh-tw": "Chinese (Traditional)",
  th: "Thai",
  tr: "Turkish",
  vi: "Vietnamese"
};

// src/aether/utils.js
function fetchJson(url, headers, timeoutMs = 15e3) {
  return __async(this, null, function* () {
    let timer = null;
    try {
      const response = yield Promise.race([
        fetch(url, { headers }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
        })
      ]);
      const text = yield response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        data = null;
      }
      return { ok: response.ok, status: response.status, data, text };
    } catch (error) {
      return { ok: false, status: 0, data: null, text: "", error: error.message };
    } finally {
      if (timer)
        clearTimeout(timer);
    }
  });
}
function fetchFinalUrl(url, headers, timeoutMs = 15e3) {
  return __async(this, null, function* () {
    let timer = null;
    try {
      const response = yield Promise.race([
        fetch(url, { method: "GET", redirect: "follow", headers }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
        })
      ]);
      const finalUrl = response.url || url;
      return { ok: response.ok, status: response.status, url: finalUrl };
    } catch (error) {
      return { ok: false, status: 0, url, error: error.message };
    } finally {
      if (timer)
        clearTimeout(timer);
    }
  });
}
function buildFemHeaders(site) {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": site,
    "Referer": site + "/",
    "User-Agent": USER_AGENT
  };
}
function buildPlaybackHeaders() {
  return { "User-Agent": USER_AGENT };
}
function buildTokenFreeHeaders(site) {
  const origin = site || "https://aether.st";
  return {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": origin,
    "Referer": origin + "/",
    "User-Agent": USER_AGENT
  };
}
function languageNameToCode(name) {
  if (!name)
    return null;
  const key = String(name).trim().toLowerCase();
  return LANGUAGE_CODES[key] || null;
}
function languageDisplayName(code, original) {
  return LANGUAGE_NAMES[code] || original || code;
}
function normalizeQuality(label) {
  if (!label)
    return "Auto";
  const key = String(label).trim().toUpperCase();
  return QUALITY_LABELS[key] || String(label).trim();
}
function rewriteRegionHost(url, regionCode) {
  if (!url || !regionCode)
    return url;
  try {
    const parsed = new URL(url);
    parsed.hostname = regionCode + REGION_HOST_SUFFIX;
    return parsed.toString();
  } catch (error) {
    return url;
  }
}
function getTmdbMeta(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return fetchJson(url, { "User-Agent": USER_AGENT }, 12e3).then((result) => {
    const data = result.data || {};
    const releaseDate = data.release_date || data.first_air_date || "";
    return {
      name: data.title || data.name || null,
      year: releaseDate ? releaseDate.split("-")[0] : "",
      duration: data.runtime ? `${data.runtime} min` : ""
    };
  }).catch(() => ({ name: null, year: "", duration: "" }));
}
function getEpisodeMeta(tmdbId, season, episode) {
  if (!tmdbId || !season || !episode)
    return Promise.resolve(null);
  const url = `${TMDB_BASE}/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
  return fetchJson(url, { "User-Agent": USER_AGENT }, 12e3).then((result) => {
    const data = result.data || {};
    return {
      name: data.name || null,
      duration: data.runtime ? `${data.runtime} min` : ""
    };
  }).catch(() => null);
}
function buildStreamTitle(meta, epMeta, quality, format, season, episode, region) {
  const name = meta && meta.name || "Unknown";
  let line1;
  if (season && episode) {
    line1 = `\u{1F37F} ${name} S${season}E${episode}`;
    if (epMeta && epMeta.name)
      line1 += ` - ${epMeta.name}`;
  } else {
    line1 = `\u{1F37F} ${name}`;
    if (meta && meta.year)
      line1 += ` (${meta.year})`;
  }
  const line2 = `\u26A1 ${quality} | \u{1F4E6} ${format} | \u{1F300} Aether`;
  const duration = epMeta && epMeta.duration || meta && meta.duration || "";
  const parts = [];
  if (duration)
    parts.push(`\u23F1 ${duration}`);
  if (region)
    parts.push(`\u{1F30D} ${region}`);
  const line3 = parts.length ? parts.join(" | ") : "";
  return line3 ? `${line1}
${line2}
${line3}` : `${line1}
${line2}`;
}
function dedupeSubtitles(tracks) {
  const seen = {};
  const out = [];
  (tracks || []).forEach((track) => {
    if (!track || !track.url)
      return;
    const key = `${track.language || "und"}|${track.url}`;
    if (seen[key])
      return;
    seen[key] = true;
    out.push(track);
  });
  return out;
}

// src/aether/femapi.js
var FemError = class extends Error {
  constructor(reason, message, attempts) {
    super(message);
    this.name = "FemError";
    this.reason = reason;
    this.attempts = attempts || [];
  }
};
function moviePaths(tmdbId) {
  return [`/movie/${tmdbId}`];
}
function tvPaths(tmdbId, season, episode) {
  return [`/tv/${tmdbId}/${season}/${episode}`, `/tv/${tmdbId}-${season}-${episode}`];
}
function movieHlsPaths(tmdbId) {
  return [`/hls/movie/${tmdbId}`];
}
function tvHlsPaths(tmdbId, season, episode) {
  return [`/hls/tv/${tmdbId}/${season}/${episode}`, `/hls/tv/${tmdbId}-${season}-${episode}`];
}
function classify(result) {
  const body = result.data || {};
  const message = String(body.error || body.message || "");
  if (result.status === 0)
    return "network";
  if (/ui=token is required|token is required|missing ui/i.test(message))
    return "no-token";
  if (/invalid token|expired|unauthor|not logged in|please login/i.test(message))
    return "bad-token";
  if (result.status === 401)
    return "bad-token";
  if (result.status === 403)
    return "forbidden";
  if (/stream not found|no stream|not available/i.test(message))
    return "no-stream";
  if (result.status === 404 || /^not found$/i.test(message.trim()))
    return "not-found";
  return "unknown";
}
var FATAL_REASONS = ["no-token", "bad-token"];
function requestFem(paths, token) {
  return __async(this, null, function* () {
    const attempts = [];
    for (const endpoint of FEM_ENDPOINTS) {
      for (const path of paths) {
        const url = `${endpoint.api}${path}?ui=${encodeURIComponent(token)}`;
        const result = yield fetchJson(url, buildFemHeaders(endpoint.site));
        const reason = classify(result);
        if (result.ok && result.data && !result.data.error) {
          return { data: result.data, endpoint, url };
        }
        attempts.push(`${endpoint.api}${path} -> ${reason} (HTTP ${result.status})`);
        if (FATAL_REASONS.indexOf(reason) !== -1) {
          throw new FemError(reason, `FEM API rejected the request: ${reason}`, attempts);
        }
      }
    }
    const onlyNotFound = attempts.length > 0 && attempts.every((entry) => entry.indexOf("-> not-found") !== -1);
    if (onlyNotFound) {
      throw new FemError("not-found", "Title is not available in the FebBox catalogue", attempts);
    }
    throw new FemError("unreachable", "No Aether FEM API mirror responded", attempts);
  });
}
function fetchMp4Payload(tmdbId, mediaType, season, episode, token) {
  return __async(this, null, function* () {
    const paths = mediaType === "tv" ? tvPaths(tmdbId, season, episode) : moviePaths(tmdbId);
    const result = yield requestFem(paths, token);
    const sources = Array.isArray(result.data.sources) ? result.data.sources : [];
    if (sources.length === 0) {
      throw new FemError("no-stream", "FEM API returned no MP4 sources", result.url);
    }
    return {
      sources,
      subtitles: Array.isArray(result.data.subtitles) ? result.data.subtitles : [],
      endpoint: result.endpoint
    };
  });
}
function fetchHlsPayload(tmdbId, mediaType, season, episode, token) {
  return __async(this, null, function* () {
    const paths = mediaType === "tv" ? tvHlsPaths(tmdbId, season, episode) : movieHlsPaths(tmdbId);
    const result = yield requestFem(paths, token);
    if (!result.data.hls) {
      throw new FemError("no-stream", "FEM API returned no HLS playlist", result.url);
    }
    return {
      hls: result.data.hls,
      subtitles: Array.isArray(result.data.subtitles) ? result.data.subtitles : [],
      endpoint: result.endpoint
    };
  });
}
function checkToken(token) {
  return __async(this, null, function* () {
    const attempts = [];
    for (const endpoint of FEM_ENDPOINTS) {
      const url = `${endpoint.api}/quota?ui=${encodeURIComponent(token)}`;
      const result = yield fetchJson(url, buildFemHeaders(endpoint.site));
      if (result.status === 0) {
        attempts.push(`${endpoint.api} -> network`);
        continue;
      }
      if (result.data && result.data.success === true) {
        return { valid: true, quota: result.data.quota || null };
      }
      const raw = result.data && result.data.raw_data || {};
      const message = `${result.data && result.data.error || ""} ${raw.msg || ""}`;
      attempts.push(`${endpoint.api} -> ${result.status} ${message.trim()}`);
      if (/login|invalid|expired|unauthor/i.test(message)) {
        return { valid: false, reason: "bad-token", attempts };
      }
      return { valid: false, reason: "unknown", attempts };
    }
    return { valid: false, reason: "unreachable", attempts };
  });
}

// src/aether/spanish.js
function fetchSpanishPlaylist(tmdbId, mediaType, season, episode, lang) {
  return __async(this, null, function* () {
    const path = mediaType === "tv" ? `/tv/${tmdbId}/${season}/${episode}` : `/movie/${tmdbId}`;
    const attempts = [];
    for (const host of SPANISH_HOSTS) {
      const url = `${host}${path}?lang=${encodeURIComponent(lang)}`;
      const result = yield fetchFinalUrl(url, buildTokenFreeHeaders("https://aether.st"));
      if (result.ok && result.url) {
        return { url: result.url, host, requested: url, label: SPANISH_LANGS[lang] || lang };
      }
      const detail = result.error ? `${result.error}` : `HTTP ${result.status}`;
      attempts.push(`${host} -> ${detail}`);
    }
    const error = new Error(`Aether token-free source unavailable (${attempts.join("; ")})`);
    error.attempts = attempts;
    throw error;
  });
}

// src/aether/index.js
function readSettings() {
  const settings = globalThis.SCRAPER_SETTINGS || {};
  const token = String(settings.febboxToken || "").trim();
  const regionKey = String(settings.region || "").trim();
  const spanishLang = SPANISH_LANGS[settings.spanishLang] ? settings.spanishLang : "sub";
  return {
    token,
    regionKey,
    regionCode: REGION_MAP[regionKey] || "",
    preferHls: settings.preferHls === true,
    spanishLang,
    // Default on: this is the only source that works before a token is set.
    enableSpanish: settings.enableSpanish !== false
  };
}
function mapSubtitles(rawTracks, headers) {
  const mapped = (rawTracks || []).filter((track) => track && track.url).map((track) => {
    const code = languageNameToCode(track.language) || "und";
    return {
      url: track.url,
      language: code,
      name: languageDisplayName(code, track.language),
      headers
    };
  });
  return dedupeSubtitles(mapped);
}
function buildMp4Streams(payload, meta, epMeta, season, episode, regionCode, headers) {
  const subtitles = mapSubtitles(payload.subtitles, headers);
  const streams = payload.sources.filter((source) => source && source.url).map((source) => {
    const quality = normalizeQuality(source.quality);
    const title = buildStreamTitle(meta, epMeta, quality, "MP4", season, episode, regionCode);
    return {
      name: `${PROVIDER_NAME} | ${quality}`,
      title,
      size: title,
      description: title,
      url: rewriteRegionHost(source.url, regionCode),
      quality,
      format: "mp4",
      headers,
      subtitles,
      provider: "aether"
    };
  });
  streams.sort((a, b) => (QUALITY_RANK[b.quality] || 0) - (QUALITY_RANK[a.quality] || 0));
  return streams;
}
function buildHlsStream(payload, meta, epMeta, season, episode, regionCode, headers) {
  const subtitles = mapSubtitles(payload.subtitles, headers);
  const quality = "Auto";
  const title = buildStreamTitle(meta, epMeta, quality, "HLS", season, episode, regionCode);
  return {
    name: `${PROVIDER_NAME} | HLS`,
    title,
    size: title,
    description: title,
    url: rewriteRegionHost(payload.hls, regionCode),
    quality,
    format: "m3u8",
    headers,
    subtitles,
    provider: "aether"
  };
}
function buildSpanishStream(playlist, meta, epMeta, season, episode, headers) {
  const label = playlist.label || "ES";
  const title = `${buildStreamTitle(meta, epMeta, label, "HLS", season, episode, "")}
\u{1F513} Token-free source`;
  return {
    name: `${PROVIDER_NAME} | ${label}`,
    title,
    size: title,
    description: title,
    url: playlist.url,
    quality: "Auto",
    format: "m3u8",
    headers,
    subtitles: [],
    provider: "aether"
  };
}
function logFailure(kind, error) {
  if (error instanceof FemError) {
    console.log(`[Aether] FEM ${kind} unavailable (${error.reason}): ${error.message}`);
    if (error.reason === "bad-token") {
      console.log("[Aether] The FebBox token looks invalid or expired \u2014 re-copy the `ui` cookie from febbox.com.");
    } else if (error.reason === "not-found") {
      console.log("[Aether] Title is not in the FebBox catalogue, so FEM has nothing to return.");
    }
    return;
  }
  console.log(`[Aether] FEM ${kind} failed: ${error.message}`);
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const { token, regionCode, preferHls, spanishLang, enableSpanish } = readSettings();
    const headers = buildPlaybackHeaders();
    const metadata = yield Promise.all([
      getTmdbMeta(tmdbId, mediaType),
      mediaType === "tv" ? getEpisodeMeta(tmdbId, season, episode) : Promise.resolve(null)
    ]);
    const meta = metadata[0];
    const epMeta = metadata[1];
    const mp4Streams = [];
    const hlsStreams = [];
    const tokenFreeStreams = [];
    if (token) {
      try {
        const mp4 = yield fetchMp4Payload(tmdbId, mediaType, season, episode, token);
        const built = buildMp4Streams(mp4, meta, epMeta, season, episode, regionCode, headers);
        mp4Streams.push(...built);
        console.log(`[Aether] FEM MP4 via ${mp4.endpoint.api}: ${built.length} stream(s)`);
      } catch (error) {
        logFailure("MP4", error);
      }
      try {
        const hls = yield fetchHlsPayload(tmdbId, mediaType, season, episode, token);
        hlsStreams.push(buildHlsStream(hls, meta, epMeta, season, episode, regionCode, headers));
        console.log(`[Aether] FEM HLS via ${hls.endpoint.api}: ok`);
      } catch (error) {
        logFailure("HLS", error);
      }
    } else {
      console.log("[Aether] No FebBox token set, so the FEM API is skipped.");
      console.log("[Aether] Add one under Aether settings for 4K/1080p MP4 + HLS (free febbox.com account, 100 GB/month).");
    }
    if (enableSpanish) {
      try {
        const playlist = yield fetchSpanishPlaylist(tmdbId, mediaType, season, episode, spanishLang);
        tokenFreeStreams.push(buildSpanishStream(playlist, meta, epMeta, season, episode, headers));
        console.log(`[Aether] Token-free source via ${playlist.host}: ok (${playlist.label})`);
      } catch (error) {
        console.log(`[Aether] Token-free source unavailable: ${error.message}`);
      }
    }
    if (mp4Streams.length === 0 && hlsStreams.length === 0 && tokenFreeStreams.length === 0) {
      if (token) {
        const status = yield checkToken(token);
        if (status.valid === false && status.reason === "bad-token") {
          console.log("[Aether] The FebBox token is no longer valid \u2014 re-copy the `ui` cookie from febbox.com.");
        } else if (status.valid === false && status.reason === "unreachable") {
          console.log("[Aether] No Aether FEM API mirror could be reached.");
        } else if (status.valid === true) {
          console.log("[Aether] Token is fine; FEM simply has no stream for this title.");
        } else {
          console.log("[Aether] FEM returned nothing playable for this title.");
        }
      }
      return [];
    }
    const ordered = preferHls ? hlsStreams.concat(mp4Streams) : mp4Streams.concat(hlsStreams);
    return ordered.concat(tokenFreeStreams);
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      {
        type: "header",
        label: "Aether \u2014 FEM API"
      },
      {
        type: "info",
        label: "Aether hosts no files. It scrapes FebBox with your own free FebBox account (100 GB/month), exactly like the Aether site does. Sign in at febbox.com, open DevTools > Application > Cookies, and copy the value of the `ui` cookie."
      },
      {
        type: "text",
        key: "febboxToken",
        label: "FebBox ui token",
        placeholder: "eyJhbGciOiJIUzI1NiJ9...",
        isPassword: true,
        description: "Optional but recommended. The value of the `ui` cookie from febbox.com. Expires periodically \u2014 re-copy it if streams stop working."
      },
      {
        type: "toggle",
        key: "preferHls",
        label: "Prefer HLS streams",
        description: "Lists the adaptive HLS playlist above the fixed-quality MP4 links.",
        defaultValue: false
      },
      {
        type: "header",
        label: "Delivery"
      },
      {
        type: "select",
        key: "region",
        label: "CDN region",
        description: "Re-points FebBox stream URLs at the edge node nearest you. Only applies to FEM streams.",
        options: [
          { label: "Auto (as returned)", value: "auto" },
          { label: "New York", value: "new-york" },
          { label: "Dallas", value: "dallas" },
          { label: "Kansas", value: "kansas" },
          { label: "Portland", value: "portland" },
          { label: "Paris", value: "paris" },
          { label: "London", value: "london" },
          { label: "Hong Kong", value: "hong-kong" },
          { label: "Singapore", value: "singapore" },
          { label: "Sydney", value: "sydney" },
          { label: "Mumbai", value: "mumbai" }
        ],
        defaultValue: "auto"
      },
      {
        type: "header",
        label: "Token-free source"
      },
      {
        type: "info",
        label: "Aether also ships one source that needs no account. It is listed after the FEM streams and is what the site itself plays when no token is set. Streams are HLS with original audio plus Spanish subtitles, or Spanish dubbing."
      },
      {
        type: "toggle",
        key: "enableSpanish",
        label: "Include token-free source",
        description: "Turn off if you only want the token-backed FEM streams.",
        defaultValue: true
      },
      {
        type: "select",
        key: "spanishLang",
        label: "Token-free source audio",
        description: "Which of Aether's three variants to request.",
        options: [
          { label: "Subtitled (ES) \u2014 original audio", value: "sub" },
          { label: "Castellano \u2014 Spanish dubbing", value: "esp" },
          { label: "Latino \u2014 Latin American dubbing", value: "lat" }
        ],
        defaultValue: "sub"
      }
    ];
  });
}
module.exports = { getStreams, onSettings };
