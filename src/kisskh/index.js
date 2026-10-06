import { MAIN_URL, HEADERS } from './constants.js';
import { getKey } from './crypto.js';
import { getTMDBDetails, findBestMatch, extractSeasonInfo } from './utils.js';

async function getStreams(tmdbId, mediaType = "movie", season = 1, episode = 1) {
    let id = tmdbId;
    let type = mediaType;
    let s = season;
    let ep = episode;

    // Support invocation with an options object
    if (typeof tmdbId === 'object' && tmdbId !== null) {
        id = tmdbId.tmdbId || tmdbId.id || tmdbId.tmdb;
        type = tmdbId.mediaType || tmdbId.type || type || "movie";
        s = tmdbId.season || season || 1;
        ep = tmdbId.episode || episode || 1;
    }

    const cleanTmdb = String(id || "").trim();
    if (!cleanTmdb || cleanTmdb === "[object Object]") {
        console.warn("[Kisskh] Invalid TMDB ID provided:", tmdbId);
        return [];
    }

    const cleanType = String(type || "movie").toLowerCase().trim();
    const isTv = cleanType === "tv" || cleanType === "series";
    const cleanSeason = Number(s) || 1;
    const cleanEpisode = Number(ep) || 1;

    console.log(`[Kisskh] Fetching streams for TMDB ID: ${cleanTmdb}, Type: ${isTv ? "tv" : "movie"}, S: ${cleanSeason}, E: ${cleanEpisode}`);
    const streams = [];

    try {
        // 1. Dapatkan detail TMDB untuk mencari judul di Kisskh
        const mediaInfo = await getTMDBDetails(cleanTmdb, isTv ? "tv" : "movie", cleanSeason);
        console.log(`[Kisskh] TMDB Title: "${mediaInfo.title}" (${mediaInfo.seasonYear || mediaInfo.year || 'N/A'})`);

        const searchQueries = [mediaInfo.title];
        if (mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
            searchQueries.push(mediaInfo.originalTitle);
        }

        let searchResults = [];
        const seenIds = new Set();

        for (const query of searchQueries) {
            try {
                const encodedQuery = encodeURIComponent(query.trim());
                const res = await fetch(`${MAIN_URL}/api/DramaList/Search?q=${encodedQuery}`, {
                    headers: HEADERS
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        for (const item of data) {
                            if (item && item.id && !seenIds.has(item.id)) {
                                seenIds.add(item.id);
                                searchResults.push(item);
                            }
                        }
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

        // 2. Cocokkan judul terbaik dengan memperhitungkan season
        let matchedDrama = findBestMatch(mediaInfo, searchResults, isTv ? "tv" : "movie", cleanSeason);

        // Jika TV dengan season > 1 dan hasil belum cocok dengan season yang diminta, coba pencarian spesifik season
        if (isTv && cleanSeason > 1) {
            const currentMatchSeason = matchedDrama ? extractSeasonInfo(matchedDrama.title, mediaInfo.title) : null;
            const hasAccurateMatch = currentMatchSeason && (
                currentMatchSeason.season === cleanSeason ||
                (currentMatchSeason.isMultiSeason && currentMatchSeason.seasons.includes(cleanSeason))
            );

            if (!hasAccurateMatch) {
                const seasonSearchQueries = [
                    `${mediaInfo.title} Season ${cleanSeason}`,
                    `${mediaInfo.title} ${cleanSeason}`
                ];
                if (mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
                    seasonSearchQueries.push(`${mediaInfo.originalTitle} Season ${cleanSeason}`);
                }

                for (const query of seasonSearchQueries) {
                    try {
                        const encodedQuery = encodeURIComponent(query.trim());
                        const res = await fetch(`${MAIN_URL}/api/DramaList/Search?q=${encodedQuery}`, {
                            headers: HEADERS
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                for (const item of data) {
                                    if (item && item.id && !seenIds.has(item.id)) {
                                        seenIds.add(item.id);
                                        searchResults.push(item);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`[Kisskh] Targeted season search failed for "${query}":`, err.message);
                    }
                }

                matchedDrama = findBestMatch(mediaInfo, searchResults, "tv", cleanSeason);
            }
        }

        if (!matchedDrama || !matchedDrama.id) {
            console.log(`[Kisskh] No confident match found for "${mediaInfo.title}" (S: ${cleanSeason})`);
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
        if (!isTv) {
            targetEpisode = episodes[0];
        } else {
            const seasonInfo = extractSeasonInfo(matchedDrama.title, mediaInfo.title);
            let targetEpNum = cleanEpisode;

            // Jika drama mencakup multi-season (mis. S1+S2) atau entry tunggal tanpa tag season untuk season > 1
            if (seasonInfo.isMultiSeason || (seasonInfo.season === null && cleanSeason > 1)) {
                let prevEpisodes = 0;
                if (Array.isArray(mediaInfo.seasons)) {
                    for (const sItem of mediaInfo.seasons) {
                        if (sItem && Number(sItem.season_number) >= 1 && Number(sItem.season_number) < cleanSeason) {
                            prevEpisodes += (Number(sItem.episode_count) || 0);
                        }
                    }
                }
                const absoluteEp = prevEpisodes + cleanEpisode;
                if (prevEpisodes > 0 && episodes.some(e => Number(e.number) === absoluteEp)) {
                    targetEpNum = absoluteEp;
                    console.log(`[Kisskh] Using absolute episode number: ${targetEpNum} (offset ${prevEpisodes} + ep ${cleanEpisode})`);
                }
            }

            targetEpisode = episodes.find(e => {
                const num = Number(e.number);
                return num === targetEpNum || Math.abs(num - targetEpNum) < 0.01;
            }) || episodes.find(e => Math.floor(Number(e.number)) === Math.floor(targetEpNum));

            // Fallback: urutkan episode secara kronologis (ascending) jika episode tidak ditemukan
            if (!targetEpisode) {
                const sortedEpisodes = [...episodes].sort((a, b) => Number(a.number) - Number(b.number));
                targetEpisode = sortedEpisodes[0];
            }
        }

        if (!targetEpisode || !targetEpisode.id) {
            console.log(`[Kisskh] Episode ${cleanEpisode} not found in drama`);
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
                        for (const sItem of subList) {
                            if (sItem.src) {
                                subtitles.push({
                                    url: sItem.src,
                                    language: (sItem.land || "en").toLowerCase(),
                                    name: sItem.label || sItem.land || "Subtitle"
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
