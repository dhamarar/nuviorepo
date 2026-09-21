import { PROVIDER_NAME, QUALITY_RANK, REGION_MAP } from './constants.js';
import { FemError, checkToken, fetchHlsPayload, fetchMp4Payload } from './femapi.js';
import {
    buildPlaybackHeaders,
    buildStreamTitle,
    dedupeSubtitles,
    getEpisodeMeta,
    getTmdbMeta,
    languageDisplayName,
    languageNameToCode,
    normalizeQuality,
    rewriteRegionHost
} from './utils.js';

function readSettings() {
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const token = String(settings.febboxToken || '').trim();
    const regionKey = String(settings.region || '').trim();
    return {
        token,
        regionKey,
        regionCode: REGION_MAP[regionKey] || '',
        preferHls: settings.preferHls === true
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
                size: title,
                description: title,
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
        size: title,
        description: title,
        url: rewriteRegionHost(payload.hls, regionCode),
        quality,
        format: 'm3u8',
        headers,
        subtitles,
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
    const { token, regionCode, preferHls } = readSettings();

    if (!token) {
        console.log('[Aether] No FebBox token set. Add one in the Aether provider settings —');
        console.log('[Aether] FEM API scrapes FebBox with your own free account (100 GB/month).');
        return [];
    }

    const headers = buildPlaybackHeaders();

    const metadata = await Promise.all([
        getTmdbMeta(tmdbId, mediaType),
        mediaType === 'tv' ? getEpisodeMeta(tmdbId, season, episode) : Promise.resolve(null)
    ]);
    const meta = metadata[0];
    const epMeta = metadata[1];

    const mp4Streams = [];
    const hlsStreams = [];

    try {
        const mp4 = await fetchMp4Payload(tmdbId, mediaType, season, episode, token);
        const built = buildMp4Streams(mp4, meta, epMeta, season, episode, regionCode, headers);
        mp4Streams.push(...built);
        console.log(`[Aether] FEM MP4 via ${mp4.endpoint.api}: ${built.length} stream(s)`);
    } catch (error) {
        logFailure('MP4', error);
    }

    try {
        const hls = await fetchHlsPayload(tmdbId, mediaType, season, episode, token);
        hlsStreams.push(buildHlsStream(hls, meta, epMeta, season, episode, regionCode, headers));
        console.log(`[Aether] FEM HLS via ${hls.endpoint.api}: ok`);
    } catch (error) {
        logFailure('HLS', error);
    }

    if (mp4Streams.length === 0 && hlsStreams.length === 0) {
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
        return [];
    }

    return preferHls ? hlsStreams.concat(mp4Streams) : mp4Streams.concat(hlsStreams);
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
            description: 'Required. The value of the `ui` cookie from febbox.com. Expires periodically — re-copy it if streams stop working.'
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
            description: 'Re-points FebBox stream URLs at the edge node nearest you.',
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
        }
    ];
}

module.exports = { getStreams, onSettings };
