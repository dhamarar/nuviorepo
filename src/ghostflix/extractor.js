import {
    PLAYER_HEADERS,
    PLAYER_URL,
    PROVIDER_NAME,
    QUALITY_WEIGHTS,
    SERVERS,
    SERVER_LABELS,
    STREAM_HEADERS
} from './constants.js';
import { filterStreamSubtitles, mergeSubtitles } from './subtitles.js';

/**
 * Normalisasi label kualitas video agar seragam di UI Nuvio.
 */
export function normalizeQuality(qualityStr, masterText) {
    if (qualityStr) {
        const q = String(qualityStr).trim().toLowerCase();
        if (q.indexOf('2160') !== -1 || q.indexOf('4k') !== -1 || q.indexOf('uhd') !== -1) return '4K';
        if (q.indexOf('1440') !== -1 || q.indexOf('2k') !== -1) return '1440p';
        if (q.indexOf('1080') !== -1 || q.indexOf('fhd') !== -1) return '1080p';
        if (q.indexOf('720') !== -1 || q.indexOf('hd') !== -1) return '720p';
        if (q.indexOf('480') !== -1 || q.indexOf('sd') !== -1) return '480p';
        if (q.indexOf('360') !== -1) return '360p';
    }

    if (masterText && typeof masterText === 'string') {
        const resMatches = masterText.match(/RESOLUTION=\d+x(\d+)/gi) || [];
        let maxH = 0;
        for (let i = 0; i < resMatches.length; i++) {
            const h = parseInt(resMatches[i].split('x')[1], 10) || 0;
            if (h > maxH) maxH = h;
        }
        if (maxH >= 2160) return '4K';
        if (maxH >= 1440) return '1440p';
        if (maxH >= 1080) return '1080p';
        if (maxH >= 720) return '720p';
        if (maxH >= 480) return '480p';
        if (maxH >= 360) return '360p';
    }

    return 'Auto';
}

/**
 * Deteksi apakah bahasa sumber/audio termasuk English, Indonesian, atau Original (tanpa label).
 */
export function classifySourceLanguage(langStr) {
    if (!langStr) return { isPreferred: true, label: '' };
    const clean = String(langStr).trim();
    const lower = clean.toLowerCase();

    if (lower.indexOf('indonesian') !== -1 || lower === 'id' || lower === 'ind') {
        return { isPreferred: true, label: clean };
    }
    if (lower.indexOf('english') !== -1 || lower === 'en' || lower === 'eng') {
        return { isPreferred: true, label: clean };
    }
    return { isPreferred: false, label: clean };
}

/**
 * Bangun query string untuk /api/resolve milik VidBolt.
 */
function buildResolveUrl(tmdbId, isTv, season, episode, serverId) {
    const parts = [
        `type=${isTv ? 'tv' : 'movie'}`,
        `id=${encodeURIComponent(tmdbId)}`
    ];
    if (isTv) {
        parts.push(`season=${encodeURIComponent(season)}`);
        parts.push(`episode=${encodeURIComponent(episode)}`);
    }
    if (serverId) {
        parts.push(`only=${encodeURIComponent(serverId)}`);
    }
    return `${PLAYER_URL}/api/resolve?${parts.join('&')}`;
}

/**
 * Ambil data stream dari satu server VidBolt (atau auto jika serverId null).
 */
export async function resolveServer(tmdbId, isTv, season, episode, serverId = null) {
    const url = buildResolveUrl(tmdbId, isTv, season, episode, serverId);
    try {
        const res = await fetch(url, { headers: PLAYER_HEADERS });
        if (!res.ok) return null;

        const data = await res.json();
        const stream = data && data.stream;
        if (!stream || !Array.isArray(stream.sources) || stream.sources.length === 0) {
            return null;
        }
        return stream;
    } catch (e) {
        console.warn(`[Ghostflix] Error resolve (${serverId || 'auto'}): ${e.message}`);
        return null;
    }
}

/**
 * Konversi respon stream satu server menjadi array objek stream Nuvio.
 */
export function buildStreamsFromResolved(resolvedStream, centralSubtitles, includeAllLanguages = false) {
    if (!resolvedStream || !Array.isArray(resolvedStream.sources)) return [];

    const serverId = resolvedStream.server || 'auto';
    const serverName = SERVER_LABELS[serverId] || serverId;
    const serverSubs = filterStreamSubtitles(resolvedStream.subtitles);
    const mergedSubtitles = mergeSubtitles(centralSubtitles, serverSubs);

    const requestHeaders = (resolvedStream.headers && typeof resolvedStream.headers === 'object')
        ? { ...STREAM_HEADERS, ...resolvedStream.headers }
        : STREAM_HEADERS;

    const results = [];
    const seenUrls = new Set();

    for (let i = 0; i < resolvedStream.sources.length; i++) {
        const src = resolvedStream.sources[i];
        if (!src || !src.url || seenUrls.has(src.url)) continue;

        const langInfo = classifySourceLanguage(src.language);
        if (!includeAllLanguages && !langInfo.isPreferred) {
            continue;
        }

        seenUrls.add(src.url);
        const quality = normalizeQuality(src.quality, src.master);
        const format = String(src.kind || '').toLowerCase() === 'mp4' ? 'mp4' : 'm3u8';
        const langSuffix = langInfo.label ? ` - ${langInfo.label}` : '';
        const formatTag = format === 'mp4' ? ' [MP4]' : '';

        results.push({
            name: `${PROVIDER_NAME} | ${serverName} (${quality})`,
            title: `${PROVIDER_NAME} - ${serverName} (${quality}${langSuffix})${formatTag}`,
            url: src.url,
            quality: quality,
            format: format,
            headers: requestHeaders,
            subtitles: mergedSubtitles
        });
    }

    return results;
}

/**
 * Kumpulkan stream dari server yang dipilih sesuai pengaturan.
 */
export async function fetchAllStreams(tmdbId, isTv, season, episode, centralSubtitles, options = {}) {
    const serverMode = options.serverMode || 'all';
    const includeAllLanguages = Boolean(options.includeAllLanguages);

    let resolvedList = [];

    if (serverMode === 'auto') {
        // Jalankan mode auto + Callisto + Orion secara paralel agar sumber utama dan cadangan selalu tersedia
        const [autoStream, orionStream, callistoStream] = await Promise.all([
            resolveServer(tmdbId, isTv, season, episode, null),
            resolveServer(tmdbId, isTv, season, episode, 'orion'),
            resolveServer(tmdbId, isTv, season, episode, 'callisto')
        ]);
        resolvedList = [orionStream, callistoStream, autoStream];
    } else if (SERVER_LABELS[serverMode]) {
        const single = await resolveServer(tmdbId, isTv, season, episode, serverMode);
        resolvedList = [single];
    } else {
        // Query semua server VidBolt secara paralel
        resolvedList = await Promise.all(
            SERVERS.map((srv) => resolveServer(tmdbId, isTv, season, episode, srv.id))
        );
    }

    const seenServerIds = new Set();
    const seenStreamUrls = new Set();
    const allStreams = [];

    for (let i = 0; i < resolvedList.length; i++) {
        const item = resolvedList[i];
        if (!item) continue;

        if (item.server && seenServerIds.has(item.server)) {
            continue;
        }
        if (item.server) {
            seenServerIds.add(item.server);
        }

        const built = buildStreamsFromResolved(item, centralSubtitles, includeAllLanguages);
        for (let j = 0; j < built.length; j++) {
            const st = built[j];
            if (!st || !st.url || seenStreamUrls.has(st.url)) continue;
            seenStreamUrls.add(st.url);
            allStreams.push(st);
        }
    }

    // Fallback: jika filter bahasa membuat hasil kosong, tampilkan semua bahasa yang ada
    if (allStreams.length === 0 && !includeAllLanguages) {
        for (let i = 0; i < resolvedList.length; i++) {
            const item = resolvedList[i];
            if (!item) continue;
            const built = buildStreamsFromResolved(item, centralSubtitles, true);
            for (let j = 0; j < built.length; j++) {
                const st = built[j];
                if (!st || !st.url || seenStreamUrls.has(st.url)) continue;
                seenStreamUrls.add(st.url);
                allStreams.push(st);
            }
        }
    }

    // Urutkan berdasarkan kualitas tertinggi dan prioritaskan HLS (m3u8)
    allStreams.sort((a, b) => {
        const wa = QUALITY_WEIGHTS[a.quality] || 0;
        const wb = QUALITY_WEIGHTS[b.quality] || 0;
        if (wb !== wa) return wb - wa;
        if (a.format === 'm3u8' && b.format !== 'm3u8') return -1;
        if (b.format === 'm3u8' && a.format !== 'm3u8') return 1;
        return 0;
    });

    return allStreams;
}
