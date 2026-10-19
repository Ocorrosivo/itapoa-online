// Deployment helper. Credentials come only from the process and ignored .env.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const domain = 'ajborrachariamovel.com.br';
const username = 'u619805679';
const token = process.env.HOSTINGER_API_TOKEN;
if (!token) throw new Error('HOSTINGER_API_TOKEN is required');
const root = `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/nodejs`;

async function api(url, method = 'GET', body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`Hostinger HTTP ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

const action = process.argv[2];
if (action === 'deploy' || action === 'deploy-git') {
  const env = dotenv.parse(fs.readFileSync('.env'));
  const required = ['NODE_ENV', 'PORT', 'APP_URL', 'API_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  for (const key of required) if (!env[key]) throw new Error(`Missing ${key}`);
  if (env.APP_URL !== `https://${domain}` || env.JWT_SECRET.length < 32) throw new Error('Invalid production environment');
  const settings = {
    node_version: 20, app_type: 'express', root_directory: null,
    output_directory: null, build_script: 'build', entry_file: 'dist/server.cjs', package_manager: 'npm'
  };

  let source;
  if (action === 'deploy-git') {
    const installation = process.argv[3];
    if (!installation) throw new Error('Git installation UUID is required');
    source = { source_type: 'git', source_options: {
      owner: 'Ocorrosivo', repository: 'itapoa-online', branch: 'main', installation_uuid: installation
    } };
  } else {
    const archive = path.resolve(process.argv[3]);
    const archiveName = path.basename(archive);
    const upload = await api('https://developers.hostinger.com/api/hosting/v1/files/upload-urls', 'POST', { username, domain });
    const url = `${upload.url.replace(/\/$/, '')}/${encodeURIComponent(archiveName)}?override=true`;
    const bytes = fs.readFileSync(archive);
    const auth = { 'X-Auth': upload.auth_key, 'X-Auth-Rest': upload.rest_auth_key, 'Tus-Resumable': '1.0.0', 'Upload-Offset': '0' };
    const create = await fetch(url, { method: 'POST', headers: { ...auth, 'Upload-Length': String(bytes.length) }, signal: AbortSignal.timeout(60000) });
    if (create.status !== 201) throw new Error(`Upload initialization HTTP ${create.status}`);
    const patch = await fetch(url, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/offset+octet-stream' }, body: bytes, signal: AbortSignal.timeout(120000) });
    if (patch.status !== 204 || Number(patch.headers.get('upload-offset')) !== bytes.length) throw new Error(`Upload incomplete HTTP ${patch.status}`);
    console.log(`Uploaded ${archiveName}: ${bytes.length} bytes`);
    source = { source_type: 'archive', source_options: { archive_path: archiveName } };
  }

  const envVars = Object.entries(env).filter(([key, value]) => value && !key.startsWith('VITE_SUPABASE_'))
    .map(([key, value]) => ({ key, value }));
  await api(`${root}/builds/settings/env`, 'PUT', { env_vars: envVars });
  await api(`${root}/builds/settings`, 'PUT', settings);
  const build = await api(`${root}/builds`, 'POST', {
    ...settings, ...source
  });
  console.log(JSON.stringify({ domain, build }, null, 2));
} else if (action === 'status') {
  const uuid = process.argv[3];
  console.log(JSON.stringify(await api(`${root}/builds/${uuid}`), null, 2));
  console.log(JSON.stringify(await api(`${root}/builds/${uuid}/logs`), null, 2));
} else if (action === 'runtime') {
  console.log(JSON.stringify(await api(`${root}/runtime-logs?period=1h&limit=100`), null, 2));
} else {
  throw new Error('Use deploy <archive>, status <uuid>, or runtime');
}
