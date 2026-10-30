// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Painel OPS - Seletor de Módulo (Atendimento x Operações) E2E', () => {

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => {
      console.error('[Page Error]:', err.message);
    });
    await page.goto(HTML_FILE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof hideAuthOverlay === 'function') hideAuthOverlay();
      const overlay = document.getElementById('auth-overlay');
      if (overlay) overlay.style.setProperty('display', 'none', 'important');
    });
  });

  test('1. Deve exibir o seletor de módulo e permitir selecionar Operações', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      showModuleSelector();
    });

    const overlay = page.locator('#module-selector-overlay');
    await expect(overlay).toBeVisible();

    const greet = page.locator('#module-selector-greet');
    await expect(greet).toContainText('Lucas');

    const cardOperacoes = page.locator('#card-module-operacoes');
    await expect(cardOperacoes).toBeVisible();

    // Clicar em Operações
    await cardOperacoes.click();

    // Overlay deve fechar
    await expect(overlay).toBeHidden();

    // Breadcrumb e botão no header devem refletir Operações
    const bcModule = page.locator('#bc-module-title');
    await expect(bcModule).toHaveText('Operações');

    const switchLabel = page.locator('#module-switch-label');
    await expect(switchLabel).toHaveText('Operações');

    // Sidebar deve conter apenas itens de Operações (dashboard visível, sizing oculto)
    const dashboardMenuItem = page.locator('.sidebar-menu .menu-item[data-view="dashboard"]');
    await expect(dashboardMenuItem).toBeVisible();

    const sizingMenuItem = page.locator('.sidebar-menu .menu-item[data-view="sizing"]');
    await expect(sizingMenuItem).toBeHidden();

    // Filtros globais devem estar visíveis
    const globalFilters = page.locator('#header-global-filters');
    await expect(globalFilters).toBeVisible();
  });

  test('2. Botão do header deve reabrir o seletor com botão fechar visível', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('operacoes');
    });

    const switchBtn = page.locator('#btn-switch-module');
    await switchBtn.click();

    const overlay = page.locator('#module-selector-overlay');
    await expect(overlay).toBeVisible();

    // Como já havia módulo selecionado, botão fechar (X) deve estar visível
    const closeBtn = page.locator('#btn-close-module-selector');
    await expect(closeBtn).toBeVisible();

    await closeBtn.click();
    await expect(overlay).toBeHidden();
  });

  test('3. Deve permitir selecionar Atendimento e isolar a visualização', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('atendimento');
    });

    // View ativa deve ser sizing
    const sizingView = page.locator('#view-sizing');
    await expect(sizingView).toBeVisible();

    // Breadcrumb e botão no header
    const bcModule = page.locator('#bc-module-title');
    await expect(bcModule).toHaveText('Atendimento');

    const switchLabel = page.locator('#module-switch-label');
    await expect(switchLabel).toHaveText('Atendimento');

    // Menu lateral deve mostrar apenas Atendimento (sizing) e esconder itens de Operações
    const sizingMenuItem = page.locator('.sidebar-menu .menu-item[data-view="sizing"]');
    await expect(sizingMenuItem).toBeVisible();

    const dashboardMenuItem = page.locator('.sidebar-menu .menu-item[data-view="dashboard"]');
    await expect(dashboardMenuItem).toBeHidden();

    const cadastrosMenuItem = page.locator('.sidebar-menu .menu-item[data-view="cadastros"]');
    await expect(cadastrosMenuItem).toBeHidden();

    // Filtros globais de área/responsável devem ficar ocultos no Atendimento
    const globalFilters = page.locator('#header-global-filters');
    await expect(globalFilters).toBeHidden();
  });

  test('4. Na Hispana o card Atendimento deve ficar desabilitado com badge', async ({ page }) => {
    await page.evaluate(async () => {
      // @ts-ignore
      currentUser = { nome: 'Valeria Sotes', email: 'valeria.sotes@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      await switchCountry('HISPANA');
      // @ts-ignore
      showModuleSelector();
    });

    const cardAtendimento = page.locator('#card-module-atendimento');
    await expect(cardAtendimento).toHaveClass(/is-disabled/);

    const soonBadge = page.locator('#module-soon-badge-atendimento');
    await expect(soonBadge).toBeVisible();

    const countryChip = page.locator('#module-user-country');
    await expect(countryChip).toContainText('Hispana');
  });

  test('5. Mudar para Hispana enquanto em Atendimento deve redirecionar para Operações', async ({ page }) => {
    await page.evaluate(async () => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('atendimento');
      // @ts-ignore
      await switchCountry('HISPANA');
    });

    const dashboardView = page.locator('#view-dashboard');
    await expect(dashboardView).toBeVisible();

    const switchLabel = page.locator('#module-switch-label');
    await expect(switchLabel).toHaveText('Operaciones');
  });

  test('6. Todos os perfis (ADMIN, OPERADOR, CONSULTA) podem selecionar módulos', async ({ page }) => {
    for (const perfil of ['OPERADOR', 'CONSULTA']) {
      await page.evaluate((p) => {
        // @ts-ignore
        currentUser = { nome: 'Usuário Teste', email: 'teste@natura.net', perfil: p, assignedTeam: 'Backoffice' };
        // @ts-ignore
        selectModule('atendimento');
      }, perfil);

      const sizingView = page.locator('#view-sizing');
      await expect(sizingView).toBeVisible();

      await page.evaluate((p) => {
        // @ts-ignore
        selectModule('operacoes');
      }, perfil);

      const dashboardView = page.locator('#view-dashboard');
      await expect(dashboardView).toBeVisible();
    }
  });

  test('7. Menu Balanceamento deve estar oculto em ambos os modulos e em todos os perfis', async ({ page }) => {
    for (const perfil of ['ADMIN', 'OPERADOR', 'CONSULTA']) {
      await page.evaluate((p) => {
        // @ts-ignore
        currentUser = { nome: 'Usuario Teste', email: 'teste@natura.net', perfil: p, assignedTeam: 'Backoffice' };
        // @ts-ignore
        selectModule('operacoes');
      }, perfil);

      const balancingMenuItem = page.locator('.sidebar-menu .menu-item[data-view="balancing"]');
      await expect(balancingMenuItem).toBeHidden();
    }
  });

  test('8. Cliques na pagina e eventos de foco nao devem reabrir o seletor de ambiente', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('operacoes');
    });

    const overlay = page.locator('#module-selector-overlay');
    await expect(overlay).toBeHidden();

    // Clicar em multiplos pontos do dashboard
    await page.locator('#app-view-title').click();
    await page.locator('body').click({ position: { x: 300, y: 200 } });
    await page.locator('.sidebar-menu').click();
    await page.waitForTimeout(300);

    // O seletor deve permanecer estritamente oculto
    await expect(overlay).toBeHidden();
  });

  test('9. Re-disparo de SIGNED_IN nao reinicia sessao nem reabre seletor', async ({ page }) => {
    await page.evaluate(async () => {
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('atendimento');
      // @ts-ignore
      window._sessionBootstrapped = true;
      // @ts-ignore
      window._authUserId = 'user-123';

      // Simular re-chamada de setupUserSession pelo listener SIGNED_IN
      // @ts-ignore
      await setupUserSession({ id: 'user-123', email: 'lucas.machiori@natura.net' });
    });

    const overlay = page.locator('#module-selector-overlay');
    await expect(overlay).toBeHidden();

    // Deve permanecer na view de Atendimento
    const sizingView = page.locator('#view-sizing');
    await expect(sizingView).toBeVisible();
  });

  test('10. Recarregar a pagina (refresh/F5) deve exibir tela de login', async ({ page }) => {
    // Recarregar a página
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Tela de login deve estar visível
    const authOverlay = page.locator('#auth-overlay');
    await expect(authOverlay).toBeVisible();
  });

});
