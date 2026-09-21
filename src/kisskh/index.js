import { MAIN_URL, HEADERS } from './constants.js';
import { getKey } from './crypto.js';
import { getTMDBDetails, findBestMatch } from './utils.js';

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    console.log(`[Kisskh] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}, S: ${season}, E: ${episode}`);
    const streams = [];

    try {
        // 1. Dapatkan detail TMDB untuk mencari judul di Kisskh
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        console.log(`[Kisskh] TMDB Title: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);

        const searchQueries = [mediaInfo.title];
        if (mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
            searchQueries.push(mediaInfo.originalTitle);
        }

        let searchResults = [];
        for (const query of searchQueries) {
            try {
                const encodedQuery = encodeURIComponent(query.trim());
                const res = await fetch(`${MAIN_URL}/api/DramaList/Search?q=${encodedQuery}`, {
                    headers: HEADERS
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        searchResults = data;
                        break;
                    }
                }
            } catch (err) {
                console.warn(`[Kisskh] Search failed for query "${query}":`, err.message);
            }
        }

        if (searchResults.length === 0) {
            console.log(`[Kisskh] No results found for "${mediaInfo.title}"`);
            return [];
        }

        // 2. Cocokkan judul terbaik
        const matchedDrama = findBestMatch(mediaInfo, searchResults);
        if (!matchedDrama || !matchedDrama.id) {
            console.log(`[Kisskh] No confident title match found for "${mediaInfo.title}"`);
            return [];
        }

        console.log(`[Kisskh] Matched Drama: "${matchedDrama.title}" (ID: ${matchedDrama.id})`);

        // 3. Ambil detail drama dan daftar episode
        const detailRes = await fetch(`${MAIN_URL}/api/DramaList/Drama/${matchedDrama.id}?isq=false`, {
            headers: HEADERS
        });
        if (!detailRes.ok) {
            console.warn(`[Kisskh] Failed to fetch drama details for ID: ${matchedDrama.id}`);
            return [];
        }

        const dramaDetail = await detailRes.json();
        const episodes = dramaDetail.episodes || [];

        if (episodes.length === 0) {
            console.log(`[Kisskh] No episodes found for drama ID: ${matchedDrama.id}`);
            return [];
        }

        // 4. Pilih episode target
        let targetEpisode = null;
        if (mediaType === "movie") {
            targetEpisode = episodes[0];
        } else {
            const epNum = Number(episode) || 1;
            targetEpisode = episodes.find(e => {
                const num = Number(e.number);
                return num === epNum || Math.floor(num) === epNum;
            }) || episodes[0];
        }

        if (!targetEpisode || !targetEpisode.id) {
            console.log(`[Kisskh] Episode ${episode} not found in drama`);
            return [];
        }

        const episodeId = targetEpisode.id;
        console.log(`[Kisskh] Target Episode ID: ${episodeId} (Number: ${targetEpisode.number})`);

        // 5. Generate kkey token keamanan untuk video dan subtitle
        const videoKkey = getKey(episodeId, false);
        const subKkey = getKey(episodeId, true);

        // 6. Ambil subtitle multi-bahasa
        const subtitles = [];
        if (subKkey) {
            try {
                const subUrl = `${MAIN_URL}/api/Sub/${episodeId}?kkey=${subKkey}`;
                const subRes = await fetch(subUrl, { headers: HEADERS });
                if (subRes.ok) {
                    const subList = await subRes.json();
                    if (Array.isArray(subList)) {
                        for (const s of subList) {
                            if (s.src) {
                                subtitles.push({
                                    url: s.src,
                                    language: (s.land || "en").toLowerCase(),
                                    name: s.label || s.land || "Subtitle"
                                });
                            }
                        }
                    }
                }
            } catch (subErr) {
                console.warn("[Kisskh] Failed to fetch subtitles:", subErr.message);
            }
        }

        // 7. Ambil stream video
        const streamUrl = `${MAIN_URL}/api/DramaList/Episode/${episodeId}.png?err=false&ts=null&time=null&kkey=${videoKkey}`;
        const streamRes = await fetch(streamUrl, { headers: HEADERS });
        if (!streamRes.ok) {
            console.warn(`[Kisskh] Stream API returned HTTP ${streamRes.status}`);
            return [];
        }

        const videoData = await streamRes.json();
        const primaryVideo = videoData.Video;
        const backupVideo = videoData.Video_tmp;
        const isCountdown = videoData.Type === 2 || (primaryVideo && primaryVideo.includes("tickcounter"));

        if (isCountdown) {
            console.log("[Kisskh] Episode is still in countdown / not released yet");
            return [];
        }

        const streamHeaders = {
            "Origin": "https://kisskh.co",
            "Referer": "https://kisskh.co/",
            "User-Agent": HEADERS["User-Agent"]
        };

        if (primaryVideo && (primaryVideo.startsWith("http") || primaryVideo.startsWith("//"))) {
            const fixedUrl = primaryVideo.startsWith("//") ? `https:${primaryVideo}` : primaryVideo;
            const isHls = fixedUrl.includes(".m3u8");
            streams.push({
                name: "Kisskh",
                title: `Kisskh - ${isHls ? "HLS" : "Direct"} (Server 1)`,
                url: fixedUrl,
                quality: "1080p",
                headers: streamHeaders,
                subtitles: subtitles
            });
        }

        if (backupVideo && (backupVideo.startsWith("http") || backupVideo.startsWith("//")) && backupVideo !== primaryVideo) {
            const fixedBackup = backupVideo.startsWith("//") ? `https:${backupVideo}` : backupVideo;
            const isHls = fixedBackup.includes(".m3u8");
            streams.push({
                name: "Kisskh",
                title: `Kisskh - ${isHls ? "HLS" : "Direct"} (Backup)`,
                url: fixedBackup,
                quality: "1080p",
                headers: streamHeaders,
                subtitles: subtitles
            });
        }

        console.log(`[Kisskh] Successfully retrieved ${streams.length} stream(s)`);
    } catch (error) {
        console.error(`[Kisskh] Error: ${error.message}`);
    }

    return streams;
}

module.exports = { getStreams };
