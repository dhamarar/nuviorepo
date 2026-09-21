import {
    LANGUAGE_CODES,
    LANGUAGE_NAMES,
    QUALITY_LABELS,
    REGION_HOST_SUFFIX,
    TMDB_API_KEY,
    TMDB_BASE,
    USER_AGENT
} from './constants.js';

/** fetch + JSON parse with a hard timeout, never throwing on non-2xx. */
export async function fetchJson(url, headers, timeoutMs = 15000) {
    let timer = null;
    try {
        const response = await Promise.race([
            fetch(url, { headers }),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
            })
        ]);
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
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** FEM API rejects bare requests, so we present the Aether mirror as origin. */
export function buildFemHeaders(site) {
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

export function getTmdbMeta(tmdbId, mediaType) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    return fetchJson(url, { 'User-Agent': USER_AGENT }, 12000)
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
    return fetchJson(url, { 'User-Agent': USER_AGENT }, 12000)
        .then(result => {
            const data = result.data || {};
            return {
                name: data.name || null,
                duration: data.runtime ? `${data.runtime} min` : ''
            };
        })
        .catch(() => null);
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
