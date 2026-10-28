import { HEADERS, STREAM_API_URL } from './constants.js';

const D_CONSTANTS = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174
];

const MAGIC_HEADER = [109, 118, 109, 49]; // "mvm1"

function r(e) {
    return ((e * (e + 1)) & 1) === 0;
}

function o(e) {
    e >>>= 0;
    e ^= e >>> 16;
    e = Math.imul(e, 0x85ebca6b) >>> 0;
    e ^= e >>> 13;
    e = Math.imul(e, 0xc2b2ae35) >>> 0;
    return (e ^= e >>> 16) >>> 0;
}

function u(e, a) {
    e >>>= 0;
    if ((a &= 31) === 0) return e >>> 0;
    return ((e << a) | (e >>> (32 - a))) >>> 0;
}

export function base64ToBytes(b64) {
    if (!b64) return new Uint8Array(0);
    let clean = String(b64).replace(/-/g, "+").replace(/_/g, "/");
    while (clean.length % 4 !== 0) {
        clean += "=";
    }

    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(clean, "base64"));
    }

    if (typeof atob !== "undefined") {
        const bin = atob(clean);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) {
            bytes[j] = bin.charCodeAt(j);
        }
        return bytes;
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const lookup = new Uint8Array(256);
    for (let k = 0; k < chars.length; k++) {
        lookup[chars.charCodeAt(k)] = k;
    }

    const len = clean.length;
    const placeHolders = clean.endsWith("==") ? 2 : (clean.endsWith("=") ? 1 : 0);
    const bytes = new Uint8Array((len * 3 / 4) - placeHolders);
    let j = 0;
    for (let i = 0; i < len; i += 4) {
        const a = lookup[clean.charCodeAt(i)];
        const b = lookup[clean.charCodeAt(i + 1)];
        const c = lookup[clean.charCodeAt(i + 2)];
        const d = lookup[clean.charCodeAt(i + 3)];
        bytes[j++] = (a << 2) | (b >> 4);
        if (j < bytes.length) bytes[j++] = ((b & 15) << 4) | (c >> 2);
        if (j < bytes.length) bytes[j++] = ((c & 3) << 6) | (d & 63);
    }
    return bytes;
}

export function decodeUtf8(bytes) {
    if (typeof TextDecoder !== "undefined") {
        try {
            return new TextDecoder("utf-8").decode(bytes);
        } catch (e) {}
    }
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("utf8");
    }
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

function getKeyStream(seedStr, tLen, sLen) {
    const n = (function (seedStr, tLen) {
        let t;
        if ((((t = seedStr.length) * (t + 1)) & 1) === 1) {
            return {
                S: (function (str) {
                    const arr = Array(256);
                    for (let k = 0; k < 256; k++) arr[k] = k;
                    let t = 0;
                    for (let n = 0; n < 256; n++) {
                        t = (t + arr[n] + str.charCodeAt(n % str.length)) & 255;
                        const temp = arr[n];
                        arr[n] = arr[t];
                        arr[t] = temp;
                    }
                    return arr;
                })(seedStr),
                acc: (function (str) {
                    let acc = 0x67452301;
                    for (let k = 0; k < str.length; k++) {
                        acc = u((acc ^ Math.imul(str.charCodeAt(k), D_CONSTANTS[15 & k])) >>> 0, 5);
                    }
                    return o(acc);
                })(seedStr)
            };
        }

        const arr61 = Array(61);
        let sHash = o(
            (function (str) {
                let h = 0x811c9dc5;
                for (let k = 0; k < str.length; k++) {
                    h = Math.imul(h ^ str.charCodeAt(k), 0x1000193) >>> 0;
                }
                return o(h);
            })(seedStr) ^ o((tLen >>> 0) ^ 0x9e3779b9)
        ) >>> 0;

        for (let k = 0; k < 8; k++) {
            if (r(k)) {
                const aIdx = sHash % 61;
                sHash = u((sHash + 0x9e3779b9) >>> 0, 7 + (7 & k));
                arr61[aIdx] = (sHash ^ o(sHash)) >>> 0;
                sHash = o((sHash + aIdx) >>> 0);
            } else {
                arr61[k] = D_CONSTANTS[15 & k];
            }
        }

        return {
            S: arr61,
            acc: o(0xa5a5a5a5 ^ sHash) >>> 0
        };
    })(seedStr, tLen);

    const keyBytes = new Uint8Array(sLen);
    let lCounter = 0;
    for (let e = 0; e < sLen; ) {
        const aVal = (function (ctx, counter) {
            const S = ctx.S;
            let acc = ctx.acc;
            const dIdx = acc % 61;
            const iFlag = 0 - Number(dIdx in S);
            const rVal = S[dIdx] >>> 0;
            const cVal = Math.imul(0x9e3779b9, counter + 1) >>> 0;
            const tVal = acc;
            const nVal = (rVal ^ cVal) >>> 0;
            const bVal = (((tVal ^ nVal) >>> 0) | ((tVal & nVal & iFlag) >>> 0)) >>> 0;
            acc = o(
                ((u((bVal + acc) >>> 0, 31 & dIdx) ^ u(acc, 31 & Math.imul(dIdx, 7))) >>> 0) +
                0x9e3779b9 >>> 0
            );
            S[dIdx] = acc >>> 0;
            ctx.acc = acc;
            return acc >>> 0;
        })(n, lCounter++);

        keyBytes[e++] = 255 & aVal;
        if (e < sLen) keyBytes[e++] = (aVal >>> 8) & 255;
        if (e < sLen) keyBytes[e++] = (aVal >>> 16) & 255;
        if (e < sLen) keyBytes[e++] = (aVal >>> 24) & 255;
    }
    return keyBytes;
}

export function decodePayload(payload, seed, tmdbId) {
    if (!payload || typeof payload !== "string") {
        throw new Error("Invalid payload: string expected");
    }

    const s = base64ToBytes(payload);
    const numId = Number(tmdbId) || 0;
    const lKey = getKeyStream(seed, numId, s.length);

    for (let k = 0; k < s.length; k++) {
        s[k] ^= lKey[k];
    }

    for (let k = 0; k < MAGIC_HEADER.length; k++) {
        if (s[k] !== MAGIC_HEADER[k]) {
            throw new Error("decrypt failed: bad seed or tampered payload");
        }
    }

    const plain = s.subarray(MAGIC_HEADER.length);
    return decodeUtf8(plain);
}

// In-memory seed cache with TTL and in-flight promise deduplication
const seedCache = new Map();
const pendingSeedPromises = new Map();

export async function fetchSeed(mediaId, force = false) {
    const cleanId = String(mediaId || "");
    const now = Date.now();
    const cached = seedCache.get(cleanId);

    if (!force && cached && cached.expiresAt > now) {
        return cached.seed;
    }

    // Deduplicate in-flight requests for the same mediaId
    if (!force && pendingSeedPromises.has(cleanId)) {
        return await pendingSeedPromises.get(cleanId);
    }

    const promise = (async () => {
        try {
            const url = `${STREAM_API_URL}/seed?mediaId=${encodeURIComponent(cleanId)}`;
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) {
                throw new Error(`Failed to fetch seed: HTTP ${res.status}`);
            }

            const data = await res.json();
            const seed = data.seed;
            const ttl = (Number(data.ttlMs) || 30000) - 5000;

            seedCache.set(cleanId, {
                seed,
                expiresAt: Date.now() + Math.max(ttl, 10000)
            });

            return seed;
        } finally {
            pendingSeedPromises.delete(cleanId);
        }
    })();

    pendingSeedPromises.set(cleanId, promise);
    return await promise;
}

export async function fetchServerSources(serverId, params, tmdbId, existingSeed = null) {
    let seed = existingSeed || await fetchSeed(tmdbId);
    const queryParams = new URLSearchParams();

    for (const key of Object.keys(params)) {
        if (params[key] !== undefined && params[key] !== null) {
            queryParams.set(key, String(params[key]));
        }
    }

    queryParams.set("enc", "2");
    queryParams.set("seed", seed);

    const url = `${STREAM_API_URL}/${serverId}/sources?${queryParams.toString()}`;
    let res = await fetch(url, { headers: HEADERS });

    // Handle 401: Seed expired, refresh once and retry
    if (res.status === 401) {
        seedCache.delete(String(tmdbId));
        seed = await fetchSeed(tmdbId, true);
        queryParams.set("seed", seed);
        const retryUrl = `${STREAM_API_URL}/${serverId}/sources?${queryParams.toString()}`;
        res = await fetch(retryUrl, { headers: HEADERS });
    }

    if (!res.ok) {
        return null;
    }

    const rawPayload = await res.text();
    const decryptedJson = decodePayload(rawPayload, seed, tmdbId);
    return JSON.parse(decryptedJson);
}
