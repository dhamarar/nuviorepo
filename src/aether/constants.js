/**
 * Aether (https://aether.st) — a movie-web / P-Stream fork.
 *
 * Aether hosts no media and exposes no server-side stream API: the web app resolves
 * streams in the browser. The one piece of Aether infrastructure that is publicly
 * reachable is its own "FEM API" scraper, and that is what this provider talks to.
 * FEM API scrapes FebBox using the viewer's own FebBox `ui` token (a free FebBox
 * account carries 100 GB/month), which is exactly the setup Aether's own onboarding
 * asks for — hence the token is a required provider setting here too.
 *
 * Contract verified live against https://fembox.aether.cx on 2026-09-21:
 *
 *   GET /movie/:tmdbId?ui=TOKEN
 *   GET /tv/:tmdbId/:season/:episode?ui=TOKEN
 *     -> { sources: [{ url, quality }], subtitles: [{ url, language }] }
 *        quality is one of ORG | 4K | 1080P | 720P | 480P | 360P
 *
 *   GET /hls/movie/:tmdbId?ui=TOKEN
 *   GET /hls/tv/:tmdbId/:season/:episode?ui=TOKEN
 *     -> { hls: "<m3u8 url>", subtitles: [{ url, language }] }
 *
 *   GET /info/:type/:tmdbId   -> metadata only, no token required
 *   GET /quota?ui=TOKEN       -> { success, quota: { remaining_mb, ... } }
 *
 * Requests without `ui` are rejected with HTTP 400 {"error":"?ui=token is required"}.
 */

export const PROVIDER_NAME = 'Aether';

export const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
export const TMDB_BASE = 'https://api.themoviedb.org/3';

export const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

/**
 * FEM API candidates, tried in order until one answers. Each entry pairs the API host
 * with the Aether mirror we claim as Origin/Referer, which is what makes the
 * aether.ist mirror a genuine fallback for aether.st (and vice versa).
 *
 * DNS checked 2026-09-21:
 *   fembox.aether.cx  - resolves, answers, verified end to end  <- the live one
 *   fembox.aether.mom - NXDOMAIN today; it is the host advertised on the FEM API docs
 *                       page, so it stays as a self-healing fallback if Aether
 *                       restores it. Dead entries cost one fast lookup.
 *   fembox.aether.st  - NXDOMAIN (never existed, removed)
 *   fembox.aether.ist - NXDOMAIN (never existed, removed)
 *
 * aether.st and aether.ist are both live site mirrors, so both are used as fallback
 * origins; only the API host has a single live address.
 */
export const FEM_ENDPOINTS = [
    { api: 'https://fembox.aether.cx', site: 'https://aether.st' },
    { api: 'https://fembox.aether.cx', site: 'https://aether.ist' },
    { api: 'https://fembox.aether.mom', site: 'https://aether.mom' }
];

/** Aether site mirrors, primary first. Used for Origin/Referer fallback. */
export const AETHER_SITE_DOMAINS = ['aether.st', 'aether.ist', 'aether.mom'];

/**
 * Aether's built-in **token-free** source.
 *
 * Aether ships three variants of a single endpoint — `aether-latino`,
 * `aether-castellano` and `aether-subtitulado` — all served from here and all
 * registered with `disabled: false` and `CORS_ALLOWED`. They are what the site
 * offers before any FebBox token is entered. Read out of Aether's own bundle:
 *
 *   GET /movie/:tmdbId?lang=lat|esp|sub
 *   GET /tv/:tmdbId/:season/:episode?lang=lat|esp|sub
 *     -> 200, and the playlist is read from the response URL (`response.url`), so the
 *        endpoint either serves the m3u8 itself or redirects to it. Both cases are
 *        handled by following redirects and using the final URL.
 *
 * There is no aether.ist equivalent of this host, so the list is a one-element array
 * kept for shape and easy extension.
 *
 * Reachability caveat: Cloudflare answers "Sorry, you have been blocked" for this
 * hostname from datacenter IPs (verified 2026-09-21) even though fembox.aether.cx
 * answers fine from the same IP, so this source could not be exercised end to end
 * from the build environment. The request shape is copied from Aether's own code.
 */
export const SPANISH_HOSTS = ['https://le.aether.cx'];

/** Aether's three variants, mapped to a readable label. */
export const SPANISH_LANGS = {
    sub: 'Subtitled (ES)',
    esp: 'Castellano',
    lat: 'Latino'
};

/** Quality labels FEM API uses, mapped to what Nuvio displays. */
export const QUALITY_LABELS = {
    ORG: 'ORG',
    '4K': '4K',
    '1080P': '1080p',
    '720P': '720p',
    '480P': '480p',
    '360P': '360p'
};

/** Higher is better, used to sort the returned stream list. */
export const QUALITY_RANK = {
    '4K': 6,
    ORG: 5,
    '1080p': 4,
    '720p': 3,
    '480p': 2,
    '360p': 1,
    Auto: 0
};

/**
 * FEM API hands back FebBox CDN URLs; Aether can re-point them at a nearer edge
 * node by swapping the hostname for "<code>.shegu.net". Mirrors Aether's own map.
 */
export const REGION_MAP = {
    'new-york': 'USA7',
    dallas: 'USA5',
    kansas: 'USA5',
    portland: 'USA6',
    paris: 'FR1',
    london: 'UK1',
    'hong-kong': 'HK1',
    singapore: 'HK1',
    sydney: 'AU1',
    mumbai: 'IN1'
};

export const REGION_HOST_SUFFIX = '.shegu.net';

/** FEM API reports subtitle languages as English names; map them to ISO 639-1. */
export const LANGUAGE_CODES = {
    english: 'en',
    arabic: 'ar',
    bosnian: 'bs',
    bulgarian: 'bg',
    croatian: 'hr',
    czech: 'cs',
    danish: 'da',
    dutch: 'nl',
    estonian: 'et',
    finnish: 'fi',
    french: 'fr',
    german: 'de',
    greek: 'el',
    hebrew: 'he',
    hindi: 'hi',
    hungarian: 'hu',
    indonesian: 'id',
    italian: 'it',
    japanese: 'ja',
    korean: 'ko',
    malay: 'ms',
    norwegian: 'no',
    persian: 'fa',
    polish: 'pl',
    portuguese: 'pt',
    'portuguese (br)': 'pt-br',
    protuguese: 'pt',
    romanian: 'ro',
    russian: 'ru',
    serbian: 'sr',
    slovene: 'sl',
    slovenian: 'sl',
    spanish: 'es',
    swedish: 'sv',
    tagalog: 'tl',
    thai: 'th',
    turkish: 'tr',
    ukrainian: 'uk',
    vietnamese: 'vi',
    chinese: 'zh',
    'chinese (simplified)': 'zh',
    'chinese (traditional)': 'zh-tw'
};

/** Fallback display names for languages we do not have an ISO code for. */
export const LANGUAGE_NAMES = {
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    'pt-br': 'Portuguese (BR)',
    ru: 'Russian',
    ar: 'Arabic',
    hi: 'Hindi',
    id: 'Indonesian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    'zh-tw': 'Chinese (Traditional)',
    th: 'Thai',
    tr: 'Turkish',
    vi: 'Vietnamese'
};
