// Local browser tests with mocked API. Never sends an email or changes a real account.
import { test, expect, Page } from '@playwright/test';
const base = 'http://127.0.0.1:4173';
async function setup(page: Page, available = true, fail = false) {
  const writes: { path: string; body: any }[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') writes.push({ path, body: request.postDataJSON() });
    let body: any = [];
    if (path.endsWith('recovery-status')) body = { available };
    if (path.endsWith('forgot-password')) body = { message: 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.' };
    if (path.endsWith('reset-password')) body = { success: true };
    const failed = fail && request.method() === 'POST';
    await route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'Recuperação temporariamente indisponível.' } : body });
  });
  return writes;
}
test('solicita recuperação real na API, com mensagem neutra', async ({ page }) => {
  const writes = await setup(page);
  await page.goto(base + '/esqueci-senha');
  await page.getByLabel('E-mail cadastrado').fill('user@example.test');
  await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitação recebida' })).toBeVisible();
  expect(writes).toEqual([{ path: '/api/auth/forgot-password', body: { email: 'user@example.test' } }]);
  await expect(page.getByText('Identificamos seu pedido', { exact: false })).toHaveCount(0);
});
test('SMTP indisponível não simula envio; falhas reais não mostram sucesso', async ({ page }) => {
  const writes = await setup(page, false);
  await page.goto(base + '/esqueci-senha');
  await expect(page.getByRole('alert')).toContainText('indisponível');
  await expect(page.getByRole('button', { name: 'Enviar link de recuperação' })).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page.unroute('**/api/**');
  await setup(page, true, true); await page.reload();
  await page.getByLabel('E-mail cadastrado').fill('user@example.test');
  await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
  await expect(page.getByRole('alert')).toContainText('indisponível');
  await expect(page.getByRole('heading', { name: 'Solicitação recebida' })).toHaveCount(0);
});
test('mobile: link não altera senha ao abrir; segredo sai da URL e só vai no POST', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const writes = await setup(page), token = 'a'.repeat(64);
  await page.goto(base + '/redefinir-senha#token=' + token);
  await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(base + '/redefinir-senha');
  expect(writes).toHaveLength(0);
  await page.getByLabel('Nova senha', { exact: true }).fill('New-password-123');
  await page.getByLabel('Confirmar nova senha').fill('Different-password');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('alert')).toContainText('não coincidem');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByLabel('Confirmar nova senha').fill('New-password-123');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('status')).toContainText('Senha redefinida');
  expect(writes).toEqual([{ path: '/api/auth/reset-password', body: { token, password: 'New-password-123' } }]);
  expect(await page.evaluate(() => localStorage.getItem('saas_token'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/password-reset-mobile.png', fullPage: true });
});
test('link ausente ou rejeitado não dá sucesso', async ({ page }) => {
  const writes = await setup(page, true, true);
  await page.goto(base + '/redefinir-senha');
  await expect(page.getByRole('alert')).toContainText('Link inválido');
  expect(writes).toHaveLength(0);
  await page.goto(base + '/redefinir-senha#token=' + 'b'.repeat(64));
  await page.getByLabel('Nova senha', { exact: true }).fill('New-password-123');
  await page.getByLabel('Confirmar nova senha').fill('New-password-123');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('alert')).toContainText('indisponível');
  await expect(page.getByText('Senha redefinida.', { exact: false })).toHaveCount(0);
});
