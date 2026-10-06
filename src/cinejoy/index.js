import { resolveDomain, getActiveServers, getTmdbDetails } from './utils.js';
import { fetchAllSubtitles } from './subtitles.js';
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

// Display label used for both `title` and `name`, e.g. "4K (2160p)" / "1080p" /
// "Auto (Adaptive)". Every stream carries the server it came from so the picker
// reads "Cinejoy - Lisbon - 1080p" instead of a wall of identical "Cinejoy" rows.
function qualityLabel(q) {
    const badge = normalizeQuality(q);
    if (badge === "4K") return "4K (2160p)";
    if (!badge || badge === "Auto") return "Auto (Adaptive)";
    return badge;
}

function streamLabel(serverDisplayName, label) {
    return `Cinejoy - ${serverDisplayName} - ${label}`;
}

// A custom resolver may still answer with generic `name: "Cinejoy"` (older
// deployments), so re-stamp every stream it returns with the server we asked
// for. The label is taken from the resolver's own title when it already carries
// one, and derived from `quality` otherwise.
function relabelResolverStreams(list, serverDisplayName, customResolver = "") {
    return list.map((st) => {
        if (!st || typeof st !== 'object') return st;
        const match = String(st.title || '').match(/^Cinejoy\s*-\s*[^-]+?\s*-\s*(.+)$/i);
        const label = match ? match[1].trim() : qualityLabel(st.quality);
        let url = st.url || "";
        if (url.startsWith('http://') && customResolver && customResolver.startsWith('https://')) {
            url = url.replace(/^http:\/\//i, 'https://');
        }
        return {
            ...st,
            name: streamLabel(serverDisplayName, label),
            title: streamLabel(serverDisplayName, label),
            url
        };
    });
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
        },
        {
            type: "select",
            key: "maxSubtitlesPerLanguage",
            label: "Max subtitles per language",
            description: "Maximum subtitle tracks to keep per language (default: 3). Set to All to keep every track.",
            options: [
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "5", value: "5" },
                { label: "All", value: "0" }
            ],
            defaultValue: "3"
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
    let customResolver = (settings.resolverUrl || "").trim().replace(/\/+$/, '');
    if (customResolver && !customResolver.startsWith('http://') && !customResolver.startsWith('https://')) {
        customResolver = 'https://' + customResolver;
    }
    if (customResolver) {
        console.log(`[Cinejoy] Using custom stream resolver: ${customResolver}`);
    }

    let maxPerLang = 3;
    if (settings.maxSubtitlesPerLanguage !== undefined) {
        const parsed = Number(settings.maxSubtitlesPerLanguage);
        if (!isNaN(parsed) && parsed >= 0) maxPerLang = parsed;
    }

    try {
        // Step 1: Resolve domain and fetch TMDB info concurrently
        const domainPromise = resolveDomain();
        const tmdbInfoPromise = getTmdbDetails(cleanTmdb, isTv ? "tv" : "movie");

        const [domain, tmdbInfo] = await Promise.all([domainPromise, tmdbInfoPromise]);

        // Step 2: Discover active servers and fetch subtitles concurrently
        const serversPromise = getActiveServers(domain);
        const subsPromise = fetchAllSubtitles(cleanTmdb, isTv ? "tv" : "movie", cleanSeason, cleanEpisode, tmdbInfo?.imdbId, maxPerLang);

        const [{ host: apiHost, servers }, combinedSubtitles] = await Promise.all([
            serversPromise,
            subsPromise
        ]);
        console.log(`[Cinejoy] Active domain: ${domain}, API Host: ${apiHost}, Servers: ${servers.join(', ')}`);
        console.log(`[Cinejoy] Resolved ${combinedSubtitles.length} subtitle track(s)`);

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
                        const targetUrl = `${customResolver}/api/stream?tmdb=${cleanTmdb}&type=${isTv ? 'series' : 'movie'}&server=${encodeURIComponent(server)}&season=${cleanSeason}&episode=${cleanEpisode}&imdb=${encodeURIComponent(tmdbInfo?.imdbId || '')}&title=${encodeURIComponent(tmdbInfo?.title || '')}&year=${encodeURIComponent(tmdbInfo?.year || '')}`;
                        const rRes = await fetch(targetUrl, {
                            headers: { "User-Agent": HEADERS["User-Agent"] }
                        });
                        if (rRes.ok) {
                            const rJson = await rRes.json();
                            // If resolver returns pre-extracted multi-quality streams
                            if (Array.isArray(rJson?.streams) && rJson.streams.length > 0) {
                                const list = relabelResolverStreams(rJson.streams, serverDisplayName, customResolver);
                                for (const st of list) {
                                    const sSubs = [...combinedSubtitles];
                                    const existing = new Set(sSubs.map(s => s.url));
                                    for (const sub of (st.subtitles || [])) {
                                        if (sub && sub.url && !existing.has(sub.url)) {
                                            existing.add(sub.url);
                                            sSubs.unshift(sub);
                                        }
                                    }
                                    st.subtitles = sSubs;
                                }
                                return list;
                            }

                            // Otherwise parse stream list
                            const rRawStreams = rJson?.data?.stream || [];
                            const parsedFromResolver = [];
                            for (const item of rRawStreams) {
                                const sSubs = [...combinedSubtitles];
                                const sSubsSeen = new Set(sSubs.map(s => s.url));
                                for (const c of (item.captions || [])) {
                                    if (c.url && !sSubsSeen.has(c.url)) {
                                        sSubsSeen.add(c.url);
                                        sSubs.unshift({
                                            url: c.url,
                                            language: (c.language || c.id || "en").toLowerCase(),
                                            name: c.language || c.id || "Subtitle"
                                        });
                                    }
                                }

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
                                                    name: streamLabel(serverDisplayName, label),
                                                    title: streamLabel(serverDisplayName, label),
                                                    url: `${customResolver}/api/playlist?url=${encodeURIComponent(item.playlist)}&height=${v.height}`,
                                                    quality: badge,
                                                    headers: streamHeaders,
                                                    subtitles: [...sSubs]
                                                });
                                            }
                                        }
                                    } catch (e) {}

                                    parsedFromResolver.push({
                                        name: streamLabel(serverDisplayName, "Auto (Adaptive)"),
                                        title: streamLabel(serverDisplayName, "Auto (Adaptive)"),
                                        url: item.playlist,
                                        quality: "Auto",
                                        headers: streamHeaders,
                                        subtitles: [...sSubs]
                                    });
                                }
                            }
                            if (parsedFromResolver.length > 0) return parsedFromResolver;
                        } else {
                            console.warn(`[Cinejoy] Custom resolver returned HTTP ${rRes.status} for server ${server}`);
                        }
                    } catch (resolverErr) {
                        console.warn(`[Cinejoy] Custom resolver error for ${server}:`, resolverErr.message);
                    }
                }

                // Option B: Direct gateway request
                const path = `/${server.toLowerCase()}/${isTv ? "series" : "movie"}`;
                const payloadObj = isTv
                    ? {
                        tmdb: cleanTmdb,
                        season: String(cleanSeason),
                        episode: String(cleanEpisode),
                        ...(tmdbInfo?.imdbId ? { imdb: tmdbInfo.imdbId } : {}),
                        ...(tmdbInfo?.title ? { title: tmdbInfo.title } : {}),
                        ...(tmdbInfo?.year ? { year: String(tmdbInfo.year) } : {})
                      }
                    : {
                        tmdb: cleanTmdb,
                        ...(tmdbInfo?.imdbId ? { imdb: tmdbInfo.imdbId } : {}),
                        ...(tmdbInfo?.title ? { title: tmdbInfo.title } : {}),
                        ...(tmdbInfo?.year ? { year: String(tmdbInfo.year) } : {})
                      };

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

                    const serverSubs = [...combinedSubtitles];
                    const serverSubsSeen = new Set(serverSubs.map(s => s.url));
                    for (const c of captions) {
                        if (c.url && !serverSubsSeen.has(c.url)) {
                            serverSubsSeen.add(c.url);
                            serverSubs.unshift({
                                url: c.url,
                                language: (c.language || c.id || "en").toLowerCase(),
                                name: c.language || c.id || "Subtitle"
                            });
                        }
                    }

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
                                        name: streamLabel(serverDisplayName, label),
                                        title: streamLabel(serverDisplayName, label),
                                        url: customResolver
                                            ? `${customResolver}/api/playlist?url=${encodeURIComponent(playlist)}&height=${v.height}`
                                            : v.url,
                                        quality: badge,
                                        headers: streamHeaders,
                                        subtitles: [...serverSubs]
                                    });
                                }
                            }
                        } catch (mErr) {
                            console.warn(`[Cinejoy] Failed to parse HLS variants for ${server}:`, mErr.message);
                        }

                        // Always include Auto / Master playlist
                        serverStreams.push({
                            name: streamLabel(serverDisplayName, "Auto (Adaptive)"),
                            title: streamLabel(serverDisplayName, "Auto (Adaptive)"),
                            url: playlist,
                            quality: "Auto",
                            headers: streamHeaders,
                            subtitles: [...serverSubs]
                        });
                    } else if (type === "file" && item.qualities) {
                        const qualities = item.qualities;
                        for (const qKey of Object.keys(qualities)) {
                            const qObj = qualities[qKey];
                            const fileUrl = qObj?.url;
                            if (fileUrl && fileUrl.startsWith('http')) {
                                const badge = normalizeQuality(qKey);
                                const label = badge === '4K' ? '4K (2160p)' : qKey;
                                serverStreams.push({
                                    name: streamLabel(serverDisplayName, label),
                                    title: streamLabel(serverDisplayName, label),
                                    url: fileUrl,
                                    quality: badge,
                                    headers: streamHeaders,
                                    subtitles: [...serverSubs]
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
                    if (!stream.subtitles || stream.subtitles.length === 0) {
                        stream.subtitles = [...combinedSubtitles];
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

export { getStreams, onSettings };

