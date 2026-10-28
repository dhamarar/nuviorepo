import {
    TMDB_PROXY_URL,
    TMDB_BASE_URL,
    TMDB_API_KEY,
    HEADERS
} from './constants.js';

export async function getTmdbDetails(tmdbId, mediaType = "movie") {
    const isTv = mediaType === "tv" || mediaType === "series";
    const type = isTv ? "tv" : "movie";

    // 1. Try Movy's direct backend TMDB proxy (db.wecollege.net/3)
    try {
        const proxyUrl = `${TMDB_PROXY_URL}/${type}/${encodeURIComponent(tmdbId)}?append_to_response=external_ids`;
        const res = await fetch(proxyUrl, { headers: HEADERS });
        if (res.ok) {
            const data = await res.json();
            const title = data.title || data.name || "";
            const originalTitle = data.original_title || data.original_name || "";
            const dateStr = data.release_date || data.first_air_date || "";
            const year = dateStr.slice(0, 4) || "";
            const imdbId = data.external_ids?.imdb_id || data.imdb_id || "";
            const totalSeasons = Number(data.number_of_seasons) || 1;

            return {
                title,
                originalTitle,
                year,
                imdbId,
                totalSeasons,
                titleGerman: title,
                titleSpanish: title,
                titleFrench: title
            };
        }
    } catch (e) {}

    // 2. Fallback to official TMDB API
    try {
        const tmdbUrl = `${TMDB_BASE_URL}/${type}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(tmdbUrl, { headers: HEADERS });
        if (res.ok) {
            const data = await res.json();
            const title = data.title || data.name || "";
            const originalTitle = data.original_title || data.original_name || "";
            const dateStr = data.release_date || data.first_air_date || "";
            const year = dateStr.slice(0, 4) || "";
            const imdbId = data.external_ids?.imdb_id || data.imdb_id || "";
            const totalSeasons = Number(data.number_of_seasons) || 1;

            return {
                title,
                originalTitle,
                year,
                imdbId,
                totalSeasons,
                titleGerman: title,
                titleSpanish: title,
                titleFrench: title
            };
        }
    } catch (e) {}

    return null;
}

export function normalizeQuality(rawQuality) {
    const str = String(rawQuality || "").toLowerCase().trim();
    if (str.includes("2160") || str.includes("4k")) return "4K";
    if (str.includes("1440") || str.includes("2k")) return "1440p";
    if (str.includes("1080") || str.includes("fhd")) return "1080p";
    if (str.includes("720") || str.includes("hd")) return "720p";
    if (str.includes("480") || str.includes("sd")) return "480p";
    if (str.includes("360")) return "360p";
    return "Auto";
}

export function qualityLabel(q) {
    const badge = normalizeQuality(q);
    if (badge === "4K") return "4K (2160p)";
    if (badge === "Auto") return "Auto (Adaptive)";
    return badge;
}

export function streamLabel(serverName, label) {
    return `Movy - ${serverName} - ${label}`;
}
