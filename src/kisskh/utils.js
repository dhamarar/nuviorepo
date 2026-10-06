import { TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

export async function getTMDBDetails(tmdbId, mediaType, season = 1) {
    const isTv = mediaType === "tv" || mediaType === "series";
    const endpoint = isTv ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    const data = await response.json();
    const title = isTv ? (data.name || data.original_name) : (data.title || data.original_title);
    const releaseDate = isTv ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0], 10) : null;

    let seasonYear = year;
    let seasonTitle = null;
    const reqSeasonNum = Number(season) || 1;
    if (isTv && Array.isArray(data.seasons)) {
        const targetSeason = data.seasons.find(s => Number(s.season_number) === reqSeasonNum);
        if (targetSeason) {
            if (targetSeason.air_date) {
                seasonYear = parseInt(targetSeason.air_date.split("-")[0], 10);
            }
            if (targetSeason.name) {
                seasonTitle = targetSeason.name;
            }
        }
    }

    return {
        title,
        originalTitle: isTv ? data.original_name : data.original_title,
        year,
        seasonYear,
        seasonTitle,
        seasons: data.seasons || [],
        imdbId: data.external_ids?.imdb_id || null,
        data
    };
}

export function normalizeTitle(title) {
    if (!title) return "";
    return title.toLowerCase()
        .replace(/\b(the|a|an)\b/g, "")
        .replace(/[:\-_]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[^\w\s]/g, "")
        .trim();
}

export function calculateTitleSimilarity(title1, title2) {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);
    if (norm1 === norm2) return 1;
    const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
    const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
    if (words1.length === 0 || words2.length === 0) return 0;
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = words1.filter(w => set2.has(w));
    const union = new Set([...words1, ...words2]);
    const jaccard = intersection.length / union.size;
    const extraWordsCount = words2.filter(w => !set1.has(w)).length;
    let score = jaccard - (extraWordsCount * 0.05);
    if (words1.length > 0 && words1.every(w => set2.has(w))) {
        score += 0.2;
    }
    return score;
}

export function extractSeasonInfo(title, baseTitle = '') {
    if (!title) return { season: null, isMultiSeason: false, seasons: [] };

    const cleanTitle = title.trim();

    // 1. Check for combined multi-season: "S1+S2", "S2 + S1", "Season 1 + Season 2", "Season 2 + Season 3"
    const multiMatch = cleanTitle.match(/(?:season|s)\s*(\d+)\s*\+\s*(?:season|s)?\s*(\d+)/i);
    if (multiMatch) {
        const s1 = parseInt(multiMatch[1], 10);
        const s2 = parseInt(multiMatch[2], 10);
        const seasons = [Math.min(s1, s2), Math.max(s1, s2)];
        return { season: null, isMultiSeason: true, seasons };
    }

    // 2. Explicit "Season X" / "Series X" / "S X" / "S{X}"
    const explicitMatch = cleanTitle.match(/\b(?:season|series)\s*[-:]?\s*(\d+)\b/i) ||
                          cleanTitle.match(/\b[sS](\d+)\b/);
    if (explicitMatch) {
        const num = parseInt(explicitMatch[1], 10);
        if (num > 0 && num < 100) {
            return { season: num, isMultiSeason: false, seasons: [num] };
        }
    }

    // 3. Ordinal season: "2nd Season", "3rd Season", "1st Season", "4th Season"
    const ordinalMatch = cleanTitle.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i);
    if (ordinalMatch) {
        const num = parseInt(ordinalMatch[1], 10);
        if (num > 0 && num < 100) {
            return { season: num, isMultiSeason: false, seasons: [num] };
        }
    }

    // 4. Roman numerals or Part: "Part II", "Part 2", "Cour 2"
    const partMatch = cleanTitle.match(/\b(?:season|part|cour)\s*[-:]?\s*([IVXLCDM]+|\d+)\b/i);
    if (partMatch) {
        let num;
        if (/^\d+$/.test(partMatch[1])) {
            num = parseInt(partMatch[1], 10);
        } else {
            const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
            num = romanMap[partMatch[1].toUpperCase()] || null;
        }
        if (num && num > 0 && num < 100) {
            return { season: num, isMultiSeason: false, seasons: [num] };
        }
    }

    // 5. Suffix number relative to base title
    if (baseTitle) {
        const cleanBase = baseTitle.replace(/[^\w\s]/g, '').trim().toLowerCase();
        const noYear = cleanTitle.replace(/\(\d{4}\)/g, '');
        const segments = [noYear, ...noYear.split(/[-:|\/]/)];
        for (const seg of segments) {
            const cleanSeg = seg.replace(/[^\w\s]/g, '').trim().toLowerCase();
            const m = cleanSeg.match(new RegExp('^' + cleanBase + '\\s+(\\d+)(?:\\s+|$)', 'i'));
            if (m) {
                const num = parseInt(m[1], 10);
                if (num > 0 && num < 100) {
                    return { season: num, isMultiSeason: false, seasons: [num] };
                }
            }
        }
    }

    return { season: null, isMultiSeason: false, seasons: [] };
}

export function cleanTitleForComparison(title) {
    return title
        .replace(/\(\d{4}\)/g, "")
        .replace(/\b(?:season|series)\s*[-:]?\s*\d+\b/gi, "")
        .replace(/\b\d+(?:st|nd|rd|th)\s+season\b/gi, "")
        .replace(/\b(?:season|part|cour)\s*[-:]?\s*([IVXLCDM]+|\d+)\b/gi, "")
        .replace(/\bs\d+\b/gi, "")
        .trim();
}

export function findBestMatch(mediaInfo, searchResults, mediaType = "movie", season = 1) {
    if (!searchResults || searchResults.length === 0) return null;
    let bestMatch = null;
    let bestScore = -Infinity;
    const isTv = mediaType === "tv" || mediaType === "series";
    const targetSeason = Number(season) || 1;

    for (const result of searchResults) {
        const resTitle = result.title || "";
        const yearMatch = resTitle.match(/\((\d{4})\)/);
        const resYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

        const cleanResTitle = cleanTitleForComparison(resTitle);

        // 1. Title similarity
        let titleScore = Math.max(
            calculateTitleSimilarity(mediaInfo.title, cleanResTitle),
            calculateTitleSimilarity(mediaInfo.title, resTitle.replace(/\(\d{4}\)/g, "").trim())
        );

        if (mediaInfo.originalTitle) {
            const origScore = Math.max(
                calculateTitleSimilarity(mediaInfo.originalTitle, cleanResTitle),
                calculateTitleSimilarity(mediaInfo.originalTitle, resTitle.replace(/\(\d{4}\)/g, "").trim())
            );
            if (origScore > titleScore) titleScore = origScore;
        }

        // Skip if title similarity is too low
        if (titleScore < 0.25) continue;

        let score = titleScore;

        // 2. Year matching
        const targetYear = (isTv && mediaInfo.seasonYear) ? mediaInfo.seasonYear : mediaInfo.year;
        if (targetYear && resYear) {
            const yearDiff = Math.abs(targetYear - resYear);
            if (yearDiff === 0) score += 0.25;
            else if (yearDiff === 1) score += 0.1;
            else if (yearDiff > 4) score -= 0.3;
        }

        // 3. Season matching for TV
        if (isTv) {
            const seasonInfo = extractSeasonInfo(resTitle, mediaInfo.title);
            if (seasonInfo.isMultiSeason) {
                if (seasonInfo.seasons.includes(targetSeason)) {
                    score += 0.5;
                } else {
                    score -= 0.5;
                }
            } else if (seasonInfo.season !== null) {
                if (seasonInfo.season === targetSeason) {
                    score += 0.6; // Strong match for requested season
                } else {
                    score -= 0.7; // Wrong season
                }
            } else {
                // No season specified in result title
                if (targetSeason === 1) {
                    score += 0.1; // Often S1 has no season suffix
                } else {
                    score -= 0.2; // Prefer explicit season match for S2+
                }
            }
        }

        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = result;
        }
    }
    return bestMatch;
}
