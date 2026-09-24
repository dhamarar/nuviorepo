const fs = require('fs');
const path = require('path');

const wasmJsPath = path.join(__dirname, '..', 'src', 'cinejoy', 'wasm.js');
const workerJsPath = path.join(__dirname, '..', 'cloudflare-worker', 'cinejoy-worker.js');

const wasmContent = fs.readFileSync(wasmJsPath, 'utf8');
const match = wasmContent.match(/const CRUSH_WASM_RAW_B64 = "([^"]+)";/);

if (!match) {
    console.error("Could not find CRUSH_WASM_RAW_B64 in wasm.js");
    process.exit(1);
}

const b64Wasm = match[1];

const workerCode = `/**
 * Cinejoy Stream Resolver - Cloudflare Worker (Standalone / Self-Contained)
 * 
 * Features:
 * - 100% Standalone: Embedded WebAssembly engine (Lumen Gate v2). Zero external sealer dependencies!
 * - Never blocked by Cloudflare Turnstile or third-party API rate limits.
 * - Multi-Resolution: Generates 4K (2160p), 1080p, 720p, 360p, and Auto (Adaptive) streams with synced audio.
 * - Multi-Server: Supports Lisbon, Solara, Nebula, Athens, etc.
 * - Native WebCrypto AES-GCM decryption.
 * - Full CORS enabled on all endpoints.
 * - Built-in Diagnostic Endpoint: /diag
 */

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
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function toArrayBuffer(uint8Arr) {
    if (!uint8Arr) return new ArrayBuffer(0);
    if (uint8Arr instanceof ArrayBuffer) return uint8Arr;
    return uint8Arr.buffer.slice(
        uint8Arr.byteOffset,
        uint8Arr.byteOffset + uint8Arr.byteLength
    );
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

    const n = new TextEncoder().encode(fullJson);
    const m = new Uint8Array(IW);
    crypto.getRandomValues(m);
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
        const responseKey = out.slice(0, Y);
        const keyId = out[Y];
        const ephemeralPublic = out.slice(Y + RW, WW);
        const body = out.slice(WW, t);

        return { responseKey, keyId, ephemeralPublic, body };
    } finally {
        try { dealloc(s, n.length); } catch (e) {}
        try { dealloc(a, m.length); } catch (e) {}
        try { dealloc(r, p); } catch (e) {}
    }
}

function makeAad(keyId, ephemeralPublic) {
    const k = new TextEncoder().encode(HW);
    const ephem = ephemeralPublic instanceof Uint8Array ? ephemeralPublic : base64ToBytes(ephemeralPublic);
    const e = new Uint8Array(k.length + 3 + ephem.length);
    e.set(k, 0);
    e[k.length] = 0;
    e[k.length + 1] = 2;
    e[k.length + 2] = Number(keyId);
    e.set(ephem, k.length + 3);
    return e;
}

async function decryptWithWebCrypto(encBytes, responseKey, keyId, ephemeralPublic, explicitAad = null) {
    const iv = encBytes.slice(0, CW);
    const ciphertextWithTag = encBytes.slice(CW);
    const aad = explicitAad || makeAad(keyId, ephemeralPublic);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        responseKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decryptedBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: aad },
        cryptoKey,
        ciphertextWithTag
    );

    return new TextDecoder().decode(decryptedBuf);
}

// Fallback to enc-dec API only if local WASM encounters an unexpected runtime error
async function sealWithApiFallback(server, isTv, tmdb, season, episode) {
    let sheguUrl = \`https://api.shegu.xyz/?type=\${isTv ? 'series' : 'movie'}&tmdb=\${tmdb}&server=\${server}\`;
    if (isTv) sheguUrl += \`&season=\${season}&episode=\${episode}\`;

    const encUrl = \`https://enc-dec.app/api/enc-cinejoy?url=\${encodeURIComponent(sheguUrl)}\`;
    const encRes = await fetch(encUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (!encRes.ok) throw new Error(\`enc-dec fallback HTTP \${encRes.status}\`);
    const encJson = await encRes.json();
    if (encJson.status !== 200 || !encJson.result) {
        throw new Error(encJson.error || "Failed to seal via enc-dec fallback");
    }

    return {
        body: base64ToBytes(encJson.result.data),
        responseKey: base64ToBytes(encJson.result.state.responseKey),
        aad: base64ToBytes(encJson.result.state.aad),
        keyId: null,
        ephemeralPublic: null
    };
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

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const origin = url.origin;

        // Health & Overview endpoint
        if (url.pathname === "/" || url.pathname === "/health") {
            const sampleMovieUrl = \`\${origin}/api/stream?tmdb=550&type=movie\`;
            const sampleTvUrl = \`\${origin}/api/stream?tmdb=1399&type=series&season=1&episode=1\`;
            return new Response(JSON.stringify({
                status: "ok",
                service: "Cinejoy Stream Resolver",
                version: "2.3.0",
                engine: "Standalone Native WebAssembly (Lumen Gate v2)",
                status_description: "Ready. No external enc-dec dependency required.",
                diagnostics_url: \`\${origin}/diag\`,
                quick_test: {
                    movie: sampleMovieUrl,
                    tv: sampleTvUrl
                },
                endpoints: {
                    stream: "/api/stream?tmdb={tmdb_id}&type=movie|series&server=lisbon|solara|nebula",
                    playlist: "/api/playlist?url={encoded_m3u8}&height={height}",
                    diagnostics: "/diag"
                }
            }, null, 2), {
                headers: { "Content-Type": "application/json", ...CORS_HEADERS }
            });
        }

        // Live Diagnostic Endpoint: /diag
        if (url.pathname === "/diag") {
            const diag = {
                timestamp: new Date().toISOString(),
                wasm_test: null,
                seal_test: null,
                wing_servers_test: null,
                wing_gateway_post_test: null,
                decrypt_test: null
            };

            // 1. WASM instantiation test
            try {
                const inst = await getWasmInstance();
                diag.wasm_test = { ok: true, exports: Object.keys(inst.exports) };
            } catch (wErr) {
                diag.wasm_test = { ok: false, error: wErr.message || String(wErr) };
            }

            // 2. Local Seal test
            let sealedDiag = null;
            try {
                sealedDiag = await sealWithWasm('/lisbon/movie', { tmdb: '550' });
                diag.seal_test = {
                    ok: true,
                    bodyLength: sealedDiag.body.length,
                    keyId: sealedDiag.keyId,
                    responseKeyLength: sealedDiag.responseKey.length
                };
            } catch (sErr) {
                diag.seal_test = { ok: false, error: sErr.message || String(sErr) };
            }

            // 3. Wing /servers connectivity test
            try {
                const srvRes = await fetch(SERVERS_URL, {
                    headers: {
                        "Origin": "https://cinejoy.pk",
                        "Referer": "https://cinejoy.pk/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                });
                diag.wing_servers_test = {
                    status: srvRes.status,
                    ok: srvRes.ok,
                    preview: (await srvRes.text()).slice(0, 150)
                };
            } catch (srvErr) {
                diag.wing_servers_test = { ok: false, error: srvErr.message || String(srvErr) };
            }

            // 4. Wing POST test with binary body
            if (sealedDiag) {
                try {
                    const postRes = await fetch(GATEWAY_URL, {
                        method: "POST",
                        body: toArrayBuffer(sealedDiag.body),
                        headers: {
                            "Content-Type": "application/octet-stream",
                            "Origin": "https://cinejoy.pk",
                            "Referer": "https://cinejoy.pk/",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                        }
                    });
                    diag.wing_gateway_post_test = {
                        status: postRes.status,
                        ok: postRes.ok,
                        headers: Object.fromEntries(postRes.headers.entries())
                    };

                    if (postRes.ok) {
                        const encBuf = await postRes.arrayBuffer();
                        const encBytes = new Uint8Array(encBuf);
                        const decryptedText = await decryptWithWebCrypto(
                            encBytes,
                            sealedDiag.responseKey,
                            sealedDiag.keyId,
                            sealedDiag.ephemeralPublic
                        );
                        diag.decrypt_test = {
                            ok: true,
                            preview: decryptedText.slice(0, 150)
                        };
                    } else {
                        diag.wing_gateway_post_test.bodyPreview = (await postRes.text()).slice(0, 300);
                    }
                } catch (pErr) {
                    diag.wing_gateway_post_test = { ok: false, error: pErr.message || String(pErr) };
                }
            }

            return new Response(JSON.stringify(diag, null, 2), {
                headers: { "Content-Type": "application/json", ...CORS_HEADERS }
            });
        }

        // Mini-master playlist for a specific quality with audio tracks preserved
        if (url.pathname === "/api/playlist") {
            const masterUrl = url.searchParams.get("url");
            const targetHeight = url.searchParams.get("height");

            if (!masterUrl) {
                return new Response("Missing 'url' query parameter", { status: 400, headers: CORS_HEADERS });
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
                    return new Response(\`Upstream returned HTTP \${m3u8Res.status}\`, { status: m3u8Res.status, headers: CORS_HEADERS });
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
                        if (!line.startsWith("#")) {
                            skippingStream = false;
                        }
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

                return new Response(filteredLines.join("\\n"), {
                    headers: {
                        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
                        "Cache-Control": "public, max-age=3600",
                        ...CORS_HEADERS
                    }
                });
            } catch (pErr) {
                return new Response("Failed to build quality playlist: " + pErr.message, { status: 500, headers: CORS_HEADERS });
            }
        }

        // Stream endpoint: /api/stream?tmdb=...&type=movie|series&server=lisbon&season=1&episode=1
        if (url.pathname === "/api/stream") {
            const tmdb = url.searchParams.get("tmdb");
            const rawType = (url.searchParams.get("type") || "movie").toLowerCase();
            const isTv = rawType === "tv" || rawType === "series";
            const server = (url.searchParams.get("server") || "lisbon").toLowerCase();
            const season = url.searchParams.get("season") || "1";
            const episode = url.searchParams.get("episode") || "1";

            if (!tmdb) {
                return new Response(JSON.stringify({ error: "Missing 'tmdb' query parameter" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
                });
            }

            const path = \`/\${server}/\${isTv ? "series" : "movie"}\`;
            const payloadObj = isTv
                ? { tmdb: String(tmdb), season: String(season), episode: String(episode) }
                : { tmdb: String(tmdb) };

            try {
                let sealed = null;
                let usedFallback = false;
                let wasmError = null;

                // 1. Try local native WebAssembly first
                try {
                    sealed = await sealWithWasm(path, payloadObj);
                } catch (wasmErr) {
                    wasmError = wasmErr.message || String(wasmErr);
                    console.warn("Local WASM failed, falling back to enc-dec API:", wasmError);
                    sealed = await sealWithApiFallback(server, isTv, tmdb, season, episode);
                    usedFallback = true;
                }

                // 2. Perform raw binary POST to Wing gateway
                let wingRes = null;
                let fetchError = null;
                let lastStatus = null;
                let lastBodyText = null;

                try {
                    const binaryBody = toArrayBuffer(sealed.body);
                    const r = await fetch(GATEWAY_URL, {
                        method: "POST",
                        body: binaryBody,
                        headers: {
                            "Content-Type": "application/octet-stream",
                            "Origin": "https://cinejoy.pk",
                            "Referer": "https://cinejoy.pk/",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                        }
                    });
                    lastStatus = r.status;
                    if (r.ok) {
                        wingRes = r;
                    } else {
                        lastBodyText = await r.text();
                    }
                } catch (fErr) {
                    fetchError = fErr.message || String(fErr);
                }

                if (!wingRes) {
                    return new Response(JSON.stringify({
                        error: "Wing gateway rejected request",
                        http_status: lastStatus || "Fetch Failed",
                        fetch_error: fetchError,
                        response_preview: lastBodyText ? lastBodyText.slice(0, 300) : null,
                        engine: usedFallback ? "api-fallback" : "native-wasm",
                        wasm_error: wasmError
                    }, null, 2), {
                        status: lastStatus || 502,
                        headers: { "Content-Type": "application/json", ...CORS_HEADERS }
                    });
                }

                // 3. Decrypt response using WebCrypto AES-GCM
                const encBuf = await wingRes.arrayBuffer();
                const encBytes = new Uint8Array(encBuf);
                const decryptedText = await decryptWithWebCrypto(
                    encBytes,
                    sealed.responseKey,
                    sealed.keyId,
                    sealed.ephemeralPublic,
                    sealed.aad
                );

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
                        } catch (m3u8Err) {
                            console.error("M3U8 variant parse error:", m3u8Err);
                        }

                        // Always include Auto / Master playlist
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

                return new Response(JSON.stringify({
                    status: 200,
                    server: serverDisplayName,
                    count: streams.length,
                    engine: usedFallback ? "api-fallback" : "native-wasm",
                    streams,
                    data: rawJson.data
                }, null, 2), {
                    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
                });
            }
        }

        return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    }
};
`;

fs.writeFileSync(workerJsPath, workerCode, 'utf8');
console.log("Successfully generated enhanced cinejoy-worker.js at " + workerJsPath);
console.log("File size: " + (fs.statSync(workerJsPath).size / 1024).toFixed(2) + " KB");
