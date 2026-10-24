import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPaymentHarness } from '../helpers/paymentHarness.js';
let h: Awaited<ReturnType<typeof createPaymentHarness>>;
before(async () => { h = await createPaymentHarness(); });
after(async () => { if (h) await h.close(); });
test('real API and SQL persist social links, preserve omitted fields and clear explicit empty values', async () => {
  const payload = { instagram: ' @norte_teste ', facebook: 'https://facebook.com/norte', tiktok: '@norte', website: 'https://example.test/', description: "Nome ' OR 1=1 --" };
  const saved = await h.request('/api/companies/a', 'PUT', payload);
  assert.equal(saved.status, 200);
  const [rows]: any = await h.admin.query('SELECT * FROM companies WHERE id=?', ['a']);
  for (const [key, value] of Object.entries(payload)) assert.equal(rows[0][key], value.trim());
  assert.equal((await h.request('/api/companies/a', 'PUT', { website: '', tiktok: null })).status, 200);
  const read = await h.request('/api/account/companies');
  assert.equal(read.body[0].instagram, '@norte_teste');
  assert.equal(read.body[0].website, '');
  assert.equal(read.body[0].tiktok, null);
});
test('other companies and paid privileges stay protected; unsafe URLs fail before write', async () => {
  assert.equal((await h.request('/api/companies/b', 'PUT', { website: 'https://example.test' })).status, 403);
  assert.equal((await h.request('/api/companies/a', 'PUT', { website: 'javascript:alert(1)' })).status, 400);
  assert.equal((await h.request('/api/companies/a', 'PUT', { website: { evil: true } })).status, 400);
  await h.request('/api/companies/a', 'PUT', { instagram: '@safe', planLevel: 'diamond_extremo', isSponsored: 1 });
  const [rows]: any = await h.admin.query('SELECT planLevel,website FROM companies WHERE id=?', ['a']);
  assert.equal(rows[0].planLevel, 'bronze'); assert.equal(rows[0].website, '');
});
test('migration is repeatable and database errors never report success', async () => {
  const sql = (await fs.readFile('database/migrations/20261024_company_contact_links.sql', 'utf8')).replace(/^--.*$/gm, '');
  await h.admin.query(sql); await h.admin.query(sql);
  await h.admin.query("CREATE TRIGGER reject_fixture_profile BEFORE UPDATE ON companies FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic fixture failure'");
  try {
    const failed = await h.request('/api/companies/a', 'PUT', { instagram: '@not_saved' });
    assert.equal(failed.status, 500);
    const [rows]: any = await h.admin.query('SELECT instagram FROM companies WHERE id=?', ['a']);
    assert.equal(rows[0].instagram, '@safe');
  } finally { await h.admin.query('DROP TRIGGER reject_fixture_profile'); }
});
