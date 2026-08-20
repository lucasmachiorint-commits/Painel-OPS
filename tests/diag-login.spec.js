// @ts-check
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test('Diagnóstico: Limpeza de Cache e Exibição do Modal de Login', async ({ page }) => {
  // Garante que o storage e cache estão vazios
  await page.context().clearCookies();
  await page.goto(HTML_FILE_URL);
  await page.waitForTimeout(1000);

  const isOverlayVisible = await page.locator('#auth-overlay').isVisible();
  const overlayDisplay = await page.locator('#auth-overlay').evaluate(el => window.getComputedStyle(el).display);
  const overlayZIndex = await page.locator('#auth-overlay').evaluate(el => window.getComputedStyle(el).zIndex);
  const userNameText = await page.locator('#userName').textContent();
  const userRoleText = await page.locator('#userRole').textContent();

  console.log('=== DIAGNÓSTICO AUTH OVERLAY ===');
  console.log('isOverlayVisible:', isOverlayVisible);
  console.log('overlayDisplay:', overlayDisplay);
  console.log('overlayZIndex:', overlayZIndex);
  console.log('userNameText:', userNameText);
  console.log('userRoleText:', userRoleText);
  console.log('=================================');
});
