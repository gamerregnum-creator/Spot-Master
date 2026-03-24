const fs = require('fs');
const path = require('path');

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'Cargo.toml') {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            if (content.includes('edition = "2024"')) {
                content = content.replace(/edition = "2024"/g, 'edition = "2021"');
                changed = true;
            }
            
            if (content.includes('rust-version')) {
                content = content.replace(/rust-version = "1\.[8-9][0-9]\.?[0-9]*"/g, 'rust-version = "1.75"');
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                // Si hemos cambiado el TOML, la firma original ya no vale.
                // Borramos el archivo de checksum para que cargo lo ignore.
                const checksumPath = path.join(dir, '.cargo-checksum.json');
                if (fs.existsSync(checksumPath)) {
                    fs.writeFileSync(checksumPath, '{"files":{}}');
                }
            }
        }
    });
}

console.log("Iniciando Mega Patch en carpeta 'vendor'...");
walk('vendor');
console.log("Mega Patch completado con éxito.");

// Crear también el archivo .cargo/config.toml de forma segura
const configDir = path.join(process.cwd(), '.cargo');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
const configContent = `[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
`;
fs.writeFileSync(path.join(configDir, 'config.toml'), configContent);
console.log("Configuración .cargo/config.toml establecida.");
