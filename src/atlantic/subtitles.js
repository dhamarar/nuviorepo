import {
    GRANITE_BASE,
    NATSUKI_BASE,
    OPENSUBS_BASE,
    OPENSUBS_USER_AGENT,
    USER_AGENT
} from './constants.js';
import {
    fetchJson,
    languageDisplayName,
    languageNameToCode,
    natsukiHeaders
} from './utils.js';

/**
 * The three subtitle backends Atlantic itself queries. All are reachable without
 * an account, which is why subtitles work here even though Atlantic's stream
 * sources need a signed session.
 *
 *   Granite        https://sub.vdrk.site/v1/{movie/:id|tv/:id/:s/:e}  -> [{ label, file }]
 *   Natsuki        https://natsuki.hls.lol/subs?imdbId=&season=&episode=
 *                                                                    -> { subtitles: [...] }
 *   OpenSubtitles  https://rest.opensubtitles.org/search/imdbid-...  -> [ { LanguageName, ... } ]
 *
 * Two things these backends do not tell you, both verified live:
 *
 *  - Natsuki ignores `tmdbId` (it answers `{ cached: false, subtitles: [] }` for
 *    every title) and only serves `imdbId`. The TMDB -> IMDb lookup is therefore
 *    load-bearing, not a nicety.
 *  - Natsuki 403s with `forbidden` unless the request carries Atlantic's own
 *    Origin/Referer, and its `.srt` files need the same pair. The headers travel
 *    with each subtitle so the player can fetch them too.
 */

const SUBTITLE_TIMEOUT_MS = 12000;

/** Granite — keyed by TMDB id, serves VTT, needs no special headers. */
async function fetchGranite(tmdbId, mediaType, season, episode) {
    const url = mediaType === 'tv'
        ? GRANITE_BASE + '/tv/' + encodeURIComponent(tmdbId) + '/' +
            encodeURIComponent(season || 1) + '/' + encodeURIComponent(episode || 1)
        : GRANITE_BASE + '/movie/' + encodeURIComponent(tmdbId);

    const result = await fetchJson(url, { 'User-Agent': USER_AGENT }, SUBTITLE_TIMEOUT_MS);
    if (!result.ok || !Array.isArray(result.data)) return [];

    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (!item || !item.file || !item.label) continue;

        const label = String(item.label);
        const hearingImpaired = /hi\d*$/i.test(label);
        // "English2" / "English HI" -> "English"
        const base = label.replace(/\s*hi\d*$/i, '').replace(/\d+$/, '');
        const code = languageNameToCode(base);
        if (!code) continue;

        tracks.push({
            url: item.file,
            language: code,
            name: label,
            hearingImpaired: hearingImpaired,
            source: 'granite'
        });
    }
    return tracks;
}

/** Natsuki — keyed by IMDb id, serves SRT, requires Atlantic's Origin/Referer. */
async function fetchNatsuki(imdbId, season, episode) {
    if (!imdbId) return [];

    const parts = ['imdbId=' + encodeURIComponent(imdbId)];
    if (season && episode) {
        parts.push('season=' + encodeURIComponent(season));
        parts.push('episode=' + encodeURIComponent(episode));
    }

    const headers = natsukiHeaders();
    const result = await fetchJson(
        NATSUKI_BASE + '?' + parts.join('&'),
        { headers: headers },
        SUBTITLE_TIMEOUT_MS
    );
    if (!result.ok || !result.data || !Array.isArray(result.data.subtitles)) return [];

    const tracks = [];
    for (let i = 0; i < result.data.subtitles.length; i++) {
        const item = result.data.subtitles[i];
        if (!item || !item.url) continue;

        const code = languageNameToCode(item.language) || languageNameToCode(item.langCode);
        if (!code) continue;

        tracks.push({
            url: item.url,
            language: code,
            name: item.fileName || languageDisplayName(code),
            headers: headers,
            source: 'natsuki'
        });
    }
    return tracks;
}

/** OpenSubtitles (legacy REST) — keyed by IMDb id, serves gzipped SRT. */
async function fetchOpenSubtitles(imdbId, season, episode) {
    if (!imdbId) return [];

    const id = String(imdbId).replace(/^tt/, '');
    const hasEpisode = Boolean(season && episode);
    const path = '/search/' +
        (hasEpisode ? 'episode-' + encodeURIComponent(episode) + '/' : '') +
        'imdbid-' + encodeURIComponent(id) +
        (hasEpisode ? '/season-' + encodeURIComponent(season) : '');

    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': USER_AGENT,
        'X-User-Agent': OPENSUBS_USER_AGENT
    };

    const result = await fetchJson(OPENSUBS_BASE + path, { headers: headers }, SUBTITLE_TIMEOUT_MS);
    if (!result.ok || !Array.isArray(result.data)) return [];

    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (!item || !item.SubDownloadLink) continue;

        const code = languageNameToCode(item.LanguageName);
        if (!code) continue;

        // The API hands back a gzip wrapper; ask for the UTF-8 variant instead so
        // the player does not have to decompress.
        const url = String(item.SubDownloadLink)
            .replace(/\.gz$/i, '')
            .replace('/download/', '/download/subencoding-utf8/');

        tracks.push({
            url: url,
            language: code,
            name: item.LanguageName || languageDisplayName(code),
            headers: { 'User-Agent': USER_AGENT },
            source: 'opensubs'
        });
    }
    return tracks;
}

/**
 * Query the enabled backends in parallel and merge the result.
 *
 * Order matters: Granite first (VTT, headerless — the most likely to just work),
 * then Natsuki (widest coverage), then OpenSubtitles.
 */
export async function fetchSubtitles(options, settings) {
    const jobs = [];

    if (settings.enableGranite) {
        jobs.push(fetchGranite(options.tmdbId, options.mediaType, options.season, options.episode));
    }
    if (settings.enableNatsuki) {
        jobs.push(fetchNatsuki(options.imdbId, options.season, options.episode));
    }
    if (settings.enableOpenSubtitles) {
        jobs.push(fetchOpenSubtitles(options.imdbId, options.season, options.episode));
    }

    if (!jobs.length) return [];

    const settled = await Promise.all(jobs.map(job => job.catch(() => [])));
    return settled.map(list => (Array.isArray(list) ? list : []));
}
