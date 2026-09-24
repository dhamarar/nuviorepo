import { MAIN_URL, USER_AGENT } from '../constants.js';
import { fetchJson, fetchText } from '../utils.js';

export async function getServer6Streams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    const s = mediaType === 'movie' ? 1 : (season || 1);
    const e = mediaType === 'movie' ? 1 : (episode || 1);
    const apiUrl = `${MAIN_URL}/yoy4.php?ajax=1&id=${tmdbId}&s=${s}&e=${e}`;

    console.log(`[KDrama] Server 6 requesting: ${apiUrl}`);
    let data;
    try {
        data = await fetchJson(apiUrl, {
            "Referer": `${MAIN_URL}/yoy4.php?id=${tmdbId}&s=${s}&e=${e}`
        });
    } catch {
        return [];
    }

    if (!data || !data.success || !Array.isArray(data.servers)) {
        return [];
    }

    const streams = [];
    for (const server of data.servers) {
        if (!server.src || !server.src.startsWith('http')) continue;

        const serverName = server.name || 'Fast Server';
        streams.push({
            name: `KDrama | Server 6 (${serverName})`,
            title: `Server 6 (YOY4) - ${serverName}`,
            url: server.src,
            quality: "Auto",
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": `${MAIN_URL}/`
            }
        });

        // Try extracting sub-servers from vidbasic embed if possible
        if (server.src.includes('vidbasic.top/embed/')) {
            try {
                const embedHtml = await fetchText(server.src, {
                    "Referer": `${MAIN_URL}/`
                });
                const matches = [...embedHtml.matchAll(/<li[^>]*data-provider=["']([^"']+)["'][^>]*data-video=["']([^"']+)["']/gi)];
                for (const m of matches) {
                    const provider = m[1];
                    let videoUrl = m[2];
                    if (videoUrl.startsWith('/')) {
                        const parsed = new URL(server.src);
                        videoUrl = `${parsed.origin}${videoUrl}`;
                    }
                    if (videoUrl.startsWith('http')) {
                        streams.push({
                            name: `KDrama | Server 6 (${provider})`,
                            title: `Server 6 - ${provider}`,
                            url: videoUrl,
                            quality: "Auto",
                            headers: {
                                "User-Agent": USER_AGENT,
                                "Referer": server.src
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn('[KDrama] Server 6: Error parsing vidbasic sub-servers:', err.message);
            }
        }
    }

    return streams;
}
