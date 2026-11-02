import { BASE_URL, HEADERS } from './constants.js';

/**
 * Menentukan badge kualitas berdasarkan resolusi vertikal dan horizontal.
 */
export function getQualityBadge(height, width) {
    const h = Number(height) || 0;
    const w = Number(width) || 0;
    if (w >= 3800 || h >= 2160) return "4K";
    if (w >= 2500 || h >= 1440) return "1440p";
    if (w >= 1900 || h >= 1080) return "1080p";
    if (w >= 1200 || h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h >= 360) return "360p";
    return h ? `${h}p` : "Auto";
}

/**
 * Mengurai master m3u8 playlist menjadi varian-varian resolusi.
 */
export function parseHlsVariants(masterText, baseUrl) {
    const lines = masterText.split(/\r?\n/);
    const variants = [];
    let currentInf = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
            currentInf = {
                width: resMatch ? parseInt(resMatch[1], 10) : 0,
                height: resMatch ? parseInt(resMatch[2], 10) : 0,
                bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0
            };
        } else if (line && !line.startsWith('#') && currentInf) {
            let streamUrl = line;
            if (!streamUrl.startsWith('http')) {
                if (streamUrl.startsWith('/')) {
                    streamUrl = `${BASE_URL}${streamUrl}`;
                } else {
                    streamUrl = new URL(streamUrl, baseUrl).toString();
                }
            }
            variants.push({
                ...currentInf,
                url: streamUrl
            });
            currentInf = null;
        }
    }

    // Urutkan dari resolusi & bitrate tertinggi
    variants.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0));
    return variants;
}

/**
 * Mengambil master HLS playlist dari beta.cno.to
 * 
 * @param {string} path - "movie/<tmdbId>" atau "tv/<tmdbId>/<season>/<episode>"
 * @returns {Promise<{masterUrl: string, masterText: string, variants: Array}>}
 */
export async function fetchMasterStream(path) {
    const masterUrl = `${BASE_URL}/screen/master/${path}`;
    try {
        const res = await fetch(masterUrl, { headers: HEADERS });
        if (!res.ok) {
            console.warn(`[Cno] Master playlist HTTP ${res.status} untuk ${path}`);
            return null;
        }
        const masterText = await res.text();
        const variants = parseHlsVariants(masterText, masterUrl);
        return {
            masterUrl,
            masterText,
            variants
        };
    } catch (e) {
        console.error(`[Cno] Error mengambil master playlist: ${e.message}`);
        return null;
    }
}
