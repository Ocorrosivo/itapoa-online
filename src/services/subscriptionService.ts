/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Subscription & Plans Service Layer - Clean Architecture
 */



export interface PlanData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  mercado_pago_plan_id?: string;
  is_active: boolean;
  features: string[];
}

export interface Subscription {
  id: string;
  companyId: string;
  planCode: string;
  status: 'trial' | 'active' | 'pending' | 'past_due' | 'canceled' | 'suspended';
  priceMonthly: number;
  trialStartsAt: string;
  trialEndsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  canceledReason?: string;
}

export class SubscriptionService {
  /**
   * Create trial subscription object
   */
  static createTrialSubscription(companyId: string, planLevel: string = 'bronze'): Subscription {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: `sub_${companyId.slice(0, 8)}`,
      companyId,
      planCode: planLevel.toLowerCase(),
      status: 'trial',
      priceMonthly: planLevel.toLowerCase() === 'ouro' ? 199 : planLevel.toLowerCase() === 'prata' ? 99 : 49,
      trialStartsAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString()
    };
  }

  /**
   * Get Trial Days Remaining Info
   */
  static getTrialDaysRemaining(sub: Subscription | null) {
    if (!sub || sub.status !== 'trial') {
      return { isTrial: false, isExpired: false, daysRemaining: 0, message: 'Assinatura Ativa' };
    }
    const end = new Date(sub.trialEndsAt);
    const now = new Date();
    const diff = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      isTrial: true,
      isExpired: diff <= 0,
      daysRemaining: diff,
      message: diff > 0 ? `Restam ${diff} dias de teste gratuito sem cartão` : 'Período de Teste Gratuito Expirado'
    };
  }

  /**
   * Fetch active plans dynamically from database
   */
  static async getActivePlans(): Promise<PlanData[]> {
    try {
      const res = await fetch('/api/plans?active=true');
      if (!res.ok) throw new Error('API falhou');
      const data = await res.json();
      if (!data || data.length === 0) {
        return [
          {
            id: 'p1',
            name: 'Plano Bronze',
            slug: 'bronze',
            description: 'Presença digital básica em Itapoá SC.',
            price_monthly: 49.00,
            price_yearly: 490.00,
            trial_days: 7,
            is_active: true,
            features: ['Mini-Site Completo', 'Galeria de Fotos', 'WhatsApp Direto', '7 Dias de Teste Grátis']
          },
          {
            id: 'p2',
            name: 'Plano Prata',
            slug: 'prata',
            description: 'Destaque comercial para produtos e promoções.',
            price_monthly: 99.00,
            price_yearly: 990.00,
            trial_days: 7,
            is_active: true,
            features: ['Tudo do Bronze', 'Catálogo de Produtos', 'Leads no CRM', '7 Dias de Teste Grátis']
          },
          {
            id: 'p3',
            name: 'Plano Ouro',
            slug: 'ouro',
            description: 'Liderança nas buscas com métricas de BI.',
            price_monthly: 199.00,
            price_yearly: 1990.00,
            trial_days: 7,
            is_active: true,
            features: ['Tudo do Prata', 'Banner de Destaque', 'Selo Verificado AME', '7 Dias de Teste Grátis']
          },
          {
            id: 'p4',
            name: 'Plano Diamond Extra VIP',
            slug: 'diamond',
            description: 'Posição Diamante no topo da Home Page.',
            price_monthly: 399.00,
            price_yearly: 3990.00,
            trial_days: 7,
            is_active: true,
            features: ['Tudo do Ouro', 'Topo da Home Page', 'IA Lojista 24h', '7 Dias de Teste Grátis']
          }
        ];
      }

      return data.map(item => ({
        id: item.id,
        name: item.nome,
        slug: item.codigo,
        description: 'Plano comercial oficial de Itapoá SC',
        price_monthly: Number(item.preco_mensal),
        price_yearly: Number(item.preco_anual),
        trial_days: 7,
        is_active: Boolean(item.ativo),
        features: Array.isArray(item.recursos) ? item.recursos : JSON.parse(item.recursos || '[]')
      }));
    } catch (err) {
      console.error('[SubscriptionService] Exception fetching plans:', err);
      return [];
    }
  }

}

// Case alias export
export { SubscriptionService as subscriptionService };
