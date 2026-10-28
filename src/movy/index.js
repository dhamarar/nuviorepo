import { ALL_SERVERS, HEADERS } from './constants.js';
import { fetchSeed, fetchServerSources } from './crypto.js';
import { fetchCentralSubtitles, formatServerSubtitles, mergeSubtitles } from './subtitles.js';
import { getTmdbDetails, normalizeQuality, qualityLabel, streamLabel } from './utils.js';

async function onSettings() {
    return [
        { type: "header", label: "Movy Configuration" },
        {
            type: "select",
            key: "serverMode",
            label: "Mode Seleksi Server",
            description: "Pilih cara penentuan server streaming (default: Otomatis - Server Terbaik).",
            options: [
                { label: "Otomatis (Server Terbaik - Rekomendasi)", value: "auto" },
                { label: "Server Utama + Cadangan (Top 2)", value: "top2" },
                { label: "Semua Server (17 Server)", value: "all" },
                { label: "Hanya Miami (4K / 1080p)", value: "miami" },
                { label: "Hanya Boise (4K / 1080p)", value: "boise" },
                { label: "Hanya Vegas (Fast Adaptive HLS)", value: "vegas" },
                { label: "Dubbing Jerman (Munich & Berlin)", value: "german" },
                { label: "Dubbing Prancis (Paris)", value: "french" },
                { label: "Dubbing Spanyol (Cancun)", value: "spanish" },
                { label: "Dubbing Hindi (Delhi)", value: "hindi" }
            ],
            defaultValue: "auto"
        },
        {
            type: "select",
            key: "maxSubtitlesPerLanguage",
            label: "Maksimal Subtitle per Bahasa",
            description: "Batas jumlah trek subtitle per bahasa (default: 3).",
            options: [
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "5", value: "5" },
                { label: "Semua", value: "0" }
            ],
            defaultValue: "3"
        }
    ];
}

const QUALITY_WEIGHTS = {
    "4K": 100,
    "1440p": 80,
    "1080p": 60,
    "720p": 40,
    "480p": 20,
    "360p": 10,
    "Auto": 50
};

function sortStreams(streams) {
    return streams.sort((a, b) => {
        const wa = QUALITY_WEIGHTS[a.quality] || 0;
        const wb = QUALITY_WEIGHTS[b.quality] || 0;
        return wb - wa;
    });
}

async function queryServer(server, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo) {
    if (!server) return [];
    try {
        const params = { ...baseParams };

        if (server.id === "chicago") {
            const altTitle = tmdbInfo?.originalTitle && tmdbInfo?.originalTitle !== tmdbInfo?.title ? tmdbInfo.originalTitle : undefined;
            if (altTitle) params.altTitle = encodeURIComponent(altTitle);
        } else if (server.id === "berlin") {
            const altTitle = tmdbInfo?.titleGerman || tmdbInfo?.title;
            if (altTitle) params.altTitle = encodeURIComponent(altTitle);
        }

        if (server.extraParams) {
            Object.assign(params, server.extraParams);
        }

        const data = await fetchServerSources(server.id, params, cleanTmdb, sharedSeed);
        if (!data || !Array.isArray(data.sources) || data.sources.length === 0) {
            return [];
        }

        let validSources = data.sources.filter(s => s && s.url);
        if (server.filter) {
            validSources = validSources.filter(server.filter);
        }

        if (validSources.length === 0) {
            return [];
        }

        const serverSubs = formatServerSubtitles(data.subtitles);
        const combinedSubtitles = mergeSubtitles(centralSubs, serverSubs);

        return validSources.map(src => {
            const qBadge = normalizeQuality(src.quality);
            const qText = qualityLabel(src.quality);
            const label = streamLabel(server.name, qText);

            return {
                name: label,
                title: label,
                url: src.url,
                quality: qBadge,
                headers: {
                    "User-Agent": HEADERS["User-Agent"],
                    "Referer": "https://www.movy.sx/",
                    "Origin": "https://www.movy.sx"
                },
                subtitles: combinedSubtitles
            };
        });
    } catch (e) {
        return [];
    }
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
        console.warn("[Movy] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    console.log(`[Movy] Fetching streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);

    const settings = globalThis.SCRAPER_SETTINGS || {};
    const serverMode = settings.serverMode || "auto";

    let maxSubsPerLang = 3;
    if (settings.maxSubtitlesPerLanguage !== undefined) {
        const parsed = Number(settings.maxSubtitlesPerLanguage);
        if (!isNaN(parsed) && parsed >= 0) maxSubsPerLang = parsed;
    }

    // Step 1: Concurrently fetch TMDB details, central subtitles, and the encryption seed
    const [tmdbInfo, centralSubs, sharedSeed] = await Promise.all([
        getTmdbDetails(cleanTmdb, cleanMediaType),
        fetchCentralSubtitles(cleanTmdb, isTv, cleanSeason, cleanEpisode, maxSubsPerLang),
        fetchSeed(cleanTmdb).catch(() => null)
    ]);

    const titleEnglish = tmdbInfo?.title || "";
    const year = tmdbInfo?.year || "";
    const imdbId = tmdbInfo?.imdbId || "";
    const totalSeasons = tmdbInfo?.totalSeasons || 1;

    const baseParams = {
        title: encodeURIComponent(titleEnglish),
        mediaType: isTv ? "tv" : "movie",
        year,
        totalSeasons,
        episodeId: cleanEpisode,
        seasonId: cleanSeason,
        tmdbId: cleanTmdb,
        imdbId
    };

    console.log(`[Movy] Server mode: "${serverMode}" for "${titleEnglish}" (${year})`);

    // Helper map
    const serverMap = new Map(ALL_SERVERS.map(srv => [srv.id, srv]));

    // Step 2A: Mode "auto" (Smart Best Server Cascade)
    if (serverMode === "auto") {
        // Tier 1: Miami & Boise (Highest Quality: 4K, 1080p, 720p, 480p)
        const [miamiRes, boiseRes] = await Promise.all([
            queryServer(serverMap.get("miami"), baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo),
            queryServer(serverMap.get("boise"), baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo)
        ]);

        if (miamiRes.length > 0) {
            console.log(`[Movy] Best server selected: Miami (${miamiRes.length} streams)`);
            return sortStreams(miamiRes);
        }
        if (boiseRes.length > 0) {
            console.log(`[Movy] Best server selected: Boise (${boiseRes.length} streams)`);
            return sortStreams(boiseRes);
        }

        // Tier 2: Fast Adaptive HLS Servers (Vegas, Reno, Chicago)
        const tier2 = [serverMap.get("vegas"), serverMap.get("reno"), serverMap.get("chicago")].filter(Boolean);
        const tier2Results = await Promise.all(tier2.map(s => queryServer(s, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo)));
        for (const res of tier2Results) {
            if (res.length > 0) {
                console.log(`[Movy] Fallback server selected: ${res[0].name.split(" - ")[1]} (${res.length} stream)`);
                return sortStreams(res);
            }
        }

        // Tier 3: Other English Servers
        const tier3 = ALL_SERVERS.filter(s => s.group === "en" && !["miami", "boise", "vegas", "reno", "chicago"].includes(s.id));
        const tier3Results = await Promise.all(tier3.map(s => queryServer(s, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo)));
        for (const res of tier3Results) {
            if (res.length > 0) {
                console.log(`[Movy] Fallback server selected: ${res[0].name.split(" - ")[1]} (${res.length} stream)`);
                return sortStreams(res);
            }
        }

        // Tier 4: International Backup
        const tier4 = ALL_SERVERS.filter(s => s.group === "multi");
        const tier4Results = await Promise.all(tier4.map(s => queryServer(s, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo)));
        for (const res of tier4Results) {
            if (res.length > 0) return sortStreams(res);
        }

        return [];
    }

    // Step 2B: Mode "top2" (Primary + Backup servers)
    if (serverMode === "top2") {
        const topStreams = [];
        const checkedServers = [
            "miami", "boise", "vegas", "reno", "chicago",
            "oakland", "seattle", "phoenix", "atlanta", "portland", "austin", "dallas"
        ];

        // Check in pairs until we have 2 working servers
        for (let i = 0; i < checkedServers.length; i += 2) {
            const pair = [serverMap.get(checkedServers[i]), serverMap.get(checkedServers[i + 1])].filter(Boolean);
            const results = await Promise.all(pair.map(s => queryServer(s, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo)));
            for (const res of results) {
                if (res.length > 0) {
                    topStreams.push(...res);
                }
            }
            if (topStreams.length >= 2) break;
        }

        return sortStreams(topStreams);
    }

    // Step 2C: Manual selection or language filters
    let targetServers = [];
    if (serverMode === "german") {
        targetServers = [serverMap.get("munich"), serverMap.get("berlin")].filter(Boolean);
    } else if (serverMode === "french") {
        targetServers = [serverMap.get("paris")].filter(Boolean);
    } else if (serverMode === "spanish") {
        targetServers = [serverMap.get("cancun")].filter(Boolean);
    } else if (serverMode === "hindi") {
        targetServers = [serverMap.get("delhi")].filter(Boolean);
    } else if (serverMap.has(serverMode)) {
        targetServers = [serverMap.get(serverMode)].filter(Boolean);
    } else {
        // "all" mode: all servers
        targetServers = ALL_SERVERS;
    }

    const allStreams = [];
    const BATCH_SIZE = 4;

    for (let i = 0; i < targetServers.length; i += BATCH_SIZE) {
        const batch = targetServers.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(
            batch.map(server => queryServer(server, baseParams, cleanTmdb, sharedSeed, centralSubs, tmdbInfo))
        );

        for (const res of settled) {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allStreams.push(...res.value);
            }
        }
    }

    return sortStreams(allStreams);
}

module.exports = { getStreams, onSettings };
