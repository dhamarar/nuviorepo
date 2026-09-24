import { VIDSYNC_URL, USER_AGENT } from '../constants.js';
import { fetchJson, parseSubtitles } from '../utils.js';

export async function getServer1Streams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    const isTv = mediaType === 'tv' || mediaType === 'series';
    const params = new URLSearchParams({
        id: String(tmdbId),
        type: isTv ? 'tv' : 'movie'
    });

    if (isTv) {
        params.set('season', String(season || 1));
        params.set('episode', String(episode || 1));
    }

    const apiUrl = `${VIDSYNC_URL}/api/core/vidsrc?${params.toString()}`;
    const embedReferer = isTv
        ? `${VIDSYNC_URL}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
        : `${VIDSYNC_URL}/embed/movie/${tmdbId}`;

    console.log(`[KDrama] Server 1 requesting: ${apiUrl}`);
    const data = await fetchJson(apiUrl, {
        "Referer": embedReferer,
        "Origin": VIDSYNC_URL
    });

    const sources = Array.isArray(data.sources) ? data.sources : [];
    if (sources.length === 0) {
        return [];
    }

    const subtitles = parseSubtitles(data.subtitles, {
        "User-Agent": USER_AGENT,
        "Referer": `${VIDSYNC_URL}/`
    });

    const streams = [];
    for (const s of sources) {
        let streamUrl = s.proxyUrl;
        if (streamUrl && !streamUrl.startsWith('http')) {
            streamUrl = `${VIDSYNC_URL}${streamUrl}`;
        }
        if (!streamUrl && s.url && s.url.startsWith('http')) {
            streamUrl = s.url;
        }
        if (!streamUrl) continue;

        const quality = s.quality || 'Auto';
        const audio = s.audioTracks && s.audioTracks[0] ? ` [${s.audioTracks[0].label || s.audioTracks[0].language}]` : '';

        streams.push({
            name: "KDrama | Server 1 (Vidsync)",
            title: `Server 1 (Vidsync) - ${quality}${audio}`,
            url: streamUrl,
            quality: quality,
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": embedReferer,
                "Origin": VIDSYNC_URL
            },
            subtitles: subtitles
        });
    }

    return streams;
}
