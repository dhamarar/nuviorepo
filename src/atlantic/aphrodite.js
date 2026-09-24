import { APHRODITE } from './constants.js';
import { signHeaders, clearSession } from './gate.js';
import { fetchJsonWithRetry, loadMaster, variantIsPlayable } from './utils.js';

/**
 * Aphrodite — Atlantic's primary source.
 *
 *   GET  {base}/content/movie/:tmdbId
 *   GET  {base}/content/tv/:tmdbId/:season/:episode
 *   ->   { found: true, type: "hls", url: "<master playlist>" }
 *   ->   { found: false }
 *   ->   { renew: true }   session expired; re-handshake and retry once
 *
 * The signed headers are computed over the exact path being requested, so the
 * path is built once and reused for both the signature and the fetch.
 */

const API_TIMEOUT_MS = 12000;
const PLAYLIST_TIMEOUT_MS = 10000;

function buildPath(tmdbId, mediaType, season, episode) {
    if (mediaType === 'tv') {
        return '/content/tv/' + encodeURIComponent(tmdbId) + '/' +
            encodeURIComponent(season || 1) + '/' + encodeURIComponent(episode || 1);
    }
    return '/content/movie/' + encodeURIComponent(tmdbId);
}

async function request(path) {
    const headers = await signHeaders('aphrodite', path);
    const result = await fetchJsonWithRetry(APHRODITE.base + path, { headers: headers }, API_TIMEOUT_MS, 2);
    return { status: result.status, data: result.data };
}

/** Returns a `{ url, headers, playlist }` descriptor, or null when unavailable. */
export async function fetchAphrodite(tmdbId, mediaType, season, episode) {
    const path = buildPath(tmdbId, mediaType, season, episode);

    let response;
    try {
        response = await request(path);
    } catch (error) {
        return null;
    }

    // A dead session answers exactly like a title the source has never heard of,
    // so `renew` is the only signal that it is worth retrying.
    if (response.data && response.data.renew) {
        clearSession('aphrodite');
        try {
            response = await request(path);
        } catch (error) {
            return null;
        }
    }

    const data = response.data;
    if (!data || !data.found) return null;

    const url = data.hls || ((data.type === 'hls' || data.format === 'hls') ? data.url : '');
    if (!url) return null;

    const playlist = await loadMaster(url, PLAYLIST_TIMEOUT_MS);
    if (!playlist) return null;

    // Confirm the top rendition is really served before advertising the source.
    const top = playlist.variants[0];
    if (top && !(await variantIsPlayable(top.url, playlist.headers, PLAYLIST_TIMEOUT_MS))) {
        return null;
    }

    return {
        label: APHRODITE.label,
        url: url,
        headers: playlist.headers,
        variants: playlist.variants,
        hasSeparateAudio: playlist.hasSeparateAudio,
        meta: { title: data.title || '', updatedAt: data.updated_at || '' }
    };
}
