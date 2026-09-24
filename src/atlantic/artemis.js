import { ARTEMIS } from './constants.js';
import { signHeaders, clearSession } from './gate.js';
import { fetchJsonWithRetry, loadMaster, variantIsPlayable } from './utils.js';

/**
 * Artemis — Atlantic's second source.
 *
 *   GET  {base}/resolve?tmdbId=:id&type=movie|tv[&season=:s&episode=:e]
 *   ->   { found: true, format: "hls", url: "<master playlist>",
 *          source: "Orbit", availableSources: ["Orbit","Nova","Astra"] }
 *   ->   401 { renew: true }   session expired; re-handshake and retry once
 *
 * Artemis fans out to three upstreams (Orbit / Nova / Astra) and picks one
 * itself — the endpoint ignores any `source`/`src`/`server` parameter (all
 * verified). When it lands on a broken upstream the master still answers 200 and
 * every variant inside it 502s, so the source has to be probed rather than trusted.
 *
 * The query string is built once and reused for the signature and the fetch,
 * because the path is part of the signed message.
 */

const API_TIMEOUT_MS = 12000;
const PLAYLIST_TIMEOUT_MS = 10000;

function buildPath(tmdbId, mediaType, season, episode) {
    const parts = ['tmdbId=' + encodeURIComponent(tmdbId), 'type=' + encodeURIComponent(mediaType)];
    if (mediaType === 'tv') {
        parts.push('season=' + encodeURIComponent(season || 1));
        parts.push('episode=' + encodeURIComponent(episode || 1));
    }
    return '/resolve?' + parts.join('&');
}

async function request(path) {
    const headers = await signHeaders('artemis', path);
    const result = await fetchJsonWithRetry(ARTEMIS.base + path, { headers: headers }, API_TIMEOUT_MS, 2);
    return { status: result.status, data: result.data };
}

/** Returns a `{ url, headers, playlist }` descriptor, or null when unavailable. */
export async function fetchArtemis(tmdbId, mediaType, season, episode) {
    const path = buildPath(tmdbId, mediaType, season, episode);

    let response;
    try {
        response = await request(path);
    } catch (error) {
        return null;
    }

    if (response.status === 401 && response.data && response.data.renew) {
        clearSession('artemis');
        try {
            response = await request(path);
        } catch (error) {
            return null;
        }
    }

    const data = response.data;
    if (!data || !data.found || !data.url) return null;

    const playlist = await loadMaster(data.url, PLAYLIST_TIMEOUT_MS);
    if (!playlist) return null;

    const top = playlist.variants[0];
    if (top && !(await variantIsPlayable(top.url, playlist.headers, PLAYLIST_TIMEOUT_MS))) {
        return null;
    }

    return {
        label: ARTEMIS.label,
        url: data.url,
        headers: playlist.headers,
        variants: playlist.variants,
        hasSeparateAudio: playlist.hasSeparateAudio,
        meta: { upstream: data.source || '', available: data.availableSources || [] }
    };
}
