import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const offline = process.argv.includes('--offline');
const port = offline ? 43819 : 43818;
const base = `http://127.0.0.1:${port}`;
const releaseSha = '1234567890abcdef1234567890abcdef12345678';
const child = spawn(process.execPath, ['dist/server.cjs'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: String(port), RELEASE_SHA: releaseSha,
    ...(offline ? { DB_HOST: '127.0.0.1', DB_PORT: '65534' } : {}) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', data => { logs += data; });
child.stderr.on('data', data => { logs += data; });
const request = async path => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(12000) });
  return { response, body: await response.json() };
};

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited (${child.exitCode})`);
    if (logs.includes('Guia Comercial Itapoá')) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Server must start even when MySQL is unavailable');
  const health = await request('/api/health');
  assert.equal(health.response.status, offline ? 503 : 200);
  assert.equal(health.response.headers.get('x-release-sha'), releaseSha);
  assert.equal(health.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(health.body, offline
    ? { status: 'degraded', database: 'disconnected' }
    : { status: 'ok', database: 'connected' });

  if (offline) {
    for (const path of ['/api/companies', '/api/categories', '/api/cities']) {
      const result = await request(path);
      assert.equal(result.response.status, 503, path);
      assert.ok(!JSON.stringify(result.body).includes('sql'), 'No SQL detail in response');
    }
    assert.equal((await request('/api/health')).response.status, 503);
  } else {
    const catalogue = (await request('/api/companies')).body;
    assert.ok(catalogue.length >= 16, 'Demo catalogue must be present');
    assert.equal((await request('/api/cities')).body.length, 4);
    assert.equal((await request('/api/categories')).body.length, 10);
    for (const term of ['Mercado', 'Pousada', 'Hambúrguer', 'Lava Rápido', 'Itapema', 'Clínica', 'Construção', 'cafe incluso', 'blend angus', 'Samambaial']) {
      const accented = (await request(`/api/companies?search=${encodeURIComponent(term)}`)).body;
      const plain = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const alias = (await request(`/api/companies?q=${encodeURIComponent(plain)}`)).body;
      assert.ok(accented.length > 0, term);
      assert.deepEqual(accented.map(c => c.id).sort(), alias.map(c => c.id).sort(), term);
    }
    assert.equal((await request('/api/companies?q=hamburguer&limit=1')).body.length, 1);
    assert.ok((await request('/api/companies?search=&q=clinica')).body.length > 0);
    assert.equal((await request('/api/companies?q=naoexiste987654')).body.length, 0);
    assert.equal((await request('/api/companies?q=%27%20OR%201%3D1--')).body.length, 0);
  }

  for (const path of ['/', '/empresas', '/empresa/mercado-central-itapoa']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).includes('id="root"'));
  }
  assert.equal((await request('/api/endpoint-inexistente')).response.status, 404);
  for (const [path, method] of [['/api/companies/create', 'POST'], ['/api/companies/test', 'PUT'], ['/api/checkout/company', 'POST'], ['/api/payments/card', 'POST']]) {
    assert.equal((await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  }
  console.log(`PASS: ${offline ? 'MySQL offline: 503, server alive' : 'live MySQL catalogue, accent-insensitive search and q, pagination'}; SPA routes; auth guards; JSON 404.`);
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, 'exit');
}
