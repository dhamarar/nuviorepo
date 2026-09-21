import { resolveDomain, getActiveServers, getTmdbDetails, fetchOpenSubtitles } from './utils.js';
import { seal } from './wasm.js';
import { decrypt } from './crypto.js';
import { HEADERS } from './constants.js';

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    const cleanTmdb = String(tmdbId || "").trim();
    if (!cleanTmdb) {
        console.warn("[Cinejoy] Empty TMDB ID provided");
        return [];
    }

    const cleanMediaType = String(mediaType || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(season) || 1;
    const cleanEpisode = Number(episode) || 1;

    console.log(`[Cinejoy] Fetching streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);
    const streams = [];

    try {
        // Step 1: Resolve domain and fetch TMDB info concurrently
        const domainPromise = resolveDomain();
        const tmdbInfoPromise = getTmdbDetails(cleanTmdb, isTv ? "tv" : "movie");

        const [domain, tmdbInfo] = await Promise.all([domainPromise, tmdbInfoPromise]);

        // Step 2: Discover active servers and fetch OpenSubtitles concurrently
        const serversPromise = getActiveServers(domain);
        const openSubsPromise = tmdbInfo?.imdbId
            ? fetchOpenSubtitles(tmdbInfo.imdbId, isTv, cleanSeason, cleanEpisode)
            : Promise.resolve([]);

        const [{ host: apiHost, servers }, openSubs] = await Promise.all([serversPromise, openSubsPromise]);
        console.log(`[Cinejoy] Active domain: ${domain}, API Host: ${apiHost}, Servers: ${servers.join(', ')}`);

        const streamHeaders = {
            "Origin": domain,
            "Referer": `${domain}/`,
            "User-Agent": HEADERS["User-Agent"]
        };

        // Step 3: Query all servers in parallel
        const serverPromises = servers.map(async (server) => {
            try {
                const serverDisplayName = server.charAt(0).toUpperCase() + server.slice(1);
                const path = `/${server.toLowerCase()}/${isTv ? "series" : "movie"}`;
                const payloadObj = isTv
                    ? { tmdb: cleanTmdb, season: String(cleanSeason), episode: String(cleanEpisode) }
                    : { tmdb: cleanTmdb };

                const serverInfo = {
                    server,
                    isTv,
                    tmdbId: cleanTmdb,
                    season: cleanSeason,
                    episode: cleanEpisode,
                    title: tmdbInfo?.title || "",
                    year: tmdbInfo?.year || "",
                    imdbId: tmdbInfo?.imdbId || ""
                };

                const sealed = await seal(path, payloadObj, serverInfo);

                const res = await fetch(`${apiHost}/g`, {
                    method: 'POST',
                    body: sealed.body,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Origin': domain,
                        'Referer': `${domain}/`,
                        'User-Agent': HEADERS["User-Agent"]
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

        const serverResults = await Promise.all(serverPromises);

        for (const resList of serverResults) {
            if (Array.isArray(resList)) {
                for (const stream of resList) {
                    // Supplement with OpenSubtitles if available
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
