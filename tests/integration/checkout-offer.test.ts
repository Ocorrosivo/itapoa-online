import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

let h: Awaited<ReturnType<typeof createPaymentHarness>>;
before(async () => { h = await createPaymentHarness(); });
beforeEach(async () => {
  await h.reset();
  process.env.PAYMENT_TEST_ACCOUNT_EMAIL = 'a@example.test';
  const start = Date.now() - 1000;
  process.env.PAYMENT_TEST_STARTS_AT = new Date(start).toISOString();
  process.env.PAYMENT_TEST_EXPIRES_AT = new Date(start + 86400000).toISOString();
});
after(async () => { if (h) await h.close(); });
const quote = (method: string, user = 'a') => h.request(`/api/payments/quote?planId=plan_gold_vip&method=${method}`, 'GET', undefined, user);
const card = (planId = 'plan_gold_vip', changes = {}) => ({ companyId: 'a', planId,
  requestId: crypto.randomUUID(), couponCode: 'TESTECARTAO2', quotedAmount: 2,
  formData: { token: 'synthetic-sdk-token', payment_method_id: 'visa', installments: 1,
    payer: { email: 'a@example.test', identification: { type: 'CPF', number: '12345678909' } } }, ...changes });
const pix = (changes = {}) => ({ companyId: 'a', planId: 'plan_gold_vip', requestId: crypto.randomUUID(),
  couponCode: 'TESTEPIX1', quotedAmount: 1, ...changes });
const posts = () => h.calls.filter(call => call.method === 'POST');

test('quote authenticates and restricts offers to the database account, not payer identity', async () => {
  assert.equal((await quote('card','')).status,401);
  assert.equal((await quote('wrong')).status,400);
  assert.equal((await quote('card')).body.amount,2);
  assert.equal((await quote('pix')).body.amount,1);
  assert.equal((await quote('card','b')).body.amount,49.9);
  const refused=await h.request('/api/payments/card','POST',card('plan_gold_vip',{companyId:'b'}),'b');
  assert.equal(refused.status,409);assert.equal(posts().length,0);
  assert.equal((await h.snapshot()).subscriptions.length,0);
});

test('expired, future, overlong and disabled windows reject a previously displayed offer without charging full price', async () => {
  const now=Date.now();
  for (const [start,end] of [[now-60000,now-1],[now+10000,now+20000],[now-1000,now+86400000]]) {
    process.env.PAYMENT_TEST_STARTS_AT=new Date(start).toISOString();
    process.env.PAYMENT_TEST_EXPIRES_AT=new Date(end).toISOString();
    assert.equal((await quote('card')).body.amount,49.9);
    assert.equal((await h.request('/api/payments/card','POST',card())).status,409);
  }
  process.env.PAYMENT_TEST_ACCOUNT_EMAIL='';
  assert.equal((await h.request('/api/payments/pix','POST',pix())).status,409);
  assert.equal(posts().length,0);assert.equal((await h.snapshot()).subscriptions.length,0);
});

test('wrong method, unknown coupon, changed price and manipulated amount fail before gateway or reservation', async () => {
  for (const changes of [{couponCode:'TESTEPIX1'},{couponCode:'UNKNOWN'},{quotedAmount:0.01},{couponCode:undefined}]) {
    assert.ok((await h.request('/api/payments/card','POST',card('plan_gold_vip',changes))).status>=400);
  }
  assert.equal((await h.request('/api/payments/pix','POST',pix({quotedAmount:2}))).status,409);
  assert.equal(posts().length,0);assert.equal((await h.snapshot()).subscriptions.length,0);
});

test('account-wide locking permits only one card offer even across different plans', async () => {
  const results=await Promise.all(['plan_gold_vip','plan_diamond_extremo'].map(plan=>h.request('/api/payments/card','POST',card(plan))));
  assert.equal(results.filter(result=>result.status===200).length,1);
  assert.equal(results.filter(result=>result.status===409).length,1);
  assert.equal(posts().length,1);assert.equal(posts()[0].body.transaction_amount,2);
  const snapshot=await h.snapshot();assert.equal(snapshot.subscriptions.length,1);
  assert.equal(Number(snapshot.subscriptions[0].amount),2);
  assert.equal(Number(snapshot.subscriptions[0].contracted_price),2);
  assert.equal(snapshot.subscriptions[0].payment_type,'portal_test_card_v1');
  assert.equal(Number(snapshot.payment_logs[0].amount),2);
  const [plans]:any=await h.admin.query('SELECT price FROM plans WHERE id=?',['plan_gold_vip']);
  assert.equal(Number(plans[0].price),49.9);
  assert.equal((await quote('card')).body.couponCode,null);
  assert.match((await quote('card')).body.notice,/reservado/);
});

test('discounted card resumes its frozen amount; duplicate verified notifications never duplicate activation', async () => {
  const created=await h.request('/api/payments/card','POST',card());assert.equal(created.status,200);
  process.env.PAYMENT_TEST_EXPIRES_AT=new Date(Date.now()-1).toISOString();
  const active=await h.request('/api/payments/attempt/active?companyId=a&planId=plan_gold_vip');
  assert.equal(active.body.amount,2);
  const retried=await h.request('/api/payments/card','POST',card());
  assert.equal(retried.body.subscriptionId,created.body.subscriptionId);assert.equal(posts().length,1);
  const payment=[...h.gateway.values()][0];payment.status='approved';
  payment.date_last_updated=new Date(Date.now()+1000).toISOString();
  assert.equal((await h.webhook(payment.id)).status,200);
  const settled=await h.snapshot();assert.equal(settled.subscriptions[0].status,'active');
  assert.equal((await h.webhook(payment.id)).status,200);assert.deepEqual(await h.snapshot(),settled);
});

test('Pix uses one real contracted price, resumes after reload and rejects a mismatched paid amount', async () => {
  const first=await h.request('/api/payments/pix','POST',pix());assert.equal(first.status,200);
  assert.equal(first.body.amount,1);assert.equal(posts()[0].body.transaction_amount,1);
  process.env.PAYMENT_TEST_EXPIRES_AT=new Date(Date.now()-1).toISOString();
  const resume=await h.request('/api/payments/pix','POST',pix());assert.equal(resume.body.paymentId,first.body.paymentId);
  assert.equal(resume.body.amount,1);assert.equal(posts().length,1);
  const payment=h.gateway.get(first.body.paymentId);payment.status='approved';payment.transaction_amount=2;
  payment.date_last_updated=new Date(Date.now()+1000).toISOString();
  assert.equal((await h.webhook(payment.id)).status,422);
  assert.equal((await h.snapshot()).subscriptions[0].status,'pending');
  payment.transaction_amount=1;assert.equal((await h.webhook(payment.id)).status,200);
  assert.equal((await h.snapshot()).subscriptions[0].status,'active');
});

test('unknown card outcome reserves the promotion; a new plan cannot create another discounted charge', async () => {
  h.setFailure('timeout');assert.equal((await h.request('/api/payments/card','POST',card())).body.status,'unknown');
  assert.equal((await h.request('/api/payments/card','POST',card('plan_diamond_extremo'))).status,409);
  assert.equal(posts().length,1);assert.equal((await h.snapshot()).subscriptions.length,1);
});

test('card and Pix promotions are independent and survive ordinary plan settlement checks', async () => {
  assert.equal((await h.request('/api/payments/card','POST',card())).status,200);
  assert.equal((await h.request('/api/payments/pix','POST',pix({planId:'plan_diamond_extremo'}))).status,200);
  assert.deepEqual(posts().map(call=>call.body.transaction_amount),[2,1]);
  assert.equal((await quote('card')).body.couponCode,null);
  assert.equal((await quote('pix')).body.couponCode,null);
});
