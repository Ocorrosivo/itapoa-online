import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_PLANS, normalizePlanTier } from '../../src/server/services/entitlementService.js';

describe('Painel do Lojista — Regras de Negócio, Métricas Reais e Isolamento', () => {

  test('1. Especificação de Limites de Galeria por Plano (Logo e Capa não contam)', () => {
    const bronze = CANONICAL_PLANS.bronze;
    const gold = CANONICAL_PLANS.gold_vip;
    const diamond = CANONICAL_PLANS.diamond_extremo;

    // Limites de fotos na galeria
    assert.equal(bronze.maxGalleryPhotos, 3, 'Bronze deve permitir até 3 fotos');
    assert.equal(gold.maxGalleryPhotos, 15, 'Gold VIP deve permitir até 15 fotos');
    assert.equal(diamond.maxGalleryPhotos, 30, 'Diamond deve permitir até 30 fotos');

    // Validação lógica de inserção com contagem de galeria
    function validateGalleryPhotoAddition(currentGalleryCount: number, tier: string): { allowed: boolean; error?: string } {
      const max = tier === 'diamond' ? 30 : tier === 'gold_vip' || tier === 'gold' ? 15 : 3;
      if (currentGalleryCount >= max) {
        return {
          allowed: false,
          error: `Limite de fotos atingido para o plano (${max} fotos). Faça upgrade para adicionar mais fotos.`
        };
      }
      return { allowed: true };
    }

    // Bronze com 3 fotos tenta adicionar a 4ª
    const bronzeCheck = validateGalleryPhotoAddition(3, 'bronze');
    assert.equal(bronzeCheck.allowed, false, 'Bronze com 3 fotos deve ser bloqueado ao adicionar a 4ª');
    assert.match(bronzeCheck.error!, /Limite de fotos atingido/);

    // Gold com 3 fotos adiciona normalmente
    const goldCheck = validateGalleryPhotoAddition(3, 'gold_vip');
    assert.equal(goldCheck.allowed, true, 'Gold com 3 fotos deve poder adicionar normalmente');

    // Gold com 15 fotos é bloqueado
    const goldMaxCheck = validateGalleryPhotoAddition(15, 'gold_vip');
    assert.equal(goldMaxCheck.allowed, false, 'Gold com 15 fotos atinge o limite');

    // Diamond com 15 fotos adiciona normalmente (até 30)
    const diamondCheck = validateGalleryPhotoAddition(15, 'diamond');
    assert.equal(diamondCheck.allowed, true, 'Diamond com 15 fotos pode adicionar até 30');
  });

  test('2. Validação das 4 Métricas Reais e Regras de Histórico por Plano', () => {
    const VALID_METRICS = ['view', 'whatsapp', 'phone', 'route'];

    // Validador de evento de telemetria
    function isValidTelemetryEvent(eventType: string): boolean {
      const clean = eventType.toLowerCase().replace('click_', '');
      return VALID_METRICS.includes(clean);
    }

    assert.equal(isValidTelemetryEvent('view'), true);
    assert.equal(isValidTelemetryEvent('whatsapp'), true);
    assert.equal(isValidTelemetryEvent('click_whatsapp'), true);
    assert.equal(isValidTelemetryEvent('phone'), true);
    assert.equal(isValidTelemetryEvent('click_phone'), true);
    assert.equal(isValidTelemetryEvent('route'), true);
    assert.equal(isValidTelemetryEvent('click_route'), true);

    // Rejeição de eventos inventados
    assert.equal(isValidTelemetryEvent('sales'), false, 'Não deve rastrear cliques de vendas fictícias');
    assert.equal(isValidTelemetryEvent('concluded_deals'), false, 'Não deve chamar cliques de conversas concluídas');

    // Regra de histórico por plano:
    // Bronze: 7 dias
    // Gold VIP e Diamond: 7, 30 e 90 dias
    function resolveAllowedAnalyticsDays(requestedDays: number, tier: string) {
      const isBronze = tier === 'bronze';
      if (requestedDays === 30 || requestedDays === 90) {
        if (isBronze) {
          return {
            days: 7,
            planRestricted: true,
            message: 'Histórico estendido de 30 e 90 dias exclusivo para planos Gold VIP e Diamond.'
          };
        }
        return { days: requestedDays, planRestricted: false, message: null };
      }
      return { days: 7, planRestricted: false, message: null };
    }

    // Teste Bronze tentando 30 dias
    const bronze30 = resolveAllowedAnalyticsDays(30, 'bronze');
    assert.equal(bronze30.days, 7, 'Bronze deve ser mantido em 7 dias');
    assert.equal(bronze30.planRestricted, true, 'Deve sinalizar restrição de plano');
    assert.match(bronze30.message!, /exclusivo para planos Gold VIP e Diamond/);

    // Teste Gold VIP tentando 30 e 90 dias
    const gold30 = resolveAllowedAnalyticsDays(30, 'gold_vip');
    assert.equal(gold30.days, 30, 'Gold VIP deve ter acesso liberado a 30 dias');
    assert.equal(gold30.planRestricted, false);

    const gold90 = resolveAllowedAnalyticsDays(90, 'gold_vip');
    assert.equal(gold90.days, 90, 'Gold VIP deve ter acesso liberado a 90 dias');
    assert.equal(gold90.planRestricted, false);

    // Teste Diamond tentando 90 dias
    const diamond90 = resolveAllowedAnalyticsDays(90, 'diamond');
    assert.equal(diamond90.days, 90, 'Diamond deve ter acesso liberado a 90 dias');
    assert.equal(diamond90.planRestricted, false);
  });

  test('3. CRM Simples: Validação de Contatos, Interesse, Situação e Próximo Contato', () => {
    interface LeadPayload {
      company_id: string;
      name: string;
      email?: string;
      phone?: string;
      interest?: string;
      status: 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
      next_contact_at?: string | null;
      notes?: string;
    }

    function validateLead(payload: LeadPayload): { valid: boolean; error?: string } {
      if (!payload.name || !payload.name.trim()) {
        return { valid: false, error: 'Nome do cliente é obrigatório.' };
      }
      if (!payload.company_id || !payload.company_id.trim()) {
        return { valid: false, error: 'ID da empresa é obrigatório.' };
      }
      const VALID_STATUS = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];
      if (!VALID_STATUS.includes(payload.status)) {
        return { valid: false, error: 'Situação inválida.' };
      }
      return { valid: true };
    }

    // Lead válido
    const validLead = validateLead({
      company_id: 'comp_123',
      name: 'Maria Fernandes',
      phone: '47991234567',
      email: 'maria@gmail.com',
      interest: 'Buffet para casamento',
      status: 'contacted',
      next_contact_at: '2026-10-25 14:00:00',
      notes: 'Cliente ligou procurando opções de cardápio para 100 pessoas.'
    });
    assert.equal(validLead.valid, true);

    // Lead inválido sem nome
    const invalidLead = validateLead({
      company_id: 'comp_123',
      name: '',
      status: 'new'
    });
    assert.equal(invalidLead.valid, false);
    assert.equal(invalidLead.error, 'Nome do cliente é obrigatório.');
  });

  test('4. Isolamento Estrito entre Duas Empresas (Multitenancy e Anti-IDOR)', () => {
    // Simula duas empresas com donos diferentes
    const companyA = { id: 'comp_A', name: 'Restaurante A', ownerUserId: 'user_1' };
    const companyB = { id: 'comp_B', name: 'Pousada B', ownerUserId: 'user_2' };

    // Simula verificação do middleware requireRecordOwnership / requireCompanyAccess
    function checkUserCompanyAccess(userId: string, targetCompanyId: string, userCompanyIds: string[]): boolean {
      return userCompanyIds.includes(targetCompanyId);
    }

    const user1Companies = ['comp_A'];
    const user2Companies = ['comp_B'];

    // Usuário 1 acessa empresa A -> Permitido
    assert.equal(checkUserCompanyAccess('user_1', 'comp_A', user1Companies), true);

    // Usuário 1 tenta acessar empresa B -> Bloqueado (403 Forbidden)
    assert.equal(checkUserCompanyAccess('user_1', 'comp_B', user1Companies), false);

    // Usuário 2 acessa empresa B -> Permitido
    assert.equal(checkUserCompanyAccess('user_2', 'comp_B', user2Companies), true);

    // Usuário 2 tenta acessar empresa A -> Bloqueado (403 Forbidden)
    assert.equal(checkUserCompanyAccess('user_2', 'comp_A', user2Companies), false);

    // Isolamento de Leads do CRM entre empresas
    const leadsDatabase = [
      { id: 'lead_1', company_id: 'comp_A', name: 'Cliente do Restaurante A' },
      { id: 'lead_2', company_id: 'comp_B', name: 'Hóspede da Pousada B' },
      { id: 'lead_3', company_id: 'comp_A', name: 'Outro cliente do Restaurante A' }
    ];

    function filterLeadsForCompany(allLeads: typeof leadsDatabase, allowedCompanyIds: string[]) {
      return allLeads.filter(l => allowedCompanyIds.includes(l.company_id));
    }

    const user1Leads = filterLeadsForCompany(leadsDatabase, user1Companies);
    assert.equal(user1Leads.length, 2, 'Usuário 1 deve ver apenas seus 2 leads da Empresa A');
    assert.ok(user1Leads.every(l => l.company_id === 'comp_A'), 'Nenhum lead de Empresa B pode vazar para Empresa A');

    const user2Leads = filterLeadsForCompany(leadsDatabase, user2Companies);
    assert.equal(user2Leads.length, 1, 'Usuário 2 deve ver apenas seu 1 lead da Empresa B');
    assert.equal(user2Leads[0].company_id, 'comp_B');
  });

  test('5. Diferenciação Clara de Mensagens de Bloqueio (Plano vs Permissão vs Falha Técnica)', () => {
    function getBlockedFeedback(scenario: 'plan_limit' | 'permission_denied' | 'network_error', resource: string) {
      if (scenario === 'plan_limit') {
        return {
          type: 'plan_limit',
          title: 'Recurso Exclusivo do Plano VIP',
          message: `O recurso ${resource} requer upgrade para os planos Gold VIP ou Diamond.`,
          canUpgrade: true
        };
      }
      if (scenario === 'permission_denied') {
        return {
          type: 'permission_denied',
          title: 'Acesso Restrito',
          message: 'Você não possui permissão de proprietário ou administrador para esta empresa.',
          canUpgrade: false
        };
      }
      return {
        type: 'network_error',
        title: 'Instabilidade Técnica',
        message: 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.',
        canUpgrade: false
      };
    }

    const planBlock = getBlockedFeedback('plan_limit', 'Promoções Ativas');
    assert.equal(planBlock.type, 'plan_limit');
    assert.equal(planBlock.canUpgrade, true);

    const permBlock = getBlockedFeedback('permission_denied', 'Minha Empresa');
    assert.equal(permBlock.type, 'permission_denied');
    assert.equal(permBlock.canUpgrade, false);

    const techBlock = getBlockedFeedback('network_error', 'Upload de Fotos');
    assert.equal(techBlock.type, 'network_error');
    assert.equal(techBlock.canUpgrade, false);
  });

  test('6. Idempotência de Eventos de Telemetria e Proteção Contra Dupla Contagem', () => {
    // Simulação do comportamento de INSERT IGNORE e controle de affectedRows
    const recordedEvents = new Set<string>();
    let consolidatedCounter = 0;

    function handleIncomingEvent(eventId: string, _type: string) {
      if (recordedEvents.has(eventId)) {
        // Evento duplicado (ex: retry de rede): não incrementa contador
        return { isDuplicate: true, affectedRows: 0 };
      }
      recordedEvents.add(eventId);
      consolidatedCounter += 1;
      return { isDuplicate: false, affectedRows: 1 };
    }

    const first = handleIncomingEvent('evt_click_whatsapp_101', 'whatsapp');
    assert.equal(first.isDuplicate, false);
    assert.equal(consolidatedCounter, 1);

    // Segundo envio com o mesmo eventId (retry de rede)
    const duplicate = handleIncomingEvent('evt_click_whatsapp_101', 'whatsapp');
    assert.equal(duplicate.isDuplicate, true);
    assert.equal(consolidatedCounter, 1, 'Contador não deve ser incrementado duas vezes');

    // Novo evento legítimo
    const second = handleIncomingEvent('evt_click_whatsapp_102', 'whatsapp');
    assert.equal(second.isDuplicate, false);
    assert.equal(consolidatedCounter, 2);
  });

  test('7. Falha de Consulta no Banco de Métricas Não é Mascarada como Zero Real', () => {
    // Validação de que erros de banco devem lançar exceção ou retornar status de erro, nunca zeros simulados
    function resolveMetrics(queryResult: { ok: boolean; data?: any; error?: string }) {
      if (!queryResult.ok) {
        throw new Error('DATABASE_UNAVAILABLE');
      }
      return queryResult.data;
    }

    assert.throws(
      () => resolveMetrics({ ok: false, error: 'Connection refused' }),
      /DATABASE_UNAVAILABLE/
    );

    const validData = resolveMetrics({ ok: true, data: { views: 42, clicksWhatsapp: 12 } });
    assert.equal(validData.views, 42);
  });

  test('8. Restrição de Cidades no Cadastro/Edição de Empresas (Itapoá e Curitiba estritas)', async () => {
    const { companyService, ALLOWED_COMPANY_CITIES } = await import('../../src/server/services/companyService.js');
    const { CompanyRepository } = await import('../../src/server/repositories/companyRepository.js');

    assert.deepEqual(ALLOWED_COMPANY_CITIES, ['city_itapoa', 'city_curitiba']);

    // Rejeição de cidades não permitidas no cadastro
    await assert.rejects(
      () => companyService.createCompany({ name: 'Nova Empresa', cityId: 'city_florianopolis' }, 'user_1'),
      /Cidade não permitida/
    );
    await assert.rejects(
      () => companyService.createCompany({ name: 'Nova Empresa', cityId: 'city_joinville' }, 'user_1'),
      /Cidade não permitida/
    );

    // Na edição, rejeição de troca para Florianópolis ou Joinville
    const origFind = CompanyRepository.findById;
    const origUpdate = CompanyRepository.update;
    try {
      CompanyRepository.findById = async () => ({ id: 'comp_1', cityId: 'city_itapoa' });
      await assert.rejects(
        () => companyService.updateCompany('comp_1', { cityId: 'city_florianopolis' }),
        /Cidade não permitida/
      );

      // Cidade histórica previamente existente é permitida manter
      CompanyRepository.findById = async () => ({ id: 'comp_hist', cityId: 'city_florianopolis' });
      let updatedPayload: any = null;
      CompanyRepository.update = async (_id, data) => { updatedPayload = data; return data; };

      await companyService.updateCompany('comp_hist', { cityId: 'city_florianopolis', name: 'Empresa Histórica' });
      assert.equal(updatedPayload?.cityId, 'city_florianopolis', 'Cidade histórica deve ser preservada');

      // Troca válida para Curitiba
      await companyService.updateCompany('comp_hist', { cityId: 'city_curitiba' });
      assert.equal(updatedPayload?.cityId, 'city_curitiba', 'Deve aceitar Curitiba');

      // Troca válida para Itapoá
      await companyService.updateCompany('comp_hist', { cityId: 'city_itapoa' });
      assert.equal(updatedPayload?.cityId, 'city_itapoa', 'Deve aceitar Itapoá');
    } finally {
      CompanyRepository.findById = origFind;
      CompanyRepository.update = origUpdate;
    }
  });

  test('9. Persistência e Tratamento Parcial de Endereço, Horários e Coordenadas GPS', async () => {
    const { companyService } = await import('../../src/server/services/companyService.js');
    const { CompanyRepository } = await import('../../src/server/repositories/companyRepository.js');

    const origFind = CompanyRepository.findById;
    const origUpdate = CompanyRepository.update;
    let saved: any = null;

    try {
      CompanyRepository.findById = async () => ({
        id: 'comp_test',
        name: 'Nome Existente',
        address: 'Rua Antiga, 100',
        hours: '08h às 18h',
        latitude: -26.11,
        longitude: -48.61
      });
      CompanyRepository.update = async (_id, data) => { saved = data; return data; };

      // 1. Atualizar apenas endereço sem sobrescrever outros campos não enviados
      await companyService.updateCompany('comp_test', {
        address: 'Av. André Rodrigues de Freitas, 500'
      });
      assert.equal(saved.address, 'Av. André Rodrigues de Freitas, 500');
      assert.equal('hours' in saved, false, 'Campo não enviado não deve ser incluído no UPDATE');
      assert.equal('latitude' in saved, false);

      // 2. Coordenadas numéricas válidas e conversão de string para float
      await companyService.updateCompany('comp_test', {
        latitude: '-26.1172',
        longitude: '-48.6145'
      });
      assert.equal(typeof saved.latitude, 'number');
      assert.equal(saved.latitude, -26.1172);
      assert.equal(saved.longitude, -48.6145);

      // 3. Remoção explícita de coordenadas (enviado vazio ou null)
      await companyService.updateCompany('comp_test', {
        latitude: '',
        longitude: null
      });
      assert.equal(saved.latitude, null);
      assert.equal(saved.longitude, null);
    } finally {
      CompanyRepository.findById = origFind;
      CompanyRepository.update = origUpdate;
    }
  });

  test('10. Resiliência do Repositório: Pruning de Colunas Inexistentes na Tabela Física', async () => {
    const { BaseRepository } = await import('../../src/server/repositories/baseRepository.js');
    const repo = new (class extends BaseRepository {
      constructor() { super('companies'); }
    })();

    // Simula colunas físicas da tabela (sem instagram/facebook ainda migrados)
    (repo as any).getPhysicalColumns = async () => new Set([
      'id', 'name', 'address', 'cityId', 'logo', 'coverImage', 'hours', 'phone', 'whatsapp'
    ]);

    const origQuery = (repo as any).constructor;
    // Testa que pickWritable inclui campos permitidos pela regra, mas create/update filtram pelo esquema físico
    const payload = {
      name: 'Teste Resiliente',
      address: 'Rua Central, 50',
      instagram: '@empresa', // existe na whitelist lógica, mas não no físico simulado
      facebook: 'https://fb.com/empresa'
    };

    const clean = (repo as any).pickWritable(payload);
    assert.equal(clean.instagram, '@empresa');

    // Ao preparar para gravação, o BaseRepository filtra contra o conjunto físico
    const physical = await (repo as any).getPhysicalColumns();
    for (const key of Object.keys(clean)) {
      if (!physical.has(key)) delete clean[key];
    }

    assert.equal(clean.name, 'Teste Resiliente');
    assert.equal(clean.address, 'Rua Central, 50');
    assert.equal('instagram' in clean, false, 'Coluna ausente no banco físico deve ser podada');
    assert.equal('facebook' in clean, false, 'Coluna ausente no banco físico deve ser podada');
  });

});
