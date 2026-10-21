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
  price: number;
  billingCycle: 'monthly';
  version: number;
  description: string;
}

export const CANONICAL_PLANS: Record<PlanTier, PlanDefinition> = {
  bronze: {
    id: 'plan_bronze',
    name: 'Bronze',
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
    description: 'Perfil essencial no diretório de Itapoá com CRM e 3 fotos na galeria.'
  },
  gold_vip: {
    id: 'plan_gold_vip',
    name: 'Gold VIP',
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
    description: 'Apresentação completa, 15 fotos, 5 produtos, 1 promoção e destaque rotativo na Home.'
  },
  diamond_extremo: {
    id: 'plan_diamond_extremo',
    name: 'Diamond',
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
    description: 'Topo das buscas, 30 fotos, 30 produtos, 3 promoções e mini-site de máxima visibilidade.'
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
    subscriptionId?: string | null;
    subscriptionStatus?: string | null;
    isAdminGrant: boolean;
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
   * Retorna os planos canônicos com limites e preços versionados
   */
  static getPlansCatalog(): PlanDefinition[] {
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
   * Avalia a origem da concessão de acesso e os direitos efetivos de uma empresa
   */
  static async getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements> {
    // 1. Buscar dados da empresa
    const [companyRows]: any = await pool.query(
      `SELECT id, name, slug, logo, coverImage, isSponsored, planLevel, 
              access_grant_type, trial_ends_at
       FROM companies WHERE id = ? LIMIT 1`,
      [companyId]
    ).catch(async () => {
      // Fallback caso colunas da migration ainda não existam no MySQL legado
      return await pool.query(
        `SELECT id, name, slug, logo, coverImage, isSponsored, planLevel
         FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );
    });

    if (!companyRows || companyRows.length === 0) {
      throw new Error(`Empresa ${companyId} não encontrada.`);
    }

    const company = companyRows[0];
    const rawPlan = company.planLevel || 'bronze';

    // 2. Verificar se há assinatura paga ativa no banco
    const [subsRows]: any = await pool.query(
      `SELECT id, planId, status, nextBillingDate, createdAt
       FROM subscriptions
       WHERE companyId = ? AND status = 'active'
       ORDER BY createdAt DESC LIMIT 1`,
      [companyId]
    ).catch(() => [[]]);

    const activeSub = subsRows && subsRows.length > 0 ? subsRows[0] : null;

    // 3. Determinar o Grant Type (Origem da concessão)
    let grantType: AccessGrantType = 'bronze';
    let effectiveTier: PlanTier = 'bronze';
    let isTrial = false;
    let trialEndsAt: string | null = null;
    let isAdminGrant = false;

    const now = new Date();
    if (company.trial_ends_at && new Date(company.trial_ends_at) > now) {
      grantType = 'trial';
      isTrial = true;
      trialEndsAt = new Date(company.trial_ends_at).toISOString();
      effectiveTier = normalizePlanTier(company.planLevel || 'gold_vip');
    } else if (activeSub) {
      grantType = 'paid';
      effectiveTier = normalizePlanTier(activeSub.planId || company.planLevel);
    } else if (Number(company.isSponsored) === 1 || company.access_grant_type === 'admin_grant') {
      grantType = 'admin_grant';
      isAdminGrant = true;
      // Concessão manual administrativa: respeita o planLevel concedido pelo admin
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

    return {
      companyId: company.id,
      companyName: company.name,
      planTier: effectiveTier,
      planName: CANONICAL_PLANS[effectiveTier].name,
      grantType,
      grantDetails: {
        isTrial,
        trialEndsAt,
        subscriptionId: activeSub?.id ?? null,
        subscriptionStatus: activeSub?.status ?? null,
        isAdminGrant
      },
      limits,
      usage,
      canAdd,
      warnings
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
}
