import { MAIN_URL, USER_AGENT } from '../constants.js';
import { fetchText } from '../utils.js';

export async function getServer2Streams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    const s = mediaType === 'movie' ? 1 : (season || 1);
    const e = mediaType === 'movie' ? 1 : (episode || 1);
    const targetUrl = `${MAIN_URL}/13.php/${tmdbId}/${s}/${e}`;

    console.log(`[KDrama] Server 2 requesting: ${targetUrl}`);
    const html = await fetchText(targetUrl, {
        "Referer": `${MAIN_URL}/watch.php?id=${tmdbId}&type=${mediaType}`
    });

    const match = html.match(/playerData\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
        return [];
    }

    try {
        const pd = JSON.parse(match[1]);
        const sources = Array.isArray(pd.sources) ? pd.sources : [];
        if (sources.length === 0) return [];

        const streams = [];
        for (const src of sources) {
            if (!src.url || !src.url.startsWith('http')) continue;

            const lang = src.language || 'Multi';
            const quality = src.quality || '1080p';

            streams.push({
                name: `KDrama | Server 2 (${lang})`,
                title: `Server 2 (Multi) - ${quality} [${lang}]`,
                url: src.url,
                quality: quality,
                size: src.size || 0,
                headers: {
                    "User-Agent": USER_AGENT,
                    "Referer": `${MAIN_URL}/`
                }
            });
        }
        return streams;
    } catch (err) {
        console.warn('[KDrama] Server 2: Failed to parse playerData:', err.message);
        return [];
    }
}
