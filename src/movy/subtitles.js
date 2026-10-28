import { SUBTITLES_API_URL, HEADERS, LANGUAGE_MAP } from './constants.js';

export function resolveLanguageCode(langStr) {
    if (!langStr) return "en";
    const clean = String(langStr).trim().toLowerCase();
    if (LANGUAGE_MAP[clean]) {
        return LANGUAGE_MAP[clean];
    }
    // Check if clean is already 2 or 3 letter code
    if (clean.length === 2 || clean.length === 3) {
        return clean;
    }
    // Search substring
    for (const [name, code] of Object.entries(LANGUAGE_MAP)) {
        if (clean.includes(name) || name.includes(clean)) {
            return code;
        }
    }
    return "en";
}

export async function fetchCentralSubtitles(tmdbId, isTv, season, episode, maxPerLang = 3) {
    try {
        let url = `${SUBTITLES_API_URL}/search?id=${encodeURIComponent(tmdbId)}`;
        if (isTv) {
            url += `&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
        }

        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];

        const list = await res.json();
        if (!Array.isArray(list)) return [];

        const languageCounts = {};
        const results = [];

        for (const item of list) {
            if (!item || !item.url) continue;

            const langCode = resolveLanguageCode(item.language || item.display);
            const currentCount = languageCounts[langCode] || 0;

            if (maxPerLang > 0 && currentCount >= maxPerLang) {
                continue;
            }

            let displayName = item.display || item.language || "Subtitle";
            if (item.isHearingImpaired) {
                displayName += " [CC]";
            }

            results.push({
                url: item.url,
                language: langCode,
                name: displayName,
                headers: {
                    "Referer": "https://www.movy.sx/",
                    "User-Agent": HEADERS["User-Agent"]
                }
            });

            languageCounts[langCode] = currentCount + 1;
        }

        return results;
    } catch (e) {
        console.warn("[Movy] Failed to fetch central subtitles:", e.message);
        return [];
    }
}

export function formatServerSubtitles(rawSubs) {
    if (!Array.isArray(rawSubs)) return [];
    const results = [];

    for (const sub of rawSubs) {
        if (!sub || !sub.url) continue;
        const langName = sub.language || sub.lang || "Unknown";
        const langCode = resolveLanguageCode(langName);

        results.push({
            url: sub.url,
            language: langCode,
            name: langName,
            headers: {
                "Referer": "https://www.movy.sx/",
                "User-Agent": HEADERS["User-Agent"]
            }
        });
    }

    return results;
}

export function mergeSubtitles(centralSubs = [], serverSubs = []) {
    const seenUrls = new Set();
    const merged = [];

    // Prioritize direct server subtitles first
    for (const s of serverSubs) {
        if (s && s.url && !seenUrls.has(s.url)) {
            seenUrls.add(s.url);
            merged.push(s);
        }
    }

    // Then append central subtitles
    for (const s of centralSubs) {
        if (s && s.url && !seenUrls.has(s.url)) {
            seenUrls.add(s.url);
            merged.push(s);
        }
    }

    return merged;
}
