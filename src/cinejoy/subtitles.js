import {
    DEFAULT_DOMAIN,
    DEFAULT_SUBTITLES_HOST,
    CANDIDATE_SUBTITLES_HOSTS,
    LANGUAGE_NAMES,
    ISO_639_2_TO_1,
    HEADERS
} from './constants.js';

export const NATSUKI_BASE = 'https://natsuki.hls.lol/subs';
export const GRANITE_BASE = 'https://sub.vdrk.site/v1';
export const OPENSUBS_BASE = 'https://rest.opensubtitles.org';
export const OPENSUBS_USER_AGENT = 'VLSub 0.10.2';

export function normalizeLanguageCode(code) {
    if (!code) return 'en';
    const clean = String(code).toLowerCase().trim();
    if (ISO_639_2_TO_1[clean]) return ISO_639_2_TO_1[clean];
    if (LANGUAGE_NAMES[clean]) return clean;
    const two = clean.slice(0, 2);
    if (LANGUAGE_NAMES[two]) return two;
    return clean;
}

export function getLanguageDisplayName(code) {
    const norm = normalizeLanguageCode(code);
    return LANGUAGE_NAMES[norm] || LANGUAGE_NAMES[code] || norm.toUpperCase();
}

async function fetchJson(url, options = {}) {
    try {
        const res = await fetch(url, options);
        let data = null;
        if (res.ok) {
            data = await res.json();
        }
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: null };
    }
}

let cachedSubtitlesHost = DEFAULT_SUBTITLES_HOST;

/**
 * Official Cinejoy / Wing subtitle API.
 * This is the exact service used by the web frontend on cinejoy.pk
 */
export async function fetchCinejoySubtitles(tmdbId, mediaType, season, episode, maxPerLang = 3) {
    const subtitles = [];
    if (!tmdbId) return subtitles;

    const isTv = mediaType === 'tv' || mediaType === 'series';
    const hosts = [cachedSubtitlesHost, ...CANDIDATE_SUBTITLES_HOSTS.filter(h => h !== cachedSubtitlesHost)];

    for (const host of hosts) {
        try {
            const type = isTv ? 'tv' : 'movie';
            let url = `${host}/subtitles?type=${type}&tmdb=${encodeURIComponent(tmdbId)}`;
            if (isTv) {
                url += `&season=${encodeURIComponent(season || 1)}&episode=${encodeURIComponent(episode || 1)}`;
            }

            const result = await fetchJson(url, {
                headers: {
                    'Accept': 'application/json',
                    'Origin': DEFAULT_DOMAIN,
                    'Referer': `${DEFAULT_DOMAIN}/`,
                    'User-Agent': HEADERS['User-Agent']
                }
            });

            if (!result.ok || !result.data) continue;

            const list = Array.isArray(result.data)
                ? result.data
                : Array.isArray(result.data?.subtitles)
                ? result.data.subtitles
                : Array.isArray(result.data?.data)
                ? result.data.data
                : [];

            if (list.length === 0) continue;

            cachedSubtitlesHost = host;
            const langCount = {};

            for (const item of list) {
                const subUrl = item.url || item.id;
                if (!subUrl || typeof subUrl !== 'string' || !subUrl.startsWith('http')) continue;

                const rawLang = item.language || item.lang || 'en';
                const langCode = normalizeLanguageCode(rawLang);
                const currentCount = langCount[langCode] || 0;

                if (maxPerLang > 0 && currentCount >= maxPerLang) {
                    continue;
                }
                langCount[langCode] = currentCount + 1;

                const baseName = getLanguageDisplayName(langCode);
                const display = String(item.display || item.label || '');
                const isHi = /[\._\- ](hi|sdh|cc)[\._\- ]|\b(hi|sdh|cc)\.srt$/i.test(display);

                let trackName = baseName;
                if (isHi) {
                    trackName = `${baseName} [CC]`;
                } else if (currentCount > 0) {
                    trackName = `${baseName} #${currentCount + 1}`;
                }

                subtitles.push({
                    url: subUrl,
                    language: langCode,
                    name: trackName,
                    headers: {
                        'Origin': DEFAULT_DOMAIN,
                        'Referer': `${DEFAULT_DOMAIN}/`,
                        'User-Agent': HEADERS['User-Agent']
                    }
                });
            }

            if (subtitles.length > 0) {
                return subtitles;
            }
        } catch (e) {
            console.warn(`[Cinejoy] Subtitle fetch from ${host} error:`, e.message);
        }
    }

    return subtitles;
}

/** Granite — keyed by TMDB id, serves VTT */
export async function fetchGranite(tmdbId, mediaType, season, episode, maxPerLang = 3) {
    if (!tmdbId) return [];
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const url = isTv
        ? `${GRANITE_BASE}/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season || 1)}/${encodeURIComponent(episode || 1)}`
        : `${GRANITE_BASE}/movie/${encodeURIComponent(tmdbId)}`;

    const result = await fetchJson(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
    if (!result.ok || !Array.isArray(result.data)) {
        return [];
    }

    const tracks = [];
    const langCount = {};
    for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (!item || !item.file || !item.label) continue;

        const label = String(item.label);
        const base = label.replace(/\s*hi\d*$/i, '').replace(/\d+$/, '');
        const code = normalizeLanguageCode(base);
        if (!code) continue;

        const currentCount = langCount[code] || 0;
        if (maxPerLang > 0 && currentCount >= maxPerLang) continue;
        langCount[code] = currentCount + 1;

        const isHi = /hi/i.test(label);
        const baseName = getLanguageDisplayName(code);
        const name = isHi ? `${baseName} [CC]` : (currentCount > 0 ? `${baseName} #${currentCount + 1}` : label);

        tracks.push({
            url: item.file,
            language: code,
            name
        });
    }
    return tracks;
}

/** Natsuki — keyed by IMDb id, serves SRT */
export async function fetchNatsuki(imdbId, season, episode, maxPerLang = 3) {
    if (!imdbId) return [];

    const parts = [`imdbId=${encodeURIComponent(imdbId)}`];
    if (season && episode) {
        parts.push(`season=${encodeURIComponent(season)}`);
        parts.push(`episode=${encodeURIComponent(episode)}`);
    }

    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://atlantic.st',
        'Referer': 'https://atlantic.st/',
        'User-Agent': HEADERS['User-Agent']
    };

    const result = await fetchJson(`${NATSUKI_BASE}?${parts.join('&')}`, { headers });
    if (!result.ok || !result.data || !Array.isArray(result.data.subtitles)) {
        return [];
    }

    const tracks = [];
    const langCount = {};
    for (let i = 0; i < result.data.subtitles.length; i++) {
        const item = result.data.subtitles[i];
        if (!item || !item.url) continue;

        const code = normalizeLanguageCode(item.language || item.langCode);
        if (!code) continue;

        const currentCount = langCount[code] || 0;
        if (maxPerLang > 0 && currentCount >= maxPerLang) continue;
        langCount[code] = currentCount + 1;

        const baseName = getLanguageDisplayName(code);
        tracks.push({
            url: item.url,
            language: code,
            name: currentCount > 0 ? `${baseName} #${currentCount + 1}` : baseName
        });
    }
    return tracks;
}

/** OpenSubtitles (Stremio v3 fallback with REST support) */
export async function fetchOpenSubtitles(imdbId, mediaType, season, episode, maxPerLang = 3) {
    if (!imdbId) return [];
    const isTv = mediaType === 'tv' || mediaType === 'series';

    // Primary OpenSubtitles v3 (Stremio proxy)
    try {
        const subUrl = isTv
            ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season || 1}:${episode || 1}.json`
            : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

        const res = await fetchJson(subUrl, {
            headers: { 'User-Agent': HEADERS['User-Agent'] }
        });

        if (res.ok && Array.isArray(res.data?.subtitles) && res.data.subtitles.length > 0) {
            const tracks = [];
            const langCount = {};
            for (const sub of res.data.subtitles) {
                if (!sub || !sub.url || typeof sub.url !== 'string') continue;
                const code = normalizeLanguageCode(sub.lang || 'en');
                const currentCount = langCount[code] || 0;
                if (maxPerLang > 0 && currentCount >= maxPerLang) continue;
                langCount[code] = currentCount + 1;

                const baseName = getLanguageDisplayName(code);
                tracks.push({
                    url: sub.url,
                    language: code,
                    name: currentCount > 0 ? `${baseName} #${currentCount + 1}` : baseName
                });
            }
            if (tracks.length > 0) return tracks;
        }
    } catch (e) {}

    // Secondary legacy REST
    try {
        const cleanId = String(imdbId).replace(/^tt/, '');
        const hasEpisode = Boolean(isTv && season && episode);
        const path = '/search/' +
            (hasEpisode ? `episode-${encodeURIComponent(episode)}/` : '') +
            `imdbid-${encodeURIComponent(cleanId)}` +
            (hasEpisode ? `/season-${encodeURIComponent(season)}` : '');

        const res = await fetchJson(OPENSUBS_BASE + path, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': HEADERS['User-Agent'],
                'X-User-Agent': OPENSUBS_USER_AGENT
            }
        });

        if (res.ok && Array.isArray(res.data)) {
            const tracks = [];
            const langCount = {};
            for (let i = 0; i < res.data.length; i++) {
                const item = res.data[i];
                if (!item || !item.SubDownloadLink) continue;
                const code = normalizeLanguageCode(item.LanguageName || item.ISO639);
                if (!code) continue;
                const currentCount = langCount[code] || 0;
                if (maxPerLang > 0 && currentCount >= maxPerLang) continue;
                langCount[code] = currentCount + 1;

                const url = String(item.SubDownloadLink)
                    .replace(/\.gz$/i, '')
                    .replace('/download/', '/download/subencoding-utf8/');

                const baseName = getLanguageDisplayName(code);
                tracks.push({
                    url,
                    language: code,
                    name: currentCount > 0 ? `${baseName} #${currentCount + 1}` : baseName
                });
            }
            return tracks;
        }
    } catch (e) {}

    return [];
}

/**
 * Concurrently queries all subtitle providers with Cinejoy official API as primary.
 */
export async function fetchAllSubtitles(tmdbId, mediaType, season, episode, imdbId, maxPerLang = 3) {
    const jobs = [
        fetchCinejoySubtitles(tmdbId, mediaType, season, episode, maxPerLang),
        fetchGranite(tmdbId, mediaType, season, episode, maxPerLang),
        fetchNatsuki(imdbId, season, episode, maxPerLang),
        fetchOpenSubtitles(imdbId, mediaType, season, episode, maxPerLang)
    ];

    const settled = await Promise.all(jobs.map(job => job.catch(() => [])));

    const allTracks = [];
    const seen = new Set();
    const langTotals = {};

    for (const list of settled) {
        if (!Array.isArray(list)) continue;
        for (const track of list) {
            if (!track || !track.url) continue;
            if (seen.has(track.url)) continue;

            const code = track.language || 'en';
            const count = langTotals[code] || 0;
            if (maxPerLang > 0 && count >= maxPerLang) continue;

            seen.add(track.url);
            langTotals[code] = count + 1;
            allTracks.push(track);
        }
    }

    return allTracks;
}
