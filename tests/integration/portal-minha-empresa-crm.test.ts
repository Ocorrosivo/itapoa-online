import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPaymentHarness } from '../helpers/paymentHarness.js';
import { readProfileDetails, formatProfileAddress, formatProfileHours } from '../../src/utils/companyProfileDetails.js';

let h: Awaited<ReturnType<typeof createPaymentHarness>>;

before(async () => {
  h = await createPaymentHarness();
});

after(async () => {
  if (h) await h.close();
});

test('FASE 2, 3, 4: Redes sociais, CEP estruturado e horários persistem ponta a ponta no MariaDB', async () => {
  // 1. Aplicar migração aditiva
  const migration = (await fs.readFile('database/migrations/20261026_company_profile_details.sql', 'utf8')).replace(/^--.*$/gm, '');
  await h.admin.query(migration);

  // 2. Montar objeto com todas as redes sociais e endereço com CEP
  const profileDetails = readProfileDetails({
    cep: '89249-000',
    street: 'Rua Portugal',
    number: '45',
    complement: 'Sala 02',
    neighborhood: 'Sertão',
    city: 'Itapoá',
    state: 'SC',
    x: 'https://x.com/itapoateste',
    googleBusiness: 'https://maps.app.goo.gl/exemplo123',
    schedule: [
      { label: 'Segunda a sexta', closed: false, open: '08:00', close: '18:00' },
      { label: 'Sábado', closed: false, open: '08:00', close: '12:00' },
      { label: 'Domingo', closed: true, open: '', close: '' },
    ],
  });

  const payload = {
    name: 'Empresa Teste Completa',
    instagram: 'https://instagram.com/empresa_teste',
    facebook: 'https://facebook.com/empresa_teste',
    website: 'https://empresa.test',
    profileDetails,
    logo: '/uploads/logo_teste.webp',
    coverImage: '/uploads/capa_teste.webp',
  };

  // Salva na empresa 'a' (pertencente ao usuário autenticado)
  const saveRes = await h.request('/api/companies/a', 'PUT', payload);
  assert.equal(saveRes.status, 200);

  // 3. Verifica persistência real no MariaDB
  const [rows]: any = await h.admin.query(
    'SELECT name, instagram, facebook, website, logo, coverImage, address, hours, profileDetails FROM companies WHERE id="a"'
  );
  assert.equal(rows[0].instagram, 'https://instagram.com/empresa_teste');
  assert.equal(rows[0].facebook, 'https://facebook.com/empresa_teste');
  assert.equal(rows[0].logo, '/uploads/logo_teste.webp');
  assert.equal(rows[0].coverImage, '/uploads/capa_teste.webp');
  assert.match(rows[0].address, /Rua Portugal, 45/);
  assert.match(rows[0].address, /Sertão/);
  assert.match(rows[0].hours, /Segunda a sexta: 08:00 às 18:00/);
  assert.match(rows[0].hours, /Domingo: Fechado/);

  const parsedDetails = JSON.parse(rows[0].profileDetails);
  assert.equal(parsedDetails.cep, '89249-000');
  assert.equal(parsedDetails.x, 'https://x.com/itapoateste');
  assert.equal(parsedDetails.googleBusiness, 'https://maps.app.goo.gl/exemplo123');
  assert.equal(parsedDetails.schedule[2].closed, true);

  // 4. Teste de isolamento multi-tenant: empresa 'b' não pode ser alterada pelo usuário da empresa 'a'
  const unauthorizedRes = await h.request('/api/companies/b', 'PUT', payload);
  assert.equal(unauthorizedRes.status, 403);
});

test('FASE 5: CRM Kanban com 6 etapas, default new, movimentação imediata e isolamento', async () => {
  // 1. Criar lead sem etapa explícita -> deve entrar em 'new'
  const createRes = await h.request('/api/crm/leads', 'POST', {
    company_id: 'a',
    name: 'Lead Novo Teste',
    phone: '(47) 98888-7777',
    interest: 'Consultoria',
  });
  assert.equal(createRes.status, 200);
  assert.equal(createRes.body.status, 'new');
  const leadId = createRes.body.id;

  // 2. Mover card pelas etapas do pipeline
  const stages = ['contacted', 'negotiation', 'proposal', 'won', 'lost'] as const;
  for (const st of stages) {
    const moveRes = await h.request(`/api/crm/leads/${leadId}`, 'PUT', { status: st });
    assert.equal(moveRes.status, 200);
  }

  // 3. Confirmar que a última etapa ('lost') está gravada no banco
  const [leadRows]: any = await h.admin.query('SELECT status FROM crm_leads WHERE id=?', [leadId]);
  assert.equal(leadRows[0].status, 'lost');

  // 4. Etapa inválida é rejeitada com 400
  const invalidStageRes = await h.request(`/api/crm/leads/${leadId}`, 'PUT', { status: 'etapa_inexistente' });
  assert.equal(invalidStageRes.status, 400);

  // 5. Isolamento: usuário de 'b' não pode alterar o lead de 'a'
  const crossTenantRes = await h.request(`/api/crm/leads/${leadId}`, 'PUT', { status: 'won' }, 'b');
  assert.equal(crossTenantRes.status, 403);
});
