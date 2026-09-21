import { PROVIDER_NAME, QUALITY_RANK, REGION_MAP, SPANISH_LANGS } from './constants.js';
import { FemError, checkToken, fetchHlsPayload, fetchMp4Payload } from './femapi.js';
import { fetchExtraSources } from './extras.js';
import { fetchMeridianMovie } from './meridian.js';
import { fetchSpanishPlaylist } from './spanish.js';
import {
    buildPlaybackHeaders,
    buildStreamTitle,
    buildTokenFreeHeaders,
    dedupeSubtitles,
    getEpisodeMeta,
    getTmdbMeta,
    languageDisplayName,
    languageNameToCode,
    normalizeQuality,
    resolveToTmdbId,
    rewriteRegionHost
} from './utils.js';

function readSettings() {
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const token = String(settings.febboxToken || '').trim();
    const regionKey = String(settings.region || '').trim();
    const spanishLang = SPANISH_LANGS[settings.spanishLang] ? settings.spanishLang : 'sub';
    return {
        token,
        regionKey,
        regionCode: REGION_MAP[regionKey] || '',
        preferHls: settings.preferHls === true,
        spanishLang,
        // Default on: these are the only sources that work before a token is set.
        enableSpanish: settings.enableSpanish !== false,
        enableExtraSources: settings.enableExtraSources !== false
    };
}

function mapSubtitles(rawTracks, headers) {
    const mapped = (rawTracks || [])
        .filter(track => track && track.url)
        .map(track => {
            const code = languageNameToCode(track.language) || 'und';
            return {
                url: track.url,
                language: code,
                name: languageDisplayName(code, track.language),
                headers
            };
        });
    return dedupeSubtitles(mapped);
}

function buildMp4Streams(payload, meta, epMeta, season, episode, regionCode, headers) {
    const subtitles = mapSubtitles(payload.subtitles, headers);

    const streams = payload.sources
        .filter(source => source && source.url)
        .map(source => {
            const quality = normalizeQuality(source.quality);
            const title = buildStreamTitle(meta, epMeta, quality, 'MP4', season, episode, regionCode);
            return {
                name: `${PROVIDER_NAME} | ${quality}`,
                title,
                url: rewriteRegionHost(source.url, regionCode),
                quality,
                format: 'mp4',
                headers,
                subtitles,
                provider: 'aether'
            };
        });

    streams.sort((a, b) => (QUALITY_RANK[b.quality] || 0) - (QUALITY_RANK[a.quality] || 0));
    return streams;
}

function buildHlsStream(payload, meta, epMeta, season, episode, regionCode, headers) {
    const subtitles = mapSubtitles(payload.subtitles, headers);
    const quality = 'Auto';
    const title = buildStreamTitle(meta, epMeta, quality, 'HLS', season, episode, regionCode);

    return {
        name: `${PROVIDER_NAME} | HLS`,
        title,
        url: rewriteRegionHost(payload.hls, regionCode),
        quality,
        format: 'm3u8',
        headers,
        subtitles,
        provider: 'aether'
    };
}

function buildMeridianStream(entry, meta, epMeta, season, episode) {
    const subNote = entry.subtitles.length ? `💬 ${entry.subtitles.length} subs` : '';
    const title = `${buildStreamTitle(meta, epMeta, 'Auto', 'HLS', season, episode, '')}\n🔓 Token-free · Meridian${subNote ? ' | ' + subNote : ''}`;

    return {
        name: `${PROVIDER_NAME} | Meridian`,
        title,
        size: title,
        description: title,
        url: entry.url,
        quality: 'Auto',
        format: 'm3u8',
        headers: entry.headers,
        subtitles: entry.subtitles,
        provider: 'aether'
    };
}

function buildExtraStream(entry, meta, epMeta, season, episode) {
    const label = entry.source.label;
    const title = `${buildStreamTitle(meta, epMeta, 'Auto', 'HLS', season, episode, '')}\n🔓 Token-free · ${label}`;

    return {
        name: `${PROVIDER_NAME} | ${label}`,
        title,
        url: entry.url,
        quality: 'Auto',
        format: 'm3u8',
        // Verified: the playlist loads with the same headers the API call needed.
        headers: entry.headers,
        subtitles: [],
        provider: 'aether'
    };
}

function buildSpanishStream(playlist, meta, epMeta, season, episode) {
    const label = playlist.label || 'ES';
    const title = `${buildStreamTitle(meta, epMeta, label, 'HLS', season, episode, '')}\n🔓 Token-free source`;

    return {
        name: `${PROVIDER_NAME} | ${label}`,
        title,
        url: playlist.url,
        quality: 'Auto',
        format: 'm3u8',
        // This host sits behind Cloudflare and 403s without these headers, so they
        // have to travel with the stream — the m3u8 and its segments need them too.
        headers: buildTokenFreeHeaders('https://aether.st'),
        subtitles: [],
        provider: 'aether'
    };
}

function logFailure(kind, error) {
    if (error instanceof FemError) {
        console.log(`[Aether] FEM ${kind} unavailable (${error.reason}): ${error.message}`);
        if (error.reason === 'bad-token') {
            console.log('[Aether] The FebBox token looks invalid or expired — re-copy the `ui` cookie from febbox.com.');
        } else if (error.reason === 'not-found') {
            console.log('[Aether] Title is not in the FebBox catalogue, so FEM has nothing to return.');
        }
        return;
    }
    console.log(`[Aether] FEM ${kind} failed: ${error.message}`);
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const { token, regionCode, preferHls, spanishLang, enableSpanish, enableExtraSources } = readSettings();

    const headers = buildPlaybackHeaders();

    const isTv = mediaType === 'tv' || mediaType === 'series' || mediaType === 'anime' || (season != null && episode != null);
    const normType = isTv ? 'tv' : 'movie';
    const normSeason = isTv ? (Number(season) || 1) : null;
    const normEpisode = isTv ? (Number(episode) || 1) : null;

    // Normalize tmdbId (resolves IMDb 'tt...' to TMDB ID if needed)
    const normTmdbId = await resolveToTmdbId(tmdbId, isTv);
    if (!normTmdbId) return [];

    // Query stream sources and metadata concurrently
    const metadataPromise = Promise.all([
        getTmdbMeta(normTmdbId, normType),
        isTv ? getEpisodeMeta(normTmdbId, normSeason, normEpisode) : Promise.resolve(null)
    ]).catch(() => [null, null]);

    const extrasPromise = enableExtraSources
        ? fetchExtraSources(normTmdbId, normType, normSeason, normEpisode).catch(() => [])
        : Promise.resolve([]);

    // Meridian is movies only — its /tv/ route answers HTML 404.
    const meridianPromise = enableExtraSources && !isTv
        ? fetchMeridianMovie(normTmdbId).catch(() => null)
        : Promise.resolve(null);

    const spanishPromise = enableSpanish
        ? fetchSpanishPlaylist(normTmdbId, normType, normSeason, normEpisode, spanishLang).catch(err => {
            console.log(`[Aether] Token-free source unavailable: ${err.message}`);
            return null;
        })
        : Promise.resolve(null);

    const mp4Promise = token
        ? fetchMp4Payload(normTmdbId, normType, normSeason, normEpisode, token).catch(err => {
            logFailure('MP4', err);
            return null;
        })
        : Promise.resolve(null);

    const hlsPromise = token
        ? fetchHlsPayload(normTmdbId, normType, normSeason, normEpisode, token).catch(err => {
            logFailure('HLS', err);
            return null;
        })
        : Promise.resolve(null);

    const [metadata, extraFound, meridianMovie, spanishPlaylist, mp4Payload, hlsPayload] = await Promise.all([
        metadataPromise,
        extrasPromise,
        meridianPromise,
        spanishPromise,
        mp4Promise,
        hlsPromise
    ]);

    const meta = metadata ? metadata[0] : null;
    const epMeta = metadata ? metadata[1] : null;

    const mp4Streams = [];
    const hlsStreams = [];
    const extraStreams = [];
    const tokenFreeStreams = [];

    if (mp4Payload) {
        const built = buildMp4Streams(mp4Payload, meta, epMeta, normSeason, normEpisode, regionCode, headers);
        mp4Streams.push(...built);
        console.log(`[Aether] FEM MP4 via ${mp4Payload.endpoint.api}: ${built.length} stream(s)`);
    }

    if (hlsPayload) {
        hlsStreams.push(buildHlsStream(hlsPayload, meta, epMeta, normSeason, normEpisode, regionCode, headers));
        console.log(`[Aether] FEM HLS via ${hlsPayload.endpoint.api}: ok`);
    }

    if (meridianMovie) {
        extraStreams.push(buildMeridianStream(meridianMovie, meta, epMeta, normSeason, normEpisode));
    }

    if (extraFound && extraFound.length > 0) {
        extraFound.forEach(entry => extraStreams.push(buildExtraStream(entry, meta, epMeta, normSeason, normEpisode)));
    }

    if (meridianMovie || (extraFound && extraFound.length > 0)) {
        const labels = [];
        if (meridianMovie) {
            labels.push('Meridian' + (meridianMovie.subtitles.length ? ' (' + meridianMovie.subtitles.length + ' subs)' : ''));
        }
        if (extraFound) extraFound.forEach(entry => labels.push(entry.source.label));
        console.log(`[Aether] Token-free extras: ${labels.join(', ')}`);
    }

    if (spanishPlaylist) {
        tokenFreeStreams.push(buildSpanishStream(spanishPlaylist, meta, epMeta, normSeason, normEpisode));
        console.log(`[Aether] Token-free source via ${spanishPlaylist.host}: ok (${spanishPlaylist.label}, server=${spanishPlaylist.server || 'n/a'})`);
    }

    if (mp4Streams.length === 0 && hlsStreams.length === 0 && extraStreams.length === 0 && tokenFreeStreams.length === 0) {
        if (token) {
            // A dead token looks exactly like a title FebBox does not carry, so ask the
            // quota endpoint which one it is before telling the user anything.
            const status = await checkToken(token);
            if (status.valid === false && status.reason === 'bad-token') {
                console.log('[Aether] The FebBox token is no longer valid — re-copy the `ui` cookie from febbox.com.');
            } else if (status.valid === false && status.reason === 'unreachable') {
                console.log('[Aether] No Aether FEM API mirror could be reached.');
            } else if (status.valid === true) {
                console.log('[Aether] Token is fine; FEM simply has no stream for this title.');
            } else {
                console.log('[Aether] FEM returned nothing playable for this title.');
            }
        }
        return [];
    }

    const ordered = preferHls ? hlsStreams.concat(mp4Streams) : mp4Streams.concat(hlsStreams);
    return ordered.concat(extraStreams).concat(tokenFreeStreams);
}

async function onSettings() {
    return [
        {
            type: 'header',
            label: 'Aether — FEM API'
        },
        {
            type: 'info',
            label: 'Aether hosts no files. It scrapes FebBox with your own free FebBox account (100 GB/month), exactly like the Aether site does. Sign in at febbox.com, open DevTools > Application > Cookies, and copy the value of the `ui` cookie.'
        },
        {
            type: 'text',
            key: 'febboxToken',
            label: 'FebBox ui token',
            placeholder: 'eyJhbGciOiJIUzI1NiJ9...',
            isPassword: true,
            description: 'Optional but recommended. The value of the `ui` cookie from febbox.com. Expires periodically — re-copy it if streams stop working.'
        },
        {
            type: 'toggle',
            key: 'preferHls',
            label: 'Prefer HLS streams',
            description: 'Lists the adaptive HLS playlist above the fixed-quality MP4 links.',
            defaultValue: false
        },
        {
            type: 'header',
            label: 'Delivery'
        },
        {
            type: 'select',
            key: 'region',
            label: 'CDN region',
            description: 'Re-points FebBox stream URLs at the edge node nearest you. Only applies to FEM streams.',
            options: [
                { label: 'Auto (as returned)', value: 'auto' },
                { label: 'New York', value: 'new-york' },
                { label: 'Dallas', value: 'dallas' },
                { label: 'Kansas', value: 'kansas' },
                { label: 'Portland', value: 'portland' },
                { label: 'Paris', value: 'paris' },
                { label: 'London', value: 'london' },
                { label: 'Hong Kong', value: 'hong-kong' },
                { label: 'Singapore', value: 'singapore' },
                { label: 'Sydney', value: 'sydney' },
                { label: 'Mumbai', value: 'mumbai' }
            ],
            defaultValue: 'auto'
        },
        {
            type: 'header',
            label: 'Token-free sources'
        },
        {
            type: 'info',
            label: 'Aether runs several sources that need no account. They are listed after the FEM streams and are what the site itself plays when no token is set. Link and Lul are language-agnostic HLS; the Spanish source is HLS with original audio plus Spanish subtitles, or Spanish dubbing.'
        },
        {
            type: 'toggle',
            key: 'enableExtraSources',
            label: 'Include Meridian / Link / Lul',
            description: 'Token-free sources queried together. Meridian carries movies and often brings subtitle tracks; every source that has the title is listed so you can pick.',
            defaultValue: true
        },
        {
            type: 'toggle',
            key: 'enableSpanish',
            label: 'Include the Spanish source',
            description: 'Turn off if you only want English-friendly streams.',
            defaultValue: true
        },
        {
            type: 'select',
            key: 'spanishLang',
            label: 'Token-free source audio',
            description: 'Which of Aether\'s three variants to request.',
            options: [
                { label: 'Subtitled (ES) — original audio', value: 'sub' },
                { label: 'Castellano — Spanish dubbing', value: 'esp' },
                { label: 'Latino — Latin American dubbing', value: 'lat' }
            ],
            defaultValue: 'sub'
        }
    ];
}

module.exports = { getStreams, onSettings };
