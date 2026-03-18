const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const HOST = 'mcp.vercel.com';
const PATH = '/api/mcp';

if (!VERCEL_TOKEN) {
    console.error('[VERCEL] Error: VERCEL_TOKEN not set.');
    process.exit(1);
}

// Robust line buffering for SSE and JSON
let buffer = '';

function handleChunk(chunk) {
    buffer += chunk.toString();
    let lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // Keep the partial line in buffer

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
            const data = trimmed.substring(6).trim();
            if (data) process.stdout.write(data + '\n');
        } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            // Likely a complete JSON result
            process.stdout.write(trimmed + '\n');
        }
    });
}

function sendRequest(jsonrpcMessage) {
    const options = {
        hostname: HOST,
        path: PATH,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        }
    };

    const req = https.request(options, (res) => {
        res.on('data', handleChunk);
    });

    req.on('error', (e) => {
        console.error(`[VERCEL] Request Error: ${e.message}`);
    });

    req.write(jsonrpcMessage);
    req.end();
}

process.stdin.on('data', (data) => {
    const str = data.toString().trim();
    if (str) {
        sendRequest(str);
    }
});

console.error('[VERCEL] Authenticated Hybrid-Bridge v2 Active.');
