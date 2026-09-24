/**
 * Atlantic (https://atlantic.st) — a movie-web / P-Stream fork.
 *
 * Like Aether, Atlantic hosts no media itself: the SPA resolves streams in the
 * browser. Unlike Aether it runs no public scraper API — instead the site signs
 * every request to its two stream backends with a short-lived session. Both
 * backends are reachable directly, and that is what this provider talks to.
 *
 * Contract recovered from the site's own bundle (`/assets/index-*.js` and the
 * `/assets/aphrodite-gate-*.js` chunk) and verified live on 2026-09-24.
 *
 * --- Aphrodite -----------------------------------------------------------------
 *   base:   https://cdn.hls.lol
 *   path:   /content/movie/:tmdbId
 *           /content/tv/:tmdbId/:season/:episode
 *   ->      { found, type:"hls", url: "<master playlist>" }
 *           { renew: true } means the session expired — re-handshake and retry.
 *
 * --- Artemis -------------------------------------------------------------------
 *   base:   https://stellar.hls.lol
 *   path:   /resolve?tmdbId=:id&type=movie|tv[&season=&episode=]
 *   ->      { found, format:"hls", url: "<master playlist>",
 *             source: "Orbit", availableSources: ["Orbit","Nova","Astra"] }
 *           401 + { renew: true } means the session expired.
 *
 * Both return a *master* playlist. Quality is adaptive inside it, so the master
 * URL is the only correct thing to hand to the player: Atlantic publishes its
 * audio as a separate `#EXT-X-MEDIA:TYPE=AUDIO` rendition, which means an
 * individual `#EXT-X-STREAM-INF` variant is video-only. See utils.js.
 *
 * --- Signing -------------------------------------------------------------------
 * The gate is obfuscated in the bundle. The scheme, recovered by instrumenting the
 * module's WebCrypto calls, is:
 *
 *   key      = SHA-256("<site>.<code>.v1" || <32 static bytes>)   // hardcoded below
 *   nonce    = 8 random bytes, hex
 *   ts       = floor(Date.now()/1000)
 *   sig      = HMAC-SHA256(key, code + "|" + ts + "|" + nonce)
 *   POST {base}{handshakePath}  {"c":code,"ts":ts,"n":nonce,"s":sig}
 *   ->   { d: "<hex>" }
 *   plain    = AES-256-GCM(key).decrypt(iv = d[0..12], ct = d[12..])
 *   ->   { sid, skey (hex), exp }
 *
 *   per request:
 *   sig      = HMAC-SHA256(skey, sid + "|" + path + "|" + ts + "|" + nonce)
 *   headers  = { X-{A|S}-Sid, X-{A|S}-Ts, X-{A|S}-Nonce, X-{A|S}-Sig }
 *
 * The two keys are pure functions of constants baked into the site's bundle, so
 * they are static; they are stored pre-computed here. crypto-js has no GCM mode,
 * so gate.js decrypts via the equivalent AES-CTR keystream.
 *
 * --- Playback headers ----------------------------------------------------------
 * The stream CDNs hotlink-protect: without `Referer: https://atlantic.st/` the
 * master playlist answers **HTTP 200 with a decoy HTML page** (a YouTube shell),
 * so a naive status check passes while playback fails. The signed API headers are
 * NOT the playback headers — the two sets are deliberately different.
 */

export const PROVIDER_ID = 'atlantic';
export const PROVIDER_NAME = 'Atlantic';

export const SITE_ORIGIN = 'https://atlantic.st';

export const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
export const TMDB_BASE = 'https://api.themoviedb.org/3';

/** Aphrodite — the site's primary source. */
export const APHRODITE = {
    label: 'Aphrodite',
    base: 'https://cdn.hls.lol',
    handshakePath: '/content/index',
    code: 'a',
    headerPrefix: 'X-A-',
    // SHA-256("aphrodite.a.v1" || <32 static bytes>) — see the header comment.
    keyHex: '5ee43d0e0f169887b0ee184e4ffbb7ee6d9629c97cf210ad8c2c4ebc73c1d8f5'
};

/** Artemis — the site's fallback source, which itself fans out to Orbit/Nova/Astra. */
export const ARTEMIS = {
    label: 'Artemis',
    base: 'https://stellar.hls.lol',
    handshakePath: '/gate/handshake',
    code: 'b',
    headerPrefix: 'X-S-',
    keyHex: '9ffdab63d48b4fa089dfa7f74303c6ccb6b5e770880f7d47a3a1ab544b7504f1'
};

/** Subtitle backends the site itself queries, all reachable without an account. */
export const NATSUKI_BASE = 'https://natsuki.hls.lol/subs';
export const GRANITE_BASE = 'https://sub.vdrk.site/v1';
export const OPENSUBS_BASE = 'https://rest.opensubtitles.org';

/** OpenSubtitles' legacy API wants this exact agent; it 403s without it. */
export const OPENSUBS_USER_AGENT = 'VLSub 0.10.2';

/** Highest first. */
export const QUALITY_RANK = {
    '4K': 6,
    '1440p': 5,
    '1080p': 4,
    '720p': 3,
    '480p': 2,
    '360p': 1,
    Auto: 0
};

/**
 * Language names used by the three subtitle backends -> ISO code.
 * Mirrors the map Atlantic ships in its own bundle, plus a few aliases those
 * backends actually emit (e.g. OpenSubtitles' "Portuguese (BR)").
 */
export const LANGUAGE_MAP = {
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
    // Natsuki reports some tracks with a 3-letter code, and a few backends only
    // send a display name, so both spellings are mapped.
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
