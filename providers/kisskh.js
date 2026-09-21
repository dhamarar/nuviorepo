/**
 * kisskh - Built from src/kisskh/
 * Generated: 2026-09-21T01:02:39.408Z
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

// src/kisskh/constants.js
var MAIN_URL = "https://kisskh.co";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "8476a7ab80ad76f0936744df0430e67c";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://kisskh.co/",
  "Accept": "application/json, text/plain, */*"
};

// src/kisskh/crypto.js
function stringToWords(s) {
  const len = s.length;
  const words = [];
  for (let i = 0; i < len; i++) {
    words[i >>> 2] |= (255 & s.charCodeAt(i)) << 24 - i % 4 * 8;
  }
  return [words, len];
}
function wordsToHex(words, byteLength) {
  const hex = [];
  for (let i = 0; i < byteLength; i++) {
    const b = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
    hex.push(b.toString(16).padStart(2, "0"));
  }
  return hex.join("");
}
function trim48(s) {
  return (s || "").substring(0, 48);
}
function hashString(s) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
  }
  return hash;
}
function padString(s) {
  const padLen = 16 - s.length % 16;
  for (let i = 0; i < padLen; i++) {
    s += String.fromCharCode(padLen);
  }
  return s;
}
var keySchedule = [
  1332468387,
  -1641050960,
  2136896045,
  -1629555948,
  1399201960,
  -850809832,
  -1307058635,
  751381793,
  -1933648423,
  1106735553,
  -203378700,
  -550927659,
  766369351,
  1817882502,
  -1615200142,
  1083409063,
  -104955314,
  -1780208184,
  173944250,
  1254993693,
  1422337688,
  -1054667952,
  -880990486,
  -2119136777,
  -1822404972,
  1380140484,
  -1723964626,
  412019417,
  -890799303,
  -1734066435,
  26893779,
  420787978,
  -1337058067,
  686432784,
  695238595,
  811911369,
  -391724567,
  -1068702727,
  -381903814,
  -648522509,
  -1266234148,
  1959407397,
  -1644776673,
  1152313324
];
var T0 = [];
var T1 = [];
var T2 = [];
var T3 = [];
var SBox = [];
var d = [];
for (let i = 0; i < 256; i++) {
  d[i] = i < 128 ? i << 1 : i << 1 ^ 283;
}
var p = 0;
var q = 0;
for (let i = 0; i < 256; i++) {
  let s = q ^ q << 1 ^ q << 2 ^ q << 3 ^ q << 4;
  s = s >>> 8 ^ 255 & s ^ 99;
  SBox[p] = s;
  const x = d[p];
  const y = d[d[x]];
  const z = 257 * d[s] ^ 16843008 * s;
  T0[p] = z << 24 | z >>> 8;
  T1[p] = z << 16 | z >>> 16;
  T2[p] = z << 8 | z >>> 24;
  T3[p] = z;
  p ? (p = x ^ d[d[d[y ^ x]]], q ^= d[d[q]]) : p = q = 1;
}
function encryptBlock(words, offset) {
  let iv;
  if (offset === 0) {
    iv = [22039283, 1457920463, 776125350, -1941999367];
  } else {
    iv = words.slice(offset - 4, offset);
  }
  for (let i = 0; i < 4; i++) {
    words[offset + i] ^= iv[i];
  }
  let s0 = words[offset] ^ keySchedule[0];
  let s1 = words[offset + 1] ^ keySchedule[1];
  let s2 = words[offset + 2] ^ keySchedule[2];
  let s3 = words[offset + 3] ^ keySchedule[3];
  let k = 4;
  for (let round = 1; round < 10; round++) {
    const t02 = T0[s0 >>> 24] ^ T1[s1 >>> 16 & 255] ^ T2[s2 >>> 8 & 255] ^ T3[s3 & 255] ^ keySchedule[k++];
    const t12 = T0[s1 >>> 24] ^ T1[s2 >>> 16 & 255] ^ T2[s3 >>> 8 & 255] ^ T3[s0 & 255] ^ keySchedule[k++];
    const t22 = T0[s2 >>> 24] ^ T1[s3 >>> 16 & 255] ^ T2[s0 >>> 8 & 255] ^ T3[s1 & 255] ^ keySchedule[k++];
    s3 = T0[s3 >>> 24] ^ T1[s0 >>> 16 & 255] ^ T2[s1 >>> 8 & 255] ^ T3[s2 & 255] ^ keySchedule[k++];
    s0 = t02;
    s1 = t12;
    s2 = t22;
  }
  const t0 = (SBox[s0 >>> 24] << 24 | SBox[s1 >>> 16 & 255] << 16 | SBox[s2 >>> 8 & 255] << 8 | SBox[s3 & 255]) ^ keySchedule[k++];
  const t1 = (SBox[s1 >>> 24] << 24 | SBox[s2 >>> 16 & 255] << 16 | SBox[s3 >>> 8 & 255] << 8 | SBox[s0 & 255]) ^ keySchedule[k++];
  const t2 = (SBox[s2 >>> 24] << 24 | SBox[s3 >>> 16 & 255] << 16 | SBox[s0 >>> 8 & 255] << 8 | SBox[s1 & 255]) ^ keySchedule[k++];
  s3 = (SBox[s3 >>> 24] << 24 | SBox[s0 >>> 16 & 255] << 16 | SBox[s1 >>> 8 & 255] << 8 | SBox[s2 & 255]) ^ keySchedule[k++];
  words[offset] = t0;
  words[offset + 1] = t1;
  words[offset + 2] = t2;
  words[offset + 3] = s3;
}
function getKey(episodeId, isSub = false) {
  const guid = isSub ? "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp" : "62f176f3bb1b5b8e70e39932ad34a0c7";
  const appVer = "2.8.10";
  const platformVer = 4830201;
  const appName = "kisskh";
  const parts = [
    "",
    episodeId,
    null,
    "mg3c3b04ba",
    appVer,
    guid,
    platformVer,
    trim48(appName),
    trim48((appName || "").toLowerCase()),
    trim48(appName),
    appName,
    appName,
    appName,
    "00",
    ""
  ];
  const hash = hashString(parts.join("|"));
  parts.splice(1, 0, hash);
  const padded = padString(parts.join("|"));
  const r = stringToWords(padded);
  const words = r[0];
  const byteLen = r[1];
  for (let i = 0; i < words.length; i += 4) {
    encryptBlock(words, i);
  }
  return wordsToHex(words, byteLen).toUpperCase();
}

// src/kisskh/utils.js
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = yield fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok)
      throw new Error(`TMDB API error: ${response.status}`);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name || data.original_name : data.title || data.original_title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return {
      title,
      originalTitle: mediaType === "tv" ? data.original_name : data.original_title,
      year,
      imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null,
      data
    };
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 0);
  if (words1.length === 0 || words2.length === 0)
    return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = words1.filter((w) => set2.has(w));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  const jaccard = intersection.length / union.size;
  const extraWordsCount = words2.filter((w) => !set1.has(w)).length;
  let score = jaccard - extraWordsCount * 0.05;
  if (words1.length > 0 && words1.every((w) => set2.has(w))) {
    score += 0.2;
  }
  return score;
}
function findBestMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    const resTitle = result.title || "";
    const yearMatch = resTitle.match(/\((\d{4})\)/);
    const resYear = yearMatch ? parseInt(yearMatch[1]) : null;
    const cleanResTitle = resTitle.replace(/\(\d{4}\)/g, "").trim();
    let score = calculateTitleSimilarity(mediaInfo.title, cleanResTitle);
    if (mediaInfo.originalTitle) {
      const origScore = calculateTitleSimilarity(mediaInfo.originalTitle, cleanResTitle);
      if (origScore > score)
        score = origScore;
    }
    if (mediaInfo.year && resYear) {
      const yearDiff = Math.abs(mediaInfo.year - resYear);
      if (yearDiff === 0)
        score += 0.25;
      else if (yearDiff === 1)
        score += 0.1;
      else if (yearDiff > 4)
        score -= 0.3;
    }
    if (score > bestScore && score > 0.35) {
      bestScore = score;
      bestMatch = result;
    }
  }
  return bestMatch;
}

// src/kisskh/index.js
function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
  return __async(this, null, function* () {
    console.log(`[Kisskh] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}, S: ${season}, E: ${episode}`);
    const streams = [];
    try {
      const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
      console.log(`[Kisskh] TMDB Title: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
      const searchQueries = [mediaInfo.title];
      if (mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
        searchQueries.push(mediaInfo.originalTitle);
      }
      let searchResults = [];
      for (const query of searchQueries) {
        try {
          const encodedQuery = encodeURIComponent(query.trim());
          const res = yield fetch(`${MAIN_URL}/api/DramaList/Search?q=${encodedQuery}`, {
            headers: HEADERS
          });
          if (res.ok) {
            const data = yield res.json();
            if (Array.isArray(data) && data.length > 0) {
              searchResults = data;
              break;
            }
          }
        } catch (err) {
          console.warn(`[Kisskh] Search failed for query "${query}":`, err.message);
        }
      }
      if (searchResults.length === 0) {
        console.log(`[Kisskh] No results found for "${mediaInfo.title}"`);
        return [];
      }
      const matchedDrama = findBestMatch(mediaInfo, searchResults);
      if (!matchedDrama || !matchedDrama.id) {
        console.log(`[Kisskh] No confident title match found for "${mediaInfo.title}"`);
        return [];
      }
      console.log(`[Kisskh] Matched Drama: "${matchedDrama.title}" (ID: ${matchedDrama.id})`);
      const detailRes = yield fetch(`${MAIN_URL}/api/DramaList/Drama/${matchedDrama.id}?isq=false`, {
        headers: HEADERS
      });
      if (!detailRes.ok) {
        console.warn(`[Kisskh] Failed to fetch drama details for ID: ${matchedDrama.id}`);
        return [];
      }
      const dramaDetail = yield detailRes.json();
      const episodes = dramaDetail.episodes || [];
      if (episodes.length === 0) {
        console.log(`[Kisskh] No episodes found for drama ID: ${matchedDrama.id}`);
        return [];
      }
      let targetEpisode = null;
      if (mediaType === "movie") {
        targetEpisode = episodes[0];
      } else {
        const epNum = Number(episode) || 1;
        targetEpisode = episodes.find((e) => {
          const num = Number(e.number);
          return num === epNum || Math.floor(num) === epNum;
        }) || episodes[0];
      }
      if (!targetEpisode || !targetEpisode.id) {
        console.log(`[Kisskh] Episode ${episode} not found in drama`);
        return [];
      }
      const episodeId = targetEpisode.id;
      console.log(`[Kisskh] Target Episode ID: ${episodeId} (Number: ${targetEpisode.number})`);
      const videoKkey = getKey(episodeId, false);
      const subKkey = getKey(episodeId, true);
      const subtitles = [];
      if (subKkey) {
        try {
          const subUrl = `${MAIN_URL}/api/Sub/${episodeId}?kkey=${subKkey}`;
          const subRes = yield fetch(subUrl, { headers: HEADERS });
          if (subRes.ok) {
            const subList = yield subRes.json();
            if (Array.isArray(subList)) {
              for (const s of subList) {
                if (s.src) {
                  subtitles.push({
                    url: s.src,
                    language: (s.land || "en").toLowerCase(),
                    name: s.label || s.land || "Subtitle"
                  });
                }
              }
            }
          }
        } catch (subErr) {
          console.warn("[Kisskh] Failed to fetch subtitles:", subErr.message);
        }
      }
      const streamUrl = `${MAIN_URL}/api/DramaList/Episode/${episodeId}.png?err=false&ts=null&time=null&kkey=${videoKkey}`;
      const streamRes = yield fetch(streamUrl, { headers: HEADERS });
      if (!streamRes.ok) {
        console.warn(`[Kisskh] Stream API returned HTTP ${streamRes.status}`);
        return [];
      }
      const videoData = yield streamRes.json();
      const primaryVideo = videoData.Video;
      const backupVideo = videoData.Video_tmp;
      const isCountdown = videoData.Type === 2 || primaryVideo && primaryVideo.includes("tickcounter");
      if (isCountdown) {
        console.log("[Kisskh] Episode is still in countdown / not released yet");
        return [];
      }
      const streamHeaders = {
        "Origin": "https://kisskh.co",
        "Referer": "https://kisskh.co/",
        "User-Agent": HEADERS["User-Agent"]
      };
      if (primaryVideo && (primaryVideo.startsWith("http") || primaryVideo.startsWith("//"))) {
        const fixedUrl = primaryVideo.startsWith("//") ? `https:${primaryVideo}` : primaryVideo;
        const isHls = fixedUrl.includes(".m3u8");
        streams.push({
          name: "Kisskh",
          title: `Kisskh - ${isHls ? "HLS" : "Direct"} (Server 1)`,
          url: fixedUrl,
          quality: "1080p",
          headers: streamHeaders,
          subtitles
        });
      }
      if (backupVideo && (backupVideo.startsWith("http") || backupVideo.startsWith("//")) && backupVideo !== primaryVideo) {
        const fixedBackup = backupVideo.startsWith("//") ? `https:${backupVideo}` : backupVideo;
        const isHls = fixedBackup.includes(".m3u8");
        streams.push({
          name: "Kisskh",
          title: `Kisskh - ${isHls ? "HLS" : "Direct"} (Backup)`,
          url: fixedBackup,
          quality: "1080p",
          headers: streamHeaders,
          subtitles
        });
      }
      console.log(`[Kisskh] Successfully retrieved ${streams.length} stream(s)`);
    } catch (error) {
      console.error(`[Kisskh] Error: ${error.message}`);
    }
    return streams;
  });
}
module.exports = { getStreams };
