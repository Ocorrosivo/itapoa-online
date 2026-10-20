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
import {
  requireAuth, requireRole, optionalAuth, attachCompanyScope,
  requireCompanyAccess, requireCompanyParam, requireRecordOwnership
} from '../middleware/auth.js';
import { checkConnection, isDatabaseUnavailable } from '../mysql.js';
import { env } from '../config/env.js';

export const apiRouter = Router();

const ADMIN_ONLY = ['admin_master'];

/**
 * Single error funnel. Known service errors keep their status; anything else
 * becomes a 500 with a generic body so internals never reach the client.
 */
const fail = (res: Response, error: unknown) => {
  if (isDatabaseUnavailable(error)) {
    return res.status(503).json({ error: 'Banco de dados temporariamente indisponível.' });
  }
  if (error instanceof AuthError || error instanceof ServiceError || error instanceof EngagementError || error instanceof PaymentError) {
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
  const { token, user } = await authService.register(req.body ?? {});
  res.json({ success: true, token, user });
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
publicList('plans', PlanRepository);
publicList('products', ProductRepository);
publicList('services', ServiceRepository);

// ============================================================
// 4. TENANT-OWNED ENTITIES
// Public read; writes require ownership of the target company.
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

  // The company id is resolved and verified by the middleware, then read from
  // req.companyIds — the body cannot redirect the write to another tenant.
  apiRouter.post(`/${path}`, requireAuth, requireCompanyAccess, handler(async (req, res) => {
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

tenantEntity('coupons', CouponRepository, 'coupons');
tenantEntity('jobs', JobRepository, 'jobs');

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

apiRouter.get('/account/companies', requireAuth, handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await listOwnedCompanies(req.user!.id));
}));

apiRouter.post('/checkout/company', requireAuth, handler(async (req, res) => {
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
  const companyId = (req.companyIds && req.companyIds[0]) || String(req.body?.companyId ?? '');
  const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
  if (!planId) return res.status(400).json({ error: 'Plano obrigatório.' });
  res.json(await paymentService.createCardPayment(req.user!.id, companyId, planId, req.body ?? {}, env.appUrl));
}));

// Create a real PIX charge. Company access is verified (anti-IDOR); the payer
// email defaults to the session user.
apiRouter.post('/payments/pix', requireAuth, requireCompanyAccess, handler(async (req, res) => {
  const companyId = (req.companyIds && req.companyIds[0]) || String(req.body?.companyId ?? req.body?.company_id ?? '');
  const planId = String(req.body?.planId ?? '');
  if (!planId) return res.status(400).json({ error: 'planId obrigatório.' });
  const payerEmail = typeof req.body?.payerEmail === 'string' ? req.body.payerEmail : req.user!.email;
  res.json(await paymentService.createPixPayment(req.user!.id, companyId, planId, payerEmail));
}));

// Recover a valid PIX attempt after a reload without creating a duplicate charge.
apiRouter.get('/payments/pix/active', requireAuth, attachCompanyScope, handler(async (req, res) => {
  const companyId = String(req.query.companyId ?? req.query.company_id ?? '');
  const planId = String(req.query.planId ?? '');
  if (!companyId || !planId) return res.status(400).json({ error: 'companyId e planId obrigatórios.' });
  const owned = req.companyIds ?? [];
  if (owned.length > 0 && !owned.includes(companyId) && req.user!.role !== 'admin_master') {
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
  const [rows]: any = await (await import('../mysql.js')).pool.query(
    'SELECT status, planId, companyId FROM subscriptions WHERE id = ? LIMIT 1',
    [subId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Assinatura não encontrada.' });
  const owns = req.user!.role === 'admin_master'
    || (await (await import('../middleware/auth.js')).loadUserCompanies(req.user!.id)).includes(String(rows[0].companyId));
  if (!owns) return res.status(403).json({ error: 'Acesso negado.' });
  res.json({ status: rows[0].status, planId: rows[0].planId, companyId: rows[0].companyId });
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
// 8. ANALYTICS
// Figures are aggregated in SQL. No estimated or sample values.
// ============================================================

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
adminEntity('plans', PlanRepository, 'plan');
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
