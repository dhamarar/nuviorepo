export const PROVIDER_ID = 'ghostflix';
export const PROVIDER_NAME = 'Ghostflix';
export const SITE_URL = 'https://ghostflix.st';
export const PLAYER_URL = 'https://vidbolt.st';
export const TSDB_BASE = 'https://api.thesubtitledb.org/v1';

export const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const PLAYER_HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': `${PLAYER_URL}/`,
    'Origin': PLAYER_URL,
    'Accept': 'application/json, text/plain, */*'
};

export const STREAM_HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': `${PLAYER_URL}/`,
    'Origin': PLAYER_URL
};

export const SERVERS = [
    { id: 'orion', name: 'Orion' },
    { id: 'callisto', name: 'Callisto' },
    { id: 'luna', name: 'Luna' },
    { id: 'vega', name: 'Vega' },
    { id: 'quantum', name: 'Quantum' },
    { id: 'quasar', name: 'Quasar' }
];

export const SERVER_LABELS = {
    orion: 'Orion',
    callisto: 'Callisto',
    luna: 'Luna',
    vega: 'Vega',
    quantum: 'Quantum',
    quasar: 'Quasar'
};

// Batasi subtitle hanya untuk bahasa Indonesia dan Inggris
export const SUBTITLE_LANGUAGE_MAP = {
    'id': { code: 'id', name: 'Indonesian' },
    'ind': { code: 'id', name: 'Indonesian' },
    'indonesian': { code: 'id', name: 'Indonesian' },
    'bahasa': { code: 'id', name: 'Indonesian' },
    'bahasa indonesia': { code: 'id', name: 'Indonesian' },
    'en': { code: 'en', name: 'English' },
    'eng': { code: 'en', name: 'English' },
    'english': { code: 'en', name: 'English' }
};

export const QUALITY_WEIGHTS = {
    '4K': 100,
    '2160p': 100,
    '1440p': 80,
    '1080p': 60,
    '720p': 40,
    '480p': 20,
    '360p': 10,
    'Auto': 50
};
