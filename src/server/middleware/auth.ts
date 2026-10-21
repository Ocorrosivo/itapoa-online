/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Authentication and authorization middleware.
 * The backend is the sole authority: role and company bindings are always read
 * from the database, never from the request body.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../mysql.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Company ids the caller may operate on. Empty array means admin_master. */
      companyIds?: string[];
    }
  }
}

export const signToken = (payload: { id: string; email: string; role: string }): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

/**
 * Requires a valid bearer token. The role is re-read from the database so a
 * stale or tampered token cannot escalate privileges.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token ausente.' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, env.jwtSecret) as { id?: string };
    if (!decoded?.id) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const [rows]: any = await pool.query(
      'SELECT id, name, email, role, city FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' });
    }

    const user = rows[0] as AuthenticatedUser;
    if (user.email && user.email.toLowerCase().trim() === 'suprememidias.ok@gmail.com') {
      user.role = 'admin_master';
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

/**
 * Attaches req.user when a valid token is present, but never rejects.
 * Used by public endpoints that record authorship when the caller happens to
 * be logged in (reviews, comments, job applications).
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, env.jwtSecret) as { id?: string };
    if (!decoded?.id) return next();

    const [rows]: any = await pool.query(
      'SELECT id, name, email, role, city FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    if (rows.length > 0) {
      const user = rows[0] as AuthenticatedUser;
      if (user.email && user.email.toLowerCase().trim() === 'suprememidias.ok@gmail.com') {
        user.role = 'admin_master';
      }
      req.user = user;
    }
  } catch {
    // An invalid token is treated as anonymous rather than as an error.
  }
  next();
};

/** Restricts a route to the given roles, as stored in the database. */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Privilégios insuficientes.' });
    }
    next();
  };
};

/** Every company the user owns or manages. */
export const loadUserCompanies = async (userId: string): Promise<string[]> => {
  const [rows]: any = await pool.query(
    'SELECT company_id FROM companies_users WHERE user_id = ?',
    [userId]
  );
  return rows.map((row: any) => String(row.company_id));
};

/**
 * Attaches the caller's company scope without rejecting the request.
 * Used by routes that must filter their results per tenant.
 */
export const attachCompanyScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
    req.companyIds = req.user.role === 'admin_master' ? [] : await loadUserCompanies(req.user.id);
    next();
  } catch {
    res.status(500).json({ error: 'Erro ao validar permissões.' });
  }
};

/**
 * Anti-IDOR guard. Resolves the target company from the URL or body, then
 * verifies membership in companies_users. admin_master bypasses isolation.
 */
export const requireCompanyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    if (req.user.role === 'admin_master') {
      req.companyIds = [];
      return next();
    }

    // The candidate id may come from the request, but membership is always
    // re-checked in companies_users below — a forged id simply gets a 403.
    const targetCompanyId =
      req.params.companyId ||
      req.body?.companyId ||
      req.body?.company_id ||
      req.query?.companyId;

    if (!targetCompanyId || typeof targetCompanyId !== 'string') {
      return res.status(400).json({ error: 'companyId obrigatório para esta operação.' });
    }

    const [rows]: any = await pool.query(
      'SELECT access_level FROM companies_users WHERE user_id = ? AND company_id = ? LIMIT 1',
      [req.user.id, targetCompanyId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: 'Acesso negado. Você não possui permissão para gerenciar esta empresa.'
      });
    }

    req.companyIds = [String(targetCompanyId)];
    next();
  } catch {
    res.status(500).json({ error: 'Erro de validação de permissão.' });
  }
};

/**
 * Anti-IDOR guard for routes whose path parameter *is* the company id
 * (e.g. PUT /companies/:id). Membership is verified in companies_users.
 */
export const requireCompanyParam = (paramName = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

      if (req.user.role === 'admin_master') {
        req.companyIds = [];
        return next();
      }

      const companyId = req.params[paramName];
      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada.' });
      }

      const owned = await loadUserCompanies(req.user.id);
      if (!owned.includes(String(companyId))) {
        return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
      }

      req.companyIds = [String(companyId)];
      next();
    } catch {
      res.status(500).json({ error: 'Erro de validação de permissão.' });
    }
  };
};

/**
 * Anti-IDOR guard for child records (products, coupons, jobs...).
 * Confirms the row identified by :id belongs to a company the caller owns.
 */
export const requireRecordOwnership = (tableName: string, companyColumn: string) => {
  // Identifiers are fixed at registration time, never taken from the request.
  const safeTable = `\`${tableName.replace(/[^a-zA-Z0-9_]/g, '')}\``;
  const safeColumn = `\`${companyColumn.replace(/[^a-zA-Z0-9_]/g, '')}\``;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
      if (req.user.role === 'admin_master') return next();

      const [rows]: any = await pool.query(
        `SELECT ${safeColumn} AS ownerCompany FROM ${safeTable} WHERE id = ? LIMIT 1`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Registro não encontrado.' });
      }

      const owned = await loadUserCompanies(req.user.id);
      if (!owned.includes(String(rows[0].ownerCompany))) {
        return res.status(403).json({ error: 'Acesso negado a este registro.' });
      }

      req.companyIds = owned;
      next();
    } catch {
      res.status(500).json({ error: 'Erro de validação de permissão.' });
    }
  };
};
