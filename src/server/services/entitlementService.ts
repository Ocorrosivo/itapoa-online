/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Entitlement Service — Centralização de Benefícios, Limites e Direitos de Acesso
 *
 * Regras aprovadas:
 * - Bronze gratuito: 3 fotos, métricas essenciais, CRM, sem destaque na home e sem novos produtos ou promoções publicáveis.
 * - Gold VIP R$ 49,90/mês: 15 fotos, 5 produtos/serviços, 1 promoção, apresentação completa e destaque rotativo.
 * - Diamond R$ 99,90/mês: 30 fotos, 30 produtos/serviços e 3 promoções, incluindo os recursos Gold.
 * - Logo e capa não contam como fotos de galeria.
 * - Conteúdo existente acima dos limites é preservado (não é deletado nem truncado).
 * - Diferenciação estrita de origem de direito: 'bronze', 'trial', 'paid', 'admin_grant'.
 */

import { pool } from '../mysql.js';

export type PlanTier = 'bronze' | 'gold_vip' | 'diamond_extremo';
export type AccessGrantType = 'bronze' | 'trial' | 'paid' | 'admin_grant';

export interface PlanLimits {
  maxGalleryPhotos: number;
  maxProducts: number;
  maxCoupons: number;
  hasHomeHighlight: boolean;
  hasCrm: boolean;
  hasFullPresentation: boolean;
  hasAnalytics: boolean;
  priorityLevel: number;
}

export interface PlanDefinition extends PlanLimits {
  id: string;
  name: string;
  displayName?: string;
  price: number;
  billingCycle: 'monthly';
  version: number;
  description: string;
  badge?: string;
  buttonText?: string;
  sortOrder?: number;
  isRecommended?: boolean;
  allowNewSubscriptions?: boolean;
  trialDays?: number;
  features?: string[];
}

export const CANONICAL_PLANS: Record<PlanTier, PlanDefinition> = {
  bronze: {
    id: 'plan_bronze',
    name: 'Bronze',
    displayName: 'Bronze Gratuito',
    price: 0.00,
    billingCycle: 'monthly',
    version: 1,
    maxGalleryPhotos: 3,
    maxProducts: 0,
    maxCoupons: 0,
    hasHomeHighlight: false,
    hasCrm: true,
    hasFullPresentation: false,
    hasAnalytics: true,
    priorityLevel: 1,
    badge: 'Gratuito',
    buttonText: 'Começar Gratuitamente',
    sortOrder: 1,
    isRecommended: false,
    allowNewSubscriptions: true,
    trialDays: 0,
    description: 'Presença essencial no guia.',
    features: [
      'Perfil com informações essenciais no guia local',
      'Até 3 fotos na galeria (logo e capa à parte)',
      'Canal direto para WhatsApp e telefone',
      'CRM de mensagens e contatos recebidos',
      'Métricas essenciais de visualizações'
    ]
  },
  gold_vip: {
    id: 'plan_gold_vip',
    name: 'Gold VIP',
    displayName: 'Gold VIP',
    price: 49.90,
    billingCycle: 'monthly',
    version: 1,
    maxGalleryPhotos: 15,
    maxProducts: 5,
    maxCoupons: 1,
    hasHomeHighlight: true,
    hasCrm: true,
    hasFullPresentation: true,
    hasAnalytics: true,
    priorityLevel: 2,
    badge: 'Mais Popular',
    buttonText: 'Assinar Gold VIP',
    sortOrder: 2,
    isRecommended: true,
    allowNewSubscriptions: true,
    trialDays: 0,
    description: 'Mais exposição e vitrine ampliada.',
    features: [
      'Mais exposição com destaque rotativo na Home',
      'Vitrine ampliada com apresentação completa e capa',
      'Até 15 fotos na galeria exclusiva',
      'Catálogo com até 5 produtos ou serviços',
      '1 promoção ou cupom de desconto ativo',
      'Selo VIP de estabelecimento verificado',
      'Perfil exclusivo sem anúncios de concorrentes'
    ]
  },
  diamond_extremo: {
    id: 'plan_diamond_extremo',
    name: 'Diamond',
    displayName: 'Diamond',
    price: 99.90,
    billingCycle: 'monthly',
    version: 1,
    maxGalleryPhotos: 30,
    maxProducts: 30,
    maxCoupons: 3,
    hasHomeHighlight: true,
    hasCrm: true,
    hasFullPresentation: true,
    hasAnalytics: true,
    priorityLevel: 3,
    badge: 'Máxima Exposição',
    buttonText: 'Assinar Diamond',
    sortOrder: 3,
    isRecommended: false,
    allowNewSubscriptions: true,
    trialDays: 0,
    description: 'Recursos Gold com maior capacidade de catálogo, fotos e promoções.',
    features: [
      'Todos os benefícios e recursos do plano Gold VIP',
      'Maior capacidade de catálogo: até 30 produtos ou serviços',
      'Galeria expandida: até 30 fotos em alta qualidade',
      'Até 3 promoções ou cupons simultâneos',
      'Posicionamento prioritário nas buscas por categoria',
      'Selo Diamante de parceiro oficial',
      'Mini-site exclusivo de alta conversão sem concorrentes'
    ]
  }
};

/** Normaliza aliases históricos de planos para o Tier canônico */
export function normalizePlanTier(rawTier: string | null | undefined): PlanTier {
  if (!rawTier) return 'bronze';
  const lower = String(rawTier).toLowerCase().trim();
  if (lower === 'diamond' || lower === 'diamond_extremo' || lower === 'plan_diamond_extremo') {
    return 'diamond_extremo';
  }
  if (lower === 'ouro' || lower === 'gold_vip' || lower === 'plan_gold_vip' || lower === 'prata') {
    return 'gold_vip';
  }
  return 'bronze';
}

export interface ResourceUsage {
  galleryPhotosCount: number;
  productsCount: number;
  couponsCount: number;
  logoConfigured: boolean;
  coverConfigured: boolean;
}

export interface CompanyEntitlements {
  companyId: string;
  companyName: string;
  planTier: PlanTier;
  planName: string;
  grantType: AccessGrantType;
  grantDetails: {
    isTrial: boolean;
    trialEndsAt?: string | null;
    trialEligible?: boolean;
    hasUsedTrial?: boolean;
    subscriptionId?: string | null;
    subscriptionStatus?: string | null;
    paymentType?: 'subscription' | 'onetime_pix' | null;
    paymentMethod?: string | null;
    nextBillingDate?: string | null;
    contractedPrice?: number | null;
    isAdminGrant: boolean;
    adminGrantEndDate?: string | null;
    adminGrantReason?: string | null;
  };
  limits: PlanLimits;
  usage: ResourceUsage;
  canAdd: {
    photos: boolean;
    products: boolean;
    coupons: boolean;
  };
  warnings?: string[];
}

export class EntitlementService {
  /**
   * Retorna os planos do catálogo consultando o banco dinamicamente, com fallback para os canônicos.
   * Permite que edições no painel administrativo reflitam imediatamente sem novo deploy.
   */
  static async getPlansCatalog(): Promise<PlanDefinition[]> {
    try {
      const [rows]: any = await pool.query(
        `SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC, price ASC`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => {
          let parsedFeatures: string[] = [];
          if (Array.isArray(r.features)) {
            parsedFeatures = r.features;
          } else if (typeof r.features === 'string') {
            try {
              parsedFeatures = JSON.parse(r.features);
            } catch {
              parsedFeatures = [r.features];
            }
          }
          return {
            id: String(r.id),
            name: String(r.name),
            displayName: r.display_name || String(r.name),
            price: Number(r.price) || 0,
            billingCycle: 'monthly',
            version: Number(r.version) || 1,
            description: r.description || '',
            maxGalleryPhotos: Number(r.max_gallery_photos ?? 3),
            maxProducts: Number(r.max_products ?? 0),
            maxCoupons: Number(r.max_coupons ?? 0),
            hasHomeHighlight: Boolean(r.has_home_highlight),
            hasCrm: Boolean(r.has_crm),
            hasFullPresentation: Boolean(r.has_full_presentation),
            hasAnalytics: Boolean(r.has_analytics),
            priorityLevel: Number(r.sort_order ?? 1),
            badge: r.badge || undefined,
            buttonText: r.button_text || undefined,
            sortOrder: Number(r.sort_order ?? 0),
            isRecommended: Boolean(r.is_recommended),
            allowNewSubscriptions: r.allow_new_subscriptions !== undefined ? Boolean(r.allow_new_subscriptions) : true,
            trialDays: Number(r.trial_days ?? 0),
            features: parsedFeatures
          };
        });
      }
    } catch {
      // Fallback gracioso para os planos padrão em caso de banco offline ou tabela inacessível
    }
    return Object.values(CANONICAL_PLANS);
  }

  /**
   * Retorna os limites padrão para um dado nível de plano
   */
  static getPlanLimits(tier: string | null | undefined): PlanLimits {
    const canonical = normalizePlanTier(tier);
    return { ...CANONICAL_PLANS[canonical] };
  }

  /**
   * Avalia a origem da concessão de acesso e os direitos efetivos de uma empresa.
   * Regra estrita: a expiração de uma concessão administrativa NUNCA remove uma contratação paga válida.
   */
  static async getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements> {
    // 1. Buscar dados da empresa
    const [companyRows]: any = await pool.query(
      `SELECT id, name, slug, logo, coverImage, isSponsored, planLevel, 
              access_grant_type, trial_ends_at, has_used_trial
       FROM companies WHERE id = ? LIMIT 1`,
      [companyId]
    ).catch(async () => {
      return await pool.query(
        `SELECT id, name, slug, logo, coverImage, isSponsored, planLevel,
                access_grant_type, trial_ends_at, 0 as has_used_trial
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
    }).catch(async () => {
      return await pool.query(
        `SELECT id, name, slug, logo, coverImage, isSponsored, planLevel,
                'bronze' as access_grant_type, NULL as trial_ends_at, 0 as has_used_trial
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
    });

    if (!companyRows || companyRows.length === 0) {
      throw new Error(`Empresa ${companyId} não encontrada.`);
    }

    const company = companyRows[0];
    const rawPlan = company.planLevel || 'bronze';

    // 2. Verificar se há assinatura paga ativa no banco (preservando condições contratadas)
    const [subsRows]: any = await pool.query(
      `SELECT id, planId, status, amount, paymentMethod, payment_type, contracted_price, nextBillingDate, createdAt
       FROM subscriptions
       WHERE companyId = ? AND status = 'active'
       ORDER BY createdAt DESC LIMIT 1`,
      [companyId]
    ).catch(async () => {
      return await pool.query(
        `SELECT id, planId, status, amount, paymentMethod, NULL as payment_type, amount as contracted_price, nextBillingDate, createdAt
         FROM subscriptions
         WHERE companyId = ? AND status = 'active'
         ORDER BY createdAt DESC LIMIT 1`,
        [companyId]
      ).catch(() => [[]]);
    });

    const activeSub = subsRows && subsRows.length > 0 ? subsRows[0] : null;

    // 2.1 Verificar concessão administrativa registrada em admin_plan_grants
    const [grantRows]: any = await pool.query(
      `SELECT id, granted_plan, start_date, end_date, reason, status
       FROM admin_plan_grants
       WHERE company_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    ).catch(() => [[]]);

    const activeGrant = grantRows && grantRows.length > 0 ? grantRows[0] : null;
    const now = new Date();

    // Se houver concessão ativa expirada pelo tempo:
    let validAdminGrant = activeGrant;
    if (activeGrant && new Date(activeGrant.end_date) <= now) {
      validAdminGrant = null;
      await pool.query(
        `UPDATE admin_plan_grants SET status = 'expired' WHERE id = ?`,
        [activeGrant.id]
      ).catch(() => {});

      // Expiração não pode remover outra contratação válida:
      const fallbackPlan = activeSub ? normalizePlanTier(activeSub.planId) : 'bronze';
      const fallbackGrantType = activeSub ? 'paid' : 'bronze';
      await pool.query(
        `UPDATE companies SET planLevel = ?, access_grant_type = ?, isSponsored = ? WHERE id = ?`,
        [fallbackPlan, fallbackGrantType, activeSub ? 1 : 0, companyId]
      ).catch(() => {});
      company.planLevel = fallbackPlan;
      company.access_grant_type = fallbackGrantType;
    }

    // Se o período de teste de 7 dias expirou pelo tempo:
    // Regra estrita: teste sem autorização de cobrança termina sem débito e retorna ao direito válido disponível.
    if (company.trial_ends_at && new Date(company.trial_ends_at) <= now && company.access_grant_type === 'trial') {
      const fallbackPlan = activeSub ? normalizePlanTier(activeSub.planId) : 'bronze';
      const fallbackGrantType = activeSub ? 'paid' : 'bronze';
      await pool.query(
        `UPDATE companies SET planLevel = ?, access_grant_type = ?, isSponsored = ? WHERE id = ?`,
        [fallbackPlan, fallbackGrantType, activeSub ? 1 : 0, companyId]
      ).catch(() => {});
      company.planLevel = fallbackPlan;
      company.access_grant_type = fallbackGrantType;
    }

    // 3. Determinar o Grant Type (Origem da concessão)
    let grantType: AccessGrantType = 'bronze';
    let effectiveTier: PlanTier = 'bronze';
    let isTrial = false;
    let trialEndsAt: string | null = null;
    let isAdminGrant = false;

    if (validAdminGrant) {
      // Concessão administrativa ativa
      grantType = 'admin_grant';
      isAdminGrant = true;
      effectiveTier = normalizePlanTier(validAdminGrant.granted_plan);
    } else if (company.trial_ends_at && new Date(company.trial_ends_at) > now) {
      grantType = 'trial';
      isTrial = true;
      trialEndsAt = new Date(company.trial_ends_at).toISOString();
      effectiveTier = normalizePlanTier(company.planLevel || 'gold_vip');
    } else if (activeSub) {
      // Assinatura paga ativa preservada
      grantType = 'paid';
      effectiveTier = normalizePlanTier(activeSub.planId || company.planLevel);
    } else if (company.access_grant_type === 'admin_grant' || Number(company.isSponsored) === 1) {
      grantType = 'admin_grant';
      isAdminGrant = true;
      effectiveTier = normalizePlanTier(company.planLevel);
    } else {
      grantType = 'bronze';
      effectiveTier = normalizePlanTier(rawPlan);
    }

    const limits = this.getPlanLimits(effectiveTier);

    // 4. Calcular o uso real de recursos
    // REGRA DE OURO: Logo e capa NÃO contam como fotos de galeria!
    const logoUrl = company.logo ? String(company.logo).trim() : null;
    const coverUrl = company.coverImage ? String(company.coverImage).trim() : null;

    const [mediaRows]: any = await pool.query(
      `SELECT id, url FROM media_items WHERE entityId = ? AND entityType = 'company'`,
      [companyId]
    ).catch(() => [[]]);

    const galleryPhotos = (mediaRows || []).filter((m: any) => {
      const u = String(m.url || '').trim();
      if (!u) return false;
      if (logoUrl && u === logoUrl) return false;
      if (coverUrl && u === coverUrl) return false;
      return true;
    });

    const [productsRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM products WHERE company_id = ?`,
      [companyId]
    ).catch(() => [[{ count: 0 }]]);

    const [couponsRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM coupons WHERE company_id = ? OR companyId = ?`,
      [companyId, companyId]
    ).catch(() => [[{ count: 0 }]]);

    const usage: ResourceUsage = {
      galleryPhotosCount: galleryPhotos.length,
      productsCount: Number(productsRows[0]?.count || 0),
      couponsCount: Number(couponsRows[0]?.count || 0),
      logoConfigured: Boolean(logoUrl),
      coverConfigured: Boolean(coverUrl)
    };

    // 5. Determinar capacidade de adicionar novos recursos
    // REGRA DE PRESERVAÇÃO: Não apagar itens excedentes! Se usage >= limite, canAdd = false.
    const canAdd = {
      photos: usage.galleryPhotosCount < limits.maxGalleryPhotos,
      products: usage.productsCount < limits.maxProducts,
      coupons: usage.couponsCount < limits.maxCoupons
    };

    const warnings: string[] = [];
    if (usage.productsCount > limits.maxProducts && limits.maxProducts === 0) {
      warnings.push(`Você possui ${usage.productsCount} produtos cadastrados. Seu plano atual não permite publicar novos produtos, mas os existentes estão preservados.`);
    } else if (usage.productsCount > limits.maxProducts) {
      warnings.push(`Você possui ${usage.productsCount} de ${limits.maxProducts} produtos cadastrados. Upgrade necessário para adicionar novos itens.`);
    }

    if (usage.galleryPhotosCount > limits.maxGalleryPhotos) {
      warnings.push(`Você possui ${usage.galleryPhotosCount} de ${limits.maxGalleryPhotos} fotos de galeria. Upgrade necessário para novas fotos.`);
    }

    const hasUsedTrial = Boolean(company.has_used_trial || company.trial_ends_at);
    const trialEligible = !activeSub && !hasUsedTrial && (normalizePlanTier(company.planLevel) === 'bronze');

    return {
      companyId: company.id,
      companyName: company.name,
      planTier: effectiveTier,
      planName: CANONICAL_PLANS[effectiveTier].name,
      grantType,
      grantDetails: {
        isTrial,
        trialEndsAt,
        trialEligible,
        hasUsedTrial,
        subscriptionId: activeSub?.id ?? null,
        subscriptionStatus: activeSub?.status ?? null,
        paymentType: activeSub?.payment_type ?? (activeSub?.paymentMethod === 'pix' ? 'onetime_pix' : activeSub ? 'subscription' : null),
        paymentMethod: activeSub?.paymentMethod ?? null,
        nextBillingDate: activeSub?.nextBillingDate ? new Date(activeSub.nextBillingDate).toISOString() : null,
        contractedPrice: activeSub?.contracted_price ? Number(activeSub.contracted_price) : activeSub?.amount ? Number(activeSub.amount) : null,
        isAdminGrant,
        adminGrantEndDate: validAdminGrant ? new Date(validAdminGrant.end_date).toISOString() : null,
        adminGrantReason: validAdminGrant?.reason ?? null
      },
      limits,
      usage,
      canAdd,
      warnings
    };
  }

  /**
   * Verifica se uma empresa é elegível para os 7 dias de experiência Gold.
   * Regra estrita: Novos clientes com perfil Bronze que nunca utilizaram o período de teste.
   */
  static async checkTrialEligibility(companyId: string): Promise<{
    eligible: boolean;
    reason?: string;
    hasUsedTrial: boolean;
    trialEndsAt: string | null;
  }> {
    const [rows]: any = await pool.query(
      `SELECT id, planLevel, access_grant_type, trial_ends_at, has_used_trial
       FROM companies WHERE id = ? LIMIT 1`,
      [companyId]
    ).catch(async () => {
      return await pool.query(
        `SELECT id, planLevel, access_grant_type, trial_ends_at, 0 as has_used_trial
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
    }).catch(async () => {
      return await pool.query(
        `SELECT id, planLevel, 'bronze' as access_grant_type, NULL as trial_ends_at, 0 as has_used_trial
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
    });

    if (!rows || rows.length === 0) {
      return { eligible: false, reason: 'Empresa não encontrada.', hasUsedTrial: false, trialEndsAt: null };
    }

    const c = rows[0];
    const hasUsed = Boolean(c.has_used_trial || c.trial_ends_at);
    const trialEndsAt = c.trial_ends_at ? new Date(c.trial_ends_at).toISOString() : null;

    if (hasUsed) {
      return {
        eligible: false,
        reason: 'Esta empresa já usufruiu dos 7 dias de experiência Gold.',
        hasUsedTrial: true,
        trialEndsAt
      };
    }

    const [subs]: any = await pool.query(
      `SELECT id FROM subscriptions WHERE companyId = ? AND status = 'active' LIMIT 1`,
      [companyId]
    ).catch(() => [[]]);

    if (subs && subs.length > 0) {
      return {
        eligible: false,
        reason: 'A empresa já possui uma contratação ativa.',
        hasUsedTrial: false,
        trialEndsAt: null
      };
    }

    return {
      eligible: true,
      hasUsedTrial: false,
      trialEndsAt: null
    };
  }

  /**
   * Inicia os 7 dias de experiência Gold para novos clientes elegíveis.
   * Regra estrita: Sem autorização de cobrança, sem cartão de crédito, sem débito automático.
   * Ao término, retorna automaticamente para o plano Bronze sem gerar débitos.
   */
  static async startSevenDayGoldTrial(companyId: string): Promise<{
    success: boolean;
    trialEndsAt: string;
    planTier: PlanTier;
    message: string;
  }> {
    const check = await this.checkTrialEligibility(companyId);
    if (!check.eligible) {
      throw new Error(check.reason || 'Empresa não elegível para teste de 7 dias.');
    }

    const trialDurationMs = 7 * 24 * 60 * 60 * 1000;
    const endsAt = new Date(Date.now() + trialDurationMs);

    await pool.query(
      `UPDATE companies
       SET planLevel = 'gold_vip',
           access_grant_type = 'trial',
           trial_ends_at = ?,
           has_used_trial = 1,
           isSponsored = 1
       WHERE id = ?`,
      [endsAt, companyId]
    );

    return {
      success: true,
      trialEndsAt: endsAt.toISOString(),
      planTier: 'gold_vip',
      message: 'Experiência Gold de 7 dias ativada com sucesso! Sem débito automático ao término.'
    };
  }

  /**
   * Validador estrito antes de criar novo produto
   */
  static async checkCanAddProduct(companyId: string): Promise<{
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
    message?: string;
  }> {
    const ent = await this.getCompanyEntitlements(companyId);
    if (!ent.canAdd.products) {
      const msg = ent.limits.maxProducts === 0
        ? `O plano ${ent.planName} não permite o cadastro de novos produtos ou serviços. Faça upgrade para o Gold VIP ou Diamond para publicar itens.`
        : `Limite de ${ent.limits.maxProducts} produtos atingido para o plano ${ent.planName}. Faça upgrade para adicionar mais produtos.`;
      return {
        allowed: false,
        current: ent.usage.productsCount,
        max: ent.limits.maxProducts,
        planName: ent.planName,
        message: msg
      };
    }
    return {
      allowed: true,
      current: ent.usage.productsCount,
      max: ent.limits.maxProducts,
      planName: ent.planName
    };
  }

  /**
   * Validador estrito antes de criar novo cupom / promoção
   */
  static async checkCanAddCoupon(companyId: string): Promise<{
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
    message?: string;
  }> {
    const ent = await this.getCompanyEntitlements(companyId);
    if (!ent.canAdd.coupons) {
      const msg = ent.limits.maxCoupons === 0
        ? `O plano ${ent.planName} não permite criar promoções ou cupons de desconto. Faça upgrade para o Gold VIP (1 promoção) ou Diamond (3 promoções).`
        : `Limite de ${ent.limits.maxCoupons} promoção(ões) ativa(s) atingido para o plano ${ent.planName}.`;
      return {
        allowed: false,
        current: ent.usage.couponsCount,
        max: ent.limits.maxCoupons,
        planName: ent.planName,
        message: msg
      };
    }
    return {
      allowed: true,
      current: ent.usage.couponsCount,
      max: ent.limits.maxCoupons,
      planName: ent.planName
    };
  }

  /**
   * Validador estrito antes de enviar foto para galeria
   */
  static async checkCanAddGalleryPhoto(companyId: string): Promise<{
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
    message?: string;
  }> {
    const ent = await this.getCompanyEntitlements(companyId);
    if (!ent.canAdd.photos) {
      return {
        allowed: false,
        current: ent.usage.galleryPhotosCount,
        max: ent.limits.maxGalleryPhotos,
        planName: ent.planName,
        message: `Limite de ${ent.limits.maxGalleryPhotos} fotos de galeria atingido para o plano ${ent.planName}. (Logo e capa não contam).`
      };
    }
    return {
      allowed: true,
      current: ent.usage.galleryPhotosCount,
      max: ent.limits.maxGalleryPhotos,
      planName: ent.planName
    };
  }

  /**
   * Concede Gold VIP ou Diamond promocional administrativamente.
   * Não gera cobrança nem pagamento fictício.
   */
  static async grantAdminPlan(
    companyId: string,
    grantedPlan: string,
    startDateStr: string,
    endDateStr: string,
    reason: string,
    user?: { id?: string; email?: string }
  ) {
    const tier = normalizePlanTier(grantedPlan);
    if (tier !== 'gold_vip' && tier !== 'diamond_extremo') {
      throw new Error('Apenas os planos Gold VIP ou Diamond podem ser concedidos promocionalmente.');
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Datas de início e término inválidas.');
    }
    if (end <= start) {
      throw new Error('A data de término deve ser posterior à data de início.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('O motivo da concessão deve ter no mínimo 5 caracteres.');
    }

    // 1. Desativar concessões ativas anteriores
    await pool.query(
      `UPDATE admin_plan_grants 
       SET status = 'revoked', revoked_at = NOW(), revoked_reason = 'Substituída por nova concessão'
       WHERE company_id = ? AND status = 'active'`,
      [companyId]
    ).catch(() => {});

    // 2. Inserir nova concessão
    const grantId = `grant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO admin_plan_grants 
       (id, company_id, granted_plan, start_date, end_date, reason, status, granted_by_user_id, granted_by_email)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        grantId,
        companyId,
        tier,
        start.toISOString().slice(0, 19).replace('T', ' '),
        end.toISOString().slice(0, 19).replace('T', ' '),
        reason.trim(),
        user?.id || null,
        user?.email || null
      ]
    );

    // 3. Atualizar empresa (sem gerar pagamento ou registro de gateway falso)
    await pool.query(
      `UPDATE companies 
       SET planLevel = ?, access_grant_type = 'admin_grant', isSponsored = 1 
       WHERE id = ?`,
      [tier, companyId]
    );

    return {
      success: true,
      grantId,
      companyId,
      grantedPlan: tier,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }

  /**
   * Revoga a concessão promocional de uma empresa.
   * Preserva qualquer contratação paga existente (não a remove).
   */
  static async revokeAdminPlan(
    companyId: string,
    reason?: string,
    _user?: { id?: string; email?: string }
  ) {
    const revokeReason = reason?.trim() || 'Revogação manual pelo administrador';

    // 1. Marcar concessões ativas como revogadas
    await pool.query(
      `UPDATE admin_plan_grants 
       SET status = 'revoked', revoked_at = NOW(), revoked_reason = ?
       WHERE company_id = ? AND status = 'active'`,
      [revokeReason, companyId]
    ).catch(() => {});

    // 2. Checar se a empresa tem assinatura paga ativa para restaurar
    const [subsRows]: any = await pool.query(
      `SELECT id, planId FROM subscriptions WHERE companyId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 1`,
      [companyId]
    ).catch(() => [[]]);

    const activeSub = subsRows && subsRows.length > 0 ? subsRows[0] : null;
    const restoredPlan = activeSub ? normalizePlanTier(activeSub.planId) : 'bronze';
    const restoredGrantType = activeSub ? 'paid' : 'bronze';

    // 3. Restaurar plano da empresa
    await pool.query(
      `UPDATE companies 
       SET planLevel = ?, access_grant_type = ?, isSponsored = ? 
       WHERE id = ?`,
      [restoredPlan, restoredGrantType, activeSub ? 1 : 0, companyId]
    );

    return {
      success: true,
      companyId,
      restoredPlan,
      restoredGrantType
    };
  }

  /**
   * Renova ou estende o prazo de uma concessão ativa
   */
  static async renewAdminPlan(
    companyId: string,
    newEndDateStr: string,
    reason?: string,
    _user?: { id?: string; email?: string }
  ) {
    const newEnd = new Date(newEndDateStr);
    if (isNaN(newEnd.getTime()) || newEnd <= new Date()) {
      throw new Error('A nova data de término deve ser válida e posterior ao momento atual.');
    }

    const renewalReason = reason?.trim() ? ` | Renovado: ${reason.trim()}` : ' | Prazo renovado';

    const [result]: any = await pool.query(
      `UPDATE admin_plan_grants 
       SET end_date = ?, reason = CONCAT(reason, ?)
       WHERE company_id = ? AND status = 'active'`,
      [newEnd.toISOString().slice(0, 19).replace('T', ' '), renewalReason, companyId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Não há concessão ativa para ser renovada nesta empresa.');
    }

    return {
      success: true,
      companyId,
      newEndDate: newEnd.toISOString()
    };
  }

  /**
   * Consulta histórico de concessões administrativas de uma empresa
   */
  static async getGrantsHistory(companyId: string) {
    const [rows]: any = await pool.query(
      `SELECT id, company_id, granted_plan, start_date, end_date, reason, status,
              granted_by_user_id, granted_by_email, revoked_at, revoked_reason, created_at, updated_at
       FROM admin_plan_grants
       WHERE company_id = ?
       ORDER BY created_at DESC`,
      [companyId]
    ).catch(() => [[]]);

    return rows || [];
  }

  /**
   * Atualização de planos pelo administrador com validação estrita e auditoria.
   * Regra: Alterar texto comercial NUNCA concede permissões técnicas automaticamente.
   */
  static async updatePlan(
    planId: string,
    updates: Record<string, any>,
    user?: { id?: string; email?: string },
    ipAddress?: string
  ) {
    // 1. Buscar plano atual
    const [rows]: any = await pool.query(
      `SELECT * FROM plans WHERE id = ? LIMIT 1`,
      [planId]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`Plano ${planId} não encontrado.`);
    }
    const current = rows[0];

    // 2. Validações estritas de tipos
    const price = updates.price !== undefined ? Math.max(0, Number(updates.price)) : Number(current.price);
    const maxGalleryPhotos = updates.maxGalleryPhotos !== undefined
      ? Math.max(0, parseInt(String(updates.maxGalleryPhotos), 10))
      : Number(current.max_gallery_photos ?? 3);
    const maxProducts = updates.maxProducts !== undefined
      ? Math.max(0, parseInt(String(updates.maxProducts), 10))
      : Number(current.max_products ?? 0);
    const maxCoupons = updates.maxCoupons !== undefined
      ? Math.max(0, parseInt(String(updates.maxCoupons), 10))
      : Number(current.max_coupons ?? 0);

    const hasHomeHighlight = updates.hasHomeHighlight !== undefined
      ? (updates.hasHomeHighlight ? 1 : 0)
      : Number(current.has_home_highlight ?? 0);
    const hasCrm = updates.hasCrm !== undefined
      ? (updates.hasCrm ? 1 : 0)
      : Number(current.has_crm ?? 1);
    const hasFullPresentation = updates.hasFullPresentation !== undefined
      ? (updates.hasFullPresentation ? 1 : 0)
      : Number(current.has_full_presentation ?? 0);
    const hasAnalytics = updates.hasAnalytics !== undefined
      ? (updates.hasAnalytics ? 1 : 0)
      : Number(current.has_analytics ?? 1);

    const displayName = updates.displayName ? String(updates.displayName).trim() : (current.display_name || current.name);
    const description = updates.description !== undefined ? String(updates.description).trim() : current.description;
    const badge = updates.badge !== undefined ? String(updates.badge).trim() : current.badge;
    const buttonText = updates.buttonText !== undefined ? String(updates.buttonText).trim() : current.button_text;
    const sortOrder = updates.sortOrder !== undefined ? parseInt(String(updates.sortOrder), 10) : Number(current.sort_order ?? 0);
    const isRecommended = updates.isRecommended !== undefined ? (updates.isRecommended ? 1 : 0) : Number(current.is_recommended ?? 0);
    const allowNewSubscriptions = updates.allowNewSubscriptions !== undefined
      ? (updates.allowNewSubscriptions ? 1 : 0)
      : Number(current.allow_new_subscriptions ?? 1);
    const trialDays = updates.trialDays !== undefined ? Math.max(0, parseInt(String(updates.trialDays), 10)) : Number(current.trial_days ?? 0);

    let featuresJson = current.features;
    if (updates.features) {
      const arr = Array.isArray(updates.features) ? updates.features : [String(updates.features)];
      featuresJson = JSON.stringify(arr);
    }

    // 3. Montar log de auditoria
    const changes: Record<string, { before: any; after: any }> = {};
    if (Number(current.price) !== price) changes.price = { before: current.price, after: price };
    if (Number(current.max_gallery_photos) !== maxGalleryPhotos) changes.maxGalleryPhotos = { before: current.max_gallery_photos, after: maxGalleryPhotos };
    if (Number(current.max_products) !== maxProducts) changes.maxProducts = { before: current.max_products, after: maxProducts };
    if (Number(current.max_coupons) !== maxCoupons) changes.maxCoupons = { before: current.max_coupons, after: maxCoupons };
    if (current.display_name !== displayName) changes.displayName = { before: current.display_name, after: displayName };
    if (current.description !== description) changes.description = { before: current.description, after: description };
    if (current.badge !== badge) changes.badge = { before: current.badge, after: badge };
    if (current.button_text !== buttonText) changes.buttonText = { before: current.button_text, after: buttonText };
    if (current.is_recommended !== isRecommended) changes.isRecommended = { before: current.is_recommended, after: isRecommended };
    if (current.allow_new_subscriptions !== allowNewSubscriptions) changes.allowNewSubscriptions = { before: current.allow_new_subscriptions, after: allowNewSubscriptions };
    if (current.trial_days !== trialDays) changes.trialDays = { before: current.trial_days, after: trialDays };

    // 4. Salvar na tabela plans
    await pool.query(
      `UPDATE plans SET
         display_name = ?, description = ?, price = ?,
         max_gallery_photos = ?, max_products = ?, max_coupons = ?,
         has_home_highlight = ?, has_crm = ?, has_full_presentation = ?, has_analytics = ?,
         badge = ?, button_text = ?, sort_order = ?, is_recommended = ?,
         allow_new_subscriptions = ?, trial_days = ?, features = ?
       WHERE id = ?`,
      [
        displayName, description, price,
        maxGalleryPhotos, maxProducts, maxCoupons,
        hasHomeHighlight, hasCrm, hasFullPresentation, hasAnalytics,
        badge, buttonText, sortOrder, isRecommended,
        allowNewSubscriptions, trialDays, featuresJson,
        planId
      ]
    );

    // 5. Registrar na tabela plan_audit_logs
    if (Object.keys(changes).length > 0) {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO plan_audit_logs 
         (id, plan_id, action, changed_by_user_id, changed_by_email, changes_json, ip_address)
         VALUES (?, ?, 'update', ?, ?, ?, ?)`,
        [
          auditId,
          planId,
          user?.id || null,
          user?.email || null,
          JSON.stringify(changes),
          ipAddress || null
        ]
      ).catch(() => {});
    }

    return {
      success: true,
      planId,
      changes
    };
  }

  /**
   * Consulta histórico de auditoria de alterações em planos
   */
  static async getPlanAuditLogs(planId?: string) {
    const query = planId
      ? `SELECT * FROM plan_audit_logs WHERE plan_id = ? ORDER BY created_at DESC LIMIT 100`
      : `SELECT * FROM plan_audit_logs ORDER BY created_at DESC LIMIT 100`;
    const params = planId ? [planId] : [];
    const [rows]: any = await pool.query(query, params).catch(() => [[]]);
    return rows || [];
  }
}

