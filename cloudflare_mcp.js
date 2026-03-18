const { spawn } = require('child_process');

const child = spawn('cmd.exe', ['/c', 'npx -y @cloudflare/mcp-server-cloudflare run'], {
    env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: '0' },
    shell: false
});

child.stdout.on('data', (data) => {
    const output = data.toString();
    const lines = output.split(/\r?\n/);
    lines.forEach(line => {
        const trimmed = line.trim();
        // Strict JSON-RPC check: must start and end with curly braces
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                JSON.parse(trimmed); // Verify it is actually JSON
                process.stdout.write(trimmed + '\n');
            } catch (e) {
                process.stderr.write('[CLOUDFLARE NON-JSON] ' + trimmed + '\n');
            }
        } else if (trimmed) {
            process.stderr.write('[CLOUDFLARE LOG] ' + trimmed + '\n');
        }
    });
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
});

child.on('exit', (code) => {
    process.exit(code);
});
