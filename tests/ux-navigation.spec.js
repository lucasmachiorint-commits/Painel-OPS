// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Painel OPS - UX Revamp & Navegação E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(HTML_FILE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Deve abrir por padrão no Dashboard com breadcrumb e subtítulo corretos', async ({ page }) => {
    const dashboardView = page.locator('#view-dashboard');
    await expect(dashboardView).toBeVisible();

    const cadastrosView = page.locator('#view-cadastros');
    await expect(cadastrosView).toBeHidden();

    const title = page.locator('#app-view-title');
    await expect(title).toHaveText('Dashboard');

    const sectionTitle = page.locator('#bc-section-title');
    await expect(sectionTitle).toHaveText('Visão Geral');

    const subtitle = page.locator('#app-view-subtitle');
    await expect(subtitle).toContainText('Visão operacional');
  });

  test('2. Sidebar deve conter seções organizadas (Visão Geral, Gestão, Administração)', async ({ page }) => {
    const sectionLabels = page.locator('.menu-section-label');
    const count = await sectionLabels.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstLabel = sectionLabels.first();
    await expect(firstLabel).toHaveText('Visão Geral');
  });

  test('3. Navegar para Cadastros deve atualizar breadcrumb, subtítulo e exibir a tela', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('cadastros');
    });

    const cadastrosView = page.locator('#view-cadastros');
    await expect(cadastrosView).toBeVisible();

    const title = page.locator('#app-view-title');
    await expect(title).toHaveText('Cadastros');

    const sectionTitle = page.locator('#bc-section-title');
    await expect(sectionTitle).toHaveText('Gestão');
  });

  test('4. Filtro global no header deve sincronizar com os filtros de Área', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      applyGlobalFilter('Backoffice', undefined);
    });

    const filterAreaVal = await page.locator('#filter-area').inputValue();
    expect(filterAreaVal).toBe('Backoffice');

    const filterBalancingVal = await page.locator('#filter-area-balancing').inputValue();
    expect(filterBalancingVal).toBe('Backoffice');
  });

  test('5. Chip de usuário deve estar integrado no header da aplicação', async ({ page }) => {
    const userChip = page.locator('.app-header #header-user-chip');
    await expect(userChip).toBeVisible();

    const userName = userChip.locator('#userName');
    await expect(userName).toBeVisible();

    const btnLogout = userChip.locator('#btn-logout');
    await expect(btnLogout).toBeVisible();
  });

});
