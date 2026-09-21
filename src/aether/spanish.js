import { SPANISH_HOSTS, SPANISH_LANGS } from './constants.js';
import { buildTokenFreeHeaders, fetchFinalUrl } from './utils.js';

/**
 * Aether's built-in, token-free source.
 *
 * Aether registers this endpoint three times — `aether-latino`, `aether-castellano`
 * and `aether-subtitulado` — differing only by the `lang` query value, and all three
 * are enabled with no token requirement. They are what the Aether site can still play
 * when a viewer has not set up a FebBox token, which is why they are used here as the
 * fallback for the token-gated FEM API.
 *
 * The response is not JSON: the playlist URL is the URL the request ends on, so
 * redirects are followed and the final URL is used (same thing Aether reads).
 */
export async function fetchSpanishPlaylist(tmdbId, mediaType, season, episode, lang) {
    const path = mediaType === 'tv'
        ? `/tv/${tmdbId}/${season}/${episode}`
        : `/movie/${tmdbId}`;

    const attempts = [];

    for (const host of SPANISH_HOSTS) {
        const url = `${host}${path}?lang=${encodeURIComponent(lang)}`;
        const result = await fetchFinalUrl(url, buildTokenFreeHeaders('https://aether.st'));

        if (result.ok && result.url) {
            return { url: result.url, host, requested: url, label: SPANISH_LANGS[lang] || lang };
        }

        const detail = result.error ? `${result.error}` : `HTTP ${result.status}`;
        attempts.push(`${host} -> ${detail}`);
    }

    const error = new Error(`Aether token-free source unavailable (${attempts.join('; ')})`);
    error.attempts = attempts;
    throw error;
}
