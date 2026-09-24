import { EXTRA_SOURCES } from './constants.js';
import { buildJsonApiHeaders, buildPlaybackHeaders, fetchJson } from './utils.js';

/**
 * Aether's other token-free sources (link / lul).
 *
 * Each is a small JSON API that answers with a ready-to-play HLS playlist for a TMDB id.
 * They share one contract, so one loop covers all of them:
 *
 *   GET /movie/:tmdbId
 *   GET /tv/:tmdbId/:season/:episode
 *     -> 200 {"stream":"<playlist url>"}
 *
 * A source that has nothing for the title answers 404, which is skipped rather than
 * treated as an error — coverage differs per source, and that is exactly why several are
 * queried. Every source that answers is returned, so the user gets a real choice.
 *
 * The header split is deliberate and was verified, not guessed: the JSON call carries the
 * browser-ish set that Cloudflare on the source host requires, while the stream is handed
 * out with the minimal set, because link's CDN answers 403 to playback requests that carry
 * a Referer (and 200 with real MPEG-TS without one).
 */
export async function fetchExtraSources(tmdbId, mediaType, season, episode) {
    const headers = buildJsonApiHeaders();
    const playbackHeaders = buildPlaybackHeaders();

    const promises = EXTRA_SOURCES.map(async (source) => {
        const url = mediaType === 'tv'
            ? `${source.host}/tv/${tmdbId}/${season}/${episode}`
            : `${source.host}/movie/${tmdbId}`;

        try {
            const result = await fetchJson(url, headers);
            const body = result.data;

            if (!result.ok || !body || typeof body.stream !== 'string' || body.stream.indexOf('http') !== 0) {
                return null;
            }

            return {
                source,
                url: body.stream,
                title: typeof body.title === 'string' ? body.title : '',
                headers: playbackHeaders
            };
        } catch {
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter(entry => entry !== null);
}
