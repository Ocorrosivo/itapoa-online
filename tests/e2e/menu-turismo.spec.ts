import { test, expect } from '@playwright/test';

const base = process.env.MENU_TEST_URL || 'http://127.0.0.1:4173';

test('desktop: Turismo abre submenu, Escape fecha e Eventos preserva URL', async ({ page }) => {
  await page.goto(base);
  const menu = page.getByRole('menu', { name: 'Submenu Turismo' });
  const turismo = page.getByRole('button', { name: 'Turismo', exact: true }).first();
  await expect(turismo).toBeVisible();
  await expect(menu).toBeHidden();
  await turismo.hover();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Informativo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.mouse.move(0, 0);
  await turismo.hover();
  await menu.getByRole('menuitem', { name: 'Eventos' }).click();
  await expect(page).toHaveURL(/\/eventos$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Turismo', exact: true }).first()).toBeVisible();
});

test('mobile: seta expande submenu e Informativo navega', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Expandir submenu Turismo' }).click();
  await expect(page.getByRole('button', { name: 'Recolher submenu Turismo' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Informativo', exact: true }).click();
  await expect(page).toHaveURL(/\/informativo$/);
  await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toBeVisible();
});
