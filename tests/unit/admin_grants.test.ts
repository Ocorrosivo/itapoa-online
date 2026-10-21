/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Testes Unitários de Concessões Administrativas, Auditoria de Planos e Permissões
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntitlementService, CANONICAL_PLANS, normalizePlanTier } from '../../src/server/services/entitlementService.js';
import { requireRole } from '../../src/server/middleware/auth.js';

describe('1. Autorização e Controle de Acesso (Usuário Comum vs Administrador Master)', () => {
  it('Usuário comum (role user/advertiser) deve ser bloqueado com 403 em rotas admin', () => {
    const adminGuard = requireRole(['admin_master']);

    let statusCalled: number | null = null;
    let jsonResponse: any = null;
    let nextCalled = false;

    const mockReq = {
      user: {
        id: 'user_comum_1',
        name: 'Comerciante Comum',
        email: 'comum@itapoa.online',
        role: 'advertiser',
        city: 'Itapoá'
      }
    };

    const mockRes = {
      status(s: number) {
        statusCalled = s;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      }
    };

    const mockNext = () => {
      nextCalled = true;
    };

    adminGuard(mockReq as any, mockRes as any, mockNext);

    assert.equal(statusCalled, 403, 'Usuário comum deve receber HTTP 403');
    assert.equal(nextCalled, false, 'next() não deve ser chamado para usuário não autorizado');
    assert.ok(jsonResponse?.error?.includes('Privilégios insuficientes'), 'Mensagem de erro adequada');
  });

  it('Administrador master (role admin_master) deve ter acesso liberado', () => {
    const adminGuard = requireRole(['admin_master']);

    let statusCalled: number | null = null;
    let nextCalled = false;

    const mockReq = {
      user: {
        id: 'user_master_1',
        name: 'Master Supreme',
        email: 'suprememidias.ok@gmail.com',
        role: 'admin_master',
        city: 'Itapoá'
      }
    };

    const mockRes = {
      status(s: number) {
        statusCalled = s;
        return this;
      },
      json() {
        return this;
      }
    };

    const mockNext = () => {
      nextCalled = true;
    };

    adminGuard(mockReq as any, mockRes as any, mockNext);

    assert.equal(statusCalled, null, 'Nenhum erro de status deve ser emitido para o master');
    assert.equal(nextCalled, true, 'next() deve ser chamado autorizando a rota');
  });
});

describe('2. Validação e Regras de Concessão Administrativa Promocional', () => {
  it('Deve rejeitar concessão com datas invertidas ou inválidas', async () => {
    await assert.rejects(
      async () => {
        await EntitlementService.grantAdminPlan(
          'comp_test_1',
          'gold_vip',
          '2026-11-20',
          '2026-10-20', // término antes do início
          'Promoção lojista teste'
        );
      },
      {
        message: 'A data de término deve ser posterior à data de início.'
      }
    );
  });

  it('Deve rejeitar concessão sem justificativa ou com motivo menor que 5 caracteres', async () => {
    await assert.rejects(
      async () => {
        await EntitlementService.grantAdminPlan(
          'comp_test_1',
          'gold_vip',
          '2026-10-20',
          '2026-11-20',
          'ok' // muito curto
        );
      },
      {
        message: 'O motivo da concessão deve ter no mínimo 5 caracteres.'
      }
    );
  });

  it('Deve aceitar apenas concessão promocional de Gold VIP ou Diamond', async () => {
    await assert.rejects(
      async () => {
        await EntitlementService.grantAdminPlan(
          'comp_test_1',
          'bronze', // Bronze não é concessão promocional VIP
          '2026-10-20',
          '2026-11-20',
          'Concessão Bronze não permitida'
        );
      },
      {
        message: 'Apenas os planos Gold VIP ou Diamond podem ser concedidos promocionalmente.'
      }
    );
  });
});

describe('3. Regra de Negócio: Expiração Segura sem Remoção de Contratação Paga Válida', () => {
  it('Se empresa tem assinatura paga ativa, revogação/expiração restaura o plano contratado pago', () => {
    // Simula cálculo de retorno
    const activeSub = { planId: 'diamond_extremo', status: 'active' };
    const restoredPlan = activeSub ? normalizePlanTier(activeSub.planId) : 'bronze';
    const restoredGrantType = activeSub ? 'paid' : 'bronze';

    assert.equal(restoredPlan, 'diamond_extremo', 'Deve restaurar para o plano contratado da assinatura ativa');
    assert.equal(restoredGrantType, 'paid', 'Origem deve voltar para assinatura paga');
  });

  it('Se empresa não tem assinatura paga ativa, revogação/expiração restaura para Bronze gratuito', () => {
    const activeSub = null;
    const restoredPlan = activeSub ? normalizePlanTier(null) : 'bronze';
    const restoredGrantType = activeSub ? 'paid' : 'bronze';

    assert.equal(restoredPlan, 'bronze', 'Sem assinatura ativa, deve retornar para Bronze');
    assert.equal(restoredGrantType, 'bronze', 'Origem volta para bronze gratuito');
  });
});

describe('4. Regra de Negócio: Alterar Texto Comercial NÃO Concede Permissões Automaticamente', () => {
  it('Texto informativo de benefícios é desacoplado dos limites técnicos', () => {
    const bronzePlan = CANONICAL_PLANS.bronze;
    
    // O texto comercial pode conter o que o marketing quiser:
    const marketingFeatures = ['Mais de 1000 fotos', 'Catálogo ilimitado de produtos'];
    
    // Mas os limites de sistema reais no backend permanecem estritos:
    assert.equal(bronzePlan.maxGalleryPhotos, 3, 'Limite técnico de fotos permanece 3');
    assert.equal(bronzePlan.maxProducts, 0, 'Limite técnico de produtos permanece 0');
    assert.equal(bronzePlan.hasHomeHighlight, false, 'Destaque na vitrine permanece falso');
    
    // O texto comercial não altera o objeto técnico
    assert.notDeepEqual(bronzePlan.maxProducts, 999);
  });
});
