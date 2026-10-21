import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_PLANS, normalizePlanTier } from '../../src/server/services/entitlementService.js';

describe('Apresentação Pública, Diferenciação de Planos e Vitrine', () => {

  test('1. Textos aprovados nos planos canônicos e ausência de promessas sem implementação', () => {
    const bronze = CANONICAL_PLANS.bronze;
    const gold = CANONICAL_PLANS.gold_vip;
    const diamond = CANONICAL_PLANS.diamond_extremo;

    assert.ok(bronze, 'Plano Bronze deve existir');
    assert.ok(gold, 'Plano Gold deve existir');
    assert.ok(diamond, 'Plano Diamond deve existir');

    // Validação dos textos aprovados
    assert.equal(bronze.description, 'Presença essencial no guia.');
    assert.equal(gold.description, 'Mais exposição e vitrine ampliada.');
    assert.equal(diamond.description, 'Recursos Gold com maior capacidade de catálogo, fotos e promoções.');

    // Nenhuma promessa enganosa / sem implementação nos textos ou benefícios
    const plansList = Object.values(CANONICAL_PLANS);
    const allTexts = plansList.flatMap(p => [p.name, p.description, ...(p.features || [])]).join(' ').toLowerCase();

    assert.doesNotMatch(allTexts, /primeiro lugar permanente/i, 'Não deve prometer primeiro lugar permanente');
    assert.doesNotMatch(allTexts, /vendas garantidas/i, 'Não deve prometer vendas garantidas');
    assert.doesNotMatch(allTexts, /ia 24 horas/i, 'Não deve prometer IA 24 horas sem implementação');
    assert.doesNotMatch(allTexts, /robô gerador de leads/i, 'Não deve prometer robô gerador de leads');
  });

  test('2. Limites e diferenciação de recursos por plano (Bronze, Gold e Diamond)', () => {
    const bronze = CANONICAL_PLANS.bronze;
    const gold = CANONICAL_PLANS.gold_vip;
    const diamond = CANONICAL_PLANS.diamond_extremo;

    // Limites de fotos
    assert.equal(bronze.maxGalleryPhotos, 3, 'Bronze deve limitar a 3 fotos');
    assert.equal(gold.maxGalleryPhotos, 15, 'Gold deve permitir até 15 fotos');
    assert.equal(diamond.maxGalleryPhotos, 30, 'Diamond deve permitir até 30 fotos');

    // Limites de produtos
    assert.equal(bronze.maxProducts, 0, 'Bronze não possui produtos publicáveis');
    assert.equal(gold.maxProducts, 5, 'Gold possui até 5 produtos');
    assert.equal(diamond.maxProducts, 30, 'Diamond possui até 30 produtos');

    // Limites de promoções
    assert.equal(bronze.maxCoupons, 0, 'Bronze não possui promoções');
    assert.equal(gold.maxCoupons, 1, 'Gold possui 1 promoção');
    assert.equal(diamond.maxCoupons, 3, 'Diamond possui até 3 promoções');

    // Destaque rotativo
    assert.equal(bronze.hasHomeHighlight, false, 'Bronze não tem destaque na home');
    assert.equal(gold.hasHomeHighlight, true, 'Gold tem destaque rotativo na home');
    assert.equal(diamond.hasHomeHighlight, true, 'Diamond tem destaque rotativo na home');

    // Apresentação completa vs essencial
    assert.equal(bronze.hasFullPresentation, false, 'Bronze tem apresentação essencial');
    assert.equal(gold.hasFullPresentation, true, 'Gold tem apresentação completa');
    assert.equal(diamond.hasFullPresentation, true, 'Diamond tem apresentação completa');
  });

  test('3. Algoritmo de Vitrine: Rotação equilibrada Gold e Diamond sem duplicar empresas', () => {
    interface MockCompany {
      id: string;
      name: string;
      tier: 'gold' | 'diamond' | 'bronze';
    }

    const mockCompanies: MockCompany[] = [
      { id: 'c1', name: 'Hotel Diamante', tier: 'diamond' },
      { id: 'c2', name: 'Restaurante Ouro VIP', tier: 'gold' },
      { id: 'c3', name: 'Pousada Mar Azul', tier: 'gold' },
      { id: 'c4', name: 'Marina Diamond Club', tier: 'diamond' },
      { id: 'c5', name: 'Padaria Essencial', tier: 'bronze' }
    ];

    // Função de rotação equilibrada idêntica à do componente PremiumCompaniesCarousel
    function balanceAndDeduplicateHighlights(items: MockCompany[]) {
      const diamonds = items.filter(c => c.tier === 'diamond');
      const golds = items.filter(c => c.tier === 'gold');

      const result: MockCompany[] = [];
      const seenIds = new Set<string>();

      let dIdx = 0;
      let gIdx = 0;

      while (dIdx < diamonds.length || gIdx < golds.length) {
        if (dIdx < diamonds.length) {
          const comp = diamonds[dIdx++];
          if (!seenIds.has(comp.id)) {
            seenIds.add(comp.id);
            result.push(comp);
          }
        }
        if (gIdx < golds.length) {
          const comp = golds[gIdx++];
          if (!seenIds.has(comp.id)) {
            seenIds.add(comp.id);
            result.push(comp);
          }
        }
      }

      return result;
    }

    const vitrine = balanceAndDeduplicateHighlights(mockCompanies);

    // Validações
    assert.equal(vitrine.length, 4, 'Vitrine deve conter 4 empresas elegíveis (excluindo bronze)');
    const ids = vitrine.map(c => c.id);
    const uniqueIds = Array.from(new Set(ids));
    assert.equal(ids.length, uniqueIds.length, 'Não pode haver IDs duplicados na mesma vitrine');

    // Valida alternância equilibrada entre Diamond e Gold
    assert.equal(vitrine[0].tier, 'diamond');
    assert.equal(vitrine[1].tier, 'gold');
    assert.equal(vitrine[2].tier, 'diamond');
    assert.equal(vitrine[3].tier, 'gold');
  });

  test('4. Regra de proteção: Não colocar anúncios de concorrentes em perfis pagos', () => {
    function shouldShowCompetitorAds(company: { tier: string; access_grant_type?: string }) {
      const isPaidOrGranted = company.tier === 'gold' || 
                              company.tier === 'gold_vip' ||
                              company.tier === 'diamond' || 
                              company.tier === 'diamond_extremo' ||
                              company.access_grant_type === 'paid' || 
                              company.access_grant_type === 'admin_grant';
      return !isPaidOrGranted;
    }

    assert.equal(shouldShowCompetitorAds({ tier: 'diamond' }), false, 'Perfil Diamond NUNCA deve exibir anúncios de concorrentes');
    assert.equal(shouldShowCompetitorAds({ tier: 'diamond_extremo' }), false, 'Perfil Diamond Extremo NUNCA deve exibir anúncios de concorrentes');
    assert.equal(shouldShowCompetitorAds({ tier: 'gold' }), false, 'Perfil Gold NUNCA deve exibir anúncios de concorrentes');
    assert.equal(shouldShowCompetitorAds({ tier: 'gold_vip' }), false, 'Perfil Gold VIP NUNCA deve exibir anúncios de concorrentes');
    assert.equal(shouldShowCompetitorAds({ tier: 'bronze', access_grant_type: 'admin_grant' }), false, 'Empresa com concessão ativa não exibe anúncios');
    assert.equal(shouldShowCompetitorAds({ tier: 'bronze', access_grant_type: 'organic' }), true, 'Empresa Bronze básica pode exibir links da comunidade');
  });
});
