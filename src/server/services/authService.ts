/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Authentication service: email + password against MySQL, verified with bcrypt.
 */

import bcrypt from 'bcryptjs';
import { pool } from '../mysql.js';
import { UserRepository } from '../repositories/baseRepository.js';
import { signToken, AuthenticatedUser } from '../middleware/auth.js';
import { sessionVersion } from './sessionVersion.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/** Roles a self-service registration may claim. Privileged roles are never self-assigned. */
const SELF_SERVICE_ROLES = ['advertiser', 'user'];

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AuthResult {
  token: string;
  user: AuthenticatedUser;
}

export const MASTER_ADMIN_EMAIL = 'suprememidias.ok@gmail.com';

const normalizeEmail = (email: unknown): string =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const toPublicUser = (row: Record<string, any>): AuthenticatedUser => {
  const email = String(row.email || '').toLowerCase().trim();
  const isMaster = email === MASTER_ADMIN_EMAIL.toLowerCase();
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: isMaster ? 'admin_master' : row.role,
    city: row.city ?? null
  };
};

export class AuthService {
  /**
   * Validates credentials against the users table.
   * Any failure yields the same generic 401 so the response cannot be used to
   * enumerate registered e-mails.
   */
  async login(emailInput: unknown, passwordInput: unknown): Promise<AuthResult> {
    const email = normalizeEmail(emailInput);
    const password = typeof passwordInput === 'string' ? passwordInput : '';

    if (!email || !password) {
      throw new AuthError(400, 'E-mail e senha são obrigatórios.');
    }

    const row = await UserRepository.findRawBy('email', email);
    // Capture the session version BEFORE checking the password. A simultaneous
    // reset must never mint a new-version token from the old password snapshot.
    const version = row ? await sessionVersion(String(row.id)) : 0;

    // Compare against a dummy hash when the user is absent to keep the timing
    // profile of both branches similar.
    const storedHash = row?.password || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const passwordMatches = await bcrypt.compare(password, storedHash);

    if (!row || !row.password || !passwordMatches) {
      throw new AuthError(401, 'Credenciais inválidas.');
    }
    const fresh = await UserRepository.findRawBy('id', String(row.id));
    if (!fresh || fresh.password !== row.password) throw new AuthError(401, 'Credenciais inválidas.');

    const user = toPublicUser(row);
    return { token: signToken({ id: user.id, email: user.email, role: user.role, av: version }), user };
  }

  /**
   * Creates an account. The role is clamped to the self-service set, so a
   * crafted payload cannot register an administrator.
   */
  async register(payload: Record<string, any>): Promise<AuthResult> {
    const email = normalizeEmail(payload.email);
    const password = typeof payload.password === 'string' ? payload.password : '';
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';

    if (!name || !email) {
      throw new AuthError(400, 'Nome e e-mail são obrigatórios.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(400, `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const existing = await UserRepository.findRawBy('email', email);
    if (existing) {
      throw new AuthError(409, 'E-mail já cadastrado.');
    }

    const isMaster = email === MASTER_ADMIN_EMAIL.toLowerCase();
    const requestedRole = typeof payload.role === 'string' ? payload.role : 'advertiser';
    const role = isMaster ? 'admin_master' : (SELF_SERVICE_ROLES.includes(requestedRole) ? requestedRole : 'advertiser');

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await pool.query(
      `INSERT INTO users (id, name, email, password, role, phone, city)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        email,
        hashedPassword,
        role,
        typeof payload.phone === 'string' ? payload.phone : null,
        typeof payload.city === 'string' ? payload.city : null
      ]
    );

    // Inicializar token de confirmação e enviar e-mail em background
    const { emailVerificationService } = await import('./emailVerificationService.js');
    const clientIp = typeof payload.ip === 'string' ? payload.ip : '127.0.0.1';
    emailVerificationService.sendVerification(id, email, clientIp).catch((err) => {
      console.warn('[auth] Could not send initial verification email:', err?.message || err);
    });

    const user: AuthenticatedUser = {
      id,
      name,
      email,
      role,
      city: typeof payload.city === 'string' ? payload.city : null,
      emailVerified: false
    };

    return { token: signToken({ id, email, role }), user };
  }

  /** Returns the authenticated user's own profile. */
  async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new AuthError(404, 'Usuário não encontrado.');
    return user;
  }

  /** Updates the caller's own profile. Role and e-mail are not editable here. */
  async updateProfile(userId: string, payload: Record<string, any>) {
    const updates: Record<string, any> = {};
    for (const field of ['name', 'phone', 'city', 'avatarUrl'] as const) {
      if (typeof payload[field] === 'string') updates[field] = payload[field];
    }
    if (Object.keys(updates).length === 0) {
      throw new AuthError(400, 'Nenhum campo válido informado.');
    }
    return UserRepository.update(userId, updates);
  }

  /**
   * Changes the caller's password. Requires the current password, so a stolen
   * session alone is not enough to take over the account.
   */
  async changePassword(userId: string, currentPassword: unknown, newPassword: unknown) {
    const current = typeof currentPassword === 'string' ? currentPassword : '';
    const next = typeof newPassword === 'string' ? newPassword : '';

    if (next.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(400, `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const row = await UserRepository.findRawBy('id', userId);
    if (!row) throw new AuthError(404, 'Usuário não encontrado.');

    if (!row.password || !(await bcrypt.compare(current, row.password))) {
      throw new AuthError(401, 'Senha atual incorreta.');
    }

    const hashed = await bcrypt.hash(next, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    return { success: true };
  }
}

export const authService = new AuthService();
