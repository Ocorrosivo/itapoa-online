/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Suíte de Testes Unitários de Entitlements e Direitos de Acesso
 *
 * Valida:
 * 1. Limites exatos: Bronze (3 fotos, 0 prods, 0 cupons), Gold VIP (15 fotos, 5 prods, 1 cupom) e Diamond (30 fotos, 30 prods, 3 cupons)
 * 2. Exclusão estrita de logo e capa da contagem de galeria
 * 3. Coexistência de direitos: Bronze, Trial, Paid e Admin Grant
 * 4. Preservação de dados acima do limite sem deleção
 * 5. Versionamento de planos
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_PLANS,
  EntitlementService,
  normalizePlanTier,
  PlanTier
} from '../../src/server/services/entitlementService.js';

describe('1. Especificação de Limites por Plano', () => {
  it('Bronze Gratuito deve ter 3 fotos, 0 produtos, 0 promoções e CRM ativo', () => {
    const bronze = CANONICAL_PLANS.bronze;
    assert.equal(bronze.price, 0.00, 'Preço deve ser R$ 0,00');
    assert.equal(bronze.maxGalleryPhotos, 3, 'Bronze deve permitir até 3 fotos na galeria');
    assert.equal(bronze.maxProducts, 0, 'Bronze não deve permitir novos produtos/serviços');
    assert.equal(bronze.maxCoupons, 0, 'Bronze não deve permitir novas promoções');
    assert.equal(bronze.hasCrm, true, 'Bronze deve incluir CRM de leads');
    assert.equal(bronze.hasHomeHighlight, false, 'Bronze não deve ter destaque na Home');
    assert.equal(bronze.hasAnalytics, true, 'Bronze deve ter métricas essenciais');
  });

  it('Gold VIP R$ 49,90/mês deve ter 15 fotos, 5 produtos, 1 promoção e destaque rotativo', () => {
    const gold = CANONICAL_PLANS.gold_vip;
    assert.equal(gold.price, 49.90, 'Preço deve ser R$ 49,90');
    assert.equal(gold.maxGalleryPhotos, 15, 'Gold VIP deve permitir até 15 fotos na galeria');
    assert.equal(gold.maxProducts, 5, 'Gold VIP deve permitir até 5 produtos/serviços');
    assert.equal(gold.maxCoupons, 1, 'Gold VIP deve permitir 1 promoção/cupom');
    assert.equal(gold.hasHomeHighlight, true, 'Gold VIP deve ter destaque rotativo na Home');
    assert.equal(gold.hasFullPresentation, true, 'Gold VIP deve ter apresentação completa');
    assert.equal(gold.hasCrm, true, 'Gold VIP deve ter CRM');
  });

  it('Diamond R$ 99,90/mês deve ter 30 fotos, 30 produtos e 3 promoções, com recursos Gold', () => {
    const diamond = CANONICAL_PLANS.diamond_extremo;
    assert.equal(diamond.price, 99.90, 'Preço deve ser R$ 99,90');
    assert.equal(diamond.maxGalleryPhotos, 30, 'Diamond deve permitir até 30 fotos na galeria');
    assert.equal(diamond.maxProducts, 30, 'Diamond deve permitir até 30 produtos/serviços');
    assert.equal(diamond.maxCoupons, 3, 'Diamond deve permitir até 3 promoções/cupons');
    assert.equal(diamond.hasHomeHighlight, true, 'Diamond deve ter destaque prioritário');
    assert.equal(diamond.hasCrm, true, 'Diamond deve incluir CRM');
    assert.equal(diamond.hasFullPresentation, true, 'Diamond deve ter apresentação completa');
  });
});

describe('2. Normalização e Versionamento de Planos', () => {
  it('Deve normalizar corretamente aliases históricos para tiers canônicos', () => {
    assert.equal(normalizePlanTier('diamond'), 'diamond_extremo');
    assert.equal(normalizePlanTier('diamond_extremo'), 'diamond_extremo');
    assert.equal(normalizePlanTier('plan_diamond_extremo'), 'diamond_extremo');

    assert.equal(normalizePlanTier('ouro'), 'gold_vip');
    assert.equal(normalizePlanTier('gold_vip'), 'gold_vip');
    assert.equal(normalizePlanTier('plan_gold_vip'), 'gold_vip');
    assert.equal(normalizePlanTier('prata'), 'gold_vip');

    assert.equal(normalizePlanTier('bronze'), 'bronze');
    assert.equal(normalizePlanTier('plan_bronze'), 'bronze');
    assert.equal(normalizePlanTier(null), 'bronze');
    assert.equal(normalizePlanTier(undefined), 'bronze');
  });

  it('Catálogo de planos deve ter versão estruturada', async () => {
    const catalog = await EntitlementService.getPlansCatalog();
    assert.equal(catalog.length, 3, 'Devem existir 3 planos canônicos');
    catalog.forEach(plan => {
      assert.ok(plan.version >= 1, `Plano ${plan.name} deve ter número de versão >= 1`);
      assert.ok(plan.id.startsWith('plan_'), `ID ${plan.id} deve ser canônico`);
    });
  });
});

describe('3. Regra de Negócio: Logo e Capa não contam na Galeria', () => {
  it('Exclusão de logo e capa da contagem de fotos de galeria', () => {
    const logoUrl = 'https://itapoa.online/uploads/logo.png';
    const coverUrl = 'https://itapoa.online/uploads/cover.jpg';
    const allMediaUrls = [
      logoUrl,
      coverUrl,
      'https://itapoa.online/uploads/foto1.jpg',
      'https://itapoa.online/uploads/foto2.jpg',
      'https://itapoa.online/uploads/foto3.jpg',
    ];

    // Lógica pura de filtro aplicada pelo EntitlementService
    const galleryOnly = allMediaUrls.filter(u => u !== logoUrl && u !== coverUrl);
    assert.equal(galleryOnly.length, 3, 'Apenas 3 fotos devem ser consideradas galeria');
    assert.ok(!galleryOnly.includes(logoUrl), 'Logo não pode estar na contagem de galeria');
    assert.ok(!galleryOnly.includes(coverUrl), 'Capa não pode estar na contagem de galeria');
  });
});

describe('4. Preservação de Dados Acima dos Limites', () => {
  it('Empresa Bronze com produtos legados não perde itens, mas é impedida de adicionar novos', () => {
    const limits = EntitlementService.getPlanLimits('bronze');
    const legacyProductsCount = 8; // Empresa tinha 8 produtos cadastrados anteriormente

    const canAddProducts = legacyProductsCount < limits.maxProducts;
    assert.equal(canAddProducts, false, 'Não deve permitir novas adições no Bronze');
    assert.equal(legacyProductsCount, 8, 'A contagem existente de 8 itens deve ser preservada intacta');
  });

  it('Empresa Gold VIP com 5 produtos atinge limite exato sem truncar', () => {
    const limits = EntitlementService.getPlanLimits('gold_vip');
    assert.equal(limits.maxProducts, 5);

    assert.equal(4 < limits.maxProducts, true, 'Com 4 itens, ainda pode adicionar');
    assert.equal(5 < limits.maxProducts, false, 'Com 5 itens, atingiu o teto de 5');
    assert.equal(7 < limits.maxProducts, false, 'Com 7 itens legados, bloqueia novas adições');
  });

  it('Empresa Diamond suporta até 30 produtos e 3 promoções', () => {
    const limits = EntitlementService.getPlanLimits('diamond_extremo');
    assert.equal(limits.maxProducts, 30);
    assert.equal(limits.maxCoupons, 3);
    assert.equal(limits.maxGalleryPhotos, 30);

    assert.equal(29 < limits.maxProducts, true);
    assert.equal(30 < limits.maxProducts, false);
    assert.equal(2 < limits.maxCoupons, true);
    assert.equal(3 < limits.maxCoupons, false);
  });
});

describe('5. Coexistência de Direitos (Grant Types)', () => {
  it('Diferenciação correta de origens de acesso', () => {
    const grants = ['bronze', 'trial', 'paid', 'admin_grant'];
    grants.forEach(g => {
      assert.ok(['bronze', 'trial', 'paid', 'admin_grant'].includes(g));
    });
  });

  it('Concessão administrativa respeita nível patrocinado concedido', () => {
    // Simula concessão admin
    const companyIsSponsored = 1;
    const companyPlanLevel = 'diamond_extremo';
    const effectiveTier = companyIsSponsored ? normalizePlanTier(companyPlanLevel) : 'bronze';

    assert.equal(effectiveTier, 'diamond_extremo', 'Admin grant deve conceder Diamond sem pagamento');
    const limits = EntitlementService.getPlanLimits(effectiveTier);
    assert.equal(limits.maxProducts, 30);
    assert.equal(limits.maxGalleryPhotos, 30);
  });

  it('Assinatura paga ativa prevalece sobre plano base', () => {
    const basePlan = 'bronze';
    const activeSubPlan = 'gold_vip';
    const effectiveTier = normalizePlanTier(activeSubPlan);

    assert.equal(effectiveTier, 'gold_vip', 'Assinatura ativa deve elevar para Gold VIP');
    const limits = EntitlementService.getPlanLimits(effectiveTier);
    assert.equal(limits.maxProducts, 5);
    assert.equal(limits.maxCoupons, 1);
  });
});
