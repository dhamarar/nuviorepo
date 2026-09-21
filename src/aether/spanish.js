import {
    MAX_LANG_ATTEMPTS,
    SPANISH_HOSTS,
    SPANISH_LANGS,
    SPANISH_LANG_ORDER
} from './constants.js';
import { buildTokenFreeHeaders, fetchJson } from './utils.js';

/**
 * Aether's built-in, token-free source.
 *
 * Aether registers this endpoint three times — `aether-latino`, `aether-castellano`
 * and `aether-subtitulado` — differing only by the `lang` query value, and all three
 * are enabled with no token requirement. They are what the Aether site can still play
 * when a viewer has not set up a FebBox token, so they act as the fallback here.
 *
 * The endpoint answers JSON containing the playlist URL. It never redirects, so the
 * URL must be read from the body — not from the response URL.
 *
 * If the requested language is not offered for a title the service answers
 * 404 {"error":"lang_not_available","available":[...]} and names what it does have,
 * which we then use instead of giving up.
 */
export async function fetchSpanishPlaylist(tmdbId, mediaType, season, episode, lang) {
    const path = mediaType === 'tv'
        ? `/tv/${tmdbId}/${season}/${episode}`
        : `/movie/${tmdbId}`;

    const attempts = [];

    for (const host of SPANISH_HOSTS) {
        let queue = [lang].concat(SPANISH_LANG_ORDER.filter(entry => entry !== lang));
        const tried = {};
        let used = 0;

        while (queue.length > 0 && used < MAX_LANG_ATTEMPTS) {
            const candidate = queue.shift();
            if (tried[candidate]) continue;
            tried[candidate] = true;
            used += 1;

            const url = `${host}${path}?lang=${encodeURIComponent(candidate)}`;
            const result = await fetchJson(url, buildTokenFreeHeaders('https://aether.st'));
            const body = result.data || {};

            if (result.ok && body.url) {
                return {
                    url: body.url,
                    lang: candidate,
                    label: SPANISH_LANGS[candidate] || candidate,
                    server: body.server || '',
                    host,
                    requested: url
                };
            }

            const reason = body.error || `HTTP ${result.status}`;
            attempts.push(`${host} lang=${candidate} -> ${reason}`);

            if (body.error === 'lang_not_available') {
                // The service told us exactly what it has; drop every other candidate.
                queue = (body.available || [])
                    .map(entry => String(entry).toLowerCase())
                    .filter(entry => !!SPANISH_LANGS[entry] && !tried[entry]);
            } else if (body.error === 'tmdb_not_found') {
                // A missing TMDB->IMDb mapping will not improve on another host.
                throw new Error(`Aether token-free source has no stream for this title (${reason})`);
            }
        }
    }

    const error = new Error(`Aether token-free source unavailable (${attempts.join('; ')})`);
    error.attempts = attempts;
    throw error;
}
