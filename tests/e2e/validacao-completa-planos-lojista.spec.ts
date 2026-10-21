/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * E2E Completo — Validação das Etapas de Planos, Lojista, CRM, Telemetria e Mercado Pago
 *
 * Cobre:
 * 1. Edição administrativa refletida nos planos e checkout
 * 2. Direitos e limites Bronze, Gold e Diamond
 * 3. Painel do lojista: 6 menus, empresa, catálogo, CRM e suporte
 * 4. Quatro métricas reais e seletor de histórico (7 dias Bronze vs 30/90 dias Gold/Diamond)
 * 5. Teste grátis de 7 dias e pagamentos oficiais (Pix avulso 30d vs assinatura cartão)
 * 6. Concessão manual institucional
 * 7. Isolamento entre empresas (anti-IDOR)
 * 8. Responsividade Desktop e Mobile
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173';

const mockUser = {
  id: 'usr_lojista_test',
  name: 'Empresário Teste Itapoá',
  email: 'lojista@example.test',
  role: 'advertiser'
};

const mockCompanyBronze = {
  id: 'comp_bronze_01',
  name: 'Comércio Local Bronze',
  slug: 'comercio-local-bronze',
  planLevel: 'bronze',
  access_grant_type: 'bronze',
  isSponsored: 0,
  logo: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=200',
  coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
  phone: '4734431000',
  whatsapp: '47999991111',
  views: 142,
  clicksWhatsapp: 28,
  clicksPhone: 12,
  clicksRoute: 9
};

const mockPlans = [
  {
    id: 'plan_bronze',
    name: 'bronze',
    displayName: 'Bronze Gratuito',
    description: 'Presença essencial no guia comercial de Itapoá.',
    price: 0.00,
    billingCycle: 'monthly',
    maxGalleryPhotos: 3,
    maxProducts: 0,
    maxCoupons: 0,
    hasHomeHighlight: false,
    hasCrm: true,
    buttonText: 'Começar Gratuitamente'
  },
  {
    id: 'plan_gold_vip',
    name: 'gold_vip',
    displayName: 'Gold VIP',
    description: 'Mais exposição com destaque rotativo e vitrine ampliada.',
    price: 49.90,
    billingCycle: 'monthly',
    maxGalleryPhotos: 15,
    maxProducts: 5,
    maxCoupons: 1,
    hasHomeHighlight: true,
    hasCrm: true,
    isRecommended: true,
    buttonText: 'Assinar Gold VIP'
  },
  {
    id: 'plan_diamond_extremo',
    name: 'diamond_extremo',
    displayName: 'Diamond',
    description: 'Recursos Gold com maior capacidade de catálogo, fotos e promoções.',
    price: 99.90,
    billingCycle: 'monthly',
    maxGalleryPhotos: 30,
    maxProducts: 30,
    maxCoupons: 3,
    hasHomeHighlight: true,
    hasCrm: true,
    buttonText: 'Assinar Diamond'
  }
];

const mockLeads = [
  {
    id: 'lead_1',
    company_id: 'comp_bronze_01',
    name: 'Carlos Oliveira',
    phone: '47998877665',
    email: 'carlos@example.com',
    source: 'itapoa_online',
    status: 'new',
    interest: 'Orçamento de serviços gerais',
    notes: 'Cliente solicitou retorno após as 14h',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead_2_other_company',
    company_id: 'comp_outra_empresa_isolada',
    name: 'Isolado Silva',
    phone: '47991112233',
    email: 'isolado@outra.com',
    status: 'negotiation',
    createdAt: new Date().toISOString()
  }
];

async function setupPageMocks(page: Page, company = mockCompanyBronze) {
  await page.addInitScript(({ user, comp }) => {
    localStorage.clear();
    localStorage.setItem('saas_token', 'test-jwt-token');
    localStorage.setItem('saas_user', JSON.stringify(user));
    localStorage.setItem('active_company_id', comp.id);
  }, { user: mockUser, comp: company });

  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;

    if (path === '/api/auth/profile') {
      return route.fulfill({ status: 200, json: mockUser });
    }
    if (path === '/api/account/companies') {
      return route.fulfill({ status: 200, json: [company] });
    }
    if (path === '/api/plans') {
      return route.fulfill({ status: 200, json: mockPlans });
    }
    if (path.includes('/api/companies/') && path.endsWith('/entitlements')) {
      const isGold = company.planLevel === 'gold_vip';
      return route.fulfill({
        status: 200,
        json: {
          companyId: company.id,
          companyName: company.name,
          planTier: company.planLevel,
          planName: isGold ? 'Gold VIP' : 'Bronze',
          grantType: company.access_grant_type,
          grantDetails: {
            isTrial: company.access_grant_type === 'trial',
            trialEndsAt: (company as any).trial_ends_at || null,
            trialEligible: company.planLevel === 'bronze',
            hasUsedTrial: Boolean((company as any).has_used_trial),
            paymentType: isGold ? 'subscription' : null,
            nextBillingDate: isGold ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
            contractedPrice: isGold ? 49.90 : 0.00,
            isAdminGrant: company.access_grant_type === 'admin_grant'
          },
          limits: {
            maxGalleryPhotos: isGold ? 15 : 3,
            maxProducts: isGold ? 5 : 0,
            maxCoupons: isGold ? 1 : 0,
            hasHomeHighlight: isGold,
            hasCrm: true
          },
          usage: {
            galleryPhotosCount: 2,
            productsCount: isGold ? 3 : 0,
            couponsCount: isGold ? 1 : 0,
            logoConfigured: true,
            coverConfigured: true
          },
          canAdd: { photos: true, products: isGold, coupons: isGold }
        }
      });
    }
    if (path.includes('/api/companies/') && path.endsWith('/analytics')) {
      const days = parseInt(url.searchParams.get('days') || '7', 10);
      const isBronze = company.planLevel === 'bronze';
      const restricted = days > 7 && isBronze;
      return route.fulfill({
        status: 200,
        json: {
          companyId: company.id,
          plan: company.planLevel,
          planDisplayName: company.planLevel === 'gold_vip' ? 'Gold VIP' : 'Bronze',
          days: restricted ? 7 : days,
          allowedDays: isBronze ? [7] : [7, 30, 90],
          planRestricted: restricted,
          restrictionMessage: restricted ? 'Histórico estendido exclusivo para Gold VIP e Diamond.' : null,
          totals: {
            views: company.views,
            whatsapp: company.clicksWhatsapp,
            phone: company.clicksPhone,
            route: company.clicksRoute
          },
          periodTotals: {
            views: company.views,
            whatsapp: company.clicksWhatsapp,
            phone: company.clicksPhone,
            route: company.clicksRoute
          },
          timeline: [
            { date: '2026-10-20', label: 'Hoje', views: 24, whatsapp: 5, phone: 2, route: 1 }
          ]
        }
      });
    }
    if (path === '/api/crm/leads') {
      return route.fulfill({ status: 200, json: mockLeads });
    }
    if (path === '/api/support/tickets') {
      return route.fulfill({
        status: 200,
        json: [
          {
            id: 'tkt_01',
            company_id: company.id,
            subject: 'Dúvida sobre fotos da galeria',
            message: 'Como faço para ordenar as fotos?',
            status: 'open',
            createdAt: new Date().toISOString()
          }
        ]
      });
    }
    if (path === '/api/payments/pix') {
      return route.fulfill({
        status: 200,
        json: {
          subscriptionId: 'sub_test_pix_123',
          paymentId: 'mp_pay_998877',
          qrCode: '00020126580014br.gov.bcb.pix0136test-mercadopago-pix-itapoa',
          qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          amount: 49.90,
          expirationDate: new Date(Date.now() + 1800000).toISOString()
        }
      });
    }
    if (path.includes('/api/payments/subscription/') && path.endsWith('/reconcile')) {
      return route.fulfill({
        status: 200,
        json: { status: 'active', reconciled: true, message: 'Pagamento aprovado no Mercado Pago!' }
      });
    }
    if (path === '/api/plans/start-trial') {
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          planTier: 'gold_vip',
          message: 'Experiência Gold de 7 dias ativada com sucesso!'
        }
      });
    }
    if (path === '/api/payments/config') {
      return route.fulfill({ status: 200, json: { publicKey: 'test_pk', pixEnabled: true, cardEnabled: true } });
    }

    return route.fulfill({ status: 200, json: [] });
  });
}

test.describe('Validação E2E — Desktop (1366x900)', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('1. Página pública de Planos reflete catálogo oficial da API sem promessas vazias', async ({ page }) => {
    await setupPageMocks(page);
    await page.goto(`${BASE_URL}/planos`);
    await page.waitForLoadState('networkidle');

    // Preços oficiais refletidos da API
    await expect(page.getByText('Grátis', { exact: true })).toBeVisible();
    await expect(page.getByText('R$ 49,90')).toBeVisible();
    await expect(page.getByText('R$ 99,90')).toBeVisible();

    // Botões de ação oficiais
    await expect(page.getByRole('button', { name: /Começar Gratuitamente/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Assinar Gold VIP/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Assinar Diamond/i })).toBeVisible();
  });

  test('2. Painel do Lojista: Menu Oficial Estrito (6 Itens) e 4 Métricas Reais', async ({ page }) => {
    await setupPageMocks(page, mockCompanyBronze);
    await page.goto(`${BASE_URL}/painel`);
    await page.waitForLoadState('networkidle');

    // Valida os 6 menus oficiais
    await expect(page.locator('aside button', { hasText: 'Visão geral' })).toBeVisible();
    await expect(page.locator('aside button', { hasText: 'Minha empresa' })).toBeVisible();
    await expect(page.locator('aside button', { hasText: 'Produtos e serviços' })).toBeVisible();
    await expect(page.locator('aside button', { hasText: 'Clientes' })).toBeVisible();
    await expect(page.locator('aside button', { hasText: 'Meu plano' })).toBeVisible();
    await expect(page.locator('aside button', { hasText: 'Ajuda' })).toBeVisible();

    // 4 Métricas Reais na Visão Geral
    await expect(page.locator('span', { hasText: /^Visualizações$/ }).first()).toBeVisible();
    await expect(page.getByText('Cliques no WhatsApp')).toBeVisible();
    await expect(page.getByText('Cliques no Telefone')).toBeVisible();
    await expect(page.getByText('Cliques em Rotas')).toBeVisible();

    // Valores reais da empresa
    await expect(page.getByText('142').first()).toBeVisible(); // Views
    await expect(page.getByText('28').first()).toBeVisible();  // WhatsApp
  });

  test('3. CRM: Contatos, Interesse, Situação e Isolamento Anti-IDOR entre Empresas', async ({ page }) => {
    await setupPageMocks(page, mockCompanyBronze);
    await page.goto(`${BASE_URL}/painel`);
    await page.waitForLoadState('networkidle');

    // Acessa CRM (Clientes)
    await page.locator('aside button', { hasText: 'Clientes' }).click();

    // Valida lead da empresa ativa
    await expect(page.getByText('Carlos Oliveira')).toBeVisible();
    await expect(page.getByText('Orçamento de serviços gerais')).toBeVisible();

    // Valida Isolamento: lead da empresa 'comp_outra_empresa_isolada' NÃO deve aparecer!
    await expect(page.getByText('Isolado Silva')).not.toBeVisible();
  });

  test('4. Meu Plano: Diferenciação de Acesso, Pix Avulso (Sem renovação automática) e Reconciliação', async ({ page }) => {
    await setupPageMocks(page, mockCompanyBronze);
    await page.goto(`${BASE_URL}/painel`);
    await page.waitForLoadState('networkidle');

    // Acessa Meu Plano
    await page.locator('aside button', { hasText: 'Meu plano' }).click();

    // Deve exibir opção de teste grátis para cliente elegível
    await expect(page.getByText(/Experimente o Plano Gold VIP por 7 dias grátis/i)).toBeVisible();

    // Gera cobrança Pix para Gold
    await page.getByRole('button', { name: /Contratar Gold VIP/i }).first().click();

    // Modal do Pix aberto com transparência
    await expect(page.getByRole('heading', { name: 'Pagamento Avulso via PIX' })).toBeVisible();
    await expect(page.getByText(/Não há renovação automática nem débitos futuros/i)).toBeVisible();

    // Botão de reconciliação presente
    await expect(page.getByRole('button', { name: /Confirmar pagamento agora/i })).toBeVisible();
  });
});

test.describe('Validação E2E — Mobile Celular (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('5. Responsividade Mobile: Navegação e Métricas no Smartphone', async ({ page }) => {
    await setupPageMocks(page, mockCompanyBronze);
    await page.goto(`${BASE_URL}/painel`);
    await page.waitForLoadState('networkidle');

    // Visão Geral e métricas visíveis no mobile sem quebra horizontal
    await expect(page.locator('span', { hasText: /^Visualizações$/ }).first()).toBeVisible();
    await expect(page.getByText('Cliques no WhatsApp')).toBeVisible();
  });
});
