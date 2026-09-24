import { MAIN_URL, USER_AGENT } from '../constants.js';
import { fetchText, parseSubtitles } from '../utils.js';

export async function getServer3Streams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    const s = mediaType === 'movie' ? 1 : (season || 1);
    const e = mediaType === 'movie' ? 1 : (episode || 1);
    const targetUrl = `${MAIN_URL}/2.php/${tmdbId}/${s}/${e}`;

    console.log(`[KDrama] Server 3 requesting: ${targetUrl}`);
    const html = await fetchText(targetUrl, {
        "Referer": `${MAIN_URL}/watch.php?id=${tmdbId}&type=${mediaType}`
    });

    const playerMatch = html.match(/src=["'](https?:\/\/[^"']*player\.html\?[^"']+)["']/i);
    if (!playerMatch) {
        console.warn('[KDrama] Server 3: player.html iframe not found in response');
        return [];
    }

    const cleanPlayerUrl = playerMatch[1].replace(/&amp;/g, '&');
    const parsedUrl = new URL(cleanPlayerUrl);
    const fileParam = parsedUrl.searchParams.get('file');
    const subParam = parsedUrl.searchParams.get('subtitle');

    let subtitles = [];
    if (subParam) {
        try {
            const rawSubs = JSON.parse(subParam);
            subtitles = parseSubtitles(rawSubs, {
                "User-Agent": USER_AGENT,
                "Referer": `${parsedUrl.origin}/`
            });
        } catch (err) {
            console.warn('[KDrama] Server 3: Failed to parse subtitles JSON:', err.message);
        }
    }

    if (!fileParam) {
        console.warn('[KDrama] Server 3: No file parameter in player URL');
        return [];
    }

    const streams = [];
    try {
        const files = JSON.parse(fileParam);
        for (const f of files) {
            if (!f.file || !f.file.startsWith('http')) continue;
            streams.push({
                name: "KDrama | Server 3 (HLS)",
                title: `Server 3 (HLS) - ${f.title || 'Multi-Quality'}`,
                url: f.file,
                quality: "Auto",
                headers: {
                    "User-Agent": USER_AGENT,
                    "Referer": `${parsedUrl.origin}/`
                },
                subtitles: subtitles
            });
        }
    } catch (err) {
        console.warn('[KDrama] Server 3: Failed to parse files JSON:', err.message);
    }

    return streams;
}
