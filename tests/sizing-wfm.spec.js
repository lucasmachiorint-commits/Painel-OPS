// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Painel OPS - Redimensionamento (WFM & Erlang C) E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(HTML_FILE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof hideAuthOverlay === 'function') hideAuthOverlay();
      const overlay = document.getElementById('auth-overlay');
      if (overlay) overlay.style.setProperty('display', 'none', 'important');
      // @ts-ignore
      currentUser = { nome: 'Operador Teste', email: 'operador@empresa.com', perfil: 'OPERADOR', assignedTeam: 'Backoffice' };
      // @ts-ignore
      aplicarPerfilDeAcesso();
    });
  });

  test('1. Item Redimensionamento deve existir no menu e abrir a view corretamente', async ({ page }) => {
    const sizingMenuItem = page.locator('.sidebar-menu .menu-item[data-view="sizing"]');
    await expect(sizingMenuItem).toBeVisible();

    await sizingMenuItem.click();

    const sizingView = page.locator('#view-sizing');
    await expect(sizingView).toBeVisible();

    const title = page.locator('#app-view-title');
    await expect(title).toContainText('Redimensionamento');

    const sectionTitle = page.locator('#bc-section-title');
    await expect(sectionTitle).toHaveText('Gestão');
  });

  test('2. Deve calcular e exibir os KPIs padrao de Voz, Backoffice e Total', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const widgetVoz = page.locator('#widget-sizing-pas-voz');
    const widgetChat = page.locator('#widget-sizing-pas-chat');
    const widgetBO = page.locator('#widget-sizing-pas-bo');
    const widgetTotal = page.locator('#widget-sizing-total-pas');

    await expect(widgetVoz).toBeVisible();
    await expect(widgetChat).toBeVisible();
    await expect(widgetBO).toBeVisible();
    await expect(widgetTotal).toBeVisible();

    const vozText = await widgetVoz.innerText();
    const boText = await widgetBO.innerText();
    const totalText = await widgetTotal.innerText();

    expect(parseInt(vozText)).toBe(29);
    expect(parseInt(boText)).toBe(8);
    expect(parseInt(totalText)).toBeGreaterThanOrEqual(parseInt(vozText) + parseInt(boText));
  });

  test('3. Formato planilha triple-panel: Voz, Chat e BKO visiveis lado a lado com campos editaveis', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const tableVoz = page.locator('#sizing-table-voz');
    const tableChat = page.locator('#sizing-table-chat');
    const tableBO = page.locator('#sizing-table-bo');

    await expect(tableVoz).toBeVisible();
    await expect(tableChat).toBeVisible();
    await expect(tableBO).toBeVisible();

    // Verify key fields match the spreadsheet
    await expect(page.locator('#input-sizing-vol-voz')).toHaveValue('19912');
    await expect(page.locator('#input-sizing-telas-voz')).toHaveValue(/^(1|1\.0)$/);
    await expect(page.locator('#input-sizing-telas-chat')).toHaveValue(/^(1|1\.0|2|2\.0)$/);
    await expect(page.locator('#input-sizing-vol-bo')).toHaveValue('10270');
    await expect(page.locator('#input-sizing-dias-uteis-bo')).toHaveValue('30');
    await expect(page.locator('#input-sizing-pas-bo')).toHaveValue('8');
    await expect(page.locator('#input-sizing-tma-real-min')).toHaveValue('00:10:00');
    await expect(page.locator('#input-sizing-nr17-bo-pct')).toHaveValue('10.53');
  });

  test('4. Campo Aumento % Chamadas deve recalcular volumes efetivos e PAs com multiplicador', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const inputAumento = page.locator('#input-sizing-aumento-pct');
    await expect(inputAumento).toBeVisible();

    const totalInitial = parseInt(await page.locator('#widget-sizing-total-pas').innerText());

    await inputAumento.fill('25');
    await inputAumento.dispatchEvent('input');
    await page.waitForTimeout(300);

    const banner = page.locator('#sizing-aumento-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('+25%');

    const totalNew = parseInt(await page.locator('#widget-sizing-total-pas').innerText());
    expect(totalNew).toBeGreaterThan(totalInitial);
  });

  test('5. Safety Buffer slider deve somar PAs adicionais ao total', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const initialTotal = parseInt(await page.locator('#widget-sizing-total-pas').innerText());

    await page.evaluate(() => {
      const slider = /** @type {HTMLInputElement} */ (document.getElementById('input-sizing-safety-buffer'));
      if (slider) {
        slider.value = '5';
        slider.dispatchEvent(new Event('input'));
      }
    });
    await page.waitForTimeout(300);

    const newTotal = parseInt(await page.locator('#widget-sizing-total-pas').innerText());
    expect(newTotal).toBe(initialTotal + 5);

    const bufferPill = page.locator('#sizing-val-safety-buffer');
    await expect(bufferPill).toHaveText('+5 PAs extras');
  });

  test('6. Campo Ajuste manual deve alterar PA Contratada diretamente', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const inputAjusteBo = page.locator('#input-sizing-ajuste-bo');
    await inputAjusteBo.fill('3');
    await inputAjusteBo.dispatchEvent('input');
    await page.waitForTimeout(300);

    // PA Contratada should be 8 + 3 = 11
    await expect(page.locator('#input-sizing-pa-contratada-bo')).toHaveValue('11');
    await expect(page.locator('#widget-sizing-pas-bo')).toHaveText('11');
  });

  test('7. Versionamento mensal e travamento de meses passados', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
      // @ts-ignore
      onSizingMonthSelect('2026-08'); // Month in the past
    });
    await page.waitForTimeout(300);

    const lockBadge = page.locator('#sizing-lock-badge');
    await expect(lockBadge).toContainText('Mês encerrado');

    // Inputs inside sheet tables should be disabled
    const volVozInput = page.locator('#input-sizing-vol-voz');
    await expect(volVozInput).toBeDisabled();

    // Switch back to future/projected month
    await page.evaluate(() => {
      // @ts-ignore
      onSizingMonthSelect('2026-11');
    });
    await page.waitForTimeout(300);

    await expect(lockBadge).toContainText('Aberto para edição');
    await expect(volVozInput).toBeEnabled();
  });

  test('8. Perfil CONSULTA pode ver a view mas os botoes de acao ficam restritos', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser = { nome: 'Visitante', email: '', perfil: 'CONSULTA', assignedTeam: '' };
      // @ts-ignore
      aplicarPerfilDeAcesso();
      // @ts-ignore
      switchToView('sizing');
    });

    const sizingMenuItem = page.locator('.sidebar-menu .menu-item[data-view="sizing"]');
    await expect(sizingMenuItem).toBeVisible();

    const btnImport = page.locator('#btn-sizing-import-excel');
    await expect(btnImport).toBeHidden();
  });
});
