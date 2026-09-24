const fs = require('fs');
const path = require('path');

const wasmJsPath = path.join(__dirname, '..', 'src', 'cinejoy', 'wasm.js');
const serverJsPath = path.join(__dirname, '..', 'resolver', 'server.js');
const vercelApiPath = path.join(__dirname, '..', 'resolver', 'api', 'index.js');

const wasmContent = fs.readFileSync(wasmJsPath, 'utf8');
const match = wasmContent.match(/const CRUSH_WASM_RAW_B64 = "([^"]+)";/);

if (!match) {
    console.error("Could not find CRUSH_WASM_RAW_B64 in wasm.js");
    process.exit(1);
}

const b64Wasm = match[1];

const serverCode = `/**
 * Cinejoy Stream Resolver - Node.js Server & Vercel Serverless Function
 * 
 * Runs on standard Node.js (AWS Lambda, Vercel, Render, Koyeb, or Local PC).
 * - Full native WebAssembly & WebCrypto support.
 * - Non-datacenter/residential or AWS IP (NOT blocked by api.wing.st).
 * - Multi-Resolution: 4K (2160p), 1080p, 720p, 360p, Auto (Adaptive).
 * - Zero external dependencies (uses built-in http/https/crypto modules).
 */

const http = require('http');
const urlParser = require('url');

const CRUSH_WASM_RAW_B64 = "${b64Wasm}";

const IW = 44;
const Y = 32;
const RW = 1;
const VW = 65;
const WW = Y + RW + VW; // 98
const CW = 12; // IV length
const NW = 16; // Tag length
const HW = "lumen-gate-v2";

const GATEWAY_URL = "https://api.wing.st/g";
const SERVERS_URL = "https://api.wing.st/servers";

function base64ToBytes(b64) {
    let clean = String(b64).replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) clean += '=';
    return Buffer.from(clean, 'base64');
}

let cachedWasm = null;
async function getWasmInstance() {
    if (cachedWasm) return cachedWasm;
    const wasmBytes = base64ToBytes(CRUSH_WASM_RAW_B64);
    const result = await WebAssembly.instantiate(wasmBytes, {});
    cachedWasm = result.instance || result;
    return cachedWasm;
}

async function sealWithWasm(path, payloadJson) {
    const instance = await getWasmInstance();
    const { alloc, dealloc, seal_request, memory } = instance.exports;

    const fullJson = JSON.stringify({
        path: path,
        payload: payloadJson ? (typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson) : null
    });

    const n = Buffer.from(fullJson, 'utf8');
    const m = Buffer.alloc(IW);
    require('crypto').randomFillSync(m);
    const p = n.length + 512;

    const s = alloc(n.length);
    const a = alloc(m.length);
    const r = alloc(p);

    try {
        const mem = new Uint8Array(memory.buffer);
        mem.set(n, s);
        mem.set(m, a);

        const t = seal_request(s, n.length, a, m.length, r, p);
        if (t <= WW || t > p) throw new Error("WASM seal failed with code: " + t);

        const out = new Uint8Array(memory.buffer, r, t);
        const responseKey = Buffer.from(out.slice(0, Y));
        const keyId = out[Y];
        const ephemeralPublic = Buffer.from(out.slice(Y + RW, WW));
        const body = Buffer.from(out.slice(WW, t));

        return { responseKey, keyId, ephemeralPublic, body };
    } finally {
        try { dealloc(s, n.length); } catch (e) {}
        try { dealloc(a, m.length); } catch (e) {}
        try { dealloc(r, p); } catch (e) {}
    }
}

function makeAad(keyId, ephemeralPublic) {
    const k = Buffer.from(HW, 'utf8');
    const ephem = Buffer.isBuffer(ephemeralPublic) ? ephemeralPublic : Buffer.from(ephemeralPublic);
    const e = Buffer.alloc(k.length + 3 + ephem.length);
    k.copy(e, 0);
    e[k.length] = 0;
    e[k.length + 1] = 2;
    e[k.length + 2] = Number(keyId);
    ephem.copy(e, k.length + 3);
    return e;
}

function decryptAESGCM(encBytes, responseKey, keyId, ephemeralPublic) {
    const iv = encBytes.subarray(0, CW);
    const ciphertextWithTag = encBytes.subarray(CW);
    const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - NW);
    const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - NW);
    const aad = makeAad(keyId, ephemeralPublic);

    const crypto = require('crypto');
    const decipher = crypto.createDecipheriv('aes-256-gcm', responseKey, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}

function parseHlsVariants(masterText, baseUrl) {
    const lines = masterText.split("\\n");
    const variants = [];
    let currentInf = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const resMatch = line.match(/RESOLUTION=(\\d+)x(\\d+)/i);
            const bwMatch = line.match(/BANDWIDTH=(\\d+)/i);
            currentInf = {
                width: resMatch ? parseInt(resMatch[1], 10) : 0,
                height: resMatch ? parseInt(resMatch[2], 10) : 0,
                bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0
            };
        } else if (line && !line.startsWith("#") && currentInf) {
            let streamUrl = line;
            if (!streamUrl.startsWith("http")) {
                streamUrl = new URL(streamUrl, baseUrl).toString();
            }
            variants.push({
                ...currentInf,
                url: streamUrl
            });
            currentInf = null;
        }
    }
    return variants;
}

function getQualityBadge(height) {
    if (height >= 2160) return "4K";
    if (height >= 1440) return "1440p";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    if (height >= 360) return "360p";
    return height ? \`\${height}p\` : "Auto";
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
};

async function handleRequest(req, res) {
    const parsedUrl = new URL(req.url, \`http://\${req.headers.host || 'localhost'}\`);
    const pathname = parsedUrl.pathname;
    const origin = parsedUrl.origin;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    // Health
    if (pathname === '/' || pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({
            status: "ok",
            service: "Cinejoy Stream Resolver (Node.js)",
            version: "2.3.0",
            engine: "Native WebAssembly + Crypto",
            endpoints: {
                stream: "/api/stream?tmdb={tmdb_id}&type=movie|series&server=lisbon",
                playlist: "/api/playlist?url={url}&height={height}",
                diagnostics: "/diag"
            }
        }, null, 2));
        return;
    }

    // Diagnostics
    if (pathname === '/diag') {
        const diag = {
            timestamp: new Date().toISOString(),
            platform: process.platform,
            node_version: process.version,
            wasm_test: null,
            wing_servers_test: null,
            wing_post_test: null
        };

        try {
            const inst = await getWasmInstance();
            diag.wasm_test = { ok: true, exports: Object.keys(inst.exports) };
        } catch (e) {
            diag.wasm_test = { ok: false, error: e.message };
        }

        try {
            const srvRes = await fetch(SERVERS_URL, {
                headers: {
                    "Origin": "https://cinejoy.pk",
                    "Referer": "https://cinejoy.pk/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                }
            });
            diag.wing_servers_test = { status: srvRes.status, ok: srvRes.ok };
        } catch (e) {
            diag.wing_servers_test = { ok: false, error: e.message };
        }

        try {
            const sealed = await sealWithWasm('/lisbon/movie', { tmdb: '550' });
            const postRes = await fetch(GATEWAY_URL, {
                method: 'POST',
                body: sealed.body,
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Origin": "https://cinejoy.pk",
                    "Referer": "https://cinejoy.pk/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                }
            });
            diag.wing_post_test = { status: postRes.status, ok: postRes.ok };
            if (postRes.ok) {
                const buf = Buffer.from(await postRes.arrayBuffer());
                const dec = decryptAESGCM(buf, sealed.responseKey, sealed.keyId, sealed.ephemeralPublic);
                diag.decrypt_test = { ok: true, preview: dec.slice(0, 150) };
            }
        } catch (e) {
            diag.wing_post_test = { ok: false, error: e.message };
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify(diag, null, 2));
        return;
    }

    // Playlist
    if (pathname === '/api/playlist') {
        const masterUrl = parsedUrl.searchParams.get("url");
        const targetHeight = parsedUrl.searchParams.get("height");

        if (!masterUrl) {
            res.writeHead(400, CORS_HEADERS);
            res.end("Missing 'url' query parameter");
            return;
        }

        try {
            const m3u8Res = await fetch(masterUrl, {
                headers: {
                    "Origin": "https://cinejoy.pk",
                    "Referer": "https://cinejoy.pk/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            if (!m3u8Res.ok) {
                res.writeHead(m3u8Res.status, CORS_HEADERS);
                res.end(\`Upstream HTTP \${m3u8Res.status}\`);
                return;
            }

            const text = await m3u8Res.text();
            const lines = text.split("\\n");
            const filteredLines = [];
            let skippingStream = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith("#EXT-X-STREAM-INF:")) {
                    const resMatch = line.match(/RESOLUTION=(\\d+)x(\\d+)/i);
                    const height = resMatch ? resMatch[2] : "";

                    if (!targetHeight || height === String(targetHeight)) {
                        filteredLines.push(lines[i]);
                        skippingStream = false;
                    } else {
                        skippingStream = true;
                    }
                } else if (skippingStream) {
                    if (!line.startsWith("#")) skippingStream = false;
                } else {
                    if (line && !line.startsWith("#")) {
                        const absUrl = line.startsWith("http") ? line : new URL(line, masterUrl).toString();
                        filteredLines.push(absUrl);
                    } else {
                        if (line.startsWith("#EXT-X-MEDIA:TYPE=AUDIO") && line.includes('URI="')) {
                            const uriMatch = line.match(/URI="([^"]+)"/);
                            if (uriMatch && !uriMatch[1].startsWith("http")) {
                                const absAudio = new URL(uriMatch[1], masterUrl).toString();
                                filteredLines.push(line.replace(uriMatch[1], absAudio));
                                continue;
                            }
                        }
                        if (!line.startsWith("# ") || (!line.includes("p") && !line.includes("4K"))) {
                            filteredLines.push(lines[i]);
                        }
                    }
                }
            }

            res.writeHead(200, {
                'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
                ...CORS_HEADERS
            });
            res.end(filteredLines.join("\\n"));
            return;
        } catch (e) {
            res.writeHead(500, CORS_HEADERS);
            res.end("Playlist error: " + e.message);
            return;
        }
    }

    // Stream
    if (pathname === '/api/stream') {
        const tmdb = parsedUrl.searchParams.get("tmdb");
        const rawType = (parsedUrl.searchParams.get("type") || "movie").toLowerCase();
        const isTv = rawType === "tv" || rawType === "series";
        const server = (parsedUrl.searchParams.get("server") || "lisbon").toLowerCase();
        const season = parsedUrl.searchParams.get("season") || "1";
        const episode = parsedUrl.searchParams.get("episode") || "1";

        if (!tmdb) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
            res.end(JSON.stringify({ error: "Missing 'tmdb' query parameter" }));
            return;
        }

        const pathStr = \`/\${server}/\${isTv ? "series" : "movie"}\`;
        const payloadObj = isTv
            ? { tmdb: String(tmdb), season: String(season), episode: String(episode) }
            : { tmdb: String(tmdb) };

        try {
            const sealed = await sealWithWasm(pathStr, payloadObj);

            const postRes = await fetch(GATEWAY_URL, {
                method: "POST",
                body: sealed.body,
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Origin": "https://cinejoy.pk",
                    "Referer": "https://cinejoy.pk/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                }
            });

            if (!postRes.ok) {
                res.writeHead(postRes.status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
                res.end(JSON.stringify({
                    error: "Gateway returned non-200",
                    status: postRes.status,
                    preview: (await postRes.text()).slice(0, 200)
                }));
                return;
            }

            const encBuf = Buffer.from(await postRes.arrayBuffer());
            const decryptedText = decryptAESGCM(encBuf, sealed.responseKey, sealed.keyId, sealed.ephemeralPublic);
            const rawJson = JSON.parse(decryptedText);

            const serverDisplayName = server.charAt(0).toUpperCase() + server.slice(1);
            const streamHeaders = {
                "Origin": "https://cinejoy.pk",
                "Referer": "https://cinejoy.pk/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            };

            const streams = [];
            const streamList = rawJson.data?.stream || [];

            for (const item of streamList) {
                const captions = item.captions || [];
                const subtitles = captions.map(c => ({
                    url: c.url,
                    language: (c.language || c.id || "en").toLowerCase(),
                    name: c.language || c.id || "Subtitle"
                })).filter(s => !!s.url);

                if (item.type === "hls" && item.playlist) {
                    try {
                        const m3u8Res = await fetch(item.playlist, { headers: streamHeaders });
                        if (m3u8Res.ok) {
                            const m3u8Text = await m3u8Res.text();
                            const variants = parseHlsVariants(m3u8Text, item.playlist);
                            for (const v of variants) {
                                const badge = getQualityBadge(v.height);
                                const qualityLabel = badge === "4K" ? "4K (2160p)" : \`\${v.height}p\`;
                                streams.push({
                                    name: "Cinejoy",
                                    title: \`Cinejoy - \${serverDisplayName} - \${qualityLabel}\`,
                                    url: \`\${origin}/api/playlist?url=\${encodeURIComponent(item.playlist)}&height=\${v.height}\`,
                                    quality: badge,
                                    headers: streamHeaders,
                                    subtitles
                                });
                            }
                        }
                    } catch (mErr) {}

                    streams.push({
                        name: "Cinejoy",
                        title: \`Cinejoy - \${serverDisplayName} - Auto (Adaptive)\`,
                        url: item.playlist,
                        quality: "Auto",
                        headers: streamHeaders,
                        subtitles
                    });
                } else if (item.type === "file" && item.qualities) {
                    for (const qKey of Object.keys(item.qualities)) {
                        const fileObj = item.qualities[qKey];
                        if (fileObj?.url) {
                            streams.push({
                                name: "Cinejoy",
                                title: \`Cinejoy - \${serverDisplayName} - \${qKey}\`,
                                url: fileObj.url,
                                quality: getQualityBadge(parseInt(qKey, 10)) || qKey,
                                headers: streamHeaders,
                                subtitles
                            });
                        }
                    }
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
            res.end(JSON.stringify({
                status: 200,
                server: serverDisplayName,
                count: streams.length,
                streams,
                data: rawJson.data
            }, null, 2));
            return;
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
            res.end(JSON.stringify({ error: err.message }));
            return;
        }
    }

    res.writeHead(404, CORS_HEADERS);
    res.end("Not Found");
}

// Export for Vercel Serverless Function
module.exports = handleRequest;

// Start HTTP server if run directly (node server.js)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(handleRequest);
    server.listen(PORT, () => {
        console.log(\`Cinejoy Resolver Server running at http://localhost:\${PORT}\`);
        console.log(\`Test URL: http://localhost:\${PORT}/api/stream?tmdb=550&type=movie\`);
    });
}
`;

fs.mkdirSync(path.dirname(vercelApiPath), { recursive: true });
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
fs.writeFileSync(vercelApiPath, serverCode, 'utf8');

console.log("Successfully generated resolver/server.js and resolver/api/index.js");
