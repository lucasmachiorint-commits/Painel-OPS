// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');

test.describe('Multi-Country & Localization E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        page.on('pageerror', err => {
            console.error('[Page Error]:', err.message);
        });

        await page.goto(HTML_FILE_URL);
        await page.waitForLoadState('domcontentloaded');

        await page.evaluate(() => {
            // @ts-ignore
            if (typeof hideAuthOverlay === 'function') hideAuthOverlay();
            // @ts-ignore
            currentUser = { nome: 'Administrador', email: 'admin@natura.net', perfil: 'ADMIN', assignedTeam: '' };
            // @ts-ignore
            aplicarPerfilDeAcesso();
        });
    });

    test('1. Should render country trigger with Brasil by default', async ({ page }) => {
        const trigger = page.locator('#btn-country-active');
        await expect(trigger).toBeVisible();
        await expect(page.locator('#country-name-label')).toHaveText(/Brasil/i);
        await expect(page.locator('#country-flag-icon')).toHaveText('🇧🇷');
    });

    test('2. Should open country dropdown and display both region options', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        const menu = page.locator('#country-dropdown-menu');
        await expect(menu).toBeVisible();

        const optBR = menu.locator('.country-dropdown-option[data-country="BR"]');
        const optHSP = menu.locator('.country-dropdown-option[data-country="HISPANA"]');
        await expect(optBR).toBeVisible();
        await expect(optHSP).toBeVisible();
        await expect(optHSP).toContainText('Hispana (AR, MX, CO)');
    });

    test('3. Should switch to Hispana and translate navigation and titles to Spanish', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Check header label and flag
        await expect(page.locator('#country-name-label')).toHaveText(/Hispana/i);
        await expect(page.locator('#country-flag-icon')).toHaveText('🌐');

        // Check translated navigation items
        await expect(page.locator('.menu-item[data-view="dashboard"] span')).toHaveText('Tablero');
        await expect(page.locator('.menu-item[data-view="history"] span')).toHaveText('Historial');
        await expect(page.locator('.menu-item[data-view="cadastros"] span')).toHaveText('Registros');
        await expect(page.locator('.menu-item[data-view="balancing"] span')).toHaveText('Balanceo');
        await expect(page.locator('.menu-item[data-view="automations"] span')).toHaveText('Automatizaciones');

        // Check breadcrumb and title
        await expect(page.locator('#app-view-title')).toHaveText('Tablero');
        await expect(page.locator('#bc-section-title')).toHaveText('General');
        await expect(page.locator('#app-view-subtitle')).toContainText('Visión operacional');
    });

    test('4. Should translate KPI cards, filter options, and table headers on Hispana', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Filter options
        await expect(page.locator('#filter-area option[value="all"]')).toHaveText('Todas las Áreas');
        await expect(page.locator('#filter-responsavel option[value="all"]')).toContainText('Todos los Responsables');

        // KPI card titles
        await expect(page.locator('h3[data-i18n="kpi_total_activities"]')).toHaveText('Total de Actividades');
        await expect(page.locator('h3[data-i18n="kpi_rpa_capacity"]')).toHaveText('RPA • Capacidad Absorbida');

        // Table headers
        await expect(page.locator('#fte-table th[data-i18n="th_activity"]')).toHaveText('Proceso / Actividad');
        await expect(page.locator('#fte-table th[data-i18n="th_area"]')).toHaveText('Área Responsable');
        await expect(page.locator('#fte-table th[data-i18n="th_responsavel"]')).toHaveText('Responsable');
        await expect(page.locator('#fte-table th[data-i18n="th_volume"]')).toHaveText('Volumen / Cant. Mes');
        await expect(page.locator('#fte-table th[data-i18n="th_time"]')).toHaveText('Tiempo (Minutos)');
        await expect(page.locator('#fte-table th[data-i18n="th_freq"]')).toHaveText('Frec. Ejecución Mes');
    });

    test('5. Should load Hispana activities with Valeria Sotes in Registros view', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Navigate to Cadastros / Registros view
        await page.locator('.menu-item[data-view="cadastros"]').click();
        await expect(page.locator('#view-cadastros')).toBeVisible();

        // Check for Conciliaciones team or Valeria Sotes responsible
        const bodyText = await page.locator('#view-cadastros').textContent();
        expect(bodyText).toContain('Valeria Sotes');
    });

    test('6. Should switch back to Brasil and restore Portuguese labels', async ({ page }) => {
        // Switch to Hispana first
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();
        await expect(page.locator('#app-view-title')).toHaveText('Tablero');

        // Switch back to Brasil
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="BR"]').click();

        await expect(page.locator('#country-name-label')).toHaveText(/Brasil/i);
        await expect(page.locator('#country-flag-icon')).toHaveText('🇧🇷');
        await expect(page.locator('#app-view-title')).toHaveText('Dashboard');
        await expect(page.locator('.menu-item[data-view="cadastros"] span')).toHaveText('Cadastros');
    });
});
