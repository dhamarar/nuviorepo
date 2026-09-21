/**
 * Cinejoy Stream Resolver - Cloudflare Worker
 * 
 * Acts as a lightweight proxy/resolver bridging Nuvio's text-only QuickJS environment
 * to Cinejoy's Lumen Gate v2 binary gateway (api.wing.st/g).
 * 
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

        // Health check endpoint
        if (url.pathname === "/" || url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", service: "Cinejoy Stream Resolver" }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
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
                return new Response(decryptedText, {
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
