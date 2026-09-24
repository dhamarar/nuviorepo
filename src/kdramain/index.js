import { getServer1Streams } from './servers/server1.js';
import { getServer2Streams } from './servers/server2.js';
import { getServer3Streams } from './servers/server3.js';
import { getServer6Streams } from './servers/server6.js';

async function onSettings() {
    return [
        {
            type: "header",
            label: "Server Configuration"
        },
        {
            type: "select",
            key: "preferredServer",
            label: "Pilihan Server Streaming",
            description: "Pilih server k-drama.in yang ingin digunakan. Pilihan 'Semua Server' akan memuat seluruh server yang tersedia secara simultan.",
            options: [
                { label: "Semua Server (Rekomendasi)", value: "all" },
                { label: "Server 3 (KDrama HLS & Multi Subtitle)", value: "3" },
                { label: "Server 1 (Vidsync Multi Lang)", value: "1" },
                { label: "Server 2 (Multi Audio & Dubbing)", value: "2" },
                { label: "Server 6 (YOY4 / Fast Server)", value: "6" }
            ],
            defaultValue: "all"
        }
    ];
}

async function getStreams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;

    // Support invocation with an options object
    if (typeof tmdbId === 'object' && tmdbId !== null) {
        id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
        type = tmdbId.mediaType || tmdbId.type || type || "movie";
        s = tmdbId.season || season || 1;
        ep = tmdbId.episode || episode || 1;
    }

    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
        console.warn("[KDrama] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanType === "tv" || cleanType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    console.log(`[KDrama] Querying streams for TMDB: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);

    const settings = globalThis.SCRAPER_SETTINGS || {};
    const preferredServer = String(settings.preferredServer || 'all').toLowerCase();

    // Map of server fetch functions
    const serverFetchers = {
        '3': () => getServer3Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
        '1': () => getServer1Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
        '2': () => getServer2Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode),
        '6': () => getServer6Streams(cleanTmdb, cleanType, cleanSeason, cleanEpisode)
    };

    // If a specific server is chosen
    if (preferredServer !== 'all' && serverFetchers[preferredServer]) {
        try {
            console.log(`[KDrama] Fetching preferred server: ${preferredServer}`);
            const streams = await serverFetchers[preferredServer]();
            if (streams.length > 0) {
                return streams;
            }
            console.log(`[KDrama] Preferred server ${preferredServer} returned no streams, falling back to all servers...`);
        } catch (err) {
            console.warn(`[KDrama] Preferred server ${preferredServer} error:`, err.message);
        }
    }

    // Default: query servers in parallel
    const activeTasks = [
        serverFetchers['3']().catch(err => {
            console.warn('[KDrama] Server 3 error:', err.message);
            return [];
        }),
        serverFetchers['1']().catch(err => {
            console.warn('[KDrama] Server 1 error:', err.message);
            return [];
        }),
        serverFetchers['2']().catch(err => {
            console.warn('[KDrama] Server 2 error:', err.message);
            return [];
        }),
        serverFetchers['6']().catch(err => {
            console.warn('[KDrama] Server 6 error:', err.message);
            return [];
        })
    ];

    const results = await Promise.allSettled(activeTasks);
    const allStreams = [];

    for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allStreams.push(...res.value);
        }
    }

    console.log(`[KDrama] Total streams resolved: ${allStreams.length}`);
    return allStreams;
}

module.exports = { getStreams, onSettings };
