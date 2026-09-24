import {
    LANGUAGE_CODES,
    LANGUAGE_NAMES,
    QUALITY_LABELS,
    REGION_HOST_SUFFIX,
    TMDB_API_KEY,
    TMDB_BASE,
    USER_AGENT
} from './constants.js';

/**
 * fetch + JSON parse, never throwing on non-2xx.
 *
 * **No timeout.** The Nuvio sandbox has no timer primitive at all, so the old
 * `Promise.race([fetch, new Promise((_, r) => setTimeout(...))])` idiom threw
 * `setTimeout is not defined` synchronously and every call returned
 * `{ ok: false, status: 0 }` — which is exactly the `HTTP 0` this provider used
 * to report on-device for every source. The native fetch bridge's own 60 s
 * connect timeout is the only bound available; there is nothing to configure here.
 */
export async function fetchJson(url, headers) {
    try {
        const response = await fetch(url, { headers });
        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (parseError) {
            data = null;
        }
        return { ok: response.ok, status: response.status, data, text };
    } catch (error) {
        return { ok: false, status: 0, data: null, text: '', error: error.message };
    }
}

/** FEM API rejects bare requests, so we present the Aether mirror as origin. */export function buildFemHeaders(site) {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': site,
        'Referer': site + '/',
        'User-Agent': USER_AGENT
    };
}

/** Headers handed to the player for the actual stream URL. */
export function buildPlaybackHeaders() {
    return { 'User-Agent': USER_AGENT };
}

/**
 * Headers for Aether's token-free endpoint, which sits behind Cloudflare.
 *
 * These are **required**, not cosmetic. Verified live: the same URL answers
 * 403 "Sorry, you have been blocked" without the Sec-Fetch-* pair and 200 with it.
 * Aether's own code sets no headers because it runs in a browser, which adds this
 * whole set automatically.
 *
 * The returned set is also used as the playback headers for that stream, because the
 * m3u8 and its segments are served from the same Cloudflare-protected host and 403
 * without them too.
 */
export function buildTokenFreeHeaders(site) {
    const origin = site || 'https://aether.st';
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': origin,
        'Referer': origin + '/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': USER_AGENT
    };
}

/**
 * Headers for the other token-free Aether APIs (tiki / link / lul), which sit behind the
 * same Cloudflare setup. This exact set was verified to work both for the JSON call and
 * for fetching the playlist URL it returns, so it is reused as the playback headers.
 */
export function buildJsonApiHeaders() {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://aether.st',
        'Referer': 'https://aether.st/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': USER_AGENT
    };
}

export function languageNameToCode(name) {
    if (!name) return null;
    const key = String(name).trim().toLowerCase();
    return LANGUAGE_CODES[key] || null;
}

export function languageDisplayName(code, original) {
    return LANGUAGE_NAMES[code] || original || code;
}

/** FEM returns uppercase quality labels; fall back to the raw label. */
export function normalizeQuality(label) {
    if (!label) return 'Auto';
    const key = String(label).trim().toUpperCase();
    return QUALITY_LABELS[key] || String(label).trim();
}

/**
 * Re-point a FebBox CDN URL at a nearer edge node, e.g.
 * https://abc.xyz/file.mp4 -> https://USA7.shegu.net/file.mp4
 */
export function rewriteRegionHost(url, regionCode) {
    if (!url || !regionCode) return url;
    try {
        const parsed = new URL(url);
        parsed.hostname = regionCode + REGION_HOST_SUFFIX;
        return parsed.toString();
    } catch (error) {
        return url;
    }
}

export async function resolveToTmdbId(rawId, isTv = false) {
    if (!rawId) return null;
    let id = String(rawId).trim();
    if (id.toLowerCase().startsWith('tmdb:')) {
        return id.replace(/^tmdb:/i, '');
    }
    if (/^tt\d+$/i.test(id)) {
        try {
            const url = `${TMDB_BASE}/find/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
            const result = await fetchJson(url, { 'User-Agent': USER_AGENT });
            const data = result.data || {};
            const list = isTv ? (data.tv_results || []) : (data.movie_results || []);
            if (list.length > 0 && list[0].id) {
                return String(list[0].id);
            }
            const otherList = isTv ? (data.movie_results || []) : (data.tv_results || []);
            if (otherList.length > 0 && otherList[0].id) {
                return String(otherList[0].id);
            }
        } catch {
            return id;
        }
    }
    return id;
}

export function getTmdbMeta(tmdbId, mediaType) {
    const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
    const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    return fetchJson(url, { 'User-Agent': USER_AGENT })
        .then(result => {
            const data = result.data || {};
            const releaseDate = data.release_date || data.first_air_date || '';
            return {
                name: data.title || data.name || null,
                year: releaseDate ? releaseDate.split('-')[0] : '',
                duration: data.runtime ? `${data.runtime} min` : ''
            };
        })
        .catch(() => ({ name: null, year: '', duration: '' }));
}

export function getEpisodeMeta(tmdbId, season, episode) {
    if (!tmdbId || !season || !episode) return Promise.resolve(null);
    const url = `${TMDB_BASE}/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    return fetchJson(url, { 'User-Agent': USER_AGENT })
        .then(result => {
            const data = result.data || {};
            return {
                name: data.name || null,
                duration: data.runtime ? `${data.runtime} min` : ''
            };
        })
        .catch(() => null);
}

export function buildCleanTitle(label, quality, format) {
    const q = (quality && quality !== 'Auto') ? ` [${quality}]` : '';
    const f = format ? ` (${format.toUpperCase()})` : '';
    return `${PROVIDER_NAME} - ${label}${q}${f}`;
}

/** Nuvio shows `title` (and mirrors it into size/description) in the stream list. */
export function buildStreamTitle(meta, epMeta, quality, format, season, episode, region) {
    const name = (meta && meta.name) || 'Unknown';
    let line1;
    if (season && episode) {
        line1 = `🍿 ${name} S${season}E${episode}`;
        if (epMeta && epMeta.name) line1 += ` - ${epMeta.name}`;
    } else {
        line1 = `🍿 ${name}`;
        if (meta && meta.year) line1 += ` (${meta.year})`;
    }

    const line2 = `⚡ ${quality} | 📦 ${format} | 🌀 Aether`;

    const duration = (epMeta && epMeta.duration) || (meta && meta.duration) || '';
    const parts = [];
    if (duration) parts.push(`⏱ ${duration}`);
    if (region) parts.push(`🌍 ${region}`);
    const line3 = parts.length ? parts.join(' | ') : '';

    return line3 ? `${line1}\n${line2}\n${line3}` : `${line1}\n${line2}`;
}

/** FEM occasionally repeats a subtitle track; keep the first of each url+language. */
export function dedupeSubtitles(tracks) {
    const seen = {};
    const out = [];
    (tracks || []).forEach(track => {
        if (!track || !track.url) return;
        const key = `${track.language || 'und'}|${track.url}`;
        if (seen[key]) return;
        seen[key] = true;
        out.push(track);
    });
    return out;
}
