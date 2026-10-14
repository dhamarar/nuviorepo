import { gcm } from '@noble/ciphers/aes.js';

export const HW = "lumen-gate-v2";
export const CW = 12; // IV length
export const NW = 16; // Tag length

export function base64ToBytes(b64) {
    if (!b64) return new Uint8Array(0);
    let clean = String(b64).replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
        clean += '=';
    }

    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(clean, 'base64'));
    }

    if (typeof atob !== 'undefined') {
        const bin = atob(clean);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
    }

    // Pure JS base64 decoding fallback (Hermes & all environments)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }

    const len = clean.length;
    const placeHolders = clean.endsWith('==') ? 2 : (clean.endsWith('=') ? 1 : 0);
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
    if (typeof TextDecoder !== 'undefined') {
        try {
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {}
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('utf8');
    }
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

export function makeAad(keyId, ephemeralPublic) {
    let k;
    if (typeof TextEncoder !== 'undefined') {
        k = new TextEncoder().encode(HW);
    } else if (typeof Buffer !== 'undefined') {
        k = Buffer.from(HW, 'utf8');
    } else {
        k = new Uint8Array(HW.length);
        for (let i = 0; i < HW.length; i++) k[i] = HW.charCodeAt(i);
    }

    const ephem = ephemeralPublic instanceof Uint8Array ? ephemeralPublic : base64ToBytes(ephemeralPublic);

    const e = new Uint8Array(k.length + 3 + ephem.length);
    e.set(k, 0);
    e[k.length] = 0;
    e[k.length + 1] = 2;
    e[k.length + 2] = Number(keyId);
    e.set(ephem, k.length + 3);
    return e;
}

export async function decrypt(encData, sealResult) {
    const encBytes = encData instanceof Uint8Array ? encData : new Uint8Array(encData);
    const iv = encBytes.slice(0, CW);
    const ciphertextWithTag = encBytes.slice(CW);

    let keyBytes;
    if (sealResult.responseKey instanceof Uint8Array) {
        keyBytes = sealResult.responseKey;
    } else if (typeof sealResult.responseKey === 'string') {
        keyBytes = base64ToBytes(sealResult.responseKey);
    } else {
        keyBytes = new Uint8Array(sealResult.responseKey);
    }

    let aadBytes;
    if (sealResult.aad) {
        if (sealResult.aad instanceof Uint8Array) {
            aadBytes = sealResult.aad;
        } else if (typeof sealResult.aad === 'string') {
            aadBytes = base64ToBytes(sealResult.aad);
        } else {
            aadBytes = new Uint8Array(sealResult.aad);
        }
    } else {
        aadBytes = makeAad(sealResult.keyId, sealResult.ephemeralPublic);
    }

    // Pure JavaScript AES-GCM Decryption (works in Hermes, Node, and Browsers)
    const cipher = gcm(keyBytes, iv, aadBytes);
    const decryptedBytes = cipher.decrypt(ciphertextWithTag);
    return decodeUtf8(decryptedBytes);
}
