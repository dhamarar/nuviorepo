/**
 * Token calculation logic for Kisskh (kkey)
 * Reverse engineered from Kisskh SPA client & KisskhHelper
 */

function stringToWords(s) {
    const len = s.length;
    const words = [];
    for (let i = 0; i < len; i++) {
        words[i >>> 2] |= (0xff & s.charCodeAt(i)) << (24 - (i % 4) * 8);
    }
    return [words, len];
}

function wordsToHex(words, byteLength) {
    const hex = [];
    for (let i = 0; i < byteLength; i++) {
        const b = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        hex.push(b.toString(16).padStart(2, '0'));
    }
    return hex.join('');
}

function trim48(s) {
    return (s || '').substring(0, 48);
}

function hashString(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
    }
    return hash;
}

function padString(s) {
    const padLen = 16 - (s.length % 16);
    for (let i = 0; i < padLen; i++) {
        s += String.fromCharCode(padLen);
    }
    return s;
}

const keySchedule = [
    0x4f6bdaa3, -0x61d07350, 0x7f5e722d, -0x61210cec,
    0x536620a8, -0x32b653e8, -0x4de821cb, 0x2cc92d21,
    -0x73412227, 0x41f771c1, -0xc1f500c, -0x20d67d2b,
    0x2dadde47, 0x6c5aaf86, -0x6045ff8e, 0x409382a7,
    -0x6417db2, -0x6a1bd238, 0xa5e2dba, 0x4acdaf1d,
    0x54c72698, -0x3edcf4b0, -0x3482d916, -0x7e4f7609,
    -0x6c9fb16c, 0x524345c4, -0x66c19cd2, 0x188eead9,
    -0x351884c7, -0x675bc103, 0x19a5dd3, 0x1914b70a,
    -0x4fb1e313, 0x28ea2210, 0x29707fc3, 0x3064c8c9,
    -0x17593e17, -0x3fb31c07, -0x16c363c6, -0x26a7ab0d,
    -0x4b793324, 0x74ca2f25, -0x62094ce1, 0x44aee7ec
];

const T0 = [];
const T1 = [];
const T2 = [];
const T3 = [];
const SBox = [];
const d = [];

for (let i = 0; i < 256; i++) {
    d[i] = i < 128 ? i << 1 : (i << 1) ^ 0x11b;
}

let p = 0;
let q = 0;
for (let i = 0; i < 256; i++) {
    let s = q ^ (q << 1) ^ (q << 2) ^ (q << 3) ^ (q << 4);
    s = (s >>> 8) ^ (0xff & s) ^ 0x63;
    SBox[p] = s;
    const x = d[p];
    const y = d[d[x]];
    const z = 0x101 * d[s] ^ 0x1010100 * s;
    T0[p] = (z << 24) | (z >>> 8);
    T1[p] = (z << 16) | (z >>> 16);
    T2[p] = (z << 8) | (z >>> 24);
    T3[p] = z;
    p ? (p = x ^ d[d[d[y ^ x]]], q ^= d[d[q]]) : (p = q = 1);
}

function encryptBlock(words, offset) {
    let iv;
    if (offset === 0) {
        iv = [0x1504af3, 0x56e619cf, 0x2e42bba6, -0x73c08f07];
    } else {
        iv = words.slice(offset - 4, offset);
    }
    for (let i = 0; i < 4; i++) {
        words[offset + i] ^= iv[i];
    }
    let s0 = words[offset] ^ keySchedule[0];
    let s1 = words[offset + 1] ^ keySchedule[1];
    let s2 = words[offset + 2] ^ keySchedule[2];
    let s3 = words[offset + 3] ^ keySchedule[3];
    let k = 4;
    for (let round = 1; round < 10; round++) {
        const t0 = T0[s0 >>> 24] ^ T1[(s1 >>> 16) & 0xff] ^ T2[(s2 >>> 8) & 0xff] ^ T3[s3 & 0xff] ^ keySchedule[k++];
        const t1 = T0[s1 >>> 24] ^ T1[(s2 >>> 16) & 0xff] ^ T2[(s3 >>> 8) & 0xff] ^ T3[s0 & 0xff] ^ keySchedule[k++];
        const t2 = T0[s2 >>> 24] ^ T1[(s3 >>> 16) & 0xff] ^ T2[(s0 >>> 8) & 0xff] ^ T3[s1 & 0xff] ^ keySchedule[k++];
        s3 = T0[s3 >>> 24] ^ T1[(s0 >>> 16) & 0xff] ^ T2[(s1 >>> 8) & 0xff] ^ T3[s2 & 0xff] ^ keySchedule[k++];
        s0 = t0; s1 = t1; s2 = t2;
    }
    const t0 = ((SBox[s0 >>> 24] << 24) | (SBox[(s1 >>> 16) & 0xff] << 16) | (SBox[(s2 >>> 8) & 0xff] << 8) | SBox[s3 & 0xff]) ^ keySchedule[k++];
    const t1 = ((SBox[s1 >>> 24] << 24) | (SBox[(s2 >>> 16) & 0xff] << 16) | (SBox[(s3 >>> 8) & 0xff] << 8) | SBox[s0 & 0xff]) ^ keySchedule[k++];
    const t2 = ((SBox[s2 >>> 24] << 24) | (SBox[(s3 >>> 16) & 0xff] << 16) | (SBox[(s0 >>> 8) & 0xff] << 8) | SBox[s1 & 0xff]) ^ keySchedule[k++];
    s3 = ((SBox[s3 >>> 24] << 24) | (SBox[(s0 >>> 16) & 0xff] << 16) | (SBox[(s1 >>> 8) & 0xff] << 8) | SBox[s2 & 0xff]) ^ keySchedule[k++];
    words[offset] = t0;
    words[offset + 1] = t1;
    words[offset + 2] = t2;
    words[offset + 3] = s3;
}

export function getKey(episodeId, isSub = false) {
    const guid = isSub ? 'VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp' : '62f176f3bb1b5b8e70e39932ad34a0c7';
    const appVer = '2.8.10';
    const platformVer = 4830201;
    const appName = 'kisskh';
    const parts = [
        '', episodeId, null, 'mg3c3b04ba', appVer, guid, platformVer,
        trim48(appName), trim48((appName || '').toLowerCase()), trim48(appName),
        appName, appName, appName, '00', ''
    ];
    const hash = hashString(parts.join('|'));
    parts.splice(1, 0, hash);
    const padded = padString(parts.join('|'));
    const r = stringToWords(padded);
    const words = r[0];
    const byteLen = r[1];
    for (let i = 0; i < words.length; i += 4) {
        encryptBlock(words, i);
    }
    return wordsToHex(words, byteLen).toUpperCase();
}
