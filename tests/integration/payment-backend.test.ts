import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

let h: Awaited<ReturnType<typeof createPaymentHarness>>;
before(async () => { h = await createPaymentHarness(); });
beforeEach(async () => { await h.reset(); });
after(async () => { if (h) await h.close(); });
const reconcile = (id = 'sub_a', user = 'a') => h.request(`/api/payments/subscription/${id}/reconcile`, 'POST', {}, user);

test('signed webhook approves via real routes and DB; duplicate never extends expiry', async () => {
  await h.attempt();
  assert.equal((await h.webhook('900001')).status, 200);
  const first = await h.snapshot();
  assert.equal(first.subscriptions[0].status, 'active'); assert.equal(first.companies[0].planLevel, 'gold_vip');
  assert.equal(first.gateway_payment_state.length, 1); assert.equal(first.payment_logs.length, 1);
  assert.equal(first.payment_logs[0].status, 'paid');
  assert.equal((await h.webhook('900001')).status, 200);
  assert.deepEqual(await h.snapshot(), first);
  assert.equal((await reconcile()).body.reconciled, true);
  assert.deepEqual(await h.snapshot(), first);
});
test('invalid, missing, stale and conflicting signatures do not call gateway or mutate payments', async () => {
  await h.attempt(); const before = await h.snapshot();
  assert.equal((await h.webhook('900001', {}, false)).status, 401);
  assert.equal((await h.request('/api/webhooks/mercadopago?data.id=900001','POST',{type:'payment'},'')).status,401);
  assert.equal((await h.webhook('900001', { data:{id:'900002'} })).status,400);
  const { paymentService } = await import('../../src/server/services/paymentService.js');
  assert.equal(paymentService.verifyWebhookSignature('ts=1000000000,v1='+'0'.repeat(64),'req','900001'),false);
  assert.equal(h.calls.length,0); assert.deepEqual(await h.snapshot(),before);
});
test('signed unrelated topic is ignored without writes or gateway calls', async () => {
  await h.attempt(); const before=await h.snapshot();
  const result=await h.webhook('900001',{type:'merchant_order'});
  assert.equal(result.status,200); assert.equal(result.body.ignored,true);
  assert.equal(h.calls.length,0); assert.deepEqual(await h.snapshot(),before);
});
for (const state of ['pending','in_process','rejected','cancelled','authorized']) test(`${state} never grants paid access`, async () => {
  await h.attempt('sub_a','a','900001',{status:state});
  assert.equal((await h.webhook('900001')).status,200);
  const result=await reconcile(); assert.equal(result.body.reconciled,false);
  const snapshot=await h.snapshot(); assert.equal(snapshot.companies[0].planLevel,'bronze');
  assert.notEqual(snapshot.subscriptions[0].status,'active');
});
for (const [name, changes] of Object.entries({
  cent:{transaction_amount:49.91}, wrongAmount:{transaction_amount:0.01}, missingAmount:{transaction_amount:null},
  currency:{currency_id:'USD'}, missingCurrency:{currency_id:null}, missingReference:{external_reference:null},
  wrongReference:{external_reference:'sub_b'}, collector:{collector_id:888888888}, live:{live_mode:true},
  missingLive:{live_mode:null}, wrongCompany:{metadata:{company_id:'b',user_id:'a'}},
  wrongUser:{metadata:{company_id:'a',user_id:'b'}}, wrongPaymentId:{id:'900002'},
  wrongMethod:{payment_method_id:'visa'}, invalidDate:{date_last_updated:'bad'},
})) test(`mismatch ${name} is rejected without changing the database`, async () => {
  await h.attempt('sub_a','a','900001',changes); const before=await h.snapshot();
  const result=await reconcile(); assert.equal(result.status,422); assert.deepEqual(await h.snapshot(),before);
});
test('gateway payment cannot be rebound to a different company via external_reference', async () => {
  await h.attempt(); await h.attempt('sub_b','b','900002');
  h.gateway.get('900001').external_reference='sub_b'; h.gateway.get('900001').metadata={company_id:'b',user_id:'b'};
  const before=await h.snapshot(); assert.equal((await h.webhook('900001')).status,422); assert.deepEqual(await h.snapshot(),before);
});
test('auth/IDOR/admin controls run on server against real user memberships', async () => {
  await h.attempt('sub_b','b'); const before=await h.snapshot();
  assert.equal((await reconcile('sub_b','')).status,401);
  assert.equal((await reconcile('sub_b','a')).status,403);
  assert.equal((await h.request('/api/payments/subscription/sub_b/status','GET',undefined,'a')).status,403);
  assert.equal((await h.request('/api/payments/pix/active?companyId=b&planId=plan_gold_vip','GET',undefined,'empty')).status,403);
  assert.equal((await h.request('/api/admin/plans','GET',undefined,'a')).status,403);
  assert.equal(h.calls.length,0); assert.deepEqual(await h.snapshot(),before);
});
test('simultaneous webhook and reconcile activate exactly once and preserve expiry', async () => {
  await h.attempt();
  const result=await Promise.all(Array.from({length:12},(_,index)=>index%2?h.webhook('900001'):reconcile()));
  assert.ok(result.every(r=>r.status===200)); const snapshot=await h.snapshot();
  assert.equal(snapshot.gateway_payment_state.length,1); assert.equal(snapshot.payment_logs.length,1);
  assert.equal(snapshot.subscriptions[0].status,'active');
  await h.webhook('900001'); assert.deepEqual(await h.snapshot(),snapshot);
});
for (const failure of ['timeout','http'] as const) test(`gateway ${failure} is retryable, not acknowledged as success`, async () => {
  await h.attempt(); const before=await h.snapshot(); h.setFailure(failure);
  assert.equal((await h.webhook('900001')).status,503);
  assert.equal((await reconcile()).status,502); assert.deepEqual(await h.snapshot(),before);
  h.setFailure(null); assert.equal((await h.webhook('900001')).status,200);
  assert.equal((await h.snapshot()).subscriptions[0].status,'active');
});
test('SQL failure rolls receipt, payment log and activation back together', async () => {
  await h.attempt(); const before=await h.snapshot();
  await h.admin.query("CREATE TRIGGER fail_company BEFORE UPDATE ON companies FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic transaction failure'");
  try { assert.equal((await h.webhook('900001')).status,503); assert.deepEqual(await h.snapshot(),before); }
  finally { await h.admin.query('DROP TRIGGER fail_company'); }
  assert.equal((await h.webhook('900001')).status,200);
});
test('late pending cannot regress approval; refund revokes; late approval cannot undo refund', async () => {
  await h.attempt(); const payment=h.gateway.get('900001');
  const original=payment.date_last_updated; await h.webhook('900001');
  const activated=await h.snapshot();
  payment.status='pending'; payment.date_last_updated=new Date(Date.parse(original)+1000).toISOString();
  await h.webhook('900001'); assert.deepEqual(await h.snapshot(),activated);
  payment.status='refunded'; payment.date_last_updated=new Date(Date.parse(original)+2000).toISOString();
  await h.webhook('900001'); const refunded=await h.snapshot();
  assert.equal(refunded.subscriptions[0].status,'canceled'); assert.equal(refunded.companies[0].planLevel,'bronze');
  payment.status='approved'; payment.date_last_updated=new Date(Date.parse(original)+3000).toISOString();
  await h.webhook('900001'); assert.deepEqual(await h.snapshot(),refunded);
});
test('late approval uses approval date, not delivery time; chargeback revokes access', async () => {
  await h.attempt('sub_a','a','900001',{date_approved:new Date(Date.now()-40*86400000).toISOString()});
  await h.webhook('900001'); assert.equal((await h.snapshot()).companies[0].planLevel,'bronze');
  h.gateway.get('900001').status='charged_back'; h.gateway.get('900001').date_last_updated=new Date(Date.now()+1000).toISOString();
  await h.webhook('900001'); assert.equal((await h.snapshot()).gateway_payment_state[0].remote_status,'charged_back');
});
test('refund preserves independent active entitlement/admin grant', async () => {
  await h.attempt(); await h.webhook('900001');
  await h.admin.query("INSERT INTO admin_plan_grants(id,company_id,granted_plan,start_date,end_date,reason,status) VALUES('grant_a','a','diamond_extremo',DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY),'synthetic','active')");
  h.gateway.get('900001').status='refunded'; h.gateway.get('900001').date_last_updated=new Date(Date.now()+1000).toISOString();
  await h.webhook('900001'); const state=await h.snapshot();
  assert.equal(state.companies[0].planLevel,'diamond_extremo'); assert.equal(state.companies[0].access_grant_type,'admin_grant');
});
test('card/Pix creation is serialized between tabs; approval response itself grants nothing', async () => {
  const input={companyId:'a',planId:'plan_gold_vip',requestId:crypto.randomUUID(),formData:{token:'synthetic-sdk-token',payment_method_id:'visa',installments:1,payer:{email:'a@example.test',identification:{type:'CPF',number:'12345678909'}}}};
  h.setResponseState('approved');
  const cards=await Promise.all([h.request('/api/payments/card','POST',input),h.request('/api/payments/card','POST',{...input,requestId:crypto.randomUUID()})]);
  assert.ok(cards.every(r=>r.status===200)); assert.equal(cards[0].body.subscriptionId,cards[1].body.subscriptionId);
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  assert.equal((await h.snapshot()).companies[0].planLevel,'bronze');
  assert.equal((await reconcile(cards[0].body.subscriptionId)).body.status,'active');
  await h.reset(); h.setResponseState('pending');
  const pixBody={companyId:'a',planId:'plan_gold_vip',payerEmail:'a@example.test',requestId:crypto.randomUUID()};
  const pix=await Promise.all([h.request('/api/payments/pix','POST',pixBody),h.request('/api/payments/pix','POST',{...pixBody,requestId:crypto.randomUUID()})]);
  assert.ok(pix.every(r=>r.status===200)); assert.equal(pix[0].body.subscriptionId,pix[1].body.subscriptionId);
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  assert.equal(pix[0].body.qrCode,'SYNTHETIC-PIX-NOT-PAYABLE');
});

test('unknown outcome is searched read-only and never emits another payment', async () => {
  await h.attempt(); await h.admin.query('DELETE FROM payment_logs');
  const resumed=await h.request('/api/payments/attempt/active?companyId=a&planId=plan_gold_vip');
  assert.equal(resumed.status,200);assert.equal(resumed.body.subscriptionId,'sub_a');assert.equal(resumed.body.paymentMethod,'pix');
  const result=await reconcile(); assert.equal(result.status,200); assert.equal(result.body.status,'active');
  assert.ok(h.calls.some(call=>call.path==='/v1/payments/search'));
  assert.equal(h.calls.filter(call=>call.method==='POST').length,0);
});
test('approved plan blocks a new charge even if another tab submits a different request ID later', async () => {
  await h.attempt();await h.webhook('900001');const before=await h.snapshot();
  const result=await h.request('/api/payments/pix','POST',{companyId:'a',planId:'plan_gold_vip',payerEmail:'a@example.test',requestId:crypto.randomUUID()});
  assert.equal(result.status,409);assert.deepEqual(await h.snapshot(),before);
  assert.equal(h.calls.filter(call=>call.method==='POST').length,0);
});
test('partial refund suspends access; newer approval never undoes it automatically', async () => {
  await h.attempt();await h.webhook('900001');
  h.gateway.get('900001').transaction_amount_refunded=10;
  h.gateway.get('900001').date_last_updated=new Date(Date.now()+1000).toISOString();
  await h.webhook('900001');const snapshot=await h.snapshot();
  assert.equal(snapshot.companies[0].planLevel,'bronze');assert.equal(snapshot.gateway_payment_state[0].remote_status,'refunded');
});
test('expired paid cache is not treated as an admin grant', async () => {
  await h.attempt();await h.webhook('900001');
  await h.admin.query("UPDATE subscriptions SET nextBillingDate=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE id='sub_a'");
  const result=await h.request('/api/companies/a/entitlements');
  assert.equal(result.status,200);assert.equal(result.body.planTier,'bronze');
});
test('settlement migration can be reapplied without changing paid records', async () => {
  await h.attempt();await h.webhook('900001');const before=await h.snapshot();
  const {sqlScript}=await import('../helpers/paymentHarness.js');
  await sqlScript(h.admin,await fs.readFile('database/migrations/20261021_payment_settlement.sql','utf8'));
  assert.deepEqual(await h.snapshot(),before);
});
test('frontend cannot set subscription active or use the non-idempotent legacy redirect', async () => {
  await h.attempt();const before=await h.snapshot();
  assert.equal((await h.request('/api/subscriptions/sub_a','PUT',{status:'active'})).status,404);
  assert.equal((await h.request('/api/payments/checkout','POST',{companyId:'a',planId:'plan_gold_vip'})).status,410);
  assert.deepEqual(await h.snapshot(),before);
});
for (const column of ['is_active','allow_new_subscriptions']) test(`disabled plan flag ${column} prevents a gateway charge`, async () => {
  await h.admin.query(`UPDATE plans SET ${column}=0 WHERE id='plan_gold_vip'`);
  try {
    const before=await h.snapshot();
    const result=await h.request('/api/payments/pix','POST',{companyId:'a',planId:'plan_gold_vip',payerEmail:'a@example.test',requestId:crypto.randomUUID()});
    assert.equal(result.status,409);assert.deepEqual(await h.snapshot(),before);assert.equal(h.calls.length,0);
  } finally { await h.admin.query(`UPDATE plans SET ${column}=1 WHERE id='plan_gold_vip'`); }
});
