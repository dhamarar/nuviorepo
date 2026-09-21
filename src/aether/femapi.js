import { FEM_ENDPOINTS } from './constants.js';
import { buildFemHeaders, fetchJson } from './utils.js';

/** Error carrying a machine-readable reason so callers can log something useful. */
export class FemError extends Error {
    constructor(reason, message, attempts) {
        super(message);
        this.name = 'FemError';
        this.reason = reason;
        this.attempts = attempts || [];
    }
}

/**
 * aether.st itself calls /movie/:id and /tv/:id/:season/:episode. The published FEM
 * API docs describe /tv/:id-:season-:episode, so both TV shapes are attempted.
 */
function moviePaths(tmdbId) {
    return [`/movie/${tmdbId}`];
}

function tvPaths(tmdbId, season, episode) {
    return [`/tv/${tmdbId}/${season}/${episode}`, `/tv/${tmdbId}-${season}-${episode}`];
}

function movieHlsPaths(tmdbId) {
    return [`/hls/movie/${tmdbId}`];
}

function tvHlsPaths(tmdbId, season, episode) {
    return [`/hls/tv/${tmdbId}/${season}/${episode}`, `/hls/tv/${tmdbId}-${season}-${episode}`];
}

function classify(result) {
    const body = result.data || {};
    const message = String(body.error || body.message || '');
    if (result.status === 0) return 'network';
    if (/ui=token is required|token is required|missing ui/i.test(message)) return 'no-token';
    if (/invalid token|expired|unauthor|not logged in|please login/i.test(message)) return 'bad-token';
    if (result.status === 401) return 'bad-token';
    // 403 is ambiguous: it can be a WAF block rather than a credential problem, so
    // it must not stop us from trying the next mirror.
    if (result.status === 403) return 'forbidden';
    // "HLS stream not found" is the live answer when FEM has nothing for a title, and
    // it must not be confused with a 404 on the path shape itself.
    if (/stream not found|no stream|not available/i.test(message)) return 'no-stream';
    if (result.status === 404 || /^not found$/i.test(message.trim())) return 'not-found';
    return 'unknown';
}

/**
 * Credential problems are fatal — every mirror fronts the same FebBox backend, so a
 * second attempt cannot succeed. Everything else (wrong path shape, dead mirror,
 * WAF block, title missing) is retried against the next candidate.
 */
const FATAL_REASONS = ['no-token', 'bad-token'];

/**
 * Walk mirror x path-shape candidates until one returns a usable payload.
 */
async function requestFem(paths, token) {
    const attempts = [];

    for (const endpoint of FEM_ENDPOINTS) {
        for (const path of paths) {
            const url = `${endpoint.api}${path}?ui=${encodeURIComponent(token)}`;
            const result = await fetchJson(url, buildFemHeaders(endpoint.site));
            const reason = classify(result);

            if (result.ok && result.data && !result.data.error) {
                return { data: result.data, endpoint, url };
            }

            attempts.push(`${endpoint.api}${path} -> ${reason} (HTTP ${result.status})`);

            if (FATAL_REASONS.indexOf(reason) !== -1) {
                throw new FemError(reason, `FEM API rejected the request: ${reason}`, attempts);
            }
        }
    }

    const onlyNotFound = attempts.length > 0 && attempts.every(entry => entry.indexOf('-> not-found') !== -1);
    if (onlyNotFound) {
        throw new FemError('not-found', 'Title is not available in the FebBox catalogue', attempts);
    }

    throw new FemError('unreachable', 'No Aether FEM API mirror responded', attempts);
}

/** Multi-quality MP4 sources + subtitles. */
export async function fetchMp4Payload(tmdbId, mediaType, season, episode, token) {
    const paths = mediaType === 'tv' ? tvPaths(tmdbId, season, episode) : moviePaths(tmdbId);
    const result = await requestFem(paths, token);
    const sources = Array.isArray(result.data.sources) ? result.data.sources : [];
    if (sources.length === 0) {
        throw new FemError('no-stream', 'FEM API returned no MP4 sources', result.url);
    }
    return {
        sources,
        subtitles: Array.isArray(result.data.subtitles) ? result.data.subtitles : [],
        endpoint: result.endpoint
    };
}

/** Single HLS playlist + subtitles. */
export async function fetchHlsPayload(tmdbId, mediaType, season, episode, token) {
    const paths = mediaType === 'tv' ? tvHlsPaths(tmdbId, season, episode) : movieHlsPaths(tmdbId);
    const result = await requestFem(paths, token);
    if (!result.data.hls) {
        throw new FemError('no-stream', 'FEM API returned no HLS playlist', result.url);
    }
    return {
        hls: result.data.hls,
        subtitles: Array.isArray(result.data.subtitles) ? result.data.subtitles : [],
        endpoint: result.endpoint
    };
}

/**
 * Ask FEM API for the account's remaining FebBox quota.
 *
 * A dead token is indistinguishable from a missing title on the stream endpoints:
 * /movie/:id?ui=<dead> answers 200 {"sources":[],"subtitles":[]} and /hls/movie/:id
 * answers 404 {"error":"HLS stream not found"}, exactly like a title FebBox has never
 * heard of. /quota is the only endpoint that tells the two apart — a good token
 * answers {"success":true,...}, a dead one answers {"success":false,
 * "raw_data":{"msg":"Please login",...}}. Verified live 2026-09-21.
 */
export async function checkToken(token) {
    const attempts = [];

    for (const endpoint of FEM_ENDPOINTS) {
        const url = `${endpoint.api}/quota?ui=${encodeURIComponent(token)}`;
        const result = await fetchJson(url, buildFemHeaders(endpoint.site));

        if (result.status === 0) {
            attempts.push(`${endpoint.api} -> network`);
            continue;
        }

        if (result.data && result.data.success === true) {
            return { valid: true, quota: result.data.quota || null };
        }

        const raw = (result.data && result.data.raw_data) || {};
        const message = `${(result.data && result.data.error) || ''} ${raw.msg || ''}`;
        attempts.push(`${endpoint.api} -> ${result.status} ${message.trim()}`);

        if (/login|invalid|expired|unauthor/i.test(message)) {
            return { valid: false, reason: 'bad-token', attempts };
        }
        return { valid: false, reason: 'unknown', attempts };
    }

    return { valid: false, reason: 'unreachable', attempts };
}
