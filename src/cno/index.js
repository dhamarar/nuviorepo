import { PROVIDER_NAME, HEADERS } from './constants.js';
import { fetchSubtitles } from './subtitles.js';
import { fetchMasterStream, getQualityBadge } from './extractor.js';

async function onSettings() {
    return [
        { type: "header", label: "Cno (Sky) Configuration" },
        {
            type: "select",
            key: "streamMode",
            label: "Mode Streaming",
            description: "Pilih format stream yang ditampilkan (Adaptive HLS atau Pilihan Resolusi).",
            options: [
                { label: "Semua Kualitas (Adaptive + Pilihan Resolusi)", value: "all" },
                { label: "Hanya Auto (Adaptive HLS)", value: "adaptive" },
                { label: "Hanya Resolusi Tetap (4K, 1080p, dll)", value: "variants" }
            ],
            defaultValue: "all"
        }
    ];
}

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;

    // Menangani argumen jika Nuvio meneruskan options object
    if (typeof tmdbId === 'object' && tmdbId !== null) {
        id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
        type = tmdbId.mediaType || tmdbId.type || type || "movie";
        s = tmdbId.season || season || 1;
        ep = tmdbId.episode || episode || 1;
    }

    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
        console.warn("[Cno] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanMediaType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanMediaType === "tv" || cleanMediaType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    const path = isTv
        ? `tv/${cleanTmdb}/${cleanSeason}/${cleanEpisode}`
        : `movie/${cleanTmdb}`;

    console.log(`[Cno] Fetching streams for: ${path}`);

    try {
        // Ambil master playlist dan subtitle secara bersamaan
        const [masterData, subtitles] = await Promise.all([
            fetchMasterStream(path),
            fetchSubtitles(path)
        ]);

        if (!masterData || !masterData.masterUrl) {
            console.warn(`[Cno] Tidak ada master stream yang ditemukan untuk: ${path}`);
            return [];
        }

        const settings = globalThis.SCRAPER_SETTINGS || {};
        const streamMode = settings.streamMode || "all";

        const variants = masterData.variants || [];
        const topVariant = variants[0];
        const topBadge = topVariant ? getQualityBadge(topVariant.height, topVariant.width) : "Auto";

        const streams = [];

        // 1. Stream Adaptive (HLS Master Playlist)
        if (streamMode === "all" || streamMode === "adaptive") {
            streams.push({
                name: `${PROVIDER_NAME} | Server 21 (Adaptive)`,
                title: `${PROVIDER_NAME} - Server 21 - Auto (Adaptive)`,
                url: masterData.masterUrl,
                quality: topBadge,
                format: "m3u8",
                headers: HEADERS,
                subtitles: subtitles
            });
        }

        // 2. Stream per Kualitas (Direct Variants)
        if (streamMode === "all" || streamMode === "variants") {
            const seenBadges = new Set();

            for (const v of variants) {
                if (!v.url) continue;

                const badge = getQualityBadge(v.height, v.width);
                const resLabel = badge === "4K"
                    ? "4K (UHD)"
                    : (v.height ? `${v.height}p` : badge);

                // Hindari duplikasi resolusi yang sama persis
                const uniqueKey = `${badge}-${v.height}`;
                if (seenBadges.has(uniqueKey)) continue;
                seenBadges.add(uniqueKey);

                streams.push({
                    name: `${PROVIDER_NAME} | Server 21 (${badge})`,
                    title: `${PROVIDER_NAME} - Server 21 - ${resLabel}`,
                    url: v.url,
                    quality: badge,
                    format: "m3u8",
                    headers: HEADERS,
                    subtitles: subtitles
                });
            }
        }

        return streams;
    } catch (err) {
        console.error(`[Cno] Error in getStreams: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams, onSettings };
