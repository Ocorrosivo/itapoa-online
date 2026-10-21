const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const scratchDir = path.join(rootDir, 'deploy_staging');
const zipFile = path.join(rootDir, 'deploy-hostinger.zip');

if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
if (fs.existsSync(zipFile)) fs.rmSync(zipFile, { force: true });

fs.mkdirSync(scratchDir, { recursive: true });

const itemsToCopy = [
  'dist',
  'src',
  'public',
  'database',
  'package.json',
  'package-lock.json',
  'server.js',
  'server.ts'
];

for (const item of itemsToCopy) {
  const src = path.join(rootDir, item);
  const dest = path.join(scratchDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Ensure uploads folder exists
fs.mkdirSync(path.join(scratchDir, 'uploads'), { recursive: true });

console.log('Arquivos copiados para deploy_staging. Compactando deploy-hostinger.zip...');

// Use tar or powershell Compress-Archive
try {
  execSync(`tar -a -c -f "${zipFile}" -C "${scratchDir}" .`, { stdio: 'inherit' });
} catch {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${scratchDir}\\*' -DestinationPath '${zipFile}' -CompressionLevel Optimal"`, { stdio: 'inherit' });
}

fs.rmSync(scratchDir, { recursive: true, force: true });

const stats = fs.statSync(zipFile);
console.log(`Sucesso! Arquivo gerado: ${zipFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
