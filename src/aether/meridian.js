import { USER_AGENT } from './constants.js';
import { fetchJson, languageDisplayName, languageNameToCode } from './utils.js';

const MERIDIAN_HOST = 'https://meridian.aether.cx';

function apiHeaders() {
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

/**
 * Meridian — Aether's token-free **movies** source, and the only one that ships subtitles.
 *
 *   GET https://meridian.aether.cx/movie/:tmdbId
 *     -> 200 {"title":"Fight Club","url":"https://cdn.neuronix.sbs/segment/<hash>/?token1=…",
 *             "subtitles":[{"language":"English","url":"https://cdn.turova.store/subtitle/…","type":"vtt"}]}
 *
 * Verified live 2026-09-21:
 *   - Movies only. `/tv/:id/:season/:episode` answers HTML 404.
 *   - Subtitle count varies by title: 23 for Fight Club (English, French, German, Czech,
 *     Danish, Dutch, Finnish, …), 1 for Inception.
 *   - `url` is a media playlist whose entries are TS segments directly (no nested variant),
 *     so the player walks it in one hop.
 *
 * Two header quirks, both found only by trying profiles:
 *   - The delivery CDN (cdn.neuronix.sbs) answers 403 unless the Referer is **its own
 *     origin**; a Referer of the Aether site or of meridian.aether.cx is rejected. The
 *     header therefore has to be derived from each response rather than fixed.
 *   - Subtitles are the opposite: they load only with a bare request, and break if a
 *     Referer or Sec-Fetch header is added.
 */
export async function fetchMeridianMovie(tmdbId) {
    const result = await fetchJson(`${MERIDIAN_HOST}/movie/${tmdbId}`, apiHeaders(), 10000);
    const body = result.data;

    if (!result.ok || !body || typeof body.url !== 'string' || body.url.indexOf('http') !== 0) {
        return null;
    }

    let referer = '';
    try {
        referer = new URL(body.url).origin + '/';
    } catch (error) {
        referer = '';
    }

    const playbackHeaders = referer
        ? { 'User-Agent': USER_AGENT, 'Referer': referer }
        : { 'User-Agent': USER_AGENT };

    const subtitles = (Array.isArray(body.subtitles) ? body.subtitles : [])
        .filter(track => track && typeof track.url === 'string' && track.url.indexOf('http') === 0)
        .map(track => {
            const code = languageNameToCode(track.language) || 'und';
            return {
                url: track.url,
                language: code,
                name: languageDisplayName(code, track.language),
                headers: { 'User-Agent': USER_AGENT }
            };
        });

    return {
        title: typeof body.title === 'string' ? body.title : '',
        url: body.url,
        headers: playbackHeaders,
        subtitles
    };
}
