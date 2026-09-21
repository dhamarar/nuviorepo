import { resolveDomain, getActiveServers, fetchOpenSubtitles } from './utils.js';
import { seal } from './wasm.js';
import { decrypt } from './crypto.js';

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    console.log(`[Cinejoy] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}, S: ${season}, E: ${episode}`);
    const streams = [];

    try {
        const domain = await resolveDomain();
        const { host: apiHost, servers } = await getActiveServers(domain);
        console.log(`[Cinejoy] Active domain: ${domain}, API Host: ${apiHost}, Servers: ${servers.join(', ')}`);

        const isTv = mediaType === "tv";
        const endpoint = isTv ? "series" : "movie";
        const payloadObj = isTv
            ? { tmdb: String(tmdbId), season: String(season || 1), episode: String(episode || 1) }
            : { tmdb: String(tmdbId) };

        // Fetch OpenSubtitles in parallel as fallback/supplement
        const openSubsPromise = fetchOpenSubtitles(tmdbId, mediaType, season, episode);

        const serverPromises = servers.map(async (server) => {
            try {
                const path = `/${server}/${endpoint}`;
                const sealed = await seal(path, payloadObj);

                const res = await fetch(`${apiHost}/g`, {
                    method: 'POST',
                    body: sealed.body,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Origin': domain,
                        'Referer': `${domain}/`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                    }
                });

                if (!res.ok) {
                    return null;
                }

                const arrayBuf = await res.arrayBuffer();
                const encBytes = new Uint8Array(arrayBuf);
                const decryptedStr = await decrypt(encBytes, sealed);
                const json = JSON.parse(decryptedStr);

                const streamArr = json.data?.stream || [];
                const serverStreams = [];

                for (const item of streamArr) {
                    const type = item.type;
                    const playlist = item.playlist;
                    const captions = item.captions || [];

                    const serverSubs = captions.map(c => ({
                        url: c.url,
                        language: (c.language || c.id || "en").toLowerCase(),
                        name: c.language || c.id || "Subtitle"
                    })).filter(s => !!s.url);

                    const streamHeaders = {
                        "Origin": domain,
                        "Referer": `${domain}/`,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                    };

                    const serverDisplayName = server.charAt(0).toUpperCase() + server.slice(1);

                    if (type === "hls" && playlist) {
                        serverStreams.push({
                            name: "Cinejoy",
                            title: `Cinejoy - ${serverDisplayName} (HLS)`,
                            url: playlist,
                            quality: "1080p",
                            headers: streamHeaders,
                            subtitles: serverSubs
                        });
                    } else if (type === "file" && item.qualities) {
                        const qualities = item.qualities;
                        for (const qKey of Object.keys(qualities)) {
                            const qObj = qualities[qKey];
                            const fileUrl = qObj?.url;
                            if (fileUrl && fileUrl.startsWith('http')) {
                                serverStreams.push({
                                    name: "Cinejoy",
                                    title: `Cinejoy - ${serverDisplayName} (${qKey})`,
                                    url: fileUrl,
                                    quality: qKey.includes('1080') ? '1080p' : (qKey.includes('720') ? '720p' : 'Auto'),
                                    headers: streamHeaders,
                                    subtitles: serverSubs
                                });
                            }
                        }
                    }
                }

                return serverStreams;
            } catch (serverErr) {
                console.warn(`[Cinejoy] Error querying server ${server}:`, serverErr.message);
                return null;
            }
        });

        const [serverResults, openSubs] = await Promise.all([
            Promise.all(serverPromises),
            openSubsPromise
        ]);

        for (const resList of serverResults) {
            if (Array.isArray(resList)) {
                for (const stream of resList) {
                    // Gabungkan subtitle OpenSubtitles jika belum ada di server
                    if (openSubs && openSubs.length > 0) {
                        const existingUrls = new Set(stream.subtitles.map(s => s.url));
                        for (const os of openSubs) {
                            if (!existingUrls.has(os.url)) {
                                stream.subtitles.push(os);
                            }
                        }
                    }
                    streams.push(stream);
                }
            }
        }

        console.log(`[Cinejoy] Successfully retrieved ${streams.length} stream(s)`);
    } catch (error) {
        console.error(`[Cinejoy] Error: ${error.message}`);
    }

    return streams;
}

module.exports = { getStreams };
