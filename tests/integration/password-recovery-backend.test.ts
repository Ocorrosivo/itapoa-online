import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

// Real disposable local MariaDB and HTTP backend. Only email transport is a sink.
let h: Awaited<ReturnType<typeof createPaymentHarness>>;
let Service: typeof import('../../src/server/services/passwordRecoveryService.js').PasswordRecoveryService;
let Auth: typeof import('../../src/server/services/authService.js').AuthService;
let service: InstanceType<typeof Service>;
let messages: { to:string; link:string }[]=[];
const token=()=>new URLSearchParams(new URL(messages[0].link).hash.slice(1)).get('token')!;
before(async()=>{
  h=await createPaymentHarness();
  Service=(await import('../../src/server/services/passwordRecoveryService.js')).PasswordRecoveryService;
  Auth=(await import('../../src/server/services/authService.js')).AuthService;
});
beforeEach(async()=>{
  await h.admin.query('DELETE FROM password_reset_tokens');
  await h.admin.query('DELETE FROM user_auth_state');
  await h.admin.query('UPDATE users SET password=?',[await bcrypt.hash('Fixture-password-123',4)]);
  messages=[];
  service=new Service(h.pool,{configured:()=>true,async send(to,link){messages.push({to,link});return {messageId:'synthetic-local@example.test'};}});
});
after(async()=>{if(h)await h.close();});
async function requestLink(){
  const reply=await service.request('a@example.test','local-fixture');
  for(let i=0;i<100&&!messages.length;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(messages.length,1);
  return reply;
}
test('real SQL token, HTTP reset/login, one-time consumption and session revocation',async()=>{
  await requestLink();const raw=token();
  const [stored]:any=await h.admin.query('SELECT token_hash FROM password_reset_tokens WHERE user_id=?',['a']);
  assert.notEqual(stored[0].token_hash,raw);
  assert.match(stored[0].token_hash,/^[a-f0-9]{64}$/);
  const page=await fetch(h.base+'/redefinir-senha#token='+raw);
  assert.equal(page.status,200);
  assert.equal((await h.admin.query('SELECT used_at FROM password_reset_tokens WHERE user_id=?',['a']))[0][0].used_at,null);
  assert.equal((await h.request('/api/auth/reset-password','POST',{token:raw,password:'New-fixture-password-456'},'')).status,200);
  assert.equal((await h.request('/api/auth/login','POST',{email:'a@example.test',password:'New-fixture-password-456'},'')).status,200);
  assert.equal((await h.request('/api/auth/login','POST',{email:'a@example.test',password:'Fixture-password-123'},'')).status,401);
  assert.equal((await h.request('/api/auth/profile')).status,401,'old version-zero JWT is revoked');
  assert.equal((await h.request('/api/auth/reset-password','POST',{token:raw,password:'Other-fixture-password-789'},'')).status,400);
});
test('real row locks permit exactly one concurrent consumption',async()=>{
  await requestLink();const raw=token();
  const results=await Promise.allSettled([service.reset(raw,'New-fixture-password-456'),service.reset(raw,'Other-fixture-password-789')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await h.admin.query('SELECT version FROM user_auth_state WHERE user_id=?',['a']))[0][0].version,1);
});
test('expired SQL token cannot reset; repeated requests do not duplicate mail',async()=>{
  await requestLink();const raw=token();
  await Promise.all([service.request('a@example.test','second-ip'),service.request('a@example.test','third-ip')]);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.length,1);
  await h.admin.query('UPDATE password_reset_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE user_id=?',['a']);
  await assert.rejects(service.reset(raw,'New-fixture-password-456'),{status:400});
  assert.equal((await new Auth().login('a@example.test','Fixture-password-123')).user.id,'a');
});
test('reset and authenticated password change cannot overwrite each other',async()=>{
  await requestLink();const raw=token();
  const results=await Promise.allSettled([service.reset(raw,'Reset-fixture-password-456'),new Auth().changePassword('a','Fixture-password-123','Changed-fixture-password-789')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await h.admin.query('SELECT version FROM user_auth_state WHERE user_id=?',['a']))[0][0].version,1);
  assert.equal((await h.request('/api/auth/profile')).status,401);
});
