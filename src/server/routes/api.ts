/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * API surface. Architecture: Route -> Middleware -> Service -> Repository -> MySQL.
 *
 * Rules enforced here:
 *  - no secret is read from process.env in this file (see config/env.ts);
 *  - authentication and authorization always run as middleware, never inline;
 *  - role and company bindings come from the database, never from the payload;
 *  - errors return a generic message; details stay in the server log.
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  UserRepository, CategoryRepository, CityRepository, DistrictRepository,
  ProductRepository, ServiceRepository, CouponRepository, ReviewRepository,
  JobRepository, JobApplicationRepository, ProfessionalRepository,
  BlogPostRepository, EventRepository, TourismPlaceRepository,
  SolidarityCampaignRepository, PlanRepository, SubscriptionRepository,
  CrmLeadRepository, SupportTicketRepository, MediaItemRepository,
  AuditLogRepository, GeneralConfigRepository, PaymentConfigRepository,
  BaseRepository
} from '../repositories/baseRepository.js';
import { CompanyRepository } from '../repositories/companyRepository.js';
import { companyService } from '../services/companyService.js';
import { checkoutContact, prepareCheckoutCompany, listOwnedCompanies } from '../services/checkoutService.js';
import { authService, AuthError } from '../services/authService.js';
import { analyticsService } from '../services/analyticsService.js';
import { engagementService, EngagementError } from '../services/engagementService.js';
import { billingService } from '../services/billingService.js';
import { CrudService, ServiceError } from '../services/crudService.js';
import { paymentService, PaymentError } from '../services/paymentService.js';
import { EntitlementService } from '../services/entitlementService.js';
import {
  requireAuth, requireRole, optionalAuth, attachCompanyScope,
  requireCompanyAccess, requireCompanyParam, requireRecordOwnership
} from '../middleware/auth.js';
import { checkConnection, isDatabaseUnavailable } from '../mysql.js';
import { env } from '../config/env.js';
import { passwordRecoveryRouter } from './passwordRecovery.js';
import { VerificationError } from '../services/emailVerificationService.js';

export const apiRouter = Router();
apiRouter.use('/auth', passwordRecoveryRouter);

const ADMIN_ONLY = ['admin_master'];

async function requireVerifiedEmail(userId: string) {
  const { emailVerificationService } = await import('../services/emailVerificationService.js');
  if (!await emailVerificationService.isUserVerified(userId)) {
    throw new VerificationError(403, 'Confirme seu e-mail antes de continuar a contratação.');
  }
}

/**
 * Single error funnel. Known service errors keep their status; anything else
 * becomes a 500 with a generic body so internals never reach the client.
 */
const fail = (res: Response, error: unknown) => {
  if (isDatabaseUnavailable(error)) {
    return res.status(503).json({ error: 'Banco de dados temporariamente indisponível.' });
  }
  if (error instanceof AuthError || error instanceof ServiceError || error instanceof EngagementError || error instanceof PaymentError || error instanceof VerificationError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('[api]', error instanceof Error ? error.message : error);
  return res.status(500).json({ error: 'Erro interno no servidor.' });
};

/** Wraps an async handler so a rejected promise cannot crash the process. */
const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      fail(res, error);
    }
  };

// ============================================================
// 0. HEALTH
// ============================================================

/**
 * Liveness probe. Reports only reachability — never the host, user, database
 * name, SQL or a stack trace.
 */
apiRouter.get('/health', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const release = process.env.RELEASE_SHA;
  if (release && /^[a-f0-9]{40}$/.test(release)) {
    res.setHeader('X-Release-Sha', release);
  }
  const connected = await checkConnection();
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});

// ============================================================
// 1. AUTHENTICATION
// ============================================================

// email + password -> MySQL -> bcrypt.compare -> JWT. A wrong password is a 401.
apiRouter.post('/auth/login', handler(async (req, res) => {
  const { token, user } = await authService.login(req.body?.email, req.body?.password);
  res.json({ success: true, token, user });
}));

apiRouter.post('/auth/register', handler(async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const { token, user, verificationEmailSent } = await authService.register({ ...(req.body ?? {}), ip });
  res.json({ success: true, token, user, verificationEmailSent });
}));

// Confirmação de e-mail via POST (anti-scanner: nunca consome em GET)
apiRouter.post('/auth/verify-email', handler(async (req, res) => {
  const { emailVerificationService } = await import('../services/emailVerificationService.js');
  const token = req.body?.token;
  const result = await emailVerificationService.verifyToken(token);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, message: 'E-mail confirmado com sucesso!', userId: result.userId, email: result.email });
}));

// Reenvio seguro com rate-limit e cooldown de 60s
apiRouter.post('/auth/resend-verification', handler(async (req, res) => {
  const { emailVerificationService } = await import('../services/emailVerificationService.js');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

  const [users]: any = await (await import('../mysql.js')).pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (!users || users.length === 0) {
    // Resposta genérica para evitar enumeração de e-mails
    return res.json({ success: true, message: 'Se o e-mail estiver cadastrado, uma nova confirmação foi enviada.' });
  }

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const sent = await emailVerificationService.sendVerification(users[0].id, email, ip, req.body?.planId);
  if (!sent) {
    return res.status(503).json({
      success: false,
      error: 'Serviço de envio de e-mails temporariamente indisponível no ambiente. Tente novamente mais tarde.'
    });
  }
  res.json({ success: true, message: 'Link de confirmação reenviado com sucesso.' });
}));

apiRouter.get('/auth/verification-status', requireAuth, handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { emailVerificationService } = await import('../services/emailVerificationService.js');
  const verified = await emailVerificationService.isUserVerified(req.user!.id);
  res.json({ verified });
}));

// Envio de teste real autorizado: De contato@itapoa.online Para suprememidias.ok@gmail.com
// Exclusivo para administradores (role admin_master). Sem exceções por e-mail no código.
apiRouter.post('/admin/send-test-email', requireAuth, handler(async (req, res) => {
  if (req.user!.role !== 'admin_master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acionar o teste de e-mail.' });
  }
  const { mailService } = await import('../services/mailService.js');
  const result = await mailService.sendAuthorizedTest();
  if (!result.accepted) {
    return res.status(503).json({
      success: false,
      accepted: false,
      error: 'Transporte SMTP não configurado ou envio recusado pelo provedor.',
      timestamp: result.timestamp
    });
  }
  res.json({ success: true, ...result });
}));

// The session owner is taken from the token, never from the body.
apiRouter.get('/auth/profile', requireAuth, handler(async (req, res) => {
  res.json(await authService.getProfile(req.user!.id));
}));

apiRouter.put('/auth/profile', requireAuth, handler(async (req, res) => {
  res.json({ success: true, user: await authService.updateProfile(req.user!.id, req.body ?? {}) });
}));

// Requires the current password, so a stolen session alone cannot take over.
apiRouter.put('/auth/password', requireAuth, handler(async (req, res) => {
  res.json(await authService.changePassword(
    req.user!.id,
    req.body?.currentPassword,
    req.body?.newPassword
  ));
}));

// ============================================================
// 2. COMPANIES
// ============================================================

apiRouter.get('/companies', handler(async (req, res) => {
  res.json(await companyService.getCompanies(req.query as Record<string, any>));
}));

apiRouter.get('/companies/:slug', handler(async (req, res) => {
  const company = await companyService.getCompanyBySlug(req.params.slug);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json(company);
}));

// The owner binding is written from the session, so the creator cannot assign
// the company to somebody else.
apiRouter.post('/companies/create', requireAuth, handler(async (req, res) => {
  const company = await companyService.createCompany(req.body ?? {}, req.user!.id);
  res.json({ success: true, company });
}));

// requireCompanyParam blocks cross-tenant edits (IDOR).
apiRouter.put('/companies/:id', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  res.json({ success: true, company: await companyService.updateCompany(req.params.id, req.body ?? {}) });
}));

apiRouter.post('/companies/:id/click', handler(async (req, res) => {
  res.json({ success: true, clicks: await companyService.registerClick(req.params.id) });
}));

apiRouter.post('/companies/:id/views', handler(async (req, res) => {
  const pool = (await import('../mysql.js')).pool;
  await pool.query('UPDATE companies SET views = views + 1 WHERE id = ?', [req.params.id]).catch(() => {});
  res.json({ success: true });
}));

// Fotos da Galeria da Empresa (com validação estrita de limite por plano)
apiRouter.get('/companies/:id/media', handler(async (req, res) => {
  const pool = (await import('../mysql.js')).pool;
  const [rows]: any = await pool.query(
    'SELECT id, url, fileType, createdAt FROM media_items WHERE entityId = ? AND entityType = ? ORDER BY createdAt DESC',
    [req.params.id, 'company']
  );
  res.json(rows);
}));

apiRouter.post('/companies/:id/media', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const { addGalleryPhoto } = await import('../services/galleryService.js');
  res.json(await addGalleryPhoto(req.params.id, req.body?.url, req.body?.fileType));
}));

apiRouter.delete('/companies/:id/media/:mediaId', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const pool = (await import('../mysql.js')).pool;
  await pool.query(
    'DELETE FROM media_items WHERE id = ? AND entityId = ? AND entityType = ?',
    [req.params.mediaId, req.params.id, 'company']
  );
  res.json({ success: true });
}));

// ============================================================
// 3. PUBLIC CATALOGUE (read-only)
// ============================================================

const publicList = (path: string, repository: BaseRepository) => {
  const service = new CrudService(repository, path);

  apiRouter.get(`/${path}`, handler(async (req, res) => {
    res.json(await service.list(req.query as Record<string, any>));
  }));

  apiRouter.get(`/${path}/:id`, handler(async (req, res) => {
    res.json(await service.get(req.params.id));
  }));
};

publicList('categories', CategoryRepository);
publicList('cities', CityRepository);
publicList('professionals', ProfessionalRepository);
publicList('events', EventRepository);
publicList('tourism', TourismPlaceRepository);
// Public plans catalog — centralizado com benefícios e limites versionados
apiRouter.get('/plans', handler(async (_req, res) => {
  res.json(await EntitlementService.getPlansCatalog());
}));

// ============================================================
// 4. TENANT-OWNED ENTITIES
// Public read; writes require ownership and respect plan entitlements.
// ============================================================

const tenantEntity = (path: string, repository: BaseRepository, table: string) => {
  const service = new CrudService(repository, path);
  const companyColumn = repository.companyColumn ?? 'companyId';

  apiRouter.get(`/${path}`, handler(async (req, res) => {
    res.json(await service.list(req.query as Record<string, any>));
  }));

  apiRouter.get(`/${path}/:id`, handler(async (req, res) => {
    res.json(await service.get(req.params.id));
  }));

  // Validação centralizada de limites de plano antes de criar itens
  // O conteúdo existente NUNCA é apagado se a empresa estiver acima do limite
  apiRouter.post(`/${path}`, requireAuth, requireCompanyAccess, handler(async (req, res) => {
    const targetCompanyId = req.body?.companyId || req.body?.company_id || (req.companyIds && req.companyIds[0]);

    if (path === 'products' || path === 'services') {
      if (targetCompanyId) {
        const check = await EntitlementService.checkCanAddProduct(targetCompanyId);
        if (!check.allowed) {
          return res.status(403).json({
            error: check.message,
            current: check.current,
            max: check.max,
            planName: check.planName,
            upgradeRequired: true
          });
        }
      }
    } else if (path === 'coupons') {
      if (targetCompanyId) {
        const check = await EntitlementService.checkCanAddCoupon(targetCompanyId);
        if (!check.allowed) {
          return res.status(403).json({
            error: check.message,
            current: check.current,
            max: check.max,
            planName: check.planName,
            upgradeRequired: true
          });
        }
      }
    }

    res.json(await service.create(req.body ?? {}, req.companyIds ?? []));
  }));

  apiRouter.put(
    `/${path}/:id`,
    requireAuth,
    requireRecordOwnership(table, companyColumn),
    handler(async (req, res) => {
      res.json(await service.update(req.params.id, req.body ?? {}));
    })
  );

  apiRouter.delete(
    `/${path}/:id`,
    requireAuth,
    requireRecordOwnership(table, companyColumn),
    handler(async (req, res) => {
      res.json(await service.remove(req.params.id));
    })
  );
};

// Registro de entidades com anti-IDOR e controle de limites
tenantEntity('products', ProductRepository, 'products');
tenantEntity('services', ServiceRepository, 'services');
tenantEntity('coupons', CouponRepository, 'coupons');
tenantEntity('jobs', JobRepository, 'jobs');

// Consulta de Direitos, Limites e Uso de Recursos da Empresa
apiRouter.get('/companies/:id/entitlements', optionalAuth, handler(async (req, res) => {
  res.json(await EntitlementService.getCompanyEntitlements(req.params.id));
}));

// ============================================================
// 5. ENGAGEMENT (public, optionally attributed)
// ============================================================

apiRouter.get('/reviews', handler(async (req, res) => {
  res.json(await engagementService.listReviews(req.query as Record<string, any>));
}));

apiRouter.post('/reviews', optionalAuth, handler(async (req, res) => {
  res.json(await engagementService.createReview(req.body ?? {}, req.user?.id ?? null));
}));

apiRouter.get('/blog', handler(async (req, res) => {
  res.json(await new CrudService(BlogPostRepository, 'blog').list(req.query as Record<string, any>));
}));

apiRouter.get('/blog/:id', handler(async (req, res) => {
  res.json(await engagementService.getBlogPost(req.params.id));
}));

apiRouter.post('/blog/:id/comment', optionalAuth, handler(async (req, res) => {
  res.json(await engagementService.addBlogComment(req.params.id, req.body ?? {}, req.user?.id ?? null));
}));

apiRouter.get('/campaigns', handler(async (req, res) => {
  res.json(await new CrudService(SolidarityCampaignRepository, 'camp').list(req.query as Record<string, any>));
}));

apiRouter.get('/campaigns/:id', handler(async (req, res) => {
  res.json(await engagementService.getCampaign(req.params.id));
}));

apiRouter.post('/campaigns/:id/comment', optionalAuth, handler(async (req, res) => {
  res.json(await engagementService.addCampaignComment(req.params.id, req.body ?? {}));
}));

apiRouter.post('/jobs/:id/apply', optionalAuth, handler(async (req, res) => {
  res.json(await engagementService.applyToJob(req.params.id, req.body ?? {}, req.user?.id ?? null));
}));

// ============================================================
// 6. CRM (tenant-scoped both ways)
// ============================================================

const crmService = new CrudService(CrmLeadRepository, 'lead');

apiRouter.get('/crm/leads', requireAuth, attachCompanyScope, handler(async (req, res) => {
  res.json(await crmService.listForUser(req.user!, req.companyIds ?? [], req.query as Record<string, any>));
}));

apiRouter.post('/crm/leads', requireAuth, requireCompanyAccess, handler(async (req, res) => {
  res.json(await crmService.create(req.body ?? {}, req.companyIds ?? []));
}));

apiRouter.put(
  '/crm/leads/:id',
  requireAuth,
  requireRecordOwnership('crm_leads', 'company_id'),
  handler(async (req, res) => {
    res.json(await crmService.update(req.params.id, req.body ?? {}));
  })
);

apiRouter.delete(
  '/crm/leads/:id',
  requireAuth,
  requireRecordOwnership('crm_leads', 'company_id'),
  handler(async (req, res) => {
    res.json(await crmService.remove(req.params.id));
  })
);

// ============================================================
// 7. BILLING + PAYMENTS (Mercado Pago)
// Reads come from MySQL; charges are created and verified server-side.
// The backend is the sole payment authority — a client can never mark a
// subscription as paid.
// ============================================================

// Public key is intentionally public; never return the access token or webhook secret.
apiRouter.get('/payments/config', handler(async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await paymentService.gatewayConfig());
}));

apiRouter.get('/payments/quote', requireAuth, handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await paymentService.checkoutQuote(req.user!.id, String(req.query.planId || ''), String(req.query.method || '')));
}));

apiRouter.get('/account/companies', requireAuth, handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await listOwnedCompanies(req.user!.id));
}));

apiRouter.post('/checkout/company', requireAuth, handler(async (req, res) => {
  await requireVerifiedEmail(req.user!.id);
  const contact = checkoutContact(req.body?.contact ?? {});
  if (!['plan_bronze', 'plan_gold_vip', 'plan_diamond_extremo'].includes(req.body?.planId)) {
    return res.status(400).json({ error: 'Plano inválido.' });
  }
  if (req.body.planId !== 'plan_bronze') await paymentService.assertGatewayReady();
  let companyId: string;
  if (req.body.companyId) {
    const owned = await listOwnedCompanies(req.user!.id);
    const match = owned.find((c: any) => c.id === req.body.companyId);
    if (!match) return res.status(403).json({ error: 'Empresa não pertence à sua conta.' });
    companyId = match.id;
  } else {
    companyId = await prepareCheckoutCompany(req.user!.id, contact);
  }
  res.json({ companyId });
}));

apiRouter.post('/payments/card', requireAuth, requireCompanyAccess, handler(async (req, res) => {
  await requireVerifiedEmail(req.user!.id);
  const companyId = (req.companyIds && req.companyIds[0]) || String(req.body?.companyId ?? '');
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  if (!planId) return res.status(400).json({ error: 'Plano obrigatório.' });
  res.json(await paymentService.createCardPayment(req.user!.id, companyId, planId, req.body ?? {}, env.appUrl));
}));

// Create a real PIX charge. Company access is verified (anti-IDOR); the payer
// email defaults to the session user.
apiRouter.post('/payments/pix', requireAuth, requireCompanyAccess, handler(async (req, res) => {
  await requireVerifiedEmail(req.user!.id);
  const companyId = (req.companyIds && req.companyIds[0]) || String(req.body?.companyId ?? req.body?.company_id ?? '');
  const planId = String(req.body?.planId ?? '');
  if (!planId) return res.status(400).json({ error: 'planId obrigatório.' });
  const payerEmail = typeof req.body?.payerEmail === 'string' ? req.body.payerEmail : req.user!.email;
  const requestId = typeof req.body?.requestId === 'string' ? req.body.requestId : undefined;
  const payerName = typeof req.body?.payerName === 'string' ? req.body.payerName : undefined;
  const payerDoc = req.body?.payerDoc && typeof req.body.payerDoc === 'object' ? req.body.payerDoc : undefined;
  res.json(await paymentService.createPixPayment(req.user!.id, companyId, planId, payerEmail, payerName, payerDoc, requestId, { couponCode: req.body?.couponCode, quotedAmount: req.body?.quotedAmount }));
}));

// Resume card/pix checkout after a reload without replaying an SDK token or charging again.
apiRouter.get('/payments/attempt/active', requireAuth, attachCompanyScope, handler(async (req, res) => {
  const companyId = String(req.query.companyId ?? ''), planId = String(req.query.planId ?? '');
  if (!companyId || !planId) return res.status(400).json({ error: 'Empresa e plano obrigatórios.' });
  if (req.user!.role !== 'admin_master' && !(req.companyIds ?? []).includes(companyId)) return res.status(403).json({ error: 'Acesso negado.' });
  
  const pool = (await import('../mysql.js')).pool;
  // Reading checkout state must never cancel a potentially successful charge.
  const [rows]: any = await pool.query(`SELECT s.id AS subscriptionId, s.status, s.companyId, s.planId, s.paymentMethod, s.amount,
    NULL AS expiresAt,
    s.createdAt
    FROM subscriptions s WHERE s.companyId=? AND s.planId=?
    AND (s.paymentMethod='credit_card' OR (s.paymentMethod='pix' AND NOT EXISTS (SELECT 1 FROM payment_logs pl WHERE pl.subscriptionId=s.id)))
    AND (
      (s.status='pending' AND s.createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))
      OR (s.status='active' AND (s.nextBillingDate IS NULL OR s.nextBillingDate > UTC_TIMESTAMP()) AND s.createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
    )
    ORDER BY s.createdAt DESC LIMIT 1`, [companyId, planId]);

  if (!rows[0]) {
    return res.json(null);
  }

  const result = rows[0];

  res.json({
    subscriptionId: result.subscriptionId,
    status: result.status,
    companyId: result.companyId,
    planId: result.planId,
    paymentMethod: result.paymentMethod,
    amount: Number(result.amount),
    expiresAt: null
  });
}));

// Recover a valid PIX attempt after a reload without creating a duplicate charge.
apiRouter.get('/payments/pix/active', requireAuth, attachCompanyScope, handler(async (req, res) => {
  const companyId = String(req.query.companyId ?? req.query.company_id ?? '');
  const planId = String(req.query.planId ?? '');
  if (!companyId || !planId) return res.status(400).json({ error: 'companyId e planId obrigatórios.' });
  const owned = req.companyIds ?? [];
  if (!owned.includes(companyId) && req.user!.role !== 'admin_master') {
    return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
  }
  const active = await paymentService.getActivePixForCompany(companyId, planId, req.user!.id);
  if (!active) return res.json(null);
  res.json(active);
}));

// Lightweight status poll: Pix (pending/approved) + Checkout (pending/active).
// Does not mark anything paid — the webhook remains the sole activation path.
apiRouter.get('/payments/subscription/:id/status', requireAuth, handler(async (req, res) => {
  const subId = String(req.params.id || '');
  if (!subId) return res.status(400).json({ error: 'subscriptionId obrigatório.' });
  const pool = (await import('../mysql.js')).pool;
  const [rows]: any = await pool.query(
    `SELECT s.id, s.status, s.planId, s.companyId, s.nextBillingDate, s.createdAt,
            NULL AS expiresAt,
            TIMESTAMPDIFF(SECOND, s.createdAt, UTC_TIMESTAMP()) AS ageSeconds
     FROM subscriptions s WHERE s.id = ? LIMIT 1`,
    [subId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Assinatura não encontrada.' });
  const owns = req.user!.role === 'admin_master'
    || (await (await import('../middleware/auth.js')).loadUserCompanies(req.user!.id)).includes(String(rows[0].companyId));
  if (!owns) return res.status(403).json({ error: 'Acesso negado.' });

  const row = rows[0];
  let status = row.status;
  if (status === 'active' && row.nextBillingDate && new Date(row.nextBillingDate).getTime() <= Date.now()) {
    status = 'expired';
  }

  res.json({ status, planId: row.planId, companyId: row.companyId, expiresAt: null });
}));

// Reconciliação idempotente com o gateway Mercado Pago (evita duplicidade e resolve atrasos de webhook)
apiRouter.post('/payments/subscription/:id/reconcile', requireAuth, handler(async (req, res) => {
  const subId = String(req.params.id || '');
  if (!subId) return res.status(400).json({ error: 'subscriptionId obrigatório.' });
  const [rows]: any = await (await import('../mysql.js')).pool.query(
    'SELECT status, planId, companyId FROM subscriptions WHERE id = ? LIMIT 1',
    [subId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Assinatura não encontrada.' });
  const owns = req.user!.role === 'admin_master'
    || (await (await import('../middleware/auth.js')).loadUserCompanies(req.user!.id)).includes(String(rows[0].companyId));
  if (!owns) return res.status(403).json({ error: 'Acesso negado.' });

  const result = await paymentService.reconcilePayment(subId);
  res.json(result);
}));

// Elegibilidade para a experiência Gold de 7 dias (novos clientes elegíveis, sem repetições indevidas)
apiRouter.get('/plans/trial-eligibility/:companyId', requireAuth, handler(async (req, res) => {
  const companyId = req.params.companyId;
  const owns = req.user!.role === 'admin_master'
    || (await (await import('../middleware/auth.js')).loadUserCompanies(req.user!.id)).includes(companyId);
  if (!owns) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

  const eligibility = await EntitlementService.checkTrialEligibility(companyId);
  res.json(eligibility);
}));

// Inicia os 7 dias de experiência Gold (sem autorização de cobrança, sem cartão de crédito)
apiRouter.post('/plans/start-trial', requireAuth, handler(async (req, res) => {
  const companyId = String(req.body?.companyId || req.body?.company_id || '');
  if (!companyId) return res.status(400).json({ error: 'companyId obrigatório.' });
  const owns = req.user!.role === 'admin_master'
    || (await (await import('../middleware/auth.js')).loadUserCompanies(req.user!.id)).includes(companyId);
  if (!owns) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });

  try {
    const result = await EntitlementService.startSevenDayGoldTrial(companyId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Falha ao ativar período de teste.' });
  }
}));

// Create a Checkout Pro preference (card) and return the hosted checkout URL.
apiRouter.post('/payments/checkout', requireAuth, requireCompanyAccess, handler(async (req, res) => {
  const companyId = (req.companyIds && req.companyIds[0]) || String(req.body?.companyId ?? req.body?.company_id ?? '');
  const planId = String(req.body?.planId ?? '');
  if (!planId) return res.status(400).json({ error: 'planId obrigatório.' });
  const payerEmail = typeof req.body?.payerEmail === 'string' ? req.body.payerEmail : req.user!.email;
  const { initPoint, subscriptionId } = await paymentService.createCheckoutPreference(
    req.user!.id, companyId, planId, payerEmail, env.appUrl
  );
  res.json({ initPoint, subscriptionId });
}));

// Authoritative subscription status for the caller's companies (feature gating).
apiRouter.get('/payments/status', requireAuth, attachCompanyScope, handler(async (req, res) => {
  const status = req.user!.role === 'admin_master'
    ? 'active'
    : await paymentService.getSubscriptionStatus(req.companyIds ?? []);
  res.json({ status });
}));

// ------------------------------------------------------------
// Legacy billing reads
// ------------------------------------------------------------

apiRouter.get('/payments/logs', requireAuth, attachCompanyScope, handler(async (req, res) => {
  if (req.user!.role === 'admin_master') {
    return res.json(await billingService.listAllPaymentLogs());
  }
  const companyIds = req.companyIds ?? [];
  if (companyIds.length === 0) return res.json([]);
  const batches = await Promise.all(
    companyIds.map(id => billingService.listPaymentLogsByCompany(id))
  );
  res.json(batches.flat());
}));

apiRouter.get('/billing/invoices', requireAuth, attachCompanyScope, handler(async (req, res) => {
  if (req.user!.role === 'admin_master') {
    return res.json(await billingService.listAllPaymentLogs());
  }
  const companyIds = req.companyIds ?? [];
  if (companyIds.length === 0) return res.json([]);
  const batches = await Promise.all(
    companyIds.map(id => billingService.listPaymentLogsByCompany(id))
  );
  res.json(batches.flat());
}));

apiRouter.get('/subscriptions', requireAuth, attachCompanyScope, handler(async (req, res) => {
  const service = new CrudService(SubscriptionRepository, 'sub');
  res.json(await service.listForUser(req.user!, req.companyIds ?? [], req.query as Record<string, any>));
}));

// ============================================================
// 8. ANALYTICS & TELEMETRIA REAL
// Figures are aggregated in SQL. No estimated or sample values.
// ============================================================

// Registro de eventos de telemetria pública (view, whatsapp, phone, route)
apiRouter.post('/analytics/events', handler(async (req, res) => {
  const { company_id, event_type, source, device } = req.body ?? {};
  if (!company_id || typeof company_id !== 'string') {
    return res.status(400).json({ error: 'company_id é obrigatório.' });
  }

  const rawType = String(event_type || '').toLowerCase().replace('click_', '');
  const VALID_EVENTS = ['view', 'whatsapp', 'phone', 'route'];
  if (!VALID_EVENTS.includes(rawType)) {
    return res.status(400).json({ error: 'Tipo de evento inválido.' });
  }

  const pool = (await import('../mysql.js')).pool;
  const eventId = typeof req.body?.eventId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(req.body.eventId.trim())
    ? req.body.eventId.trim()
    : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Insere o evento real com chave primária única para evitar contagem duplicada
  const [insertResult]: any = await pool.query(
    'INSERT IGNORE INTO company_analytics_events (id, company_id, event_type, source, device, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [eventId, company_id, rawType, String(source || 'direct').slice(0, 64), String(device || 'mobile').slice(0, 32)]
  ).catch(() => [{ affectedRows: 0 }]);

  // Incrementa contador consolidado em companies somente se o evento for novo (não duplicado)
  if (insertResult && insertResult.affectedRows > 0) {
    if (rawType === 'view') {
      await pool.query('UPDATE companies SET views = views + 1 WHERE id = ?', [company_id]).catch(() => {});
    } else if (rawType === 'whatsapp') {
      await pool.query('UPDATE companies SET clicksWhatsapp = clicksWhatsapp + 1 WHERE id = ?', [company_id]).catch(() => {});
    } else if (rawType === 'phone') {
      await pool.query('UPDATE companies SET clicksPhone = clicksPhone + 1 WHERE id = ?', [company_id]).catch(() => {});
    } else if (rawType === 'route') {
      await pool.query('UPDATE companies SET clicksRoute = clicksRoute + 1 WHERE id = ?', [company_id]).catch(() => {});
    }
  }

  res.json({ success: true, eventId, isDuplicate: Boolean(!insertResult || insertResult.affectedRows === 0) });
}));

// Métricas reais da empresa com controle de histórico por plano (Bronze: 7 dias; Gold/Diamond: 7, 30 e 90 dias)
apiRouter.get('/companies/:id/analytics', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const companyId = req.params.id;
  const pool = (await import('../mysql.js')).pool;

  const entitlements = await EntitlementService.getCompanyEntitlements(companyId);
  const isBronze = entitlements.planTier === 'bronze';

  const requestedDays = parseInt(String(req.query.days || '7'), 10);
  let days = 7;
  let planRestricted = false;

  if (requestedDays === 30 || requestedDays === 90) {
    if (isBronze) {
      days = 7;
      planRestricted = true;
    } else {
      days = requestedDays;
    }
  }

  // Agrupamento diário real (sem engolir erro de banco para não mascarar falhas como zero)
  const [dailyRows]: any = await pool.query(
    `SELECT DATE(created_at) as date, event_type, COUNT(*) as count 
     FROM company_analytics_events 
     WHERE company_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at), event_type 
     ORDER BY date ASC`,
    [companyId, days]
  );

  // Totais consolidados reais
  const [companyRows]: any = await pool.query(
    'SELECT views, clicksWhatsapp, clicksPhone, clicksRoute FROM companies WHERE id = ? LIMIT 1',
    [companyId]
  );
  if (!companyRows || companyRows.length === 0) {
    return res.status(404).json({ error: 'Empresa não encontrada.' });
  }
  const cRow = companyRows[0] || {};
  const totals = {
    views: Number(cRow.views || 0),
    clicksWhatsapp: Number(cRow.clicksWhatsapp || 0),
    clicksPhone: Number(cRow.clicksPhone || 0),
    clicksRoute: Number(cRow.clicksRoute || 0)
  };

  const dayMap = new Map<string, { views: number; whatsapp: number; phone: number; route: number }>();
  for (const r of dailyRows) {
    const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0];
    if (!dayMap.has(dStr)) {
      dayMap.set(dStr, { views: 0, whatsapp: 0, phone: 0, route: 0 });
    }
    const cur = dayMap.get(dStr)!;
    if (r.event_type === 'view') cur.views += Number(r.count);
    else if (r.event_type === 'whatsapp') cur.whatsapp += Number(r.count);
    else if (r.event_type === 'phone') cur.phone += Number(r.count);
    else if (r.event_type === 'route') cur.route += Number(r.count);
  }

  // Monta linha do tempo preenchendo dias ausentes com 0
  const timeline: { date: string; views: number; whatsapp: number; phone: number; route: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const val = dayMap.get(dStr) || { views: 0, whatsapp: 0, phone: 0, route: 0 };
    timeline.push({ date: dStr, ...val });
  }

  const periodTotals = timeline.reduce(
    (acc, cur) => ({
      views: acc.views + cur.views,
      whatsapp: acc.whatsapp + cur.whatsapp,
      phone: acc.phone + cur.phone,
      route: acc.route + cur.route
    }),
    { views: 0, whatsapp: 0, phone: 0, route: 0 }
  );

  res.json({
    companyId,
    plan: entitlements.planTier,
    planDisplayName: entitlements.planName,
    days,
    allowedDays: isBronze ? [7] : [7, 30, 90],
    planRestricted,
    restrictionMessage: planRestricted ? 'Histórico estendido de 30 e 90 dias exclusivo para planos Gold VIP e Diamond.' : null,
    totals: {
      views: Number(totals.views || 0),
      whatsapp: Number(totals.clicksWhatsapp || 0),
      phone: Number(totals.clicksPhone || 0),
      route: Number(totals.clicksRoute || 0)
    },
    periodTotals,
    timeline
  });
}));

apiRouter.get('/analytics', requireAuth, requireRole(ADMIN_ONLY), handler(async (_req, res) => {
  res.json(await analyticsService.getPlatformStats());
}));

apiRouter.get('/analytics/billing/kpis', requireAuth, requireRole(ADMIN_ONLY), handler(async (_req, res) => {
  res.json(await analyticsService.getFinancialKPIs());
}));

// ============================================================
// 9. ADMIN MASTER
// ============================================================

/** Full CRUD restricted to admin_master. */
const adminEntity = (path: string, repository: BaseRepository, idPrefix: string) => {
  const service = new CrudService(repository, idPrefix);
  const guards = [requireAuth, requireRole(ADMIN_ONLY)] as const;

  apiRouter.get(`/admin/${path}`, ...guards, handler(async (req, res) => {
    res.json(await service.list(req.query as Record<string, any>));
  }));

  apiRouter.post(`/admin/${path}`, ...guards, handler(async (req, res) => {
    res.json(await service.create(req.body ?? {}));
  }));

  apiRouter.put(`/admin/${path}/:id`, ...guards, handler(async (req, res) => {
    res.json(await service.update(req.params.id, req.body ?? {}));
  }));

  apiRouter.delete(`/admin/${path}/:id`, ...guards, handler(async (req, res) => {
    res.json(await service.remove(req.params.id));
  }));
};

adminEntity('users', UserRepository, 'user');
// Rotas dedicadas de gestão de planos e benefícios com validação estrita e auditoria
apiRouter.get('/admin/plans', requireAuth, requireRole(ADMIN_ONLY), handler(async (_req, res) => {
  res.json(await EntitlementService.getPlansCatalog());
}));

apiRouter.put('/admin/plans/:id', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const result = await EntitlementService.updatePlan(
    req.params.id,
    req.body ?? {},
    req.user,
    req.ip
  );
  res.json(result);
}));

apiRouter.get('/admin/plans-audit', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const logs = await EntitlementService.getPlanAuditLogs(req.query.planId as string | undefined);
  res.json(logs);
}));

// Rotas de Concessão Administrativa Promocional de Empresas
apiRouter.post('/admin/companies/:id/grant', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const { grantedPlan, startDate, endDate, reason } = req.body ?? {};
  if (!grantedPlan || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: 'grantedPlan, startDate, endDate e reason são obrigatórios.' });
  }
  const result = await EntitlementService.grantAdminPlan(
    req.params.id,
    grantedPlan,
    startDate,
    endDate,
    reason,
    req.user
  );
  res.json(result);
}));

apiRouter.post('/admin/companies/:id/revoke-grant', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const result = await EntitlementService.revokeAdminPlan(
    req.params.id,
    req.body?.reason,
    req.user
  );
  res.json(result);
}));

apiRouter.post('/admin/companies/:id/renew-grant', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const { endDate, reason } = req.body ?? {};
  if (!endDate) {
    return res.status(400).json({ error: 'endDate é obrigatório para renovar a concessão.' });
  }
  const result = await EntitlementService.renewAdminPlan(
    req.params.id,
    endDate,
    reason,
    req.user
  );
  res.json(result);
}));

apiRouter.get('/admin/companies/:id/grants-history', requireAuth, requireRole(ADMIN_ONLY), handler(async (req, res) => {
  const history = await EntitlementService.getGrantsHistory(req.params.id);
  res.json(history);
}));

adminEntity('coupons', CouponRepository, 'coupon');
adminEntity('jobs', JobRepository, 'job');
adminEntity('campaigns', SolidarityCampaignRepository, 'camp');
adminEntity('blog', BlogPostRepository, 'post');
adminEntity('companies', CompanyRepository, 'comp');
adminEntity('cities', CityRepository, 'city');
adminEntity('categories', CategoryRepository, 'cat');
adminEntity('bairros', DistrictRepository, 'district');
adminEntity('leads', CrmLeadRepository, 'lead');
adminEntity('tickets', SupportTicketRepository, 'ticket');
adminEntity('media', MediaItemRepository, 'media');
adminEntity('audit-logs', AuditLogRepository, 'log');
adminEntity('reviews', ReviewRepository, 'rev');
adminEntity('applications', JobApplicationRepository, 'app');

/**
 * Singleton configuration rows. Upsert on a fixed id: these tables hold exactly
 * one record, so there is no id to take from the client.
 */
const singletonConfig = (path: string, repository: BaseRepository, rowId: string) => {
  const guards = [requireAuth, requireRole(ADMIN_ONLY)] as const;

  apiRouter.get(`/admin/${path}`, ...guards, handler(async (_req, res) => {
    // sanitize() in the repository strips accessToken from payment_config.
    res.json((await repository.findById(rowId)) ?? {});
  }));

  apiRouter.put(`/admin/${path}`, ...guards, handler(async (req, res) => {
    const existing = await repository.findById(rowId);
    const saved = existing
      ? await repository.update(rowId, req.body ?? {})
      : await repository.create({ ...(req.body ?? {}), id: rowId });
    res.json({ success: true, config: saved });
  }));
};

singletonConfig('general-config', GeneralConfigRepository, 'general');
singletonConfig('payment-config', PaymentConfigRepository, 'payment');

// ============================================================
// 10. SUPPORT TICKETS (lojista-scoped)
// ============================================================

const supportService = new CrudService(SupportTicketRepository, 'ticket');

// List tickets for the current user (lojista sees own; admin sees all).
apiRouter.get('/support/tickets', requireAuth, handler(async (req, res) => {
  if (req.user!.role === 'admin_master') {
    return res.json(await supportService.list(req.query as Record<string, any>));
  }
  const [rows]: any = await (await import('../mysql.js')).pool.query(
    'SELECT * FROM support_tickets WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
    [req.user!.id]
  );
  res.json(rows);
}));

// Create a ticket assigned to the logged-in user.
apiRouter.post('/support/tickets', requireAuth, handler(async (req, res) => {
  const { subject, message, category } = req.body ?? {};
  if (!subject?.trim()) return res.status(400).json({ error: 'Assunto obrigatório.' });
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória.' });
  const id = `ticket_${randomUUID()}`;
  await (await import('../mysql.js')).pool.query(
    'INSERT INTO support_tickets (id, userId, subject, message, status, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
    [id, req.user!.id, subject.trim().slice(0, 255), message.trim().slice(0, 5000), 'open']
  );
  res.json({ success: true, id });
}));

// ============================================================
// 11. COMPANY STAFF (members of a company)
// ============================================================

// List staff members for a company (owner only).
apiRouter.get('/companies/:id/staff', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const [rows]: any = await (await import('../mysql.js')).pool.query(
    'SELECT cu.user_id, u.name, u.email, cu.access_level FROM companies_users cu LEFT JOIN users u ON u.id = cu.user_id WHERE cu.company_id = ?',
    [req.params.id]
  );
  res.json(rows);
}));

// Invite/add a member by email.
apiRouter.post('/companies/:id/staff', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const { email, access_level } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: 'E-mail obrigatório.' });
  const VALID_LEVELS = ['viewer', 'editor', 'manager'];
  const level = VALID_LEVELS.includes(access_level) ? access_level : 'editor';
  const pool = (await import('../mysql.js')).pool;
  const [users]: any = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim()]);
  if (!users[0]) return res.status(404).json({ error: 'Usuário não encontrado. O convidado precisa ter uma conta no Itapoá Online.' });
  const userId = users[0].id;
  if (userId === req.user!.id) return res.status(400).json({ error: 'Você já é o responsável por esta empresa.' });
  await pool.query(
    'INSERT INTO companies_users (user_id, company_id, access_level) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE access_level = VALUES(access_level)',
    [userId, req.params.id, level]
  );
  res.json({ success: true });
}));

// Remove a staff member (owner cannot remove themselves).
apiRouter.delete('/companies/:id/staff/:userId', requireAuth, requireCompanyParam('id'), handler(async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user!.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo como responsável.' });
  const pool = (await import('../mysql.js')).pool;
  await pool.query('DELETE FROM companies_users WHERE company_id = ? AND user_id = ?', [req.params.id, userId]);
  res.json({ success: true });
}));
