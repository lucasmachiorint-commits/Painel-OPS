// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Painel OPS - RBAC & Permissões E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Escuta erros do console no navegador
    page.on('pageerror', err => {
      console.error('[Page Error]:', err.message);
    });
    await page.goto(HTML_FILE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Perfil ADMIN deve ter acesso irrestrito e ver todos os controles de equipe', async ({ page }) => {
    // Seleciona o perfil ADMIN
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Administrador', email: 'admin@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      aplicarPerfilDeAcesso();
      // @ts-ignore
      if (typeof switchToView === 'function') switchToView('cadastros');
      else renderCadastrosView();
    });

    // 1. Botão de Nova Equipe e Padrão Global visíveis
    const btnNewTeam = page.locator('#btn-open-new-team-modal');
    await expect(btnNewTeam).toBeVisible();

    const btnGlobalParams = page.locator('#btn-global-params');
    await expect(btnGlobalParams).toBeVisible();

    // 2. Coluna de seleção em massa visível
    const adminCol = page.locator('.col-select-admin').first();
    await expect(adminCol).toBeVisible();
  });

  test('2. Perfil OPERADOR deve ficar restrito estritamente à sua equipe', async ({ page }) => {
    // Configura usuário OPERADOR vinculado a "Eficiência Operacional"
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { 
        nome: 'Jailton Santos', 
        email: 'jailtonsantos@natura.net', 
        perfil: 'OPERADOR', 
        assignedTeam: 'Eficiência Operacional' 
      };
      // @ts-ignore
      aplicarPerfilDeAcesso();
      // @ts-ignore
      if (typeof switchToView === 'function') switchToView('cadastros');
      else renderCadastrosView();
    });

    // 1. Botões de criação de equipe e parâmetro global devem estar OCULTOS
    const btnNewTeam = page.locator('#btn-open-new-team-modal');
    await expect(btnNewTeam).toBeHidden();

    const btnGlobalParams = page.locator('#btn-global-params');
    await expect(btnGlobalParams).toBeHidden();

    // 2. Atividades de OUTRAS equipes (ex: Backoffice ou Seguros) devem estar TRAVADAS
    const disabledTeamSelects = await page.locator('tr[data-id] .select-activity-team-cell[disabled]').count();
    expect(disabledTeamSelects).toBeGreaterThan(0);

    const disabledRpaCheckboxes = await page.locator('tr[data-id] .cb-activity-rpa[disabled]').count();
    expect(disabledRpaCheckboxes).toBeGreaterThan(0);

    // 3. Valida que a exibição da equipe de outra linha mostra o nome real (ex: Seguros/N2 ou Backoffice)
    const selectFirstOther = page.locator('tr[data-id] .select-activity-team-cell[disabled]').first();
    const selectedVal = await selectFirstOther.inputValue();
    expect(selectedVal).not.toBe('');
  });

  test('3. Perfil CONSULTA deve ser somente leitura', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Visitante', email: 'visitante@natura.net', perfil: 'CONSULTA', assignedTeam: '' };
      // @ts-ignore
      aplicarPerfilDeAcesso();
      // @ts-ignore
      if (typeof switchToView === 'function') switchToView('cadastros');
      else renderCadastrosView();
    });

    // 1. Coluna de exclusão deve estar oculta
    const colExcluir = page.locator('.col-acao-excluir').first();
    await expect(colExcluir).toBeHidden();

    // 2. Inputs devem estar desabilitados
    const activeInputs = await page.locator('input.input-activity-name-cell:not([readonly])').count();
    expect(activeInputs).toBe(0);
  });

});
