// UI contract tests. All gateway/API traffic is simulated: no real charge or credential is used.
import { test, expect, Page } from '@playwright/test';

const base = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173';
const customer = { id: 'checkout-test-user', name: 'Cliente Teste', email: 'cliente@example.test', phone: '47999990000', role: 'advertiser' };

async function setup(page: Page, ready = true) {
  const writes: { path: string; body: any }[] = [];
  await page.addInitScript(user => {
    localStorage.clear();
    localStorage.setItem('saas_token', 'test-session');
    localStorage.setItem('saas_user', JSON.stringify(user));
  }, customer);
  await page.route('https://sdk.mercadopago.com/js/v2', route => route.fulfill({
    contentType: 'application/javascript', body: `window.MercadoPago = class {
      bricks() { return { create: async (type, id, settings) => {
        const container = document.getElementById(id);
        const button = document.createElement('button');
        button.textContent = 'Pagar cartão simulado';
        button.onclick = () => settings.callbacks.onSubmit({token:'sdk-test-token',payment_method_id:'visa',installments:1,payer:{identification:{type:'CPF',number:'12345678909'}}});
        container.appendChild(button); settings.callbacks.onReady();
        return {unmount: () => {container.innerHTML = '';}};
      }}; }
    };`
  }));
  await page.route('**/api/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() });
    let body: unknown = [];
    if (path === '/api/auth/profile') body = customer;
    if (path === '/api/payments/config') body = { publicKey: ready ? 'public-test-key' : '', pixEnabled: ready, cardEnabled: ready };
    if (path === '/api/plans') body = [{ id: 'plan_gold_vip', name: 'gold_vip', price: 49.9 }, { id: 'plan_bronze', name: 'bronze', price: 0 }];
    if (path === '/api/checkout/company') body = { companyId: 'checkout_private_test' };
    if (path === '/api/payments/card') body = { subscriptionId: 'sub_test', status: 'in_process' };
    if (path === '/api/payments/pix') body = { subscriptionId: 'sub_test', paymentId: 'pix_test', qrCode: 'CODIGO-PIX-SIMULADO', qrCodeBase64: '', amount: 49.9, expirationDate: new Date(Date.now() + 1800000).toISOString() };
    if (path.includes('/api/payments/subscription/')) body = { status: 'pending' };
    await route.fulfill({ status: 200, json: body });
  });
  await page.goto(base + '/planos');
  await page.getByRole('button', { name: 'Assinar Plano Gold' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Finalize seu plano' })).toBeVisible();
  return writes;
}

test('checkout é página, pede só contato e usa cartão tokenizado', async ({ page }) => {
  const writes = await setup(page);
  await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Telefone', { exact: true })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pagar cartão simulado' }).click();
  await expect(page.getByText('Aguardando a confirmação oficial', { exact: false })).toBeVisible();
  expect(writes.map(w => w.path)).toEqual(['/api/checkout/company', '/api/payments/card']);
  expect(writes[0].body.contact).toEqual({ name: customer.name, email: customer.email, phone: customer.phone });
  expect(writes[1].body.formData.token).toBe('sdk-test-token');
  expect(writes[1].body).not.toHaveProperty('amount');
  await expect(page.getByText('Pagamento confirmado', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/checkout-desktop.png', fullPage: true });
});

test('mobile: Pix só é gerado após confirmação e não exige dados comerciais', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const writes = await setup(page);
  await page.getByRole('button', { name: 'Pix', exact: true }).click();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Gerar QR Code Pix' }).click();
  await expect(page.getByLabel('Pix Copia e Cola')).toHaveValue('CODIGO-PIX-SIMULADO');
  expect(writes.map(w => w.path)).toEqual(['/api/checkout/company', '/api/payments/pix']);
  await page.screenshot({ path: 'test-results/checkout-mobile.png', fullPage: true });
});

test('configuração ausente não mostra campos falsos nem permite gerar cobrança', async ({ page }) => {
  const writes = await setup(page, false);
  await expect(page.getByText('Cartão temporariamente indisponível.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Pix', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gerar QR Code Pix' })).toBeDisabled();
  expect(writes).toHaveLength(0);
});
