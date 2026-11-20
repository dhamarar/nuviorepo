import { PLAYER_HEADERS, STREAM_HEADERS, SUBTITLE_LANGUAGE_MAP, TSDB_BASE } from './constants.js';

/**
 * Normalisasi kode bahasa subtitle dan verifikasi apakah termasuk yang diizinkan (hanya ID dan EN).
 * Bahasa selain Indonesia dan Inggris akan mengembalikan null (dikecualikan).
 */
export function filterAllowedLanguage(langStr) {
    if (!langStr) return null;
    const clean = String(langStr).trim().toLowerCase();
    if (SUBTITLE_LANGUAGE_MAP[clean]) {
        return SUBTITLE_LANGUAGE_MAP[clean];
    }
    if (clean.indexOf('indonesian') !== -1) {
        return SUBTITLE_LANGUAGE_MAP.id;
    }
    if (clean.indexOf('english') !== -1) {
        return SUBTITLE_LANGUAGE_MAP.en;
    }
    return null;
}

/**
 * Ambil daftar subtitle dari TheSubtitleDB untuk bahasa tertentu (hanya 'id' atau 'en').
 */
async function fetchTsdbByLang(tmdbPath, langCode, maxPerLang) {
    const allowed = filterAllowedLanguage(langCode);
    if (!allowed) return [];

    const url = `${TSDB_BASE}/by-tmdb/${tmdbPath}?lang=${encodeURIComponent(allowed.code)}&limit=50`;
    try {
        const res = await fetch(url, { headers: PLAYER_HEADERS });
        if (!res.ok) return [];

        const data = await res.json();
        const items = Array.isArray(data?.subtitles?.items) ? data.subtitles.items : [];
        if (items.length === 0) return [];

        const validItems = items.filter((item) => {
            if (!item || !item.download_url) return false;
            return Boolean(filterAllowedLanguage(item.language));
        });

        // Prioritaskan non-AI dan non-hearing-impaired terlebih dahulu
        validItems.sort((a, b) => {
            const aiDiff = (a.ai_transcribed ? 1 : 0) - (b.ai_transcribed ? 1 : 0);
            if (aiDiff !== 0) return aiDiff;
            return (a.hearing_impaired ? 1 : 0) - (b.hearing_impaired ? 1 : 0);
        });

        const limit = maxPerLang > 0 ? Math.min(maxPerLang, validItems.length) : validItems.length;
        const tracks = [];

        for (let i = 0; i < limit; i++) {
            const item = validItems[i];
            const suffixParts = [];
            if (item.hearing_impaired) suffixParts.push('SDH');
            if (item.ai_transcribed) suffixParts.push('AI');
            const suffix = suffixParts.length > 0 ? ` [${suffixParts.join(', ')}]` : '';
            const countLabel = limit > 1 && i > 0 ? ` #${i + 1}` : '';

            tracks.push({
                url: item.download_url,
                language: allowed.code,
                name: `${allowed.name}${countLabel}${suffix}`,
                headers: STREAM_HEADERS
            });
        }

        return tracks;
    } catch (e) {
        console.warn(`[Ghostflix] Gagal mengambil subtitle TSDB (${allowed.code}): ${e.message}`);
        return [];
    }
}

/**
 * Ambil subtitle Indonesia dan Inggris dari TheSubtitleDB.
 */
export async function fetchTsdbSubtitles(tmdbId, isTv, season, episode, maxPerLang = 3) {
    const tmdbPath = isTv
        ? `tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}/episode/${encodeURIComponent(episode)}`
        : `movie/${encodeURIComponent(tmdbId)}`;

    const [idSubs, enSubs] = await Promise.all([
        fetchTsdbByLang(tmdbPath, 'id', maxPerLang),
        fetchTsdbByLang(tmdbPath, 'en', maxPerLang)
    ]);

    return [...idSubs, ...enSubs];
}

/**
 * Filter subtitle bawaan dari respon stream VidBolt agar hanya menyertakan Indonesia dan Inggris.
 */
export function filterStreamSubtitles(rawSubs) {
    if (!Array.isArray(rawSubs)) return [];
    const results = [];

    for (let i = 0; i < rawSubs.length; i++) {
        const sub = rawSubs[i];
        if (!sub || !sub.url) continue;

        const allowed = filterAllowedLanguage(sub.lang || sub.language || sub.label);
        if (!allowed) continue;

        results.push({
            url: sub.url,
            language: allowed.code,
            name: allowed.name,
            headers: STREAM_HEADERS
        });
    }

    return results;
}

/**
 * Gabungkan dan deduplikasi subtitle (Indonesia didahulukan, lalu Inggris).
 */
export function mergeSubtitles(tsdbSubs = [], streamSubs = []) {
    const seenUrls = new Set();
    const merged = [];

    for (const sub of [...tsdbSubs, ...streamSubs]) {
        if (!sub || !sub.url || seenUrls.has(sub.url)) continue;
        const allowed = filterAllowedLanguage(sub.language || sub.name);
        if (!allowed) continue;

        seenUrls.add(sub.url);
        merged.push({
            url: sub.url,
            language: allowed.code,
            name: sub.name || allowed.name,
            headers: sub.headers || STREAM_HEADERS
        });
    }

    merged.sort((a, b) => {
        if (a.language === 'id' && b.language !== 'id') return -1;
        if (b.language === 'id' && a.language !== 'id') return 1;
        return 0;
    });

    return merged;
}
