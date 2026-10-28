export const BASE_URL = "https://www.movy.sx";
export const STREAM_API_URL = "https://api.wecollege.net";
export const SUBTITLES_API_URL = "https://subtitles.vidy.st";
export const TMDB_PROXY_URL = "https://db.wecollege.net/3";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_API_KEY = "8476a7ab80ad76f0936744df0430e67c";

export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.movy.sx/",
    "Origin": "https://www.movy.sx",
    "Accept": "application/json, text/plain, */*"
};

export const ALL_SERVERS = [
    { id: "miami", name: "Miami", note: "Original audio / 4K", lang: "en", group: "en" },
    { id: "boise", name: "Boise", note: "Original audio / 4K", lang: "en", group: "en" },
    { id: "vegas", name: "Vegas", note: "Original audio", lang: "en", group: "en" },
    { id: "reno", name: "Reno", note: "Original audio", lang: "en", group: "en" },
    { id: "chicago", name: "Chicago", note: "Original audio", lang: "en", group: "en" },
    { id: "oakland", name: "Oakland", note: "Original audio", lang: "en", group: "en" },
    { id: "seattle", name: "Seattle", note: "Original audio", lang: "en", group: "en" },
    { id: "phoenix", name: "Phoenix", note: "Original audio", lang: "en", group: "en" },
    { id: "atlanta", name: "Atlanta", note: "Original audio", lang: "en", group: "en" },
    { id: "portland", name: "Portland", note: "Original audio", lang: "en", group: "en" },
    { id: "austin", name: "Austin", note: "Original audio", lang: "en", group: "en", filter: (s) => s.quality === "English" },
    { id: "dallas", name: "Dallas", note: "Original audio", lang: "en", group: "en" },
    { id: "munich", name: "Munich", note: "German audio", lang: "de", group: "multi", extraParams: { language: "german" } },
    { id: "berlin", name: "Berlin", note: "German audio", lang: "de", group: "multi", altTitleKey: "titleGerman" },
    { id: "paris", name: "Paris", note: "French audio", lang: "fr", group: "multi" },
    { id: "delhi", name: "Delhi", note: "Hindi audio", lang: "hi", group: "multi", filter: (s) => s.quality === "Hindi" },
    { id: "cancun", name: "Cancun", note: "Spanish audio", lang: "es", group: "multi" }
];

export const LANGUAGE_MAP = {
    english: "en",
    indonesian: "id",
    spanish: "es",
    french: "fr",
    german: "de",
    italian: "it",
    portuguese: "pt",
    russian: "ru",
    hindi: "hi",
    arabic: "ar",
    japanese: "ja",
    korean: "ko",
    chinese: "zh",
    turkish: "tr",
    dutch: "nl",
    polish: "pl",
    vietnamese: "vi",
    thai: "th",
    greek: "el",
    bulgarian: "bg",
    croatian: "hr",
    czech: "cs",
    danish: "da",
    finnish: "fi",
    hebrew: "he",
    hungarian: "hu",
    norwegian: "no",
    persian: "fa",
    romanian: "ro",
    serbian: "sr",
    slovak: "sk",
    slovenian: "sl",
    swedish: "sv",
    ukrainian: "uk",
    malay: "ms",
    tagalog: "tl"
};
