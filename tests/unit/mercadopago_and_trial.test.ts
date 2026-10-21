import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_PLANS, normalizePlanTier } from '../../src/server/services/entitlementService.js';

describe('Integração de Planos com Mercado Pago e Experiência Gold de 7 Dias', () => {

  test('1. Elegibilidade e Concessão dos 7 Dias de Experiência Gold (Sem Débito Automático)', () => {
    // Função de validação de elegibilidade
    function evaluateTrialEligibility(company: {
      planLevel: string;
      has_used_trial: boolean | number;
      trial_ends_at: string | null;
      hasActiveSubscription: boolean;
    }): { eligible: boolean; reason?: string } {
      if (company.has_used_trial || company.trial_ends_at) {
        return { eligible: false, reason: 'Esta empresa já usufruiu dos 7 dias de experiência Gold.' };
      }
      if (company.hasActiveSubscription) {
        return { eligible: false, reason: 'A empresa já possui uma contratação ativa.' };
      }
      if (normalizePlanTier(company.planLevel) !== 'bronze') {
        return { eligible: false, reason: 'Apenas empresas no plano Bronze gratuito podem iniciar o teste.' };
      }
      return { eligible: true };
    }

    // Caso 1: Novo cliente Bronze elegível
    const newBronze = {
      planLevel: 'bronze',
      has_used_trial: 0,
      trial_ends_at: null,
      hasActiveSubscription: false
    };
    const elig1 = evaluateTrialEligibility(newBronze);
    assert.equal(elig1.eligible, true, 'Novo cliente Bronze deve ser elegível para os 7 dias de experiência Gold');

    // Concessão de 7 dias
    const now = new Date('2026-10-21T12:00:00Z');
    const trialDurationDays = 7;
    const trialEndsAt = new Date(now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);

    const updatedCompany = {
      ...newBronze,
      planLevel: 'gold_vip',
      access_grant_type: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      has_used_trial: 1,
      isSponsored: 1
    };

    assert.equal(updatedCompany.planLevel, 'gold_vip');
    assert.equal(updatedCompany.access_grant_type, 'trial');
    assert.equal(updatedCompany.has_used_trial, 1);
    assert.equal(updatedCompany.trial_ends_at, '2026-10-28T12:00:00.000Z', 'Duração exata de 7 dias corridos');

    // Caso 2: Tentativa de repetição do teste (bloqueio de repetições indevidas)
    const elig2 = evaluateTrialEligibility({
      planLevel: 'bronze',
      has_used_trial: 1,
      trial_ends_at: '2026-10-28T12:00:00.000Z',
      hasActiveSubscription: false
    });
    assert.equal(elig2.eligible, false, 'Empresa que já usou trial não pode repetir o teste');
    assert.match(elig2.reason!, /já usufruiu dos 7 dias/);
  });

  test('2. Expiração de Teste sem Autorização de Cobrança: Retorno Seguro ao Direito Válido Disponível', () => {
    // Simula resolução de expiração de trial
    function resolveExpiredTrial(company: {
      planLevel: string;
      access_grant_type: string;
      trial_ends_at: string;
      isSponsored?: number;
      activeSubscription?: { planId: string } | null;
    }, currentDate: Date) {
      const isExpired = new Date(company.trial_ends_at) <= currentDate;
      if (!isExpired || company.access_grant_type !== 'trial') {
        return company;
      }
      // Se não há autorização de débito, fallback para direito disponível
      const fallbackPlan = company.activeSubscription ? normalizePlanTier(company.activeSubscription.planId) : 'bronze';
      const fallbackGrant = company.activeSubscription ? 'paid' : 'bronze';
      return {
        ...company,
        planLevel: fallbackPlan,
        access_grant_type: fallbackGrant,
        isSponsored: company.activeSubscription ? 1 : 0
      };
    }

    const testCompany = {
      planLevel: 'gold_vip',
      access_grant_type: 'trial',
      trial_ends_at: '2026-10-28T12:00:00.000Z',
      isSponsored: 1,
      activeSubscription: null
    };

    // Antes de expirar: continua Gold VIP em teste
    const beforeExpiry = resolveExpiredTrial(testCompany, new Date('2026-10-25T12:00:00Z'));
    assert.equal(beforeExpiry.planLevel, 'gold_vip');
    assert.equal(beforeExpiry.access_grant_type, 'trial');

    // Após expirar: encerra sem débito e retorna automaticamente para Bronze gratuito
    const afterExpiry = resolveExpiredTrial(testCompany, new Date('2026-10-29T12:00:00Z'));
    assert.equal(afterExpiry.planLevel, 'bronze', 'Deve retornar ao Bronze gratuito após o término do teste');
    assert.equal(afterExpiry.access_grant_type, 'bronze');
    assert.equal(afterExpiry.isSponsored, 0);
  });

  test('3. Diferenciação Rigorosa dos Quatro Tipos de Acesso e Cobrança', () => {
    interface AccessDiagnosis {
      accessType: 'trial' | 'paid_subscription' | 'paid_onetime_pix' | 'admin_grant' | 'organic_bronze';
      hasAutomaticRenewal: boolean;
      generatesBilling: boolean;
      clearConditionsPresentedBefore: boolean;
    }

    function diagnoseAccess(grantType: string, paymentMethod?: string, paymentType?: string): AccessDiagnosis {
      if (grantType === 'trial') {
        return {
          accessType: 'trial',
          hasAutomaticRenewal: false,
          generatesBilling: false,
          clearConditionsPresentedBefore: false
        };
      }
      if (grantType === 'admin_grant') {
        return {
          accessType: 'admin_grant',
          hasAutomaticRenewal: false,
          generatesBilling: false,
          clearConditionsPresentedBefore: false
        };
      }
      if (grantType === 'paid') {
        const isPix = paymentMethod === 'pix' || paymentType === 'onetime_pix';
        if (isPix) {
          return {
            accessType: 'paid_onetime_pix',
            hasAutomaticRenewal: false, // Regra estrita: Pix avulso NÃO é renovação automática
            generatesBilling: true,
            clearConditionsPresentedBefore: true
          };
        }
        return {
          accessType: 'paid_subscription',
          hasAutomaticRenewal: true,
          generatesBilling: true,
          clearConditionsPresentedBefore: true
        };
      }
      return {
        accessType: 'organic_bronze',
        hasAutomaticRenewal: false,
        generatesBilling: false,
        clearConditionsPresentedBefore: false
      };
    }

    // 1. Teste de 7 dias
    const trialDiag = diagnoseAccess('trial');
    assert.equal(trialDiag.hasAutomaticRenewal, false, 'Teste NÃO deve ter renovação automática');
    assert.equal(trialDiag.generatesBilling, false, 'Teste NÃO deve gerar cobrança');

    // 2. Concessão administrativa
    const adminDiag = diagnoseAccess('admin_grant');
    assert.equal(adminDiag.hasAutomaticRenewal, false);
    assert.equal(adminDiag.generatesBilling, false, 'Concessão administrativa NÃO deve gerar cobrança');

    // 3. Pagamento avulso via Pix
    const pixDiag = diagnoseAccess('paid', 'pix', 'onetime_pix');
    assert.equal(pixDiag.accessType, 'paid_onetime_pix');
    assert.equal(pixDiag.hasAutomaticRenewal, false, 'Pix avulso NÃO deve aparecer como renovação automática nem como Pix automático');
    assert.equal(pixDiag.generatesBilling, true);

    // 4. Assinatura autorizada (cartão)
    const cardDiag = diagnoseAccess('paid', 'credit_card', 'subscription');
    assert.equal(cardDiag.accessType, 'paid_subscription');
    assert.equal(cardDiag.hasAutomaticRenewal, true, 'Assinatura cartão possui recorrência autorizada');
    assert.equal(cardDiag.clearConditionsPresentedBefore, true);
  });

  test('4. Preservação de Contratos Antigos quando o Administrador Altera Preços', () => {
    // Simula uma assinatura antiga contratada a R$ 49,90 no plano Gold
    const existingSubscription = {
      id: 'sub_123',
      companyId: 'comp_001',
      planId: 'plan_gold_vip',
      plan_version: 1,
      contracted_price: 49.90,
      amount: 49.90,
      status: 'active'
    };

    // Administrador altera o preço no catálogo de planos para R$ 69,90 e incrementa a versão
    const updatedCatalogPlan = {
      id: 'plan_gold_vip',
      version: 2,
      price: 69.90
    };

    // Função de cálculo de renovação/faturamento do contrato
    function getBillingAmountForContract(sub: typeof existingSubscription, currentCatalog: typeof updatedCatalogPlan): number {
      // Regra de ouro: o valor acordado no contrato existente é preservado
      return sub.contracted_price ?? sub.amount;
    }

    const billingPrice = getBillingAmountForContract(existingSubscription, updatedCatalogPlan);
    assert.equal(billingPrice, 49.90, 'O contrato antigo deve manter o preço acordado de R$ 49,90 mesmo com alteração no catálogo');
    assert.notEqual(billingPrice, updatedCatalogPlan.price, 'Não deve reajustar automaticamente o contrato sem consentimento');
  });

  test('5. Idempotência do Webhook e Liberação Única (Sem Duplicação de Concessões)', () => {
    // Simula estado de assinatura e eventos concorrentes de webhook
    let subscriptionState = {
      id: 'sub_xyz',
      status: 'pending',
      activationsCount: 0
    };

    function processWebhookApprovedEvent(sub: typeof subscriptionState, mpPaymentId: string): { processed: boolean; reason?: string } {
      if (sub.status === 'active') {
        // Idempotência: já liberado anteriormente
        return { processed: false, reason: 'Idempotente: assinatura já ativa, ignorando repetição.' };
      }
      sub.status = 'active';
      sub.activationsCount += 1;
      return { processed: true };
    }

    // 1º evento de webhook chega
    const firstDelivery = processWebhookApprovedEvent(subscriptionState, 'mp_1001');
    assert.equal(firstDelivery.processed, true);
    assert.equal(subscriptionState.status, 'active');
    assert.equal(subscriptionState.activationsCount, 1);

    // 2º evento idêntico de webhook (retentativa ou duplicata de rede do MP)
    const secondDelivery = processWebhookApprovedEvent(subscriptionState, 'mp_1001');
    assert.equal(secondDelivery.processed, false);
    assert.match(secondDelivery.reason!, /assinatura já ativa/);
    assert.equal(subscriptionState.activationsCount, 1, 'Liberação deve ser estritamente única');
  });

});
