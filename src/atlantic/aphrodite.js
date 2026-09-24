import { APHRODITE } from './constants.js';
import { signHeaders, clearSession } from './gate.js';
import { briefUrl, fetchJsonWithRetry, loadMaster, log, summarise, variantIsPlayable } from './utils.js';

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
    log('aphrodite: GET ' + path);

    let response;
    try {
        response = await request(path);
    } catch (error) {
        log('aphrodite: request threw (' + error.message + ')');
        return null;
    }
    log('aphrodite: API HTTP ' + response.status + ' -> ' + summarise(response.data));

    // A dead session answers exactly like a title the source has never heard of,
    // so `renew` is the only signal that it is worth retrying.
    if (response.data && response.data.renew) {
        log('aphrodite: session expired, re-handshaking and retrying once');
        clearSession('aphrodite');
        try {
            response = await request(path);
        } catch (error) {
            log('aphrodite: retry threw (' + error.message + ')');
            return null;
        }
        log('aphrodite: retry HTTP ' + response.status + ' -> ' + summarise(response.data));
    }

    const data = response.data;
    if (!data || !data.found) {
        log('aphrodite: dropped — source has no stream for this title');
        return null;
    }

    const url = data.hls || ((data.type === 'hls' || data.format === 'hls') ? data.url : '');
    if (!url) {
        log('aphrodite: dropped — response had no HLS url (keys: ' + keysOf(data) + ')');
        return null;
    }
    log('aphrodite: playlist ' + briefUrl(url));

    const playlist = await loadMaster(url, PLAYLIST_TIMEOUT_MS);
    if (!playlist) {
        log('aphrodite: dropped — master playlist unusable');
        return null;
    }

    // Confirm the top rendition is really served before advertising the source.
    const top = playlist.variants[0];
    if (top && !(await variantIsPlayable(top.url, playlist.headers, PLAYLIST_TIMEOUT_MS))) {
        log('aphrodite: dropped — top variant (' + top.height + 'p) is not being served');
        return null;
    }

    log('aphrodite: OK — ' + playlist.variants.length + ' renditions, top ' +
        (top ? top.height + 'p' : 'n/a'));

    return {
        label: APHRODITE.label,
        url: url,
        headers: playlist.headers,
        variants: playlist.variants,
        hasSeparateAudio: playlist.hasSeparateAudio,
        meta: { title: data.title || '', updatedAt: data.updated_at || '' }
    };
}
