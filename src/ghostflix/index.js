import { fetchAllStreams } from './extractor.js';
import { fetchTsdbSubtitles } from './subtitles.js';

async function onSettings() {
    return [
        { type: "header", label: "Ghostflix Configuration" },
        {
            type: "select",
            key: "serverMode",
            label: "Mode Server",
            description: "Pilih server VidBolt yang akan digunakan (default: Semua Server).",
            options: [
                { label: "Semua Server (Orion, Callisto, Luna, Vega, Quantum, Quasar)", value: "all" },
                { label: "Otomatis (Orion + Callisto)", value: "auto" },
                { label: "Hanya Orion", value: "orion" },
                { label: "Hanya Callisto", value: "callisto" },
                { label: "Hanya Luna", value: "luna" },
                { label: "Hanya Vega", value: "vega" },
                { label: "Hanya Quantum", value: "quantum" },
                { label: "Hanya Quasar", value: "quasar" }
            ],
            defaultValue: "all"
        },
        {
            type: "select",
            key: "maxSubtitlesPerLanguage",
            label: "Maksimal Subtitle per Bahasa (ID & EN)",
            description: "Batas jumlah trek subtitle Indonesia & Inggris per episode/film.",
            options: [
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3 (Default)", value: "3" },
                { label: "5", value: "5" },
                { label: "Semua", value: "0" }
            ],
            defaultValue: "3"
        },
        {
            type: "toggle",
            key: "includeAllSourceLanguages",
            label: "Tampilkan Semua Bahasa Audio/Hardsub",
            description: "Jika dimatikan, hanya menampilkan stream English, Indonesian, atau Original.",
            defaultValue: false
        }
    ];
}

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;

    if (typeof tmdbId === 'object' && tmdbId !== null) {
        id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
        type = tmdbId.mediaType || tmdbId.type || type || "movie";
        s = tmdbId.season || season || 1;
        ep = tmdbId.episode || episode || 1;
    }

    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
        console.warn("[Ghostflix] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    const settings = globalThis.SCRAPER_SETTINGS || {};
    const serverMode = settings.serverMode || "all";
    const maxSubVal = parseInt(settings.maxSubtitlesPerLanguage, 10);
    const maxPerLang = isNaN(maxSubVal) ? 3 : maxSubVal;
    const includeAllLanguages = settings.includeAllSourceLanguages === true || settings.includeAllSourceLanguages === "true";

    const label = isTv
        ? `tv/${cleanTmdb}/${cleanSeason}/${cleanEpisode}`
        : `movie/${cleanTmdb}`;
    console.log(`[Ghostflix] Fetching streams for: ${label}`);

    try {
        const centralSubtitles = await fetchTsdbSubtitles(
            cleanTmdb,
            isTv,
            cleanSeason,
            cleanEpisode,
            maxPerLang
        );

        const streams = await fetchAllStreams(
            cleanTmdb,
            isTv,
            cleanSeason,
            cleanEpisode,
            centralSubtitles,
            { serverMode, includeAllLanguages }
        );

        return streams;
    } catch (err) {
        console.error(`[Ghostflix] Error in getStreams: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams, onSettings };
