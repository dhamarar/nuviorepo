import { DEFAULT_HEADERS, LANGUAGE_MAP } from './constants.js';

export async function fetchText(url, customHeaders = {}) {
    const response = await fetch(url, {
        headers: {
            ...DEFAULT_HEADERS,
            ...customHeaders
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return await response.text();
}

export async function fetchJson(url, customHeaders = {}) {
    const text = await fetchText(url, customHeaders);
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error(`Failed to parse JSON from ${url}: ${e.message}`);
    }
}

export function parseSubtitles(rawSubs, defaultHeaders = {}) {
    if (!Array.isArray(rawSubs)) return [];

    const mapped = [];
    const seen = new Set();

    for (const sub of rawSubs) {
        const fileUrl = sub.file || sub.url;
        if (!fileUrl || !fileUrl.startsWith('http')) continue;

        const rawName = String(sub.name || sub.label || sub.language || 'Unknown').trim();
        const lowerName = rawName.toLowerCase();

        const langInfo = LANGUAGE_MAP[lowerName] || {
            code: lowerName.slice(0, 2) || 'und',
            name: rawName
        };

        const dedupeKey = `${langInfo.code}_${fileUrl}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        mapped.push({
            url: fileUrl,
            language: langInfo.code,
            name: `${langInfo.name} (${rawName})`,
            headers: defaultHeaders
        });
    }

    return mapped;
}
