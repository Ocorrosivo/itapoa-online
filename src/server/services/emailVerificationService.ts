import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../mysql.js';
import { env } from '../config/env.js';
import { mailService } from './mailService.js';

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
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_email_verifications (
          user_id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token_hash CHAR(64) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          verified_at DATETIME NULL,
          INDEX idx_uev_token_hash (token_hash),
          INDEX idx_uev_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch {
      // Falha não-bloqueante se usuário do banco tiver restrição de DDL
    }
  }

  /**
   * Cria ou substitui um token de confirmação pendente para um usuário recém-cadastrado.
   * Invalida qualquer token anterior para garantir uso único do token mais recente.
   */
  async createVerificationToken(userId: string, email: string): Promise<string> {
    await this.initTable();
    const rawToken = randomBytes(32).toString('hex');
    const hash = tokenHash(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await pool.query(
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
  async sendVerification(userId: string, email: string, ip: string): Promise<boolean> {
    this.limiter.consume(`ip:${ip}`, 10);
    this.limiter.consume(`user:${userId}`, 3);

    // Cooldown de 60 segundos por conta
    const [recent]: any = await pool.query(
      `SELECT created_at FROM user_email_verifications WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND) LIMIT 1`,
      [userId]
    ).catch(() => [[]]);

    if (recent && recent.length > 0) {
      throw new VerificationError(429, 'Aguarde 1 minuto antes de solicitar um novo e-mail de confirmação.');
    }

    const token = await this.createVerificationToken(userId, email);
    // Link com fragmento (#token=) para não ser enviado em requisições GET por scanners de antivírus/e-mail
    const verificationUrl = `${env.appUrl.replace(/\/$/, '')}/confirmar-email#token=${token}`;

    const sent = await mailService.sendVerification(email, verificationUrl);
    return sent.accepted;
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
      // Se tabela não existir no banco, não bloqueia o acesso
      return true;
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
