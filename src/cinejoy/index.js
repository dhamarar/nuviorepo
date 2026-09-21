import { resolveDomain, getActiveServers, getTmdbDetails, fetchOpenSubtitles } from './utils.js';
import { seal } from './wasm.js';
import { decrypt } from './crypto.js';
import { HEADERS } from './constants.js';

function parseHlsVariants(masterText, baseUrl) {
    const lines = masterText.split("\n");
    const variants = [];
    let currentInf = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
            currentInf = {
                width: resMatch ? parseInt(resMatch[1], 10) : 0,
                height: resMatch ? parseInt(resMatch[2], 10) : 0,
                bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0
            };
        } else if (line && !line.startsWith("#") && currentInf) {
            let streamUrl = line;
            if (!streamUrl.startsWith("http")) {
                streamUrl = new URL(streamUrl, baseUrl).toString();
            }
            variants.push({
                ...currentInf,
                url: streamUrl
            });
            currentInf = null;
        }
    }
    return variants;
}

function getQualityBadge(height) {
    const h = Number(height) || 0;
    if (h >= 2160) return "4K";
    if (h >= 1440) return "1440p";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h >= 360) return "360p";
    return h ? `${h}p` : "Auto";
}

function normalizeQuality(qKey) {
    const s = String(qKey || "").toLowerCase();
    if (s.includes('2160') || s.includes('4k')) return "4K";
    if (s.includes('1440') || s.includes('2k')) return "1440p";
    if (s.includes('1080') || s.includes('fhd')) return "1080p";
    if (s.includes('720') || s.includes('hd')) return "720p";
    if (s.includes('480') || s.includes('sd')) return "480p";
    if (s.includes('360')) return "360p";
    return getQualityBadge(parseInt(s, 10));
}

async function onSettings() {
    return [
        { type: "header", label: "Cinejoy Configuration" },
        {
            type: "text",
            key: "resolverUrl",
            label: "Custom Resolver URL (Optional)",
            placeholder: "https://your-cinejoy-worker.workers.dev",
            description: "Dedicated Cloudflare Worker / API endpoint for environments without raw binary HTTP support."
        }
    ];
}

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;

    // Handle object argument if Nuvio passes an options object
    if (typeof tmdbId === 'object' && tmdbId !== null) {
        id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
        type = tmdbId.mediaType || tmdbId.type || type || "movie";
        s = tmdbId.season || season || 1;
        ep = tmdbId.episode || episode || 1;
    }

    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
        console.warn("[Cinejoy] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    console.log(`[Cinejoy] Fetching streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);
    const streams = [];

    const settings = globalThis.SCRAPER_SETTINGS || {};
    const customResolver = (settings.resolverUrl || "").trim().replace(/\/+$/, '');

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

                // Option A: If custom resolver is configured, fetch directly from resolver
                if (customResolver) {
                    try {
                        const targetUrl = `${customResolver}/api/stream?tmdb=${cleanTmdb}&type=${isTv ? 'series' : 'movie'}&server=${encodeURIComponent(server)}&season=${cleanSeason}&episode=${cleanEpisode}`;
                        const rRes = await fetch(targetUrl, {
                            headers: { "User-Agent": HEADERS["User-Agent"] }
                        });
                        if (rRes.ok) {
                            const rJson = await rRes.json();
                            // If resolver returns pre-extracted multi-quality streams
                            if (Array.isArray(rJson?.streams) && rJson.streams.length > 0) {
                                return rJson.streams;
                            }

                            // Otherwise parse stream list
                            const rRawStreams = rJson?.data?.stream || [];
                            const parsedFromResolver = [];
                            for (const item of rRawStreams) {
                                const sSubs = (item.captions || []).map(c => ({
                                    url: c.url,
                                    language: (c.language || c.id || "en").toLowerCase(),
                                    name: c.language || c.id || "Subtitle"
                                })).filter(s => !!s.url);

                                if (item.type === 'hls' && item.playlist) {
                                    try {
                                        const m3u8Res = await fetch(item.playlist, { headers: streamHeaders });
                                        if (m3u8Res.ok) {
                                            const m3u8Text = await m3u8Res.text();
                                            const variants = parseHlsVariants(m3u8Text, item.playlist);
                                            for (const v of variants) {
                                                const badge = getQualityBadge(v.height);
                                                const label = badge === "4K" ? "4K (2160p)" : `${v.height}p`;
                                                parsedFromResolver.push({
                                                    name: "Cinejoy",
                                                    title: `Cinejoy - ${serverDisplayName} - ${label}`,
                                                    url: `${customResolver}/api/playlist?url=${encodeURIComponent(item.playlist)}&height=${v.height}`,
                                                    quality: badge,
                                                    headers: streamHeaders,
                                                    subtitles: sSubs
                                                });
                                            }
                                        }
                                    } catch (e) {}

                                    parsedFromResolver.push({
                                        name: "Cinejoy",
                                        title: `Cinejoy - ${serverDisplayName} - Auto (Adaptive)`,
                                        url: item.playlist,
                                        quality: "Auto",
                                        headers: streamHeaders,
                                        subtitles: sSubs
                                    });
                                }
                            }
                            if (parsedFromResolver.length > 0) return parsedFromResolver;
                        }
                    } catch (resolverErr) {
                        console.warn(`[Cinejoy] Custom resolver error for ${server}:`, resolverErr.message);
                    }
                }

                // Option B: Direct gateway request
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
                    console.warn(`[Cinejoy] [${server}] HTTP ${res.status}: Gateway rejected request (Nuvio QuickJS fetch sends string bodies; binary octets cannot round-trip natively)`);
                    return null;
                }

                let encBytes;
                if (typeof res.arrayBuffer === 'function') {
                    const arrayBuf = await res.arrayBuffer();
                    encBytes = new Uint8Array(arrayBuf);
                } else {
                    const text = await res.text();
                    encBytes = new Uint8Array(text.length);
                    for (let i = 0; i < text.length; i++) {
                        encBytes[i] = text.charCodeAt(i) & 0xFF;
                    }
                }

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
                        try {
                            const m3u8Res = await fetch(playlist, { headers: streamHeaders });
                            if (m3u8Res.ok) {
                                const m3u8Text = await m3u8Res.text();
                                const variants = parseHlsVariants(m3u8Text, playlist);

                                for (const v of variants) {
                                    const badge = getQualityBadge(v.height);
                                    const label = badge === "4K" ? "4K (2160p)" : `${v.height}p`;
                                    serverStreams.push({
                                        name: "Cinejoy",
                                        title: `Cinejoy - ${serverDisplayName} - ${label}`,
                                        url: customResolver
                                            ? `${customResolver}/api/playlist?url=${encodeURIComponent(playlist)}&height=${v.height}`
                                            : v.url,
                                        quality: badge,
                                        headers: streamHeaders,
                                        subtitles: serverSubs
                                    });
                                }
                            }
                        } catch (mErr) {
                            console.warn(`[Cinejoy] Failed to parse HLS variants for ${server}:`, mErr.message);
                        }

                        // Always include Auto / Master playlist
                        serverStreams.push({
                            name: "Cinejoy",
                            title: `Cinejoy - ${serverDisplayName} - Auto (Adaptive)`,
                            url: playlist,
                            quality: "Auto",
                            headers: streamHeaders,
                            subtitles: serverSubs
                        });
                    } else if (type === "file" && item.qualities) {
                        const qualities = item.qualities;
                        for (const qKey of Object.keys(qualities)) {
                            const qObj = qualities[qKey];
                            const fileUrl = qObj?.url;
                            if (fileUrl && fileUrl.startsWith('http')) {
                                const badge = normalizeQuality(qKey);
                                serverStreams.push({
                                    name: "Cinejoy",
                                    title: `Cinejoy - ${serverDisplayName} - ${badge === '4K' ? '4K (2160p)' : qKey}`,
                                    url: fileUrl,
                                    quality: badge,
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

module.exports = { getStreams, onSettings };
