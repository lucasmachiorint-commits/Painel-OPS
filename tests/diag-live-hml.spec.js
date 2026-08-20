// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const LIVE_HML_URL = 'https://lucasmachiorint-commits.github.io/Painel-OPS/hml.html';

test('Diagnóstico Live HML: Limpeza de Cache e Exibição do Modal de Login', async ({ page }) => {
  page.on('console', msg => console.log('[Browser Console]:', msg.text()));
  page.on('pageerror', err => console.error('[Browser PageError]:', err.message));

  await page.context().clearCookies();
  await page.goto(LIVE_HML_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const isOverlayVisible = await page.locator('#auth-overlay').isVisible();
  const overlayDisplay = await page.locator('#auth-overlay').evaluate(el => window.getComputedStyle(el).display);
  const userNameText = await page.locator('#userName').textContent();
  const userRoleText = await page.locator('#userRole').textContent();

  const screenshotPath = path.resolve(__dirname, '../../brain/0cf73b4e-0602-4d7d-a92e-6a4591451db0/live_hml_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const storageItems = await page.evaluate(() => {
    return { ...localStorage };
  });

  console.log('=== DIAGNÓSTICO LIVE HML ===');
  console.log('isOverlayVisible:', isOverlayVisible);
  console.log('overlayDisplay:', overlayDisplay);
  console.log('userNameText:', userNameText);
  console.log('userRoleText:', userRoleText);
  console.log('storageItems:', storageItems);
  console.log('=============================');
});
