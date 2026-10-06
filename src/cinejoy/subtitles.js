import { HEADERS } from './constants.js';

export const NATSUKI_BASE = 'https://natsuki.hls.lol/subs';
export const GRANITE_BASE = 'https://sub.vdrk.site/v1';
export const OPENSUBS_BASE = 'https://rest.opensubtitles.org';
export const OPENSUBS_USER_AGENT = 'VLSub 0.10.2';

const LANGUAGE_MAP = {
    english: 'en',
    french: 'fr',
    spanish: 'es',
    'spanish (latin america)': 'es',
    'spanish (la)': 'es',
    latino: 'es',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    'portuguese (br)': 'pt-br',
    'portuguese (brazil)': 'pt-br',
    'portuguese (brazilian)': 'pt-br',
    brazilian: 'pt-br',
    'brazilian portuguese': 'pt-br',
    dutch: 'nl',
    russian: 'ru',
    japanese: 'ja',
    korean: 'ko',
    'chinese (simplified)': 'zh-cn',
    'chinese (traditional)': 'zh-tw',
    chinese: 'zh',
    arabic: 'ar',
    hindi: 'hi',
    turkish: 'tr',
    polish: 'pl',
    swedish: 'sv',
    norwegian: 'no',
    danish: 'da',
    finnish: 'fi',
    greek: 'el',
    hebrew: 'he',
    thai: 'th',
    vietnamese: 'vi',
    indonesian: 'id',
    czech: 'cs',
    hungarian: 'hu',
    romanian: 'ro',
    ukrainian: 'uk',
    bulgarian: 'bg',
    croatian: 'hr',
    serbian: 'sr',
    slovak: 'sk',
    slovenian: 'sl',
    estonian: 'et',
    latvian: 'lv',
    lithuanian: 'lt',
    farsi: 'fa',
    persian: 'fa',
    bengali: 'bn',
    tamil: 'ta',
    telugu: 'te',
    malay: 'ms',
    filipino: 'tl',
    tagalog: 'tl',
    albanian: 'sq',
    armenian: 'hy',
    azerbaijani: 'az',
    basque: 'eu',
    belarusian: 'be',
    bosnian: 'bs',
    catalan: 'ca',
    galician: 'gl',
    georgian: 'ka',
    icelandic: 'is',
    kazakh: 'kk',
    khmer: 'km',
    macedonian: 'mk',
    malayalam: 'ml',
    marathi: 'mr',
    mongolian: 'mn',
    nepali: 'ne',
    punjabi: 'pa',
    sinhala: 'si',
    swahili: 'sw',
    urdu: 'ur',
    uzbek: 'uz',
    welsh: 'cy',
    kurdish: 'ku',
    sorani: 'ckb',
    'kurdish (sorani)': 'ckb',
    'kurdish (kurmanji)': 'ku',
    ckb: 'ckb',
    burmese: 'my',
    myanmar: 'my',
    pashto: 'ps',
    pushto: 'ps',
    sindhi: 'sd',
    somali: 'so',
    afrikaans: 'af',
    akan: 'ak',
    ewe: 'ee',
    oromo: 'om',
    amharic: 'am',
    yoruba: 'yo',
    zulu: 'zu',
    hausa: 'ha',
    lao: 'lo',
    tibetan: 'bo',
    esperanto: 'eo',
    latin: 'la',
    'norwegian bokmål': 'nb',
    'norwegian nynorsk': 'nn',
    flemish: 'nl',
    cantonese: 'zh-yue',
    'chinese (cantonese)': 'zh-yue',
    'serbo-croatian': 'sh'
};

function languageNameToCode(name) {
    const key = String(name || '').trim().toLowerCase();
    if (!key) return '';
    if (LANGUAGE_MAP[key]) return LANGUAGE_MAP[key];
    if (/^[a-z]{2}(-[a-z]{2})?$/.test(key)) return key;
    return '';
}

function languageDisplayName(code) {
    const wanted = String(code || '').toLowerCase();
    if (!wanted) return 'Unknown';
    for (const key in LANGUAGE_MAP) {
        if (LANGUAGE_MAP[key] === wanted) {
            return key.replace(/\b\w/g, c => c.toUpperCase());
        }
    }
    return wanted.toUpperCase();
}

async function fetchJson(url, options = {}) {
    try {
        const res = await fetch(url, options);
        let data = null;
        if (res.ok) {
            data = await res.json();
        }
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: null };
    }
}

/** Granite — keyed by TMDB id, serves VTT, needs no special headers. */
async function fetchGranite(tmdbId, mediaType, season, episode) {
    if (!tmdbId) return [];
    const url = mediaType === 'tv'
        ? GRANITE_BASE + '/tv/' + encodeURIComponent(tmdbId) + '/' +
            encodeURIComponent(season || 1) + '/' + encodeURIComponent(episode || 1)
        : GRANITE_BASE + '/movie/' + encodeURIComponent(tmdbId);

    const result = await fetchJson(url, { headers: { 'User-Agent': HEADERS["User-Agent"] } });
    if (!result.ok || !Array.isArray(result.data)) {
        return [];
    }

    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (!item || !item.file || !item.label) continue;

        const label = String(item.label);
        // "English2" / "English HI" -> "English"
        const base = label.replace(/\s*hi\d*$/i, '').replace(/\d+$/, '');
        const code = languageNameToCode(base);
        if (!code) continue;

        tracks.push({
            url: item.file,
            language: code,
            name: label
        });
    }
    return tracks;
}

/** Natsuki — keyed by IMDb id, serves SRT, requires Origin/Referer. */
async function fetchNatsuki(imdbId, season, episode) {
    if (!imdbId) {
        return [];
    }

    const parts = ['imdbId=' + encodeURIComponent(imdbId)];
    if (season && episode) {
        parts.push('season=' + encodeURIComponent(season));
        parts.push('episode=' + encodeURIComponent(episode));
    }

    // Use Atlantic's Origin and Referer since Natsuki explicitly checks for it, as we learned
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://atlantic.st',
        'Referer': 'https://atlantic.st/',
        'User-Agent': HEADERS["User-Agent"]
    };

    const result = await fetchJson(
        NATSUKI_BASE + '?' + parts.join('&'),
        { headers: headers }
    );
    if (!result.ok || !result.data || !Array.isArray(result.data.subtitles)) {
        return [];
    }

    const tracks = [];
    for (let i = 0; i < result.data.subtitles.length; i++) {
        const item = result.data.subtitles[i];
        if (!item || !item.url) continue;

        const code = languageNameToCode(item.language) || languageNameToCode(item.langCode);
        if (!code) continue;

        tracks.push({
            url: item.url,
            language: code,
            name: item.fileName || languageDisplayName(code)
        });
    }
    return tracks;
}

/** OpenSubtitles (legacy REST) — keyed by IMDb id, serves gzipped SRT. */
async function fetchOpenSubtitles(imdbId, season, episode) {
    if (!imdbId) {
        return [];
    }

    const id = String(imdbId).replace(/^tt/, '');
    const hasEpisode = Boolean(season && episode);
    const path = '/search/' +
        (hasEpisode ? 'episode-' + encodeURIComponent(episode) + '/' : '') +
        'imdbid-' + encodeURIComponent(id) +
        (hasEpisode ? '/season-' + encodeURIComponent(season) : '');

    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': HEADERS["User-Agent"],
        'X-User-Agent': OPENSUBS_USER_AGENT
    };

    const result = await fetchJson(OPENSUBS_BASE + path, { headers: headers });
    if (!result.ok || !Array.isArray(result.data)) {
        return [];
    }

    const tracks = [];
    for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        if (!item || !item.SubDownloadLink) continue;

        const code = languageNameToCode(item.LanguageName);
        if (!code) continue;

        // The API hands back a gzip wrapper; ask for the UTF-8 variant instead so
        // the player does not have to decompress.
        const url = String(item.SubDownloadLink)
            .replace(/\.gz$/i, '')
            .replace('/download/', '/download/subencoding-utf8/');

        tracks.push({
            url: url,
            language: code,
            name: item.LanguageName || languageDisplayName(code)
        });
    }
    return tracks;
}

export async function fetchAllSubtitles(tmdbId, mediaType, season, episode, imdbId) {
    const jobs = [
        fetchGranite(tmdbId, mediaType, season, episode),
        fetchNatsuki(imdbId, season, episode),
        fetchOpenSubtitles(imdbId, season, episode)
    ];

    const settled = await Promise.all(jobs.map(job => job.catch(() => [])));

    // Merge tracks
    const allTracks = [];
    const seen = new Set();

    for (const list of settled) {
        if (!Array.isArray(list)) continue;
        for (const track of list) {
            const key = track.language + '|' + track.url;
            if (!seen.has(key)) {
                seen.add(key);
                allTracks.push(track);
            }
        }
    }

    return allTracks;
}
