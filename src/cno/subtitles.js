import { BASE_URL, HEADERS, SUBTITLE_LANGUAGE_MAP } from './constants.js';

/**
 * Normalisasi kode bahasa subtitle dan verifikasi apakah termasuk yang diizinkan (hanya ID dan EN).
 * Bahasa selain Indonesia dan Inggris akan mengembalikan null (dikecualikan).
 */
export function filterAllowedLanguage(langStr) {
    if (!langStr) return null;
    const clean = String(langStr).trim().toLowerCase();
    return SUBTITLE_LANGUAGE_MAP[clean] || null;
}

/**
 * Mengambil dan memfilter daftar subtitle dari beta.cno.to.
 * ATURAN KHUSUS: Hanya mengambil data subtitle Indonesia dan Inggris, kecualikan yang lain.
 * 
 * @param {string} path - "movie/<tmdbId>" atau "tv/<tmdbId>/<season>/<episode>"
 * @returns {Promise<Array<{url: string, language: string, name: string, headers: object}>>}
 */
export async function fetchSubtitles(path) {
    const subtitles = [];
    const seenLangs = new Set();

    try {
        const listUrl = `${BASE_URL}/screen-api/subs/list/${path}`;
        const res = await fetch(listUrl, { headers: HEADERS });

        if (res.ok) {
            const data = await res.json();
            const files = Array.isArray(data?.files) ? data.files : [];

            // Periksa ketersediaan subtitle bahasa Indonesia dan Inggris dari daftar file
            for (const file of files) {
                if (!file || !file.lang) continue;

                const allowed = filterAllowedLanguage(file.lang);
                if (!allowed) {
                    // Kecualikan semua bahasa selain id dan en
                    continue;
                }

                if (!seenLangs.has(allowed.code)) {
                    seenLangs.add(allowed.code);
                    subtitles.push({
                        url: `${BASE_URL}/screen/subs/${path}/${allowed.code}.vtt`,
                        language: allowed.code,
                        name: allowed.name,
                        headers: {
                            'Referer': `${BASE_URL}/`,
                            'User-Agent': HEADERS['User-Agent']
                        }
                    });
                }

                // Jika kedua bahasa (id dan en) sudah ditemukan, tidak perlu iterasi lebih lanjut
                if (seenLangs.has('id') && seenLangs.has('en')) {
                    break;
                }
            }
        }
    } catch (e) {
        console.warn(`[Cno] Gagal mengambil daftar subtitle: ${e.message}`);
    }

    // Urutkan: Bahasa Indonesia pertama (jika ada), kemudian Inggris
    subtitles.sort((a, b) => {
        if (a.language === 'id') return -1;
        if (b.language === 'id') return 1;
        return 0;
    });

    return subtitles;
}
