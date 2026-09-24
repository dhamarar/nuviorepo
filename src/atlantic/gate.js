import CryptoJS from 'crypto-js';
import { APHRODITE, ARTEMIS, SITE_ORIGIN, USER_AGENT } from './constants.js';
import { blockPageReason, briefUrl, log } from './utils.js';

/**
 * Atlantic's request gate.
 *
 * The site signs every call to its stream backends with a session issued by a
 * handshake endpoint. This module reproduces that handshake and the per-request
 * signature using crypto-js, which the host injects as a global and which is
 * already the repo's convention for crypto work.
 */

const SOURCES = {
    aphrodite: APHRODITE,
    artemis: ARTEMIS
};

/** Session cache, keyed by source name. Sessions carry their own `exp`. */
const sessions = {};
const pending = {};

/** Refresh a little early so a session cannot expire mid-flight. */
const EXPIRY_SKEW_SECONDS = 60;

/**
 * 8 random bytes as hex — the same shape the site generates (a 16-char nonce).
 * The sandbox does provide `crypto.getRandomValues`, but fall back to
 * Math.random if it is ever absent. The nonce only needs to be unique per
 * request, not unguessable.
 */
function randomHex(bytes) {
    const out = [];
    const webCrypto = globalThis.crypto;
    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
        const buffer = new Uint8Array(bytes);
        try {
            webCrypto.getRandomValues(buffer);
            for (let i = 0; i < buffer.length; i++) {
                out.push(('0' + buffer[i].toString(16)).slice(-2));
            }
            return out.join('');
        } catch (error) {
            // fall through to Math.random
        }
    }
    for (let i = 0; i < bytes; i++) {
        out.push(('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2));
    }
    return out.join('');
}

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

function hmacHex(keyHex, message) {
    return CryptoJS.HmacSHA256(message, CryptoJS.enc.Hex.parse(keyHex)).toString(CryptoJS.enc.Hex);
}

function hexToUtf8(hex) {
    return CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Utf8);
}

/**
 * Decrypt the handshake payload.
 *
 * The wire format is `hex( iv[12] || ciphertext || tag[16] )` and the cipher is
 * AES-256-GCM. crypto-js has no GCM, but GCM's confidentiality layer is exactly
 * AES-CTR starting at counter 2 (counter 1 is used for the tag), so the keystream
 * can be produced with AES-CTR from `iv || 00000002` and XORed in.
 *
 * The authentication tag is intentionally not verified: this is a client-side
 * scraper reading a payload it will parse anyway, and a forged payload would have
 * to also satisfy the HMAC the server checks. Integrity is not the goal here.
 */
function decryptHandshakePayload(keyHex, payloadHex) {
    const raw = String(payloadHex || '');
    // iv (24 hex) + at least one block of ciphertext + tag (32 hex)
    if (raw.length < 24 + 32 + 32) return '';
    if (!/^[0-9a-f]+$/i.test(raw)) return '';

    const ivHex = raw.slice(0, 24);
    const bodyHex = raw.slice(24);
    const dataHex = bodyHex.slice(0, bodyHex.length - 32);

    const key = CryptoJS.enc.Hex.parse(keyHex);
    const zeros = CryptoJS.enc.Hex.parse(new Array(dataHex.length + 1).join('0'));
    const keystream = CryptoJS.AES.encrypt(zeros, key, {
        iv: CryptoJS.enc.Hex.parse(ivHex + '00000002'),
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding
    }).ciphertext.toString(CryptoJS.enc.Hex);

    let plainHex = '';
    for (let i = 0; i < dataHex.length; i += 2) {
        const a = parseInt(dataHex.substr(i, 2), 16);
        const b = parseInt(keystream.substr(i, 2) || '0', 16);
        plainHex += ('0' + (a ^ b).toString(16)).slice(-2);
    }
    return hexToUtf8(plainHex);
}

/**
 * No timeout wrapper here on purpose.
 *
 * The sandbox has no timer primitive, so the usual `Promise.race([fetch, timeout])`
 * idiom throws `setTimeout is not defined` synchronously and the handshake would
 * never even be sent. The native fetch bridge's own 60 s connect timeout is the
 * only bound available. See `fetchText` in `utils.js` for the full explanation.
 */

/** Run the handshake and return `{ sid, skey, exp }`. */
async function handshake(name) {
    const source = SOURCES[name];
    const ts = nowSeconds();
    const nonce = randomHex(8);
    const sig = hmacHex(source.keyHex, source.code + '|' + ts + '|' + nonce);

    log(name + ': handshake POST ' + briefUrl(source.base + source.handshakePath));

    let response;
    try {
        response = await fetch(source.base + source.handshakePath, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Origin': SITE_ORIGIN,
                'Referer': SITE_ORIGIN + '/',
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ c: source.code, ts: ts, n: nonce, s: sig })
        });
    } catch (error) {
        log(name + ': handshake network error (' + error.message + ')');
        throw error;
    }

    if (response.status === 0) {
        // The bridge never got a response at all. This is a network-level failure
        // (TLS interception, DNS hijack, no route) and no amount of provider-side
        // work will fix it — say so instead of blaming the signature.
        log(name + ': handshake got NO response (status 0) — the request never completed. ' +
            'Look for the "Fetch bridge error" line above; a TLS/DNS failure means this ' +
            'network is blocking ' + source.base);
        throw new Error(name + ' handshake got no response (status 0)');
    }

    if (!response.ok) {
        log(name + ': handshake HTTP ' + response.status + ' (gate rejected the signature)');
        throw new Error(name + ' handshake failed (HTTP ' + response.status + ')');
    }

    const text = await response.text();

    // A carrier/ISP block page arrives as 200 + HTML. Check for it before the
    // JSON parse so the log blames the network, not the gate.
    const blocked = blockPageReason(text);
    if (blocked) {
        log(name + ': handshake answered with a ' + blocked + ' — this network is blocking ' +
            source.base + ', the provider cannot fix that');
        throw new Error(name + ' handshake blocked by the network (' + blocked + ')');
    }

    let payload = null;
    try {
        payload = JSON.parse(text);
    } catch (error) {
        payload = null;
    }
    if (!payload || !payload.d) {
        log(name + ': handshake returned no payload (body starts: ' + String(text).slice(0, 60) + ')');
        throw new Error(name + ' handshake returned no payload');
    }

    const raw = String(payload.d);
    if (raw.length < 88 || !/^[0-9a-f]+$/i.test(raw)) {
        // The envelope was JSON but `d` is not gate ciphertext: wrong key/endpoint,
        // or a middlebox rewrote the body on the way through.
        log(name + ': handshake payload is not gate ciphertext (' + raw.length +
            ' chars, ' + (/^[0-9a-f]+$/i.test(raw) ? 'valid hex' : 'NOT hex') +
            ') — wrong key/endpoint, or the body was rewritten in transit');
        throw new Error(name + ' handshake payload is not ciphertext');
    }

    let session = null;
    try {
        session = JSON.parse(decryptHandshakePayload(source.keyHex, raw));
    } catch (error) {
        session = null;
    }
    if (!session || !session.sid || !session.skey) {
        // Genuine crypto failure: the ciphertext was well-formed but did not
        // decrypt to a session. Almost always a stale `keyHex`/`code` in
        // `constants.js`, or crypto-js missing from the sandbox.
        log(name + ': handshake decrypted to something that is not a session ' +
            '(crypto-js missing, or keyHex/code in constants.js is stale)');
        throw new Error(name + ' handshake payload could not be decrypted');
    }

    log(name + ': handshake ok, session expires in ' +
        (session.exp ? (Number(session.exp) - nowSeconds()) + 's' : 'unknown'));

    return { sid: String(session.sid), skey: String(session.skey), exp: Number(session.exp) || 0 };
}

/** Return a cached session, refreshing it when it is missing or about to expire. */
async function getSession(name) {
    const current = sessions[name];
    if (current && (!current.exp || current.exp - EXPIRY_SKEW_SECONDS > nowSeconds())) {
        return current;
    }

    // Collapse concurrent refreshes so parallel sources share one handshake.
    if (!pending[name]) {
        pending[name] = handshake(name).then(
            session => {
                sessions[name] = session;
                pending[name] = null;
                return session;
            },
            error => {
                sessions[name] = null;
                pending[name] = null;
                throw error;
            }
        );
    }
    return pending[name];
}

/**
 * Headers for one signed request.
 *
 * `path` must be byte-for-byte what is sent on the wire, query string included,
 * because it is part of the signed message.
 */
export async function signHeaders(name, path) {
    const source = SOURCES[name];
    const session = await getSession(name);

    const ts = nowSeconds();
    const nonce = randomHex(8);
    const sig = hmacHex(session.skey, session.sid + '|' + path + '|' + ts + '|' + nonce);

    const headers = {};
    headers[source.headerPrefix + 'Sid'] = session.sid;
    headers[source.headerPrefix + 'Ts'] = String(ts);
    headers[source.headerPrefix + 'Nonce'] = nonce;
    headers[source.headerPrefix + 'Sig'] = sig;
    headers['Accept'] = 'application/json, text/plain, */*';
    headers['User-Agent'] = USER_AGENT;
    return headers;
}

/** Drop a cached session so the next call re-handshakes (used on `renew`). */
export function clearSession(name) {
    sessions[name] = null;
}
