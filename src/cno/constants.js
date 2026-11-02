export const PROVIDER_ID = 'cno';
export const PROVIDER_NAME = 'Cno';
export const BASE_URL = 'https://beta.cno.to';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const HEADERS = {
    'User-Agent': USER_AGENT,
    'Referer': `${BASE_URL}/`,
    'Accept': 'application/json, text/plain, */*'
};

// Subtitle language constraints: HANYA izinkan Indonesia dan Inggris
export const ALLOWED_SUBTITLE_LANGUAGES = ['id', 'en'];

export const SUBTITLE_LANGUAGE_MAP = {
    'id': { code: 'id', name: 'Indonesian' },
    'ind': { code: 'id', name: 'Indonesian' },
    'indonesian': { code: 'id', name: 'Indonesian' },
    'bahasa': { code: 'id', name: 'Indonesian' },
    'en': { code: 'en', name: 'English' },
    'eng': { code: 'en', name: 'English' },
    'english': { code: 'en', name: 'English' }
};
