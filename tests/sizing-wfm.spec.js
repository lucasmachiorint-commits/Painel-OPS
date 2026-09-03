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

    expect(parseInt(vozText)).toBeGreaterThan(10);
    expect(parseInt(boText)).toBe(23);
    expect(parseInt(totalText)).toBeGreaterThanOrEqual(parseInt(vozText) + parseInt(boText));
  });

  test('3. Alternancia entre abas de parametros (Voz, Chat, Backoffice, Governanca)', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const tabVozContent = page.locator('#sizing-tab-content-voz');
    const tabChatContent = page.locator('#sizing-tab-content-chat');
    const tabBOContent = page.locator('#sizing-tab-content-bo');
    const tabGovContent = page.locator('#sizing-tab-content-gov');

    await expect(tabVozContent).toBeVisible();
    await expect(tabChatContent).toBeHidden();

    await page.locator('#btn-sizing-tab-chat').click();
    await expect(tabChatContent).toBeVisible();
    await expect(tabVozContent).toBeHidden();

    await page.locator('#btn-sizing-tab-bo').click();
    await expect(tabBOContent).toBeVisible();
    await expect(tabChatContent).toBeHidden();

    await page.locator('#btn-sizing-tab-gov').click();
    await expect(tabGovContent).toBeVisible();
    await expect(tabBOContent).toBeHidden();
  });

  test('4. Campo Aumento % Chamadas deve recalcular volumes efetivos e PAs com multiplicador', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    await page.locator('#btn-sizing-tab-gov').click();

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

    await page.locator('#btn-sizing-tab-gov').click();

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

  test('6. Perfil CONSULTA pode ver a view mas os botoes de acao ficam restritos', async ({ page }) => {
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

  test('7. Acordeao de detalhamento tecnico abre e fecha corretamente', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const bodyVoz = page.locator('#body-acc-voz');
    await expect(bodyVoz).toBeVisible();

    const bodyChat = page.locator('#body-acc-chat');
    await expect(bodyChat).toBeHidden();

    await page.locator('.sizing-acc-header:has-text("N1 Chat")').click();
    await expect(bodyChat).toBeVisible();
  });
});
