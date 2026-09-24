import {
    LANGUAGE_MAP,
    QUALITY_RANK,
    SITE_ORIGIN,
    TMDB_API_KEY,
    TMDB_BASE,
    USER_AGENT
} from './constants.js';

/**
 * Logging.
 *
 * Nuvio runs providers inside a QuickJS sandbox and forwards their `console`
 * output to Android's logcat under the **`PluginRuntime`** tag, prefixed with
 * `Plugin:<manifest-url>:<id>`. So `adb logcat -s PluginRuntime` shows these
 * lines on a real device. Keep every message to a single line.
 */
export function log(message) {
    try {
        console.log('[Atlantic] ' + message);
    } catch (error) {
        // Logging must never be the reason a scrape fails.
    }
}

/** Trim a URL so one log line stays readable. */
export function briefUrl(url) {
    const text = String(url || '');
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
}

export function keysOf(data) {
    if (!data || typeof data !== 'object') return 'none';
    return Object.keys(data).join(',') || 'none';
}

/** One-line summary of a source API response, for logcat. */
export function summarise(data) {
    if (!data || typeof data !== 'object') return String(data);
    const parts = [];
    if (data.found !== undefined) parts.push('found=' + data.found);
    if (data.renew !== undefined) parts.push('renew=' + data.renew);
    if (data.format || data.type) parts.push('format=' + (data.format || data.type));
    if (data.source) parts.push('upstream=' + data.source);
    if (Array.isArray(data.availableSources)) {
        parts.push('available=[' + data.availableSources.join(',') + ']');
    }
    if (data.title) parts.push('title="' + data.title + '"');
    return parts.length ? parts.join(' ') : 'keys=' + keysOf(data);
}

/** fetch + text with a hard timeout. Never throws; always resolves to a result. */
export async function fetchText(url, options, timeoutMs) {
    let timer = null;
    try {
        const response = await Promise.race([
            fetch(url, options),
            new Promise((resolve, reject) => {
                timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
            })
        ]);
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
    } catch (error) {
        // A status-0 failure is the one that silently kills a source, so it is
        // the single most useful thing to surface. The native fetch keeps
        // running after this timeout, so the host may log its own
        // "Fetch bridge error" line much later — that is expected.
        log('network error after ' + timeoutMs + 'ms: ' + briefUrl(url) + ' (' + error.message + ')');
        return { ok: false, status: 0, text: '', error: error.message };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function fetchJson(url, options, timeoutMs) {
    const result = await fetchText(url, options, timeoutMs);
    let data = null;
    if (result.ok && result.text) {
        try {
            data = JSON.parse(result.text);
        } catch (error) {
            data = null;
        }
    }
    return { ok: result.ok, status: result.status, data, text: result.text };
}

/** `fetchJson` with the transient-failure retry. */
export async function fetchJsonWithRetry(url, options, timeoutMs, attempts) {
    const result = await fetchWithRetry(url, options, timeoutMs, attempts);
    let data = null;
    if (result.ok && result.text) {
        try {
            data = JSON.parse(result.text);
        } catch (error) {
            data = null;
        }
    }
    return { ok: result.ok, status: result.status, data, text: result.text };
}

/**
 * Headers for the stream CDNs.
 *
 * **Required.** Verified live: with no `Referer` the master playlist answers
 * `200 text/html` with a decoy page, so the failure is silent — playback just
 * never starts. With the site's Referer it answers `200 application/vnd.apple.mpegurl`.
 * These are deliberately *not* the signed API headers; the API call and playback
 * need different sets.
 */
export function playbackHeaders() {
    return {
        'Accept': '*/*',
        'Origin': SITE_ORIGIN,
        'Referer': SITE_ORIGIN + '/',
        'User-Agent': USER_AGENT
    };
}

/** Headers the Natsuki subtitle backend requires — it answers `403 forbidden` without them. */
export function natsukiHeaders() {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Origin': SITE_ORIGIN,
        'Referer': SITE_ORIGIN + '/',
        'User-Agent': USER_AGENT
    };
}

/** `4K` / `1440p` / `1080p` / ... — the badge Nuvio shows next to a stream. */
export function qualityBadge(height) {
    const h = Number(height) || 0;
    if (h >= 2160) return '4K';
    if (h >= 1440) return '1440p';
    if (h >= 1080) return '1080p';
    if (h >= 720) return '720p';
    if (h >= 480) return '480p';
    if (h >= 360) return '360p';
    return h ? h + 'p' : 'Auto';
}

export function rankQuality(badge) {
    return QUALITY_RANK[badge] !== undefined ? QUALITY_RANK[badge] : 0;
}

function absolutize(url, baseUrl) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
        return new URL(url, baseUrl).toString();
    } catch (error) {
        return url;
    }
}

/**
 * Parse a master playlist.
 *
 * Returns the `#EXT-X-STREAM-INF` variants plus whether the master declares a
 * separate audio rendition. That flag decides how the source is exposed:
 *
 * Atlantic publishes audio as `#EXT-X-MEDIA:TYPE=AUDIO` and points at it with
 * `AUDIO="..."` on each variant. A variant playlist cannot reference a media
 * group, so handing a single variant to the player yields **video with no audio**
 * (confirmed by decrypting an Aphrodite variant init segment: it contains one
 * `vide` track and no `soun` track). When that flag is set the provider therefore
 * exposes the master only, and lets the player's own quality selector pick the
 * rendition — which keeps audio and still offers every quality.
 */
export function parseMasterPlaylist(text, baseUrl) {
    const lines = String(text || '').split('\n');
    const variants = [];
    let hasSeparateAudio = false;
    let current = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.indexOf('#EXT-X-MEDIA:') === 0) {
            if (/TYPE=AUDIO/i.test(line)) hasSeparateAudio = true;
            continue;
        }

        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            const resolution = /RESOLUTION=(\d+)x(\d+)/i.exec(line);
            const bandwidth = /BANDWIDTH=(\d+)/i.exec(line);
            current = {
                width: resolution ? Number(resolution[1]) : 0,
                height: resolution ? Number(resolution[2]) : 0,
                bandwidth: bandwidth ? Number(bandwidth[1]) : 0
            };
            continue;
        }

        if (line.charAt(0) === '#') continue;

        if (current) {
            current.url = absolutize(line, baseUrl);
            variants.push(current);
            current = null;
        }
    }

    variants.sort((a, b) => (b.height - a.height) || (b.bandwidth - a.bandwidth));

    return { variants: variants, hasSeparateAudio: hasSeparateAudio };
}

/**
 * Fetch, and on a *transient* failure try once more with a shorter timeout.
 *
 * The delivery CDNs are intermittent — the same title can answer cleanly on one
 * call and fail on the next — so a single blip would otherwise drop a source that
 * is perfectly usable. Only network errors (status 0) and 5xx are retried; a 4xx
 * is a real answer (a missing title, an expired session) and retrying it would
 * just double the cost.
 */
async function fetchWithRetry(url, options, timeoutMs, attempts) {
    let result = await fetchText(url, options, timeoutMs);
    if (result.ok) return result;

    const transient = result.status === 0 || result.status >= 500;
    if (!transient) return result;

    for (let i = 1; i < attempts; i++) {
        result = await fetchText(url, options, Math.max(3000, Math.round(timeoutMs / 2)));
        if (result.ok) return result;
        if (result.status !== 0 && result.status < 500) return result;
    }
    return result;
}

/** True when a body really is an HLS playlist rather than the CDN's decoy HTML. */
export function looksLikePlaylist(text) {
    return typeof text === 'string' && text.indexOf('#EXTM3U') !== -1;
}

/** Fetch a master playlist and parse it. Returns null when the source is unusable. */
export async function loadMaster(url, timeoutMs) {
    const headers = playbackHeaders();
    const result = await fetchWithRetry(url, { headers: headers }, timeoutMs, 2);
    if (!result.ok) {
        log('master playlist HTTP ' + result.status + ' ' + briefUrl(url));
        return null;
    }
    if (!looksLikePlaylist(result.text)) {
        // The CDN answers 200 text/html with a decoy page when the Referer is
        // missing, so this is the signature of a stripped/blocked header.
        log('master playlist is NOT HLS (got ' + result.text.length + ' bytes of ' +
            (result.text.indexOf('<') === 0 ? 'HTML' : 'unknown') + ') — headers likely stripped');
        return null;
    }
    const parsed = parseMasterPlaylist(result.text, url);
    if (!parsed.variants.length) {
        log('master playlist has no variants: ' + briefUrl(url));
        return null;
    }
    log('master ok: ' + parsed.variants.length + ' variants, separateAudio=' +
        parsed.hasSeparateAudio + ', top=' + qualityBadge(parsed.variants[0].height));
    return { headers: headers, variants: parsed.variants, hasSeparateAudio: parsed.hasSeparateAudio };
}

/**
 * Confirm a variant playlist is actually served.
 *
 * A master playlist loading proves nothing: Artemis advertises four variants on
 * its `Orbit` source and every one of them answers 502, while the master itself
 * is a clean 200. Probing the top variant is what separates a live source from a
 * listed-but-dead one.
 */
export async function variantIsPlayable(url, headers, timeoutMs) {
    const result = await fetchWithRetry(url, { headers: headers }, timeoutMs, 2);
    if (!result.ok) {
        log('variant probe HTTP ' + result.status + ' ' + briefUrl(url));
        return false;
    }
    return result.text.indexOf('#EXTINF') !== -1 || looksLikePlaylist(result.text);
}

/** TMDB metadata plus the IMDb id the subtitle backends need. */
export async function getTmdbMeta(tmdbId, mediaType) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    // `external_ids` is required: /tv/:id does not carry imdb_id on its own.
    const url = TMDB_BASE + '/' + type + '/' + encodeURIComponent(tmdbId) +
        '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';
    const result = await fetchJson(url, { 'User-Agent': USER_AGENT }, 10000);
    const data = result.data || {};
    const external = data.external_ids || {};
    const date = data.release_date || data.first_air_date || '';
    const meta = {
        title: data.title || data.name || data.original_title || data.original_name || '',
        year: date ? String(date).slice(0, 4) : '',
        imdbId: external.imdb_id || data.imdb_id || ''
    };
    log('tmdb ' + type + '/' + tmdbId + ' -> "' + meta.title + '" (' + (meta.year || '?') +
        '), imdb=' + (meta.imdbId || 'NONE'));
    return meta;
}

/** Resolve a backend's language *name* to an ISO code, or '' when unrecognised. */
export function languageNameToCode(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return '';
    if (LANGUAGE_MAP[key]) return LANGUAGE_MAP[key];
    if (/^[a-z]{2}(-[a-z]{2})?$/.test(key)) return key;
    return '';
}

export function languageDisplayName(code) {
    const wanted = String(code || '').toLowerCase();
    if (!wanted) return 'Unknown';
    for (const key in LANGUAGE_MAP) {
        if (LANGUAGE_MAP[key] === wanted) {
            return key.replace(/\b\w/g, c => c.toUpperCase());
        }
    }
    return wanted.toUpperCase();
}

/**
 * Merge the backends' tracks and keep the list a sane size.
 *
 * Left alone these backends return hundreds of rows (611 for one Game of Thrones
 * episode) which is useless in a picker and bloats the payload. Dedupe by
 * language+url, then keep at most `maxPerLanguage` per language.
 *
 * Tracks are taken **round-robin across backends** rather than first-backend-first:
 * otherwise Granite alone fills every language's quota and the Natsuki and
 * OpenSubtitles rows — which are the ones with the better file names, and the only
 * source of some languages — never appear at all.
 */
export function mergeSubtitles(lists, maxPerLanguage, maxTotal) {
    const order = [];
    const queues = {};
    const seen = {};

    for (let s = 0; s < lists.length; s++) {
        const list = lists[s] || [];
        for (let i = 0; i < list.length; i++) {
            const track = list[i];
            if (!track || !track.url || !track.language) continue;

            const key = track.language + '|' + track.url;
            if (seen[key]) continue;
            seen[key] = true;

            if (!queues[track.language]) {
                queues[track.language] = [];
                order.push(track.language);
            }
            while (queues[track.language].length <= s) queues[track.language].push([]);
            queues[track.language][s].push(track);
        }
    }

    const out = [];
    for (let l = 0; l < order.length; l++) {
        const perSource = queues[order[l]];
        let taken = 0;
        let index = 0;

        while (taken < maxPerLanguage) {
            let progressed = false;
            for (let s = 0; s < perSource.length && taken < maxPerLanguage; s++) {
                const queue = perSource[s];
                if (queue.length > index) {
                    out.push(queue[index]);
                    taken++;
                    progressed = true;
                    if (out.length >= maxTotal) return out;
                }
            }
            if (!progressed) break;
            index++;
        }
    }

    return out;
}

/** `Atlantic | Aphrodite 4K · S1E2 | Fight Club (1999)` */
export function buildStreamTitle(meta, label, quality, season, episode) {
    const parts = [meta.title || 'Atlantic'];
    if (meta.year) parts[0] += ' (' + meta.year + ')';
    let title = parts[0];
    if (season && episode) title += ' S' + season + 'E' + episode;
    return 'Atlantic | ' + label + ' ' + quality + ' | ' + title;
}
