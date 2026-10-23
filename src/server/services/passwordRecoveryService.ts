import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../mysql.js';
import { env } from '../config/env.js';
import { recoveryMailer } from './recoveryMailService.js';

export const RECOVERY_MESSAGE = 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação. Confira também a pasta de spam. O link é válido por 15 minutos.';
const INVALID_LINK = 'Link inválido, expirado ou já utilizado. Solicite uma nova recuperação.';
const UNAVAILABLE = 'Recuperação por e-mail temporariamente indisponível. Entre em contato com o suporte.';
export class RecoveryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const fingerprint = (password: string) => createHmac('sha256', env.jwtSecret).update(password).digest('hex');
export const validNewPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72;

/** Bounded per-process limiter; the database also enforces a per-account cooldown. */
export class RecoveryLimiter {
  private attempts = new Map<string, { count: number; until: number }>();
  consume(key: string, limit: number, now = Date.now()) {
    for (const [k, item] of this.attempts) if (item.until <= now) this.attempts.delete(k);
    let item = this.attempts.get(key);
    if (!item) {
      if (this.attempts.size >= 10000) throw new RecoveryError(429, 'Muitas solicitações. Tente novamente mais tarde.');
      item = { count: 0, until: now + 3600000 };
      this.attempts.set(key, item);
    }
    if (++item.count > limit) throw new RecoveryError(429, 'Muitas solicitações. Tente novamente mais tarde.');
  }
}

export class PasswordRecoveryService {
  private pending = 0;
  private limiter = new RecoveryLimiter();
  constructor(private db = pool, private mailer: {
    configured(): boolean;
    send(to: string, link: string): Promise<{ messageId?: string } | void>;
  } = recoveryMailer) {}

  async available() {
    if (!this.mailer.configured()) return false;
    try {
      await this.db.query('SELECT user_id, token_hash, password_fingerprint, expires_at, created_at, used_at FROM password_reset_tokens LIMIT 0');
      await this.db.query('SELECT user_id, version FROM user_auth_state LIMIT 0');
      return true;
    } catch { return false; }
  }

  async request(emailInput: unknown, ip: string) {
    const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RecoveryError(400, 'Informe um e-mail válido.');
    }
    this.limiter.consume(`ip:${tokenHash(ip)}`, 20);
    this.limiter.consume(`email:${fingerprint(email)}`, 5);
    if (this.pending >= 10) throw new RecoveryError(503, UNAVAILABLE);
    // Reserve synchronously, before the first await, including requests preparing SQL.
    this.pending++;
    let deliveryQueued = false;
    const correlationId = randomUUID();
    try {
    if (!await this.available()) throw new RecoveryError(503, UNAVAILABLE);

    const connection = await this.db.getConnection();
    let mail: { to: string; link: string; userId: string; hash: string } | undefined;
    try {
      await connection.beginTransaction();
      // All password-recovery writers lock user, then token, in that order.
      const [users]: any = await connection.query('SELECT id, email, password FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [email]);
      const user = users[0];
      if (user?.password) {
        const [recent]: any = await connection.query('SELECT user_id FROM password_reset_tokens WHERE user_id = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 60 SECOND)', [user.id]);
        if (!recent.length) {
          const token = randomBytes(32).toString('hex');
          const hash = tokenHash(token);
          await connection.query(`INSERT INTO password_reset_tokens (user_id, token_hash, password_fingerprint, expires_at, created_at, used_at)
            VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE), UTC_TIMESTAMP(3), NULL)
            ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), password_fingerprint = VALUES(password_fingerprint),
              expires_at = VALUES(expires_at), created_at = VALUES(created_at), used_at = NULL`, [user.id, hash, fingerprint(user.password)]);
          const link = new URL('/redefinir-senha', env.appUrl);
          // Fragments do not reach HTTP/access logs or referrers.
          link.hash = `token=${token}`;
          mail = { to: user.email, userId: user.id, link: link.toString(), hash };
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }

    // SMTP is outside the response path: known/unknown accounts receive the same
    // response, without exposing existence through SMTP latency or errors.
    if (mail) {
      deliveryQueued = true;
      const task = mail;
      setImmediate(() => {
        void this.deliver(task, correlationId).finally(() => { this.pending--; });
      });
    }
    console.info('[password-recovery] request_processed', correlationId);
    return { message: RECOVERY_MESSAGE, correlationId };
    } finally {
      if (!deliveryQueued) this.pending--;
    }
  }

  private async deliver(mail: { to: string; link: string; userId: string; hash: string }, correlationId: string) {
    try {
      const result = await this.mailer.send(mail.to, mail.link);
      const messageId = result && result.messageId;
      console.info('[password-recovery] delivery_accepted', JSON.stringify({ correlationId,
        messageId: messageId && /^[a-zA-Z0-9<>@._+\-]{1,180}$/.test(messageId) ? messageId : undefined,
        timestamp: new Date().toISOString() }));
    } catch (error: any) {
      // Never log SMTP errors (can contain credentials/recipient), links or tokens.
      const allowedCodes = ['EAUTH','ECONNECTION','ECONNREFUSED','ECONNRESET','ETIMEDOUT','ESOCKET','EDNS','EENVELOPE','EMESSAGE'];
      console.error('[password-recovery] delivery_failed', JSON.stringify({ correlationId,
        code: allowedCodes.includes(error?.code) ? error.code : 'SMTP_FAILURE',
        responseCode: Number.isInteger(error?.responseCode) && error.responseCode >= 100 && error.responseCode <= 599 ? error.responseCode : undefined,
        timestamp: new Date().toISOString() }));
      try {
        await this.db.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND token_hash = ?', [mail.userId, mail.hash]);
      } catch { console.error('[password-recovery] cleanup_failed', correlationId); }
    }
  }

  async reset(tokenInput: unknown, password: unknown) {
    if (typeof tokenInput !== 'string' || !/^[a-f0-9]{64}$/.test(tokenInput)) throw new RecoveryError(400, INVALID_LINK);
    if (!validNewPassword(password)) throw new RecoveryError(400, 'A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.');
    // Reset remains available for already delivered links even if SMTP goes off.
    const hash = tokenHash(tokenInput);
    const [matches]: any = await this.db.query('SELECT user_id FROM password_reset_tokens WHERE token_hash = ?', [hash]);
    if (!matches.length) throw new RecoveryError(400, INVALID_LINK);
    const userId = matches[0].user_id;
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction();
      const [users]: any = await connection.query('SELECT id, password FROM users WHERE id = ? FOR UPDATE', [userId]);
      const [tokens]: any = await connection.query(`SELECT password_fingerprint, (expires_at > UTC_TIMESTAMP(3) AND used_at IS NULL) AS valid
        FROM password_reset_tokens WHERE user_id = ? AND token_hash = ? FOR UPDATE`, [userId, hash]);
      if (!users[0] || !tokens[0]?.valid || tokens[0].password_fingerprint !== fingerprint(users[0].password)) {
        throw new RecoveryError(400, INVALID_LINK);
      }
      const nextHash = await bcrypt.hash(password, 12);
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [nextHash, userId]);
      await connection.query('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ?', [userId]);
      await connection.query('INSERT INTO user_auth_state (user_id, version) VALUES (?, 1) ON DUPLICATE KEY UPDATE version = version + 1', [userId]);
      await connection.commit();
      return { success: true, message: 'Senha redefinida. Entre novamente com sua nova senha.' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
}

export const passwordRecoveryService = new PasswordRecoveryService();
