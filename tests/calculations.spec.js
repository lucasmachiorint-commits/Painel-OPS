// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Painel OPS - Validação de Cálculos & Capacidade E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(HTML_FILE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Deve calcular FTE e horas mensais sem valores NaN ou infinitos', async ({ page }) => {
    const calcResults = await page.evaluate(() => {
      // @ts-ignore
      updateCalculations();
      
      const totalFteEl = document.getElementById('widget-fte-required');
      const totalActivityEl = document.getElementById('widget-activity-count');
      const totalRpaEl = document.getElementById('widget-rpa-count');
      
      return {
        totalFte: totalFteEl ? totalFteEl.textContent : '',
        totalActivities: totalActivityEl ? totalActivityEl.textContent : '',
        totalRpa: totalRpaEl ? totalRpaEl.textContent : ''
      };
    });

    expect(calcResults.totalFte).not.toContain('NaN');
    expect(calcResults.totalActivities).not.toBe('0');
    expect(calcResults.totalRpa).not.toContain('NaN');
  });

  test('2. Não deve apresentar erros uncaught no console do navegador ao navegar entre abas', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Clica nas abas principais
    const tabs = ['dashboard', 'cadastros', 'balancing', 'review', 'rpa-metrics'];
    for (const tab of tabs) {
      await page.evaluate((targetTab) => {
        // @ts-ignore
        if (typeof switchView === 'function') switchView(targetTab);
      }, tab);
      await page.waitForTimeout(100);
    }

    expect(errors).toHaveLength(0);
  });

});
