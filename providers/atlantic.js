/**
 * atlantic - Built from src/atlantic/
 * Generated: 2026-09-24T04:31:55.075Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/atlantic/index.js
var atlantic_exports = {};
__export(atlantic_exports, {
  getStreams: () => getStreams,
  onSettings: () => onSettings
});
module.exports = __toCommonJS(atlantic_exports);

// src/atlantic/constants.js
var PROVIDER_NAME = "Atlantic";
var SITE_ORIGIN = "https://atlantic.st";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TMDB_BASE = "https://api.themoviedb.org/3";
var APHRODITE = {
  label: "Aphrodite",
  base: "https://cdn.hls.lol",
  handshakePath: "/content/index",
  code: "a",
  headerPrefix: "X-A-",
  // SHA-256("aphrodite.a.v1" || <32 static bytes>) — see the header comment.
  keyHex: "5ee43d0e0f169887b0ee184e4ffbb7ee6d9629c97cf210ad8c2c4ebc73c1d8f5"
};
var ARTEMIS = {
  label: "Artemis",
  base: "https://stellar.hls.lol",
  handshakePath: "/gate/handshake",
  code: "b",
  headerPrefix: "X-S-",
  keyHex: "9ffdab63d48b4fa089dfa7f74303c6ccb6b5e770880f7d47a3a1ab544b7504f1"
};
var NATSUKI_BASE = "https://natsuki.hls.lol/subs";
var GRANITE_BASE = "https://sub.vdrk.site/v1";
var OPENSUBS_BASE = "https://rest.opensubtitles.org";
var OPENSUBS_USER_AGENT = "VLSub 0.10.2";
var QUALITY_RANK = {
  "4K": 6,
  "1440p": 5,
  "1080p": 4,
  "720p": 3,
  "480p": 2,
  "360p": 1,
  Auto: 0
};
var LANGUAGE_MAP = {
  english: "en",
  french: "fr",
  spanish: "es",
  "spanish (latin america)": "es",
  "spanish (la)": "es",
  latino: "es",
  german: "de",
  italian: "it",
  portuguese: "pt",
  "portuguese (br)": "pt-br",
  "portuguese (brazil)": "pt-br",
  "portuguese (brazilian)": "pt-br",
  brazilian: "pt-br",
  "brazilian portuguese": "pt-br",
  dutch: "nl",
  russian: "ru",
  japanese: "ja",
  korean: "ko",
  "chinese (simplified)": "zh-cn",
  "chinese (traditional)": "zh-tw",
  chinese: "zh",
  arabic: "ar",
  hindi: "hi",
  turkish: "tr",
  polish: "pl",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  finnish: "fi",
  greek: "el",
  hebrew: "he",
  thai: "th",
  vietnamese: "vi",
  indonesian: "id",
  czech: "cs",
  hungarian: "hu",
  romanian: "ro",
  ukrainian: "uk",
  bulgarian: "bg",
  croatian: "hr",
  serbian: "sr",
  slovak: "sk",
  slovenian: "sl",
  estonian: "et",
  latvian: "lv",
  lithuanian: "lt",
  farsi: "fa",
  persian: "fa",
  bengali: "bn",
  tamil: "ta",
  telugu: "te",
  malay: "ms",
  filipino: "tl",
  tagalog: "tl",
  albanian: "sq",
  armenian: "hy",
  azerbaijani: "az",
  basque: "eu",
  belarusian: "be",
  bosnian: "bs",
  catalan: "ca",
  galician: "gl",
  georgian: "ka",
  icelandic: "is",
  kazakh: "kk",
  khmer: "km",
  macedonian: "mk",
  malayalam: "ml",
  marathi: "mr",
  mongolian: "mn",
  nepali: "ne",
  punjabi: "pa",
  sinhala: "si",
  swahili: "sw",
  urdu: "ur",
  uzbek: "uz",
  welsh: "cy",
  // Natsuki reports some tracks with a 3-letter code, and a few backends only
  // send a display name, so both spellings are mapped.
  kurdish: "ku",
  sorani: "ckb",
  "kurdish (sorani)": "ckb",
  "kurdish (kurmanji)": "ku",
  ckb: "ckb",
  burmese: "my",
  myanmar: "my",
  pashto: "ps",
  pushto: "ps",
  sindhi: "sd",
  somali: "so",
  afrikaans: "af",
  akan: "ak",
  ewe: "ee",
  oromo: "om",
  amharic: "am",
  yoruba: "yo",
  zulu: "zu",
  hausa: "ha",
  lao: "lo",
  tibetan: "bo",
  esperanto: "eo",
  latin: "la",
  "norwegian bokm\xE5l": "nb",
  "norwegian nynorsk": "nn",
  flemish: "nl",
  cantonese: "zh-yue",
  "chinese (cantonese)": "zh-yue",
  "serbo-croatian": "sh"
};

// src/atlantic/gate.js
var import_crypto_js = __toESM(require("crypto-js"));
var SOURCES = {
  aphrodite: APHRODITE,
  artemis: ARTEMIS
};
var sessions = {};
var pending = {};
var EXPIRY_SKEW_SECONDS = 60;
var HANDSHAKE_TIMEOUT_MS = 12e3;
function randomHex(bytes) {
  const out = [];
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const buffer = new Uint8Array(bytes);
    try {
      webCrypto.getRandomValues(buffer);
      for (let i = 0; i < buffer.length; i++) {
        out.push(("0" + buffer[i].toString(16)).slice(-2));
      }
      return out.join("");
    } catch (error) {
    }
  }
  for (let i = 0; i < bytes; i++) {
    out.push(("0" + Math.floor(Math.random() * 256).toString(16)).slice(-2));
  }
  return out.join("");
}
function nowSeconds() {
  return Math.floor(Date.now() / 1e3);
}
function hmacHex(keyHex, message) {
  return import_crypto_js.default.HmacSHA256(message, import_crypto_js.default.enc.Hex.parse(keyHex)).toString(import_crypto_js.default.enc.Hex);
}
function hexToUtf8(hex) {
  return import_crypto_js.default.enc.Hex.parse(hex).toString(import_crypto_js.default.enc.Utf8);
}
function decryptHandshakePayload(keyHex, payloadHex) {
  const raw = String(payloadHex || "");
  if (raw.length < 24 + 32 + 32)
    return "";
  const ivHex = raw.slice(0, 24);
  const bodyHex = raw.slice(24);
  const dataHex = bodyHex.slice(0, bodyHex.length - 32);
  const key = import_crypto_js.default.enc.Hex.parse(keyHex);
  const zeros = import_crypto_js.default.enc.Hex.parse(new Array(dataHex.length + 1).join("0"));
  const keystream = import_crypto_js.default.AES.encrypt(zeros, key, {
    iv: import_crypto_js.default.enc.Hex.parse(ivHex + "00000002"),
    mode: import_crypto_js.default.mode.CTR,
    padding: import_crypto_js.default.pad.NoPadding
  }).ciphertext.toString(import_crypto_js.default.enc.Hex);
  let plainHex = "";
  for (let i = 0; i < dataHex.length; i += 2) {
    const a = parseInt(dataHex.substr(i, 2), 16);
    const b = parseInt(keystream.substr(i, 2) || "0", 16);
    plainHex += ("0" + (a ^ b).toString(16)).slice(-2);
  }
  return hexToUtf8(plainHex);
}
function fetchWithTimeout(url, options, timeoutMs) {
  return __async(this, null, function* () {
    let timer = null;
    try {
      return yield Promise.race([
        fetch(url, options),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error("Handshake timed out")), timeoutMs);
        })
      ]);
    } finally {
      if (timer)
        clearTimeout(timer);
    }
  });
}
function handshake(name) {
  return __async(this, null, function* () {
    const source = SOURCES[name];
    const ts = nowSeconds();
    const nonce = randomHex(8);
    const sig = hmacHex(source.keyHex, source.code + "|" + ts + "|" + nonce);
    const response = yield fetchWithTimeout(
      source.base + source.handshakePath,
      {
        method: "POST",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "Origin": SITE_ORIGIN,
          "Referer": SITE_ORIGIN + "/",
          "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ c: source.code, ts, n: nonce, s: sig })
      },
      HANDSHAKE_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error(name + " handshake failed (HTTP " + response.status + ")");
    }
    const text = yield response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = null;
    }
    if (!payload || !payload.d) {
      throw new Error(name + " handshake returned no payload");
    }
    let session = null;
    try {
      session = JSON.parse(decryptHandshakePayload(source.keyHex, payload.d));
    } catch (error) {
      session = null;
    }
    if (!session || !session.sid || !session.skey) {
      throw new Error(name + " handshake payload could not be decrypted");
    }
    return { sid: String(session.sid), skey: String(session.skey), exp: Number(session.exp) || 0 };
  });
}
function getSession(name) {
  return __async(this, null, function* () {
    const current = sessions[name];
    if (current && (!current.exp || current.exp - EXPIRY_SKEW_SECONDS > nowSeconds())) {
      return current;
    }
    if (!pending[name]) {
      pending[name] = handshake(name).then(
        (session) => {
          sessions[name] = session;
          pending[name] = null;
          return session;
        },
        (error) => {
          sessions[name] = null;
          pending[name] = null;
          throw error;
        }
      );
    }
    return pending[name];
  });
}
function signHeaders(name, path) {
  return __async(this, null, function* () {
    const source = SOURCES[name];
    const session = yield getSession(name);
    const ts = nowSeconds();
    const nonce = randomHex(8);
    const sig = hmacHex(session.skey, session.sid + "|" + path + "|" + ts + "|" + nonce);
    const headers = {};
    headers[source.headerPrefix + "Sid"] = session.sid;
    headers[source.headerPrefix + "Ts"] = String(ts);
    headers[source.headerPrefix + "Nonce"] = nonce;
    headers[source.headerPrefix + "Sig"] = sig;
    headers["Accept"] = "application/json, text/plain, */*";
    headers["User-Agent"] = USER_AGENT;
    return headers;
  });
}
function clearSession(name) {
  sessions[name] = null;
}

// src/atlantic/utils.js
function fetchText(url, options, timeoutMs) {
  return __async(this, null, function* () {
    let timer = null;
    try {
      const response = yield Promise.race([
        fetch(url, options),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
        })
      ]);
      const text = yield response.text();
      return { ok: response.ok, status: response.status, text };
    } catch (error) {
      return { ok: false, status: 0, text: "", error: error.message };
    } finally {
      if (timer)
        clearTimeout(timer);
    }
  });
}
function fetchJson(url, options, timeoutMs) {
  return __async(this, null, function* () {
    const result = yield fetchText(url, options, timeoutMs);
    let data = null;
    if (result.ok && result.text) {
      try {
        data = JSON.parse(result.text);
      } catch (error) {
        data = null;
      }
    }
    return { ok: result.ok, status: result.status, data, text: result.text };
  });
}
function fetchJsonWithRetry(url, options, timeoutMs, attempts) {
  return __async(this, null, function* () {
    const result = yield fetchWithRetry(url, options, timeoutMs, attempts);
    let data = null;
    if (result.ok && result.text) {
      try {
        data = JSON.parse(result.text);
      } catch (error) {
        data = null;
      }
    }
    return { ok: result.ok, status: result.status, data, text: result.text };
  });
}
function playbackHeaders() {
  return {
    "Accept": "*/*",
    "Origin": SITE_ORIGIN,
    "Referer": SITE_ORIGIN + "/",
    "User-Agent": USER_AGENT
  };
}
function natsukiHeaders() {
  return {
    "Accept": "application/json, text/plain, */*",
    "Origin": SITE_ORIGIN,
    "Referer": SITE_ORIGIN + "/",
    "User-Agent": USER_AGENT
  };
}
function qualityBadge(height) {
  const h = Number(height) || 0;
  if (h >= 2160)
    return "4K";
  if (h >= 1440)
    return "1440p";
  if (h >= 1080)
    return "1080p";
  if (h >= 720)
    return "720p";
  if (h >= 480)
    return "480p";
  if (h >= 360)
    return "360p";
  return h ? h + "p" : "Auto";
}
function rankQuality(badge) {
  return QUALITY_RANK[badge] !== void 0 ? QUALITY_RANK[badge] : 0;
}
function absolutize(url, baseUrl) {
  if (!url)
    return "";
  if (/^https?:\/\//i.test(url))
    return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    return url;
  }
}
function parseMasterPlaylist(text, baseUrl) {
  const lines = String(text || "").split("\n");
  const variants = [];
  let hasSeparateAudio = false;
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line)
      continue;
    if (line.indexOf("#EXT-X-MEDIA:") === 0) {
      if (/TYPE=AUDIO/i.test(line))
        hasSeparateAudio = true;
      continue;
    }
    if (line.indexOf("#EXT-X-STREAM-INF:") === 0) {
      const resolution = /RESOLUTION=(\d+)x(\d+)/i.exec(line);
      const bandwidth = /BANDWIDTH=(\d+)/i.exec(line);
      current = {
        width: resolution ? Number(resolution[1]) : 0,
        height: resolution ? Number(resolution[2]) : 0,
        bandwidth: bandwidth ? Number(bandwidth[1]) : 0
      };
      continue;
    }
    if (line.charAt(0) === "#")
      continue;
    if (current) {
      current.url = absolutize(line, baseUrl);
      variants.push(current);
      current = null;
    }
  }
  variants.sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth);
  return { variants, hasSeparateAudio };
}
function fetchWithRetry(url, options, timeoutMs, attempts) {
  return __async(this, null, function* () {
    let result = yield fetchText(url, options, timeoutMs);
    if (result.ok)
      return result;
    const transient = result.status === 0 || result.status >= 500;
    if (!transient)
      return result;
    for (let i = 1; i < attempts; i++) {
      result = yield fetchText(url, options, Math.max(3e3, Math.round(timeoutMs / 2)));
      if (result.ok)
        return result;
      if (result.status !== 0 && result.status < 500)
        return result;
    }
    return result;
  });
}
function looksLikePlaylist(text) {
  return typeof text === "string" && text.indexOf("#EXTM3U") !== -1;
}
function loadMaster(url, timeoutMs) {
  return __async(this, null, function* () {
    const headers = playbackHeaders();
    const result = yield fetchWithRetry(url, { headers }, timeoutMs, 2);
    if (!result.ok || !looksLikePlaylist(result.text))
      return null;
    const parsed = parseMasterPlaylist(result.text, url);
    if (!parsed.variants.length)
      return null;
    return { headers, variants: parsed.variants, hasSeparateAudio: parsed.hasSeparateAudio };
  });
}
function variantIsPlayable(url, headers, timeoutMs) {
  return __async(this, null, function* () {
    const result = yield fetchWithRetry(url, { headers }, timeoutMs, 2);
    if (!result.ok)
      return false;
    return result.text.indexOf("#EXTINF") !== -1 || looksLikePlaylist(result.text);
  });
}
function getTmdbMeta(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = TMDB_BASE + "/" + type + "/" + encodeURIComponent(tmdbId) + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids";
    const result = yield fetchJson(url, { "User-Agent": USER_AGENT }, 1e4);
    const data = result.data || {};
    const external = data.external_ids || {};
    const date = data.release_date || data.first_air_date || "";
    return {
      title: data.title || data.name || data.original_title || data.original_name || "",
      year: date ? String(date).slice(0, 4) : "",
      imdbId: external.imdb_id || data.imdb_id || ""
    };
  });
}
function languageNameToCode(name) {
  const key = String(name || "").trim().toLowerCase();
  if (!key)
    return "";
  if (LANGUAGE_MAP[key])
    return LANGUAGE_MAP[key];
  if (/^[a-z]{2}(-[a-z]{2})?$/.test(key))
    return key;
  return "";
}
function languageDisplayName(code) {
  const wanted = String(code || "").toLowerCase();
  if (!wanted)
    return "Unknown";
  for (const key in LANGUAGE_MAP) {
    if (LANGUAGE_MAP[key] === wanted) {
      return key.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return wanted.toUpperCase();
}
function mergeSubtitles(lists, maxPerLanguage, maxTotal) {
  const order = [];
  const queues = {};
  const seen = {};
  for (let s = 0; s < lists.length; s++) {
    const list = lists[s] || [];
    for (let i = 0; i < list.length; i++) {
      const track = list[i];
      if (!track || !track.url || !track.language)
        continue;
      const key = track.language + "|" + track.url;
      if (seen[key])
        continue;
      seen[key] = true;
      if (!queues[track.language]) {
        queues[track.language] = [];
        order.push(track.language);
      }
      while (queues[track.language].length <= s)
        queues[track.language].push([]);
      queues[track.language][s].push(track);
    }
  }
  const out = [];
  for (let l = 0; l < order.length; l++) {
    const perSource = queues[order[l]];
    let taken = 0;
    let index = 0;
    while (taken < maxPerLanguage) {
      let progressed = false;
      for (let s = 0; s < perSource.length && taken < maxPerLanguage; s++) {
        const queue = perSource[s];
        if (queue.length > index) {
          out.push(queue[index]);
          taken++;
          progressed = true;
          if (out.length >= maxTotal)
            return out;
        }
      }
      if (!progressed)
        break;
      index++;
    }
  }
  return out;
}
function buildStreamTitle(meta, label, quality, season, episode) {
  const parts = [meta.title || "Atlantic"];
  if (meta.year)
    parts[0] += " (" + meta.year + ")";
  let title = parts[0];
  if (season && episode)
    title += " S" + season + "E" + episode;
  return "Atlantic | " + label + " " + quality + " | " + title;
}

// src/atlantic/aphrodite.js
var API_TIMEOUT_MS = 12e3;
var PLAYLIST_TIMEOUT_MS = 1e4;
function buildPath(tmdbId, mediaType, season, episode) {
  if (mediaType === "tv") {
    return "/content/tv/" + encodeURIComponent(tmdbId) + "/" + encodeURIComponent(season || 1) + "/" + encodeURIComponent(episode || 1);
  }
  return "/content/movie/" + encodeURIComponent(tmdbId);
}
function request(path) {
  return __async(this, null, function* () {
    const headers = yield signHeaders("aphrodite", path);
    const result = yield fetchJsonWithRetry(APHRODITE.base + path, { headers }, API_TIMEOUT_MS, 2);
    return { status: result.status, data: result.data };
  });
}
function fetchAphrodite(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const path = buildPath(tmdbId, mediaType, season, episode);
    let response;
    try {
      response = yield request(path);
    } catch (error) {
      return null;
    }
    if (response.data && response.data.renew) {
      clearSession("aphrodite");
      try {
        response = yield request(path);
      } catch (error) {
        return null;
      }
    }
    const data = response.data;
    if (!data || !data.found)
      return null;
    const url = data.hls || (data.type === "hls" || data.format === "hls" ? data.url : "");
    if (!url)
      return null;
    const playlist = yield loadMaster(url, PLAYLIST_TIMEOUT_MS);
    if (!playlist)
      return null;
    const top = playlist.variants[0];
    if (top && !(yield variantIsPlayable(top.url, playlist.headers, PLAYLIST_TIMEOUT_MS))) {
      return null;
    }
    return {
      label: APHRODITE.label,
      url,
      headers: playlist.headers,
      variants: playlist.variants,
      hasSeparateAudio: playlist.hasSeparateAudio,
      meta: { title: data.title || "", updatedAt: data.updated_at || "" }
    };
  });
}

// src/atlantic/artemis.js
var API_TIMEOUT_MS2 = 12e3;
var PLAYLIST_TIMEOUT_MS2 = 1e4;
function buildPath2(tmdbId, mediaType, season, episode) {
  const parts = ["tmdbId=" + encodeURIComponent(tmdbId), "type=" + encodeURIComponent(mediaType)];
  if (mediaType === "tv") {
    parts.push("season=" + encodeURIComponent(season || 1));
    parts.push("episode=" + encodeURIComponent(episode || 1));
  }
  return "/resolve?" + parts.join("&");
}
function request2(path) {
  return __async(this, null, function* () {
    const headers = yield signHeaders("artemis", path);
    const result = yield fetchJsonWithRetry(ARTEMIS.base + path, { headers }, API_TIMEOUT_MS2, 2);
    return { status: result.status, data: result.data };
  });
}
function fetchArtemis(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const path = buildPath2(tmdbId, mediaType, season, episode);
    let response;
    try {
      response = yield request2(path);
    } catch (error) {
      return null;
    }
    if (response.status === 401 && response.data && response.data.renew) {
      clearSession("artemis");
      try {
        response = yield request2(path);
      } catch (error) {
        return null;
      }
    }
    const data = response.data;
    if (!data || !data.found || !data.url)
      return null;
    const playlist = yield loadMaster(data.url, PLAYLIST_TIMEOUT_MS2);
    if (!playlist)
      return null;
    const top = playlist.variants[0];
    if (top && !(yield variantIsPlayable(top.url, playlist.headers, PLAYLIST_TIMEOUT_MS2))) {
      return null;
    }
    return {
      label: ARTEMIS.label,
      url: data.url,
      headers: playlist.headers,
      variants: playlist.variants,
      hasSeparateAudio: playlist.hasSeparateAudio,
      meta: { upstream: data.source || "", available: data.availableSources || [] }
    };
  });
}

// src/atlantic/subtitles.js
var SUBTITLE_TIMEOUT_MS = 12e3;
function fetchGranite(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const url = mediaType === "tv" ? GRANITE_BASE + "/tv/" + encodeURIComponent(tmdbId) + "/" + encodeURIComponent(season || 1) + "/" + encodeURIComponent(episode || 1) : GRANITE_BASE + "/movie/" + encodeURIComponent(tmdbId);
    const result = yield fetchJson(url, { "User-Agent": USER_AGENT }, SUBTITLE_TIMEOUT_MS);
    if (!result.ok || !Array.isArray(result.data))
      return [];
    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
      const item = result.data[i];
      if (!item || !item.file || !item.label)
        continue;
      const label = String(item.label);
      const hearingImpaired = /hi\d*$/i.test(label);
      const base = label.replace(/\s*hi\d*$/i, "").replace(/\d+$/, "");
      const code = languageNameToCode(base);
      if (!code)
        continue;
      tracks.push({
        url: item.file,
        language: code,
        name: label,
        hearingImpaired,
        source: "granite"
      });
    }
    return tracks;
  });
}
function fetchNatsuki(imdbId, season, episode) {
  return __async(this, null, function* () {
    if (!imdbId)
      return [];
    const parts = ["imdbId=" + encodeURIComponent(imdbId)];
    if (season && episode) {
      parts.push("season=" + encodeURIComponent(season));
      parts.push("episode=" + encodeURIComponent(episode));
    }
    const headers = natsukiHeaders();
    const result = yield fetchJson(
      NATSUKI_BASE + "?" + parts.join("&"),
      { headers },
      SUBTITLE_TIMEOUT_MS
    );
    if (!result.ok || !result.data || !Array.isArray(result.data.subtitles))
      return [];
    const tracks = [];
    for (let i = 0; i < result.data.subtitles.length; i++) {
      const item = result.data.subtitles[i];
      if (!item || !item.url)
        continue;
      const code = languageNameToCode(item.language) || languageNameToCode(item.langCode);
      if (!code)
        continue;
      tracks.push({
        url: item.url,
        language: code,
        name: item.fileName || languageDisplayName(code),
        headers,
        source: "natsuki"
      });
    }
    return tracks;
  });
}
function fetchOpenSubtitles(imdbId, season, episode) {
  return __async(this, null, function* () {
    if (!imdbId)
      return [];
    const id = String(imdbId).replace(/^tt/, "");
    const hasEpisode = Boolean(season && episode);
    const path = "/search/" + (hasEpisode ? "episode-" + encodeURIComponent(episode) + "/" : "") + "imdbid-" + encodeURIComponent(id) + (hasEpisode ? "/season-" + encodeURIComponent(season) : "");
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": USER_AGENT,
      "X-User-Agent": OPENSUBS_USER_AGENT
    };
    const result = yield fetchJson(OPENSUBS_BASE + path, { headers }, SUBTITLE_TIMEOUT_MS);
    if (!result.ok || !Array.isArray(result.data))
      return [];
    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
      const item = result.data[i];
      if (!item || !item.SubDownloadLink)
        continue;
      const code = languageNameToCode(item.LanguageName);
      if (!code)
        continue;
      const url = String(item.SubDownloadLink).replace(/\.gz$/i, "").replace("/download/", "/download/subencoding-utf8/");
      tracks.push({
        url,
        language: code,
        name: item.LanguageName || languageDisplayName(code),
        headers: { "User-Agent": USER_AGENT },
        source: "opensubs"
      });
    }
    return tracks;
  });
}
function fetchSubtitles(options, settings) {
  return __async(this, null, function* () {
    const jobs = [];
    if (settings.enableGranite) {
      jobs.push(fetchGranite(options.tmdbId, options.mediaType, options.season, options.episode));
    }
    if (settings.enableNatsuki) {
      jobs.push(fetchNatsuki(options.imdbId, options.season, options.episode));
    }
    if (settings.enableOpenSubtitles) {
      jobs.push(fetchOpenSubtitles(options.imdbId, options.season, options.episode));
    }
    if (!jobs.length)
      return [];
    const settled = yield Promise.all(jobs.map((job) => job.catch(() => [])));
    return settled.map((list) => Array.isArray(list) ? list : []);
  });
}

// src/atlantic/index.js
function readSettings() {
  const settings = globalThis.SCRAPER_SETTINGS || {};
  const perLanguage = Number(settings.maxSubtitlesPerLanguage);
  return {
    enableAphrodite: settings.enableAphrodite !== false,
    enableArtemis: settings.enableArtemis !== false,
    enableGranite: settings.enableGranite !== false,
    enableNatsuki: settings.enableNatsuki !== false,
    enableOpenSubtitles: settings.enableOpenSubtitles !== false,
    maxSubtitlesPerLanguage: perLanguage > 0 ? perLanguage : 2,
    maxSubtitlesTotal: 100
  };
}
function qualityLadder(variants) {
  const seen = {};
  const out = [];
  for (let i = 0; i < variants.length; i++) {
    const badge = qualityBadge(variants[i].height);
    if (badge === "Auto" || seen[badge])
      continue;
    seen[badge] = true;
    out.push(badge);
  }
  return out;
}
function subtitleSummary(subtitles) {
  const languages = {};
  for (let i = 0; i < subtitles.length; i++)
    languages[subtitles[i].language] = true;
  const count = Object.keys(languages).length;
  return count ? "\u{1F4AC} " + count + " languages" : "";
}
function buildStreams(source, meta, season, episode, subtitles) {
  const variants = source.variants || [];
  const top = variants[0];
  const topBadge = top ? qualityBadge(top.height) : "Auto";
  const ladder = qualityLadder(variants);
  const ladderText = ladder.length ? ladder.join(" \xB7 ") : "Auto";
  const subs = subtitleSummary(subtitles);
  const upstream = source.meta && source.meta.upstream ? " \xB7 " + source.meta.upstream : "";
  const streams = [{
    name: PROVIDER_NAME + " | " + source.label + upstream,
    title: buildStreamTitle(meta, source.label, ladderText, season, episode) + "\n\u{1F39E} Adaptive HLS \xB7 " + variants.length + " renditions" + (subs ? " | " + subs : ""),
    url: source.url,
    quality: topBadge,
    size: topBadge + " adaptive",
    description: ladderText + (subs ? " | " + subs : ""),
    format: "m3u8",
    headers: source.headers,
    subtitles,
    provider: "atlantic"
  }];
  if (!source.hasSeparateAudio) {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant.url)
        continue;
      const badge = qualityBadge(variant.height);
      if (badge === "Auto")
        continue;
      streams.push({
        name: PROVIDER_NAME + " | " + source.label + " " + badge + upstream,
        title: buildStreamTitle(meta, source.label, badge, season, episode) + (subs ? "\n" + subs : ""),
        url: variant.url,
        quality: badge,
        size: badge,
        description: badge + (subs ? " | " + subs : ""),
        format: "m3u8",
        headers: source.headers,
        subtitles,
        provider: "atlantic"
      });
    }
  }
  return streams;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const settings = readSettings();
    const type = mediaType === "tv" ? "tv" : "movie";
    const seasonNumber = type === "tv" ? Number(season) || 1 : null;
    const episodeNumber = type === "tv" ? Number(episode) || 1 : null;
    const meta = yield getTmdbMeta(tmdbId, type);
    const subtitleJob = fetchSubtitles(
      {
        tmdbId,
        mediaType: type,
        season: seasonNumber,
        episode: episodeNumber,
        imdbId: meta.imdbId
      },
      settings
    ).catch(() => []);
    const aphroditeJob = settings.enableAphrodite ? fetchAphrodite(tmdbId, type, seasonNumber, episodeNumber).catch(() => null) : Promise.resolve(null);
    const artemisJob = settings.enableArtemis ? fetchArtemis(tmdbId, type, seasonNumber, episodeNumber).catch(() => null) : Promise.resolve(null);
    const results = yield Promise.all([aphroditeJob, artemisJob, subtitleJob]);
    const sources = [results[0], results[1]].filter(Boolean);
    const subtitles = mergeSubtitles(
      results[2] || [],
      settings.maxSubtitlesPerLanguage,
      settings.maxSubtitlesTotal
    );
    const streams = [];
    for (let i = 0; i < sources.length; i++) {
      const built = buildStreams(sources[i], meta, seasonNumber, episodeNumber, subtitles);
      for (let j = 0; j < built.length; j++)
        streams.push(built[j]);
    }
    streams.sort((a, b) => rankQuality(b.quality) - rankQuality(a.quality));
    return streams;
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Atlantic \u2014 Sources" },
      {
        type: "toggle",
        key: "enableAphrodite",
        label: "Aphrodite",
        description: "Primary source (cdn.hls.lol). Carries 1080p/4K adaptive HLS. Recommended.",
        defaultValue: true
      },
      {
        type: "toggle",
        key: "enableArtemis",
        label: "Artemis",
        description: "Fallback source (stellar.hls.lol). It picks its own upstream (Orbit/Nova/Astra); when it lands on a broken one, the provider drops it automatically.",
        defaultValue: true
      },
      { type: "header", label: "Atlantic \u2014 Subtitles" },
      {
        type: "toggle",
        key: "enableGranite",
        label: "Granite",
        description: "Serves VTT and needs no extra headers, so it is the most likely to just play.",
        defaultValue: true
      },
      {
        type: "toggle",
        key: "enableNatsuki",
        label: "Natsuki",
        description: "Widest coverage \u2014 hundreds of tracks on popular titles. Needs an IMDb id, which the provider resolves from TMDB.",
        defaultValue: true
      },
      {
        type: "toggle",
        key: "enableOpenSubtitles",
        label: "OpenSubtitles",
        description: "Legacy REST endpoint, serves UTF-8 SRT.",
        defaultValue: true
      },
      {
        type: "select",
        key: "maxSubtitlesPerLanguage",
        label: "Tracks kept per language",
        description: "These backends can return 600+ tracks for a single episode. Lower this if the subtitle picker feels cluttered.",
        options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "5", value: "5" },
          { label: "10", value: "10" }
        ],
        defaultValue: "2"
      }
    ];
  });
}
