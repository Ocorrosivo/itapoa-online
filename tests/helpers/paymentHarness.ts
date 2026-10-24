import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

export async function sqlScript(db: any, source: string) {
  let delimiter = ';', statement = '';
  for (const line of source.split(/\r?\n/)) {
    if (line.trim().startsWith('--') || !line.trim()) continue;
    if (line.trim().startsWith('DELIMITER ')) { delimiter = line.trim().slice(10); continue; }
    statement += line + '\n';
    if (!statement.trimEnd().endsWith(delimiter)) continue;
    const sql = statement.trim().slice(0, -delimiter.length).trim(); statement = '';
    // Historical migration seeds a real master identity. Test fixtures never import it.
    if (sql.startsWith('INSERT INTO users')) continue;
    if (sql) await db.query(sql);
  }
  if (statement.trim()) throw new Error('Incomplete test SQL script');
}

export async function createPaymentHarness(uploadDirectory?: string) {
  const port = Number(process.env.PAYMENT_TEST_DB_PORT || 43316);
  if (port === 3306 || port < 1024) throw new Error('Use a dedicated local test database port, never production');
  const database = `itapoa_payments_test_${process.pid}`;
  const password = process.env.PAYMENT_TEST_DB_PASSWORD || 'payment-local-only';
  Object.assign(process.env, {
    NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_USER: 'root',
    DB_PASSWORD: password, DB_NAME: database, JWT_SECRET: 'local-payments-fixture-not-a-real-secret-0123456789',
    APP_URL: 'http://127.0.0.1:4179', MERCADOPAGO_ACCESS_TOKEN: 'TEST-fixture-not-a-real-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'fixture-webhook-signature-only', MERCADOPAGO_MODE: 'test',
    // Never inherit a real SMTP transport from the operator's shell.
    SMTP_HOST: '',
    PAYMENT_TEST_ACCOUNT_EMAIL: '', PAYMENT_TEST_STARTS_AT: '', PAYMENT_TEST_EXPIRES_AT: '',
  });
  const admin = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', password });
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.changeUser({ database });
  for (const file of ['database/schema/MYSQL_SCHEMA.sql',
    'database/migrations/20261020_plan_entitlements_versioning.sql',
    'database/migrations/20261020_admin_master_and_grants.sql',
    'database/migrations/20261021_mercadopago_trial_and_billing.sql',
    'database/migrations/20261022_webhook_events_and_orphan_media.sql',
    'database/migrations/20261021_payment_settlement.sql',
    'database/migrations/20261021_password_recovery.sql',
    'database/migrations/20261022_email_verification.sql']) {
    await sqlScript(admin, await fs.readFile(file, 'utf8'));
  }
  const { pool } = await import('../../src/server/mysql.js');
  const { apiRouter } = await import('../../src/server/routes/api.js');
  const { mercadoPagoWebhook } = await import('../../src/server/routes/mercadoPagoWebhook.js');
  const { signToken } = await import('../../src/server/middleware/auth.js');
  const users = ['a', 'b', 'empty', 'admin'];
  const tokens: Record<string, string> = {};
  for (const role of ['advertiser', 'admin_master', 'user']) await admin.query('INSERT IGNORE INTO roles (id,name) VALUES (?,?)', [role, role]);
  const hash = await bcrypt.hash('Fixture-password-123', 4);
  for (const id of users) {
    const role = id === 'admin' ? 'admin_master' : 'advertiser', email = `${id}@example.test`;
    await admin.query('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)', [id, `Fixture ${id}`, email, hash, role]);
    tokens[id] = signToken({ id, email, role });
  }
  for (const [id, name, price] of [['plan_bronze','bronze',0],['plan_gold_vip','gold_vip',49.90],['plan_diamond_extremo','diamond_extremo',99.90]]) {
    await admin.query('INSERT INTO plans (id,name,price) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price)', [id, name, price]);
  }
  for (const id of ['a', 'b']) {
    await admin.query('INSERT INTO companies (id,name,slug,planLevel,access_grant_type) VALUES (?,?,?,\'bronze\',\'bronze\')', [id, `Company ${id}`, id]);
    await admin.query("INSERT INTO companies_users (user_id,company_id,access_level) VALUES (?,?,'owner')", [id, id]);
  }
  await admin.query('INSERT INTO payment_config (id,gateway,publicKey,accessToken) VALUES (?,?,?,?)', ['payment','mercadopago','TEST-public-fixture','TEST-fixture-not-a-real-token']);
  const gateway = new Map<string, any>();
  const calls: { method: string; path: string; body: any; key: string }[] = [];
  const originalFetch = globalThis.fetch;
  let gatewayFailure: 'timeout' | 'http' | null = null, responseState = 'pending', nextId = 100000;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== 'https://api.mercadopago.com') return originalFetch(input, init);
    calls.push({ method: init?.method || 'GET', path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : null, key: new Headers(init?.headers).get('X-Idempotency-Key') || '' });
    if (gatewayFailure === 'timeout') throw new DOMException('Simulated timeout at external boundary', 'TimeoutError');
    if (gatewayFailure === 'http') return Response.json({ error: 'synthetic' }, { status: 503 });
    if (url.pathname === '/users/me') return Response.json({ id: 777777777 });
    if (url.pathname === '/v1/payments/search') return Response.json({ results: [...gateway.values()].filter(p => p.external_reference === url.searchParams.get('external_reference')) });
    if (url.pathname === '/v1/payments' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      const previous = [...gateway.values()].find(p => p.external_reference === body.external_reference);
      if (previous) return Response.json(previous);
      const id = String(++nextId);
      const value = remotePayment(body.external_reference, { id, status: responseState, transaction_amount: body.transaction_amount,
        metadata: body.metadata, payment_method_id: body.payment_method_id, payment_type_id: body.payment_method_id === 'pix' ? 'bank_transfer' : 'credit_card',
        date_of_expiration: new Date(Date.now()+1800000).toISOString(),
        point_of_interaction: { transaction_data: { qr_code: 'SYNTHETIC-PIX-NOT-PAYABLE', qr_code_base64: '' } } });
      gateway.set(id, value); return Response.json(value, { status: 201 });
    }
    const value = gateway.get(url.pathname.split('/').pop()!);
    return value ? Response.json(value) : Response.json({ error: 'not_found' }, { status: 404 });
  };
  const app = express();
  if (uploadDirectory) {
    const { createUploadRouter } = await import('../../src/server/routes/uploads.js');
    app.use('/api', createUploadRouter(uploadDirectory));
    app.use('/uploads', express.static(uploadDirectory));
  }
  app.post('/api/webhooks/mercadopago', express.json(), mercadoPagoWebhook);
  app.use(express.json()); app.use('/api', apiRouter);
  app.use('/api', (_req,res)=>{res.status(404).json({error:'Endpoint não encontrado.'});});
  app.use(express.static('dist'));
  app.get('*', (_req, res) => { res.sendFile(path.resolve('dist/index.html')); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function request(path: string, method = 'GET', body?: any, user = 'a', extraHeaders = {}) {
    const response = await originalFetch(base + path, { method, headers: { 'Content-Type':'application/json', ...(user ? { Authorization: `Bearer ${tokens[user]}` } : {}), ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  async function webhook(id: string, extra: any = {}, valid = true) {
    const requestId = crypto.randomUUID(), ts = String(Math.floor(Date.now()/1000));
    const signature = crypto.createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
    return request('/api/webhooks/mercadopago?data.id=' + id, 'POST', { type: 'payment', data: { id }, ...extra }, '', { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${valid ? signature : '0'.repeat(64)}` });
  }
  async function attempt(id = 'sub_a', company = 'a', paymentId = '900001', changes = {}) {
    await admin.query(`INSERT INTO subscriptions (id,userId,companyId,planId,status,amount,contracted_price,paymentMethod,payment_type,billing_period_days)
      VALUES (?,?,?,'plan_gold_vip','pending',49.90,49.90,'pix','onetime_pix',30)`, [id, company, company]);
    await admin.query("INSERT INTO payment_logs (id,subscriptionId,amount,status,gateway_reference) VALUES (?,?,49.90,'pending',?)", ['seed_'+paymentId,id,paymentId]);
    gateway.set(paymentId, remotePayment(id, { id: paymentId, metadata: { company_id:company,user_id:company }, ...changes }));
    return id;
  }
  async function snapshot() {
    const result: Record<string, any> = {};
    for (const table of ['companies','subscriptions','payment_logs','gateway_payment_state']) {
      result[table] = (await admin.query(`SELECT * FROM ${table} ORDER BY 1`))[0];
    }
    return JSON.parse(JSON.stringify(result));
  }
  async function reset() {
    gatewayFailure=null; responseState='pending'; calls.length=0; gateway.clear();
    for (const table of ['gateway_payment_state','payment_logs','subscriptions','webhook_events','admin_plan_grants']) await admin.query(`DELETE FROM ${table}`);
    await admin.query("UPDATE companies SET planLevel='bronze',access_grant_type='bronze',isSponsored=0,has_used_trial=0,trial_ends_at=NULL");
  }
  return { admin, pool, base, server, tokens, gateway, calls, request, webhook, attempt, snapshot, reset,
    setFailure(value: typeof gatewayFailure) { gatewayFailure=value; }, setResponseState(value: string) { responseState=value; },
    async close() {
      globalThis.fetch=originalFetch;
      await new Promise<void>(resolve => server.close(() => resolve())); await pool.end();
      // Only this PID-scoped, newly created, local fixture database is disposable.
      if (!/^itapoa_payments_test_\d+$/.test(database)) throw new Error('Unsafe cleanup target');
      await admin.query(`DROP DATABASE \`${database}\``); await admin.end();
    },
  };
}

export function remotePayment(subscriptionId: string, changes: Record<string, any> = {}) {
  return { id:'900001', external_reference:subscriptionId, status:'approved', currency_id:'BRL', transaction_amount:49.90,
    transaction_amount_refunded:0, collector_id:777777777, live_mode:false, payment_method_id:'pix', payment_type_id:'bank_transfer',
    date_last_updated:new Date().toISOString(), date_approved:new Date().toISOString(), metadata:{ company_id:'a',user_id:'a' }, ...changes };
}
