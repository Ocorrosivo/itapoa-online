import { test, expect, Page } from '@playwright/test';

const base = process.env.VISUAL_TEST_URL || 'http://127.0.0.1:4173';
const companies = [1, 2, 3].map(n => ({
  id: `visual_${n}`, name: `Empresa Teste ${n}`, slug: `empresa-teste-${n}`,
  logo: '/logotipo.png?w=100&q=80', coverImage: '/logotipo.png?w=800&q=90', planLevel: 'gold_vip',
  cityId: 'city_test', categoryId: 'cat_test', rating: 5, reviewCount: 0,
  phone: '47999990000', whatsapp: '47999990000', description: 'Empresa de teste visual',
  features: [], products: [], faqs: [], latitude: -26.11, longitude: -48.61
}));

async function fixture(page: Page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === '/api/companies') json = companies;
    else if (path.startsWith('/api/companies/')) json = companies.find(c => path.endsWith(c.slug)) || {};
    else if (path === '/api/cities') json = [{ id: 'city_test', name: 'Itapoá' }];
    else if (path === '/api/categories') json = [{ id: 'cat_test', name: 'Comércio', icon: 'Store' }];
    return route.fulfill({ status: 200, json });
  });
}

for (const width of [390, 768, 1366, 1920]) {
  test(`litoral e mini-site alinhados em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    await page.goto(base);
    const firstCard = page.getByAltText('Nossas Praias', { exact: true }).locator('..');
    const grid = firstCard.locator('..');
    const carousel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Top Empresas de Itapoá' }) });
    await expect(carousel).toBeVisible();
    const stripBox = await grid.boundingBox();
    const carouselBox = await carousel.boundingBox();
    expect(stripBox).not.toBeNull(); expect(carouselBox).not.toBeNull();
    expect(Math.abs(stripBox!.x - carouselBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(stripBox!.width - carouselBox!.width)).toBeLessThanOrEqual(1);
    expect(await grid.locator(':scope > div').count()).toBe(6);
    expect(await firstCard.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(0);
    // When logo equals cover, no second copy may appear in the floating badge.
    expect(await carousel.locator('img').count()).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto(base + '/empresa/empresa-teste-1');
    const cover = page.locator('#detail_cover');
    await expect(cover).toBeVisible();
    // The catalogue can finish loading after the detail request and briefly remount it.
    await expect.poll(async () => {
      const coverBox = await cover.boundingBox();
      const tabsBox = await page.getByRole('button', { name: 'Informações Gerais', exact: true }).locator('..').boundingBox();
      if (!coverBox || !tabsBox) return Infinity;
      return Math.max(Math.abs(coverBox.x - tabsBox.x), Math.abs(coverBox.width - tabsBox.width));
    }).toBeLessThanOrEqual(1);
    expect(await cover.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
