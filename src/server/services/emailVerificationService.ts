import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../mysql.js';
import { env } from '../config/env.js';
import { mailService } from './mailService.js';
import { registrationPlan } from '../../lib/registrationPlan.js';
import type { PoolConnection } from 'mysql2/promise';

export class VerificationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

class SimpleRateLimiter {
  private attempts = new Map<string, { count: number; until: number }>();
  consume(key: string, limit: number, windowMs = 3600000) {
    const now = Date.now();
    for (const [k, item] of this.attempts) {
      if (item.until <= now) this.attempts.delete(k);
    }
    let item = this.attempts.get(key);
    if (!item) {
      if (this.attempts.size >= 10000) throw new VerificationError(429, 'Muitas solicitações. Aguarde antes de tentar novamente.');
      item = { count: 0, until: now + windowMs };
      this.attempts.set(key, item);
    }
    if (++item.count > limit) {
      throw new VerificationError(429, 'Muitas solicitações de confirmação. Aguarde antes de tentar novamente.');
    }
  }
}

export class EmailVerificationService {
  private limiter = new SimpleRateLimiter();

  async initTable() {
    // Runtime must not create/migrate production tables.
    await pool.query('SELECT user_id, token_hash, verified_at FROM user_email_verifications LIMIT 0');
  }
  /**
   * Cria ou substitui um token de confirmação pendente para um usuário recém-cadastrado.
   * Invalida qualquer token anterior para garantir uso único do token mais recente.
   */
  async createVerificationToken(userId: string, email: string, connection?: PoolConnection): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const hash = tokenHash(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await (connection || pool).query(
      `INSERT INTO user_email_verifications (user_id, email, token_hash, expires_at, created_at, verified_at)
       VALUES (?, ?, ?, ?, NOW(), NULL)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         token_hash = VALUES(token_hash),
         expires_at = VALUES(expires_at),
         created_at = NOW(),
         verified_at = NULL`,
      [userId, email.toLowerCase().trim(), hash, expiresAt]
    );

    return rawToken;
  }

  /**
   * Envia ou reenvia o e-mail de confirmação com link seguro.
   */
  async sendToken(email: string, token: string, planInput?: unknown, name?: string): Promise<boolean> {
    const fragment = new URLSearchParams({ token });
    const plan = registrationPlan(planInput);
    if (plan) fragment.set('plan', plan);
    const url = `${env.appUrl.replace(/\/$/, '')}/confirmar-email#${fragment}`;
    return (await mailService.sendVerification(email, url, name)).accepted;
  }

  async sendVerification(userId: string, email: string, ip: string, planInput?: unknown, name?: string): Promise<boolean> {
    this.limiter.consume(`ip:${ip}`, 10);
    this.limiter.consume(`user:${userId}`, 3);

    // A resend must never revoke an already confirmed account.
    if (await this.isUserVerified(userId)) return true;
    // Cooldown de 60 segundos por conta
    const [recent]: any = await pool.query(
      `SELECT created_at FROM user_email_verifications WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND) LIMIT 1`,
      [userId]
    );

    if (recent && recent.length > 0) {
      throw new VerificationError(429, 'Aguarde 1 minuto antes de solicitar um novo e-mail de confirmação.');
    }

    let recipientName = name;
    if (!recipientName) {
      try {
        const [u]: any = await pool.query('SELECT name FROM users WHERE id = ? LIMIT 1', [userId]);
        if (u?.[0]?.name) recipientName = u[0].name;
      } catch {}
    }

    const token = await this.createVerificationToken(userId, email);
    return this.sendToken(email, token, planInput, recipientName);
  }

  /**
   * Verifica se a conta do usuário já foi validada.
   * Usuários antigos sem registro em user_email_verifications são considerados verificados.
   */
  async isUserVerified(userId: string): Promise<boolean> {
    try {
      const [rows]: any = await pool.query(
        'SELECT verified_at FROM user_email_verifications WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (!rows || rows.length === 0) {
        // Usuário legado sem pendência: compatibilidade retroativa
        return true;
      }
      return rows[0].verified_at !== null;
    } catch {
      // A database/configuration failure is not proof of a verified identity.
      throw new VerificationError(503, 'Não foi possível verificar a confirmação do e-mail.');
    }
  }

  /**
   * Valida o token e confirma o e-mail via POST (nunca consome em GET).
   * Tratamento de token inválido, expirado ou já utilizado.
   */
  async verifyToken(rawToken: unknown): Promise<{ userId: string; email: string }> {
    if (typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/i.test(rawToken.trim())) {
      throw new VerificationError(400, 'Link de confirmação inválido ou formato incorreto.');
    }

    const hash = tokenHash(rawToken.trim());
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT user_id, email, expires_at, verified_at
           FROM user_email_verifications
          WHERE token_hash = ?
          LIMIT 1 FOR UPDATE`,
        [hash]
      );

      if (!rows || rows.length === 0) {
        throw new VerificationError(404, 'Link de confirmação inválido ou já utilizado.');
      }

      const record = rows[0];

      if (record.verified_at !== null) {
        await conn.commit();
        return { userId: record.user_id, email: record.email };
      }

      if (new Date(record.expires_at).getTime() < Date.now()) {
        throw new VerificationError(410, 'Este link de confirmação expirou. Solicite um novo link.');
      }

      await conn.query(
        `UPDATE user_email_verifications
            SET verified_at = NOW()
          WHERE user_id = ? AND token_hash = ?`,
        [record.user_id, hash]
      );

      await conn.commit();
      return { userId: record.user_id, email: record.email };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      throw err;
    } finally {
      conn.release();
    }
  }
}

export const emailVerificationService = new EmailVerificationService();
