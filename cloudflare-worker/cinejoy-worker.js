/**
 * Cinejoy Stream Resolver - Cloudflare Worker
 * 
 * Acts as a lightweight proxy/resolver bridging Nuvio's text-only QuickJS environment
 * to Cinejoy's Lumen Gate v2 binary gateway (api.wing.st/g).
 * 
 * Exposes all resolutions (4K 2160p, 1080p, 720p, 360p, Auto) with synced audio.
 * Zero external dependencies. Uses 100% native Web standard APIs (Fetch, WebCrypto).
 */

function base64ToBytes(b64) {
    let clean = String(b64).replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) clean += '=';
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function parseHlsVariants(masterText, baseUrl) {
    const lines = masterText.split("\n");
    const variants = [];
    let currentInf = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
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
    return height ? `${height}p` : "Auto";
}

export default {
    async fetch(request, env, ctx) {
        // Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                }
            });
        }

        const url = new URL(request.url);
        const origin = url.origin;

        // Health check endpoint
        if (url.pathname === "/" || url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", service: "Cinejoy Stream Resolver" }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        // Mini-master playlist for a specific quality with audio preserved
        // /api/playlist?url=<master_url>&height=2160
        if (url.pathname === "/api/playlist") {
            const masterUrl = url.searchParams.get("url");
            const targetHeight = url.searchParams.get("height");

            if (!masterUrl) {
                return new Response("Missing 'url' query parameter", { status: 400 });
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
                    return new Response(`Upstream returned HTTP ${m3u8Res.status}`, { status: m3u8Res.status });
                }

                const text = await m3u8Res.text();
                const lines = text.split("\n");
                const filteredLines = [];
                let skippingStream = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    if (line.startsWith("#EXT-X-STREAM-INF:")) {
                        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
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
                            // Don't include standalone comment quality headers if skipped
                            if (!line.startsWith("# ") || !line.includes("p") && !line.includes("4K")) {
                                filteredLines.push(lines[i]);
                            }
                        }
                    }
                }

                return new Response(filteredLines.join("\n"), {
                    headers: {
                        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "public, max-age=3600"
                    }
                });
            } catch (pErr) {
                return new Response("Failed to build quality playlist: " + pErr.message, { status: 500 });
            }
        }

        // Stream endpoint: /api/stream?tmdb=...&type=movie|series&server=Lisbon&season=1&episode=1
        if (url.pathname === "/api/stream") {
            const tmdb = url.searchParams.get("tmdb");
            const type = (url.searchParams.get("type") || "movie").toLowerCase();
            const server = url.searchParams.get("server") || "Lisbon";
            const season = url.searchParams.get("season") || "1";
            const episode = url.searchParams.get("episode") || "1";

            if (!tmdb) {
                return new Response(JSON.stringify({ error: "Missing 'tmdb' query parameter" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }

            try {
                const isTv = type === "tv" || type === "series";
                let sheguUrl = `https://api.shegu.xyz/?type=${isTv ? 'series' : 'movie'}&tmdb=${tmdb}&server=${server}`;
                if (isTv) sheguUrl += `&season=${season}&episode=${episode}`;

                // 1. Request signed payload token from enc-dec.app
                const encUrl = `https://enc-dec.app/api/enc-cinejoy?url=${encodeURIComponent(sheguUrl)}`;
                const encRes = await fetch(encUrl, {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                });

                if (!encRes.ok) {
                    return new Response(JSON.stringify({ error: `enc-dec API returned HTTP ${encRes.status}` }), {
                        status: 502,
                        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }

                const encJson = await encRes.json();
                if (encJson.status !== 200 || !encJson.result) {
                    return new Response(JSON.stringify({ error: encJson.error || "Failed to seal Cinejoy request" }), {
                        status: 500,
                        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }

                const requestBody = base64ToBytes(encJson.result.data);
                const responseKey = base64ToBytes(encJson.result.state.responseKey);
                const aad = base64ToBytes(encJson.result.state.aad);

                // 2. Perform raw binary POST to Wing gateway
                const wingRes = await fetch("https://api.wing.st/g", {
                    method: "POST",
                    body: requestBody,
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Origin": "https://cinejoy.pk",
                        "Referer": "https://cinejoy.pk/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                });

                if (!wingRes.ok) {
                    return new Response(JSON.stringify({ error: `Wing gateway returned HTTP ${wingRes.status}` }), {
                        status: wingRes.status,
                        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }

                // 3. Decrypt response using standard WebCrypto AES-GCM
                const encBuf = await wingRes.arrayBuffer();
                const encBytes = new Uint8Array(encBuf);
                const iv = encBytes.slice(0, 12);
                const ciphertextWithTag = encBytes.slice(12);

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

                const decryptedText = new TextDecoder().decode(decryptedBuf);
                const rawJson = JSON.parse(decryptedText);

                // 4. Expand all resolutions from the master HLS playlist
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
                            const m3u8Res = await fetch(item.playlist, {
                                headers: streamHeaders
                            });
                            if (m3u8Res.ok) {
                                const m3u8Text = await m3u8Res.text();
                                const variants = parseHlsVariants(m3u8Text, item.playlist);

                                for (const v of variants) {
                                    const badge = getQualityBadge(v.height);
                                    const qualityLabel = badge === "4K" ? "4K (2160p)" : `${v.height}p`;
                                    streams.push({
                                        name: "Cinejoy",
                                        title: `Cinejoy - ${serverDisplayName} - ${qualityLabel}`,
                                        url: `${origin}/api/playlist?url=${encodeURIComponent(item.playlist)}&height=${v.height}`,
                                        quality: badge,
                                        headers: streamHeaders,
                                        subtitles
                                    });
                                }
                            }
                        } catch (m3u8Err) {
                            console.error("M3U8 variant parse error:", m3u8Err);
                        }

                        // Always include Auto / Master playlist as well
                        streams.push({
                            name: "Cinejoy",
                            title: `Cinejoy - ${serverDisplayName} - Auto (Adaptive)`,
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
                                    title: `Cinejoy - ${serverDisplayName} - ${qKey}`,
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
                    data: rawJson.data,
                    streams
                }), {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }
        }

        return new Response("Not Found", { status: 404 });
    }
};
