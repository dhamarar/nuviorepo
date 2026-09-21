const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // os.networkInterfaces() can return null for an interface, so guard the iteration
        // and each entry; otherwise this throws before the server ever listens.
        for (const iface of (interfaces[name] || [])) {
            if (iface && iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const mimeTypes = {
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.html': 'text/html',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Strip the query string: the app appends cache-busting params (?v=123), and without
    // this the lookup would ask for a file literally named "manifest.json?v=123".
    const requestPath = (req.url === '/' ? 'index.html' : req.url.split('?')[0]);

    // Resolve against the repo root and then verify containment with path.relative, rather
    // than a startsWith prefix check — which would also accept a sibling directory whose
    // name merely begins with the same characters (e.g. "...\nuviorepo-evil").
    const filePath = path.resolve(__dirname, '.' + path.posix.normalize(requestPath));
    const relative = path.relative(__dirname, filePath);

    // Security check: prevent directory traversal. Compare against the ".." segment itself
    // or ".." followed by a separator, so a file whose name merely begins with dots is not
    // rejected by mistake.
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov'];

    const extname = path.extname(filePath);
    let contentType = mimeTypes[extname] || 'application/octet-stream';
    if (videoExtensions.includes(extname)) {
        contentType = "video/mp4"; // Defaulting to mp4 for video files for simplicity
    }


    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If asking for root and index.html doesn't exist, allow checking specific files
                if (req.url === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Nuvio Providers Server Running. Access /manifest.json to see the manifest.');
                    return;
                }
                res.writeHead(404);
                res.end(`File not found: ${req.url}`);
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const ip = getLocalIp();
    console.log(`\n🚀 Server running at: http://${ip}:${PORT}/`);
    console.log(`📝 Manifest URL:      http://${ip}:${PORT}/manifest.json`);
    console.log('Press Ctrl+C to stop\n');
});
