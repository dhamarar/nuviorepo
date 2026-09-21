import {
    DEFAULT_DOMAIN,
    CANDIDATE_DOMAINS,
    DEFAULT_API_HOST,
    CANDIDATE_API_HOSTS,
    TMDB_BASE_URL,
    TMDB_API_KEY
} from './constants.js';

let cachedDomain = DEFAULT_DOMAIN;
let lastDomainResolvedTime = 0;
const DOMAIN_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

let cachedApiHost = DEFAULT_API_HOST;

export async function resolveDomain(force = false) {
    const now = Date.now();
    if (!force && lastDomainResolvedTime > 0 && (now - lastDomainResolvedTime) < DOMAIN_CACHE_TTL) {
        return cachedDomain;
    }

    const candidates = [cachedDomain, ...CANDIDATE_DOMAINS.filter(d => d !== cachedDomain)];
    for (const candidate of candidates) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(candidate, {
                signal: controller.signal,
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            clearTimeout(timer);
            if (res.ok || (res.status >= 200 && res.status < 400)) {
                cachedDomain = candidate.replace(/\/+$/, '');
                lastDomainResolvedTime = now;
                return cachedDomain;
            }
        } catch (e) {}
    }

    return cachedDomain || DEFAULT_DOMAIN;
}

export async function getActiveServers(domain = DEFAULT_DOMAIN) {
    const cleanDomain = domain.replace(/\/+$/, '');
    const apiHosts = [cachedApiHost, ...CANDIDATE_API_HOSTS.filter(h => h !== cachedApiHost)];

    for (const host of apiHosts) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`${host}/servers`, {
                signal: controller.signal,
                headers: {
                    "Origin": cleanDomain,
                    "Referer": `${cleanDomain}/`,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                }
            });
            clearTimeout(timer);

            if (res.ok) {
                const json = await res.json();
                const arr = json.servers;
                if (Array.isArray(arr) && arr.length > 0) {
                    cachedApiHost = host;
                    const validServers = [];
                    for (const s of arr) {
                        const name = (s.name || "").toLowerCase().trim();
                        const status = (s.status || "").toLowerCase().trim();
                        if (name && (status === "" || status === "ok")) {
                            validServers.push(name);
                        }
                    }
                    if (validServers.length > 0) return { host: cachedApiHost, servers: validServers };
                }
            }
        } catch (e) {}
    }

    return { host: cachedApiHost, servers: ["lisbon", "nebula", "solara", "athens"] };
}

export async function fetchOpenSubtitles(tmdbId, mediaType, season = 1, episode = 1) {
    const subtitles = [];
    try {
        const extUrl = `${TMDB_BASE_URL}/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const extRes = await fetch(extUrl, {
            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
        });
        if (!extRes.ok) return subtitles;

        const extJson = await extRes.json();
        const imdbId = extJson.imdb_id;
        if (!imdbId) return subtitles;

        const subUrl = mediaType === "tv"
            ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`
            : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

        const subRes = await fetch(subUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!subRes.ok) return subtitles;

        const subData = await subRes.json();
        const arr = subData.subtitles || [];
        for (const sub of arr) {
            if (sub.url) {
                subtitles.push({
                    url: sub.url,
                    language: (sub.lang || "en").toLowerCase(),
                    name: sub.lang || "Subtitle"
                });
            }
        }
    } catch (e) {
        console.warn("[Cinejoy] OpenSubtitles fetch error:", e.message);
    }
    return subtitles;
}
