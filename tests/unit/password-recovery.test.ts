import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/server/services/authService.js';
import { UserRepository } from '../../src/server/repositories/baseRepository.js';
import { PasswordRecoveryService, RecoveryLimiter, tokenHash, validNewPassword } from '../../src/server/services/passwordRecoveryService.js';
import { recoveryMailConfig, recoveryTransport } from '../../src/server/services/recoveryMailService.js';
import { pool } from '../../src/server/mysql.js';
import { sessionVersion } from '../../src/server/services/sessionVersion.js';
import { requireAuth, optionalAuth, signToken } from '../../src/server/middleware/auth.js';

after(async () => { await pool.end(); });
const tick = () => new Promise(resolve => setImmediate(resolve));

/** SQL-shaped transactional fake. No production database/SMTP is contacted. */
async function fixture() {
  const state = {
    user: { id: 'test-user', email: 'recovery@example.test', password: await bcrypt.hash('Old-password-123', 4) },
    token: undefined as any, version: 0, schema: true, smtp: true, failMail: false,
    mail: [] as { to: string; link: string }[], statements: [] as { sql: string; values: any[] }[],
  };
  let tail = Promise.resolve();
  const query = async (sql: string, values: any[] = []) => {
    state.statements.push({ sql, values });
    if (!state.schema && /password_reset_tokens|user_auth_state/.test(sql)) throw Object.assign(new Error('missing'), { code: 'ER_NO_SUCH_TABLE' });
    if (sql.includes('LIMIT 0')) return [[]];
    if (sql.startsWith('SELECT version')) return [[{ version: state.version }]];
    if (sql.startsWith('SELECT id, email, password')) return [[...(values[0] === state.user.email ? [state.user] : [])]];
    if (sql.startsWith('SELECT id, password')) return [[state.user]];
    if (sql.startsWith('SELECT user_id FROM password_reset_tokens') && sql.includes('created_at')) return [[...(state.token?.recent ? [{ user_id: state.user.id }] : [])]];
    if (sql.startsWith('SELECT user_id FROM password_reset_tokens')) return [[...(state.token?.hash === values[0] ? [{ user_id: state.user.id }] : [])]];
    if (sql.startsWith('SELECT password_fingerprint')) return [[...(state.token?.hash === values[1] ? [{ password_fingerprint: state.token.fingerprint, valid: !state.token.expired && !state.token.used }] : [])]];
    if (sql.startsWith('INSERT INTO password_reset_tokens')) state.token = { hash: values[1], fingerprint: values[2], used: false, expired: false, recent: true };
    if (sql.startsWith('UPDATE users SET password')) state.user.password = values[0];
    if (sql.startsWith('UPDATE password_reset_tokens')) state.token.used = true;
    if (sql.startsWith('INSERT INTO user_auth_state')) state.version++;
    if (sql.startsWith('DELETE FROM password_reset_tokens') && state.token?.hash === values[1]) state.token = undefined;
    return [[]];
  };
  const db = { query, async getConnection() {
    let unlock: () => void;
    let snapshot: any;
    return {
      async beginTransaction() {
        const previous = tail;
        tail = new Promise<void>(resolve => { unlock = resolve; });
        await previous;
        snapshot = { password: state.user.password, token: state.token && { ...state.token }, version: state.version };
      },
      query,
      async commit() {},
      async rollback() { state.user.password = snapshot.password; state.token = snapshot.token; state.version = snapshot.version; },
      release() { unlock(); },
    };
  } };
  const mailer = { configured: () => state.smtp, async send(to: string, link: string) {
    if (state.failMail) throw new Error('must-not-log SMTP recipient or secrets');
    state.mail.push({ to, link });
  } };
  return { state, db, service: new PasswordRecoveryService(db as any, mailer) };
}
const getToken = (link: string) => new URLSearchParams(new URL(link).hash.slice(1)).get('token')!;

test('known/unknown accounts get identical responses; only token hash is persisted', async () => {
  const { state, service } = await fixture();
  const unknown = await service.request('unknown@example.test', '127.0.0.1');
  const known = await service.request(' RECOVERY@example.test ', '127.0.0.1');
  assert.equal(known.message, unknown.message);
  assert.match(known.correlationId, /^[a-f0-9-]{36}$/);
  assert.match(unknown.correlationId, /^[a-f0-9-]{36}$/);
  assert.ok(!JSON.stringify(known).includes(state.user.email));
  await tick();
  assert.equal(state.mail.length, 1);
  const link = new URL(state.mail[0].link);
  assert.equal(link.pathname, '/redefinir-senha');
  assert.equal(link.search, '');
  const raw = getToken(link.toString());
  assert.match(raw, /^[a-f0-9]{64}$/);
  assert.equal(state.token.hash, tokenHash(raw));
  assert.ok(!JSON.stringify(state.statements).includes(raw));
  assert.ok(state.statements.some(s => s.sql.includes('INTERVAL 15 MINUTE')));
  await service.request(state.user.email, '127.0.0.1');
  await tick();
  assert.equal(state.mail.length, 1, 'cooldown prevents duplicate mail');
});

test('missing SMTP/schema disables only recovery and does not claim delivery', async () => {
  const { state, service } = await fixture();
  state.smtp = false;
  assert.equal(await service.available(), false);
  await assert.rejects(service.request(state.user.email, '127.0.0.1'), { status: 503 });
  state.smtp = true; state.schema = false;
  assert.equal(await service.available(), false);
  await assert.rejects(service.request('unknown@example.test', '127.0.0.1'), { status: 503 });
  assert.equal(state.mail.length, 0);
});

test('reset hashes password, invalidates old password/session and is atomic single-use', async () => {
  const { state, db, service } = await fixture();
  await service.request(state.user.email, '127.0.0.1'); await tick();
  const token = getToken(state.mail[0].link);
  const outcomes = await Promise.allSettled([service.reset(token, 'New-password-456'), service.reset(token, 'Attacker-password-456')]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(state.version, 1);
  assert.equal(await bcrypt.compare('Old-password-123', state.user.password), false);
  assert.equal(await bcrypt.compare('New-password-456', state.user.password), true);
  await assert.rejects(service.reset(token, 'Third-password-789'), { status: 400 });
  // Exercise the real auth middleware, not just a version assertion.
  const query = pool.query;
  (pool as any).query = async (sql: string, values: any[]) => sql.startsWith('SELECT version') ? db.query(sql, values) : [[{ ...state.user, name: 'Test', role: 'user', city: null }]];
  try {
    for (const av of [undefined, 0, 1]) {
      const req: any = { headers: { authorization: `Bearer ${signToken({ id: state.user.id, email: state.user.email, role: 'user', av })}` } };
      let status = 0, passed = false;
      const res: any = { status(code: number) { status = code; return this; }, json() { return this; } };
      await requireAuth(req, res, () => { passed = true; });
      assert.equal(passed, av === 1);
      if (av !== 1) assert.equal(status, 401);
      delete req.user;
      await optionalAuth(req, res, () => {});
      assert.equal(Boolean(req.user), av === 1);
    }
  } finally { pool.query = query; }
});

test('expired, malformed, unknown and password-invalidated tokens cannot change a password', async () => {
  const { state, service } = await fixture();
  await service.request(state.user.email, '127.0.0.1'); await tick();
  const token = getToken(state.mail[0].link), old = state.user.password;
  await assert.rejects(service.reset('bad', 'New-password-456'), { status: 400 });
  await assert.rejects(service.reset('f'.repeat(64), 'New-password-456'), { status: 400 });
  state.token.expired = true;
  await assert.rejects(service.reset(token, 'New-password-456'), { status: 400 });
  assert.equal(state.user.password, old);
  state.token.expired = false;
  state.user.password = await bcrypt.hash('Changed-elsewhere-123', 4);
  await assert.rejects(service.reset(token, 'New-password-456'), { status: 400 });
  assert.equal(state.version, 0);
});

test('SMTP failure removes undelivered token without leaking server error', async () => {
  const { state, service } = await fixture();
  state.failMail = true;
  const original = console.error, logs: any[] = [];
  console.error = (...args: any[]) => { logs.push(args); };
  try {
    const reply = await service.request(state.user.email, '127.0.0.1');
    assert.match(reply.message, /^Se houver/);
    await tick(); await tick();
    assert.equal(state.token, undefined);
    assert.equal(state.mail.length, 0);
    assert.ok(!JSON.stringify(logs).includes('must-not-log'));
    assert.ok(!JSON.stringify(logs).includes(state.user.email));
    assert.ok(JSON.stringify(logs).includes(reply.correlationId));
  } finally { console.error = original; }
});

test('SMTP capacity is reserved before awaits and released for unknown accounts', async () => {
  const {service}=await fixture();
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  service.available=async()=>{await gate;return true;};
  const pending=Promise.allSettled(Array.from({length:20},(_,i)=>service.request(`unknown${i}@example.test`,`ip${i}`)));
  release();
  const results=await pending;
  assert.equal(results.filter(r=>r.status==='fulfilled').length,10);
  assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===503).length,10);
  await service.request('another@example.test','another-ip');
});

test('session lookup failure never restores a revoked version-zero JWT', async () => {
  const query=pool.query;
  (pool as any).query=async()=>{throw Object.assign(new Error('private SQL must not leak'),{code:'ER_TABLEACCESS_DENIED_ERROR'});};
  try {
    await assert.rejects(sessionVersion('test-user'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
    let status=0,nextCalled=false;
    const req:any={headers:{authorization:'Bearer '+signToken({id:'test-user',email:'test@example.test',role:'advertiser',av:0})}};
    const res:any={status(value:number){status=value;return this;},json(){return this;}};
    await requireAuth(req,res,()=>{nextCalled=true;});
    assert.equal(status,401);assert.equal(nextCalled,false);assert.equal(req.user,undefined);
  }finally{pool.query=query;}
});

test('password/email validation, rate limit and legacy sessions', async () => {
  assert.equal(validNewPassword('short'), false);
  assert.equal(validNewPassword('á'.repeat(37)), false);
  assert.equal(validNewPassword('á'.repeat(36)), true);
  const limiter = new RecoveryLimiter();
  for (let i = 0; i < 5; i++) limiter.consume('test', 5, 0);
  assert.throws(() => limiter.consume('test', 5, 1), { status: 429 });
  limiter.consume('test', 5, 3600001);
  const { service, state } = await fixture();
  for (const email of ['', 'not-an-email', 'x'.repeat(255) + '@example.test']) await assert.rejects(service.request(email, 'ip'), { status: 400 });
  await service.request(state.user.email, 'ip'); await tick();
  await assert.rejects(service.reset(getToken(state.mail[0].link), 'weak'), { status: 400 });
  const query = pool.query;
  (pool as any).query = async () => { throw Object.assign(new Error('missing'), { code: 'ER_NO_SUCH_TABLE' }); };
  try { await assert.rejects(sessionVersion('legacy-user'), { code: 'ER_NO_SUCH_TABLE' }); } finally { pool.query = query; }
});

test('SMTP validates config and uses verified TLS with no debug/credentials output', () => {
  const names = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_PASS', 'SMTP_FROM', 'EMAIL_FROM'];
  const saved = Object.fromEntries(names.map(n => [n, process.env[n]]));
  const original = nodemailer.createTransport;
  let options: any;
  (nodemailer as any).createTransport = (config: any) => { options = config; return {}; };
  try {
    for (const name of names) delete process.env[name];
    assert.equal(recoveryMailConfig(), null);
    Object.assign(process.env, { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '465', SMTP_USER: 'sender@example.test', SMTP_PASSWORD: 'test-only', SMTP_FROM: 'sender@example.test' });
    recoveryTransport();
    assert.equal(options.secure, true); assert.equal(options.tls.rejectUnauthorized, true); assert.equal(options.logger, false);
    process.env.SMTP_PORT = '587'; recoveryTransport();
    assert.equal(options.secure, false); assert.equal(options.requireTLS, true);
    process.env.SMTP_PORT = '25'; assert.equal(recoveryMailConfig(), null);
  } finally {
    nodemailer.createTransport = original;
    for (const name of names) if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
  }
});

test('login does not grant a reset session version to an old password snapshot', async () => {
  const query = pool.query, find = UserRepository.findRawBy;
  const hash = await bcrypt.hash('Old-password-123', 4);
  let changed = false;
  const user = { id: 'test-user', email: 'recovery@example.test', password: hash, name: 'Teste', role: 'user' };
  (pool as any).query = async () => [[{ version: changed ? 1 : 0 }]];
  (UserRepository as any).findRawBy = async (key: string) => key === 'id' && changed ? { ...user, password: 'password-was-reset-concurrently' } : { ...user };
  try {
    const auth = new AuthService();
    const result = await auth.login(user.email, 'Old-password-123');
    assert.equal((jwt.decode(result.token) as any).av, 0);
    changed = true;
    await assert.rejects(auth.login(user.email, 'Old-password-123'), { status: 401 });
  } finally { pool.query = query; UserRepository.findRawBy = find; }
});

test('a new link supersedes the previous one; database failure rolls the reset back', async () => {
  const { state, db, service } = await fixture();
  await service.request(state.user.email, 'ip'); await tick();
  const first = getToken(state.mail[0].link);
  state.token.recent = false;
  await service.request(state.user.email, 'ip'); await tick();
  const second = getToken(state.mail[1].link);
  assert.notEqual(first, second);
  await assert.rejects(service.reset(first, 'New-password-456'), { status: 400 });
  const connect = db.getConnection;
  db.getConnection = async () => {
    const connection = await connect();
    const query = connection.query;
    connection.query = async (sql: string, values: any[]) => {
      if (sql.startsWith('INSERT INTO user_auth_state')) throw new Error('simulated transactional failure');
      return query(sql, values);
    };
    return connection;
  };
  const old = state.user.password;
  await assert.rejects(service.reset(second, 'New-password-456'), /simulated transactional failure/);
  assert.equal(state.user.password, old);
  assert.equal(state.token.used, false);
  assert.equal(state.version, 0);
});
