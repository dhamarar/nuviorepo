import { ALL_SERVERS, HEADERS } from './constants.js';
import { fetchSeed, fetchServerSources } from './crypto.js';
import { fetchCentralSubtitles, formatServerSubtitles, mergeSubtitles } from './subtitles.js';
import { getTmdbDetails, normalizeQuality, qualityLabel, streamLabel } from './utils.js';

async function onSettings() {
    return [
        { type: "header", label: "Movy Configuration" },
        {
            type: "select",
            key: "serverGroup",
            label: "Server Filter",
            description: "Choose which server regions to query (default: All servers).",
            options: [
                { label: "All Servers (17 servers)", value: "all" },
                { label: "English / Original Audio Only (12 servers)", value: "en" },
                { label: "International Dubbed Audio (DE, FR, HI, ES)", value: "multi" }
            ],
            defaultValue: "all"
        },
        {
            type: "select",
            key: "maxSubtitlesPerLanguage",
            label: "Max subtitles per language",
            description: "Maximum subtitle tracks to keep per language (default: 3).",
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

const QUALITY_WEIGHTS = {
    "4K": 100,
    "1440p": 80,
    "1080p": 60,
    "720p": 40,
    "480p": 20,
    "360p": 10,
    "Auto": 50
};

const BATCH_SIZE = 4;

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
    const serverGroup = settings.serverGroup || "all";

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
    const titleOriginal = tmdbInfo?.originalTitle || "";
    const year = tmdbInfo?.year || "";
    const imdbId = tmdbInfo?.imdbId || "";
    const totalSeasons = tmdbInfo?.totalSeasons || 1;

    // Step 2: Filter servers based on settings
    const targetServers = ALL_SERVERS.filter(srv => {
        if (serverGroup === "all") return true;
        return srv.group === serverGroup;
    });

    console.log(`[Movy] Querying ${targetServers.length} servers in batches of ${BATCH_SIZE} for "${titleEnglish}" (${year})`);

    // Step 3: Fetch servers in batches to avoid network congestion and API rate limits
    const allStreams = [];

    for (let i = 0; i < targetServers.length; i += BATCH_SIZE) {
        const batch = targetServers.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(batch.map(async (server) => {
            try {
                const params = {
                    title: encodeURIComponent(titleEnglish),
                    mediaType: isTv ? "tv" : "movie",
                    year,
                    totalSeasons,
                    episodeId: cleanEpisode,
                    seasonId: cleanSeason,
                    tmdbId: cleanTmdb,
                    imdbId
                };

                // Server-specific parameter overrides
                if (server.id === "chicago") {
                    const altTitle = titleOriginal && titleOriginal !== titleEnglish ? titleOriginal : undefined;
                    if (altTitle) params.altTitle = encodeURIComponent(altTitle);
                } else if (server.id === "berlin") {
                    const altTitle = tmdbInfo?.titleGerman || titleEnglish;
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

                // Merge server-specific subtitles with central subtitles
                const serverSubs = formatServerSubtitles(data.subtitles);
                const combinedSubtitles = mergeSubtitles(centralSubs, serverSubs);

                const streamResults = [];
                for (const src of validSources) {
                    const qBadge = normalizeQuality(src.quality);
                    const qText = qualityLabel(src.quality);
                    const label = streamLabel(server.name, qText);

                    streamResults.push({
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
                    });
                }

                return streamResults;
            } catch (e) {
                console.warn(`[Movy] Server ${server.name} error:`, e.message);
                return [];
            }
        }));

        for (const res of settled) {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allStreams.push(...res.value);
            }
        }
    }

    // Sort streams by quality priority (4K -> 1080p -> Auto -> 720p -> 480p -> 360p)
    allStreams.sort((a, b) => {
        const wa = QUALITY_WEIGHTS[a.quality] || 0;
        const wb = QUALITY_WEIGHTS[b.quality] || 0;
        return wb - wa;
    });

    console.log(`[Movy] Successfully found ${allStreams.length} stream(s) across servers`);
    return allStreams;
}

module.exports = { getStreams, onSettings };
