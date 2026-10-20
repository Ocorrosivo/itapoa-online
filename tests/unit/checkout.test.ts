import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutContact } from '../../src/server/services/checkoutService.js';
import { paymentService } from '../../src/server/services/paymentService.js';
import { pool } from '../../src/server/mysql.js';
import { companyService } from '../../src/server/services/companyService.js';
import { CompanyRepository } from '../../src/server/repositories/companyRepository.js';

test('contact validation accepts only minimal valid contact data', () => {
  assert.deepEqual(checkoutContact({ name: ' Maria ', email: 'MARIA@example.test', phone: '(47) 99999-0000', amount: 0 }), {
    name: 'Maria', email: 'maria@example.test', phone: '47999990000'
  });
  for (const payload of [{}, { name: 'A', email: 'x', phone: '1' }, { name: 'Teste', email: 'x@example.test', phone: '1' }]) {
    assert.throws(() => checkoutContact(payload), /Informe nome/);
  }
});

test('completing a business profile cannot grant a paid plan', async () => {
  const original = CompanyRepository.update;
  let received: Record<string, unknown> | undefined;
  CompanyRepository.update = async (_id, data) => { received = data; return data; };
  try {
    await companyService.updateCompany('company_test', { name: 'Empresa', categoryId: 'cat_test', id: 'another_company', planLevel: 'diamond_extremo', isSponsored: 1 });
    assert.deepEqual(received, { name: 'Empresa', categoryId: 'cat_test' });
  } finally { CompanyRepository.update = original; }
});

test('card amount is server-owned, tokenized and idempotent; response never activates plan', async () => {
  const query = pool.query;
  const fetch = globalThis.fetch;
  const oldToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const oldSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'test-only-token';
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'test-only-secret';
  const requests: { headers: any; body: any }[] = [];
  const sql: string[] = [];
  (pool as any).query = async (statement: string) => {
    sql.push(statement);
    if (statement.includes('FROM plans')) return [[{ id: 'plan_gold_vip', name: 'gold_vip', price: 49.9 }]];
    if (statement.includes('SELECT userId')) return [[{ userId: 'user_test', companyId: 'company_test', planId: 'plan_gold_vip', amount: 49.9 }]];
    return [[]];
  };
  globalThis.fetch = async (_url, init) => {
    requests.push({ headers: init?.headers, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 1234, status: 'approved' }), { status: 201 });
  };
  try {
    const input = { requestId: '12345678-1234-1234-1234-123456789abc', amount: 0.01,
      formData: { token: 'safe-test-token', transaction_amount: 0.01, payment_method_id: 'visa', installments: 1,
        payer: { email: 'payer@example.test', identification: { type: 'CPF', number: '12345678909' } } } };
    const first = await paymentService.createCardPayment('user_test', 'company_test', 'plan_gold_vip', input, 'https://itapoa.online');
    const second = await paymentService.createCardPayment('user_test', 'company_test', 'plan_gold_vip', input, 'https://itapoa.online');
    assert.equal(first.subscriptionId, second.subscriptionId);
    assert.equal(requests[0].body.transaction_amount, 49.9);
    assert.equal(requests[0].body.notification_url, 'https://itapoa.online/api/webhooks/mercadopago');
    assert.equal(requests[0].headers['X-Idempotency-Key'], requests[1].headers['X-Idempotency-Key']);
    assert.equal(requests[0].body.token, 'safe-test-token');
    assert.ok(!sql.some(s => /UPDATE.*status.*active/i.test(s)));
    await assert.rejects(() => paymentService.createCardPayment('user_test', 'company_test', 'plan_gold_vip', { ...input, formData: { ...input.formData, token: '' } }, 'https://itapoa.online'), /Confira os dados/);
    globalThis.fetch = async () => { throw new Error('Simulated timeout'); };
    const uncertain = await paymentService.createCardPayment('user_test', 'company_test', 'plan_gold_vip', input, 'https://itapoa.online');
    assert.equal(uncertain.status, 'unknown');
    assert.equal(uncertain.subscriptionId, first.subscriptionId);
  } finally {
    (pool as any).query = query;
    globalThis.fetch = fetch;
    if (oldToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN; else process.env.MERCADOPAGO_ACCESS_TOKEN = oldToken;
    if (oldSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET; else process.env.MERCADOPAGO_WEBHOOK_SECRET = oldSecret;
    await pool.end();
  }
});
