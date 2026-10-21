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

test('pix idempotency: reuses pending subscription across tabs with different requestIds and recovers safely', async () => {
  const query = pool.query;
  const fetch = globalThis.fetch;
  const oldToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const oldSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'test-only-token';
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'test-only-secret';

  const mockSubscriptions: Record<string, any> = {};
  const idempotencyKeysSent: string[] = [];

  (pool as any).query = async (statement: string, params: any[] = []) => {
    if (statement.includes('FROM plans')) {
      return [[{ id: 'plan_gold_vip', name: 'gold_vip', price: 49.9, version: 1 }]];
    }
    if (statement.includes('SELECT id, createdAt FROM subscriptions')) {
      const match = Object.values(mockSubscriptions).find(
        (s: any) => s.companyId === params[0] && s.planId === params[1] && s.userId === params[2] && s.status === 'pending'
      );
      return [match ? [match] : []];
    }
    if (statement.includes('INSERT IGNORE INTO subscriptions')) {
      mockSubscriptions[params[0]] = {
        id: params[0],
        userId: params[1],
        companyId: params[2],
        planId: params[3],
        status: 'pending',
        amount: params[4],
        createdAt: new Date().toISOString()
      };
      return [{ affectedRows: 1 }];
    }
    if (statement.includes('SELECT userId, companyId, planId, amount FROM subscriptions WHERE id = ?')) {
      const sub = mockSubscriptions[params[0]];
      return [sub ? [sub] : []];
    }
    if (statement.includes('SELECT gateway_reference FROM payment_logs')) {
      return [[]];
    }
    if (statement.includes('INSERT INTO payment_logs')) {
      return [{ affectedRows: 1 }];
    }
    if (statement.includes('UPDATE subscriptions SET status = ?')) {
      if (params[1] && mockSubscriptions[params[1]]) {
        mockSubscriptions[params[1]].status = params[0];
      }
      return [{ affectedRows: 1 }];
    }
    return [[]];
  };

  globalThis.fetch = async (_url, init) => {
    idempotencyKeysSent.push(String(init?.headers && (init.headers as any)['X-Idempotency-Key']));
    return new Response(JSON.stringify({
      id: 99991,
      status: 'pending',
      point_of_interaction: {
        transaction_data: {
          qr_code: 'pix-test-payload-code',
          qr_code_base64: 'data:image/png;base64,mock'
        }
      }
    }), { status: 201 });
  };

  try {
    // Aba 1 com requestId tab-1
    const tab1 = await paymentService.createPixPayment(
      'user_abc', 'comp_xyz', 'plan_gold_vip', 'payer@test.com', 'Cliente Teste', undefined, 'tab-1-req-id-12345678'
    );
    assert.ok(tab1.subscriptionId);
    assert.equal(tab1.qrCode, 'pix-test-payload-code');

    // Aba 2 com requestId diferente para a mesma compra
    const tab2 = await paymentService.createPixPayment(
      'user_abc', 'comp_xyz', 'plan_gold_vip', 'payer@test.com', 'Cliente Teste', undefined, 'tab-2-different-req-id-87654321'
    );

    // Ambas as abas convergem para o mesmo subscriptionId e idempotency key
    assert.equal(tab1.subscriptionId, tab2.subscriptionId);
    assert.equal(idempotencyKeysSent[0], idempotencyKeysSent[1]);
  } finally {
    (pool as any).query = query;
    globalThis.fetch = fetch;
    if (oldToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN; else process.env.MERCADOPAGO_ACCESS_TOKEN = oldToken;
    if (oldSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET; else process.env.MERCADOPAGO_WEBHOOK_SECRET = oldSecret;
    await pool.end();
  }
});

