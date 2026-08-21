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

    test('3. Should switch to Hispana, translate navigation to Spanish, and deactivate Historial, Balanceo, and RPA menus', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Check header label and flag
        await expect(page.locator('#country-name-label')).toHaveText(/Hispana/i);
        await expect(page.locator('#country-flag-icon')).toHaveText('🌐');

        // Check translated navigation items (only active ones)
        await expect(page.locator('.menu-item[data-view="dashboard"] span')).toHaveText('Tablero');
        await expect(page.locator('.menu-item[data-view="cadastros"] span')).toHaveText('Registros');
        
        // Historial, Balanceo, and RPA must be DEACTIVATED / HIDDEN in Hispana
        await expect(page.locator('.menu-item[data-view="history"]')).toBeHidden();
        await expect(page.locator('.menu-item[data-view="balancing"]')).toBeHidden();
        await expect(page.locator('.menu-item[data-view="automations"]')).toBeHidden();

        // Check breadcrumb and title
        await expect(page.locator('#app-view-title')).toHaveText('Tablero');
        await expect(page.locator('#bc-section-title')).toHaveText('General');
        await expect(page.locator('#app-view-subtitle')).toContainText('Visión operacional');
    });

    test('4. Should translate KPI cards, filter options, table headers, and hide all RPA widgets on Hispana', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // RPA cards in Dashboard KPI cluster must be hidden
        await expect(page.locator('.rpa-cluster-card').first()).toBeHidden();

        // FTE Indicators
        await expect(page.locator('h3[data-i18n="kpi_fte_required"]')).toHaveText('FTE Actividades');
        await expect(page.locator('h3[data-i18n="kpi_fte_area"]')).toHaveText('FTE del Área');
        await expect(page.locator('#widget-fte-area')).toHaveText('1');

        // Non-RPA KPI card title
        await expect(page.locator('h3[data-i18n="kpi_total_activities"]')).toHaveText('Total de Actividades');

        // Table headers
        await expect(page.locator('#fte-table th[data-i18n="th_activity"]')).toHaveText('Proceso / Actividad');
        await expect(page.locator('#fte-table th[data-i18n="th_area"]')).toHaveText('Área Responsable');
        await expect(page.locator('#fte-table th[data-i18n="th_responsavel"]')).toHaveText('Responsable');
        await expect(page.locator('#fte-table th[data-i18n="th_volume"]')).toHaveText('Volumen / Cant. Mes');
        await expect(page.locator('#fte-table th[data-i18n="th_time"]')).toHaveText('Tiempo (Minutos)');
        await expect(page.locator('#fte-table th[data-i18n="th_freq"]')).toHaveText('Frec. Ejecución Mes');
    });

    test('5. Should load Hispana activities with Valeria Sotes and hide RPA column/filter in Registros view', async ({ page }) => {
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Navigate to Cadastros / Registros view
        await page.locator('.menu-item[data-view="cadastros"]').click();
        await expect(page.locator('#view-cadastros')).toBeVisible();

        // Check for Conciliaciones team or Valeria Sotes responsible
        const bodyText = await page.locator('#view-cadastros').textContent();
        expect(bodyText).toContain('Valeria Sotes');

        // RPA filter dropdown and RPA column header must be hidden
        await expect(page.locator('.cadastros-rpa-filter-group')).toBeHidden();
        await expect(page.locator('.col-rpa-header')).toBeHidden();
    });

    test('6. Should switch back to Brasil and restore all menus (Histórico, Balanceamento, Automações) and labels', async ({ page }) => {
        // Switch to Hispana first
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();
        await expect(page.locator('#app-view-title')).toHaveText('Tablero');
        await expect(page.locator('.menu-item[data-view="history"]')).toBeHidden();
        await expect(page.locator('.menu-item[data-view="balancing"]')).toBeHidden();
        await expect(page.locator('.menu-item[data-view="automations"]')).toBeHidden();

        // Switch back to Brasil
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="BR"]').click();

        await expect(page.locator('#country-name-label')).toHaveText(/Brasil/i);
        await expect(page.locator('#country-flag-icon')).toHaveText('🇧🇷');
        await expect(page.locator('#app-view-title')).toHaveText('Dashboard');
        await expect(page.locator('.menu-item[data-view="cadastros"] span')).toHaveText('Cadastros');
        
        // All menus restored in Brasil
        await expect(page.locator('.menu-item[data-view="history"]')).toBeVisible();
        await expect(page.locator('.menu-item[data-view="balancing"]')).toBeVisible();
        await expect(page.locator('.menu-item[data-view="automations"]')).toBeVisible();
    });

    test('7. Should open Nova Atividade modal in Brasil, fill fields, submit and verify in table', async ({ page }) => {
        // Navigate to Cadastros
        await page.locator('.menu-item[data-view="cadastros"]').click();
        await expect(page.locator('#view-cadastros')).toBeVisible();

        // Click "+ Adicionar Atividade"
        await page.locator('#btn-cadastros-add-row').click();

        // Modal must be visible
        const modal = page.locator('#modal-add-activity');
        await expect(modal).toBeVisible();
        await expect(modal.locator('[data-i18n="modal_title_new_activity"]')).toHaveText('Nova Atividade');
        await expect(modal.locator('#modal-add-rpa-container')).toBeVisible();

        // Fill form
        const testActName = 'Teste Automatizado Modal ' + Date.now();
        await modal.locator('#modal-add-name').fill(testActName);
        await modal.locator('#modal-add-product').fill('Produto Teste');
        await modal.locator('.modal-toggle-switch').click();

        // Submit
        await modal.locator('#btn-modal-submit-activity').click();

        // Modal closes
        await expect(modal).toBeHidden();

        // Check if new activity input appears in table
        const nameInput = page.locator(`input.input-activity-name-cell[value="${testActName}"]`);
        await expect(nameInput).toBeAttached();
    });

    test('8. Should open Nueva Actividad modal in Hispana with Spanish labels and hidden RPA field', async ({ page }) => {
        // Switch to Hispana
        await page.locator('#btn-country-active').click();
        await page.locator('.country-dropdown-option[data-country="HISPANA"]').click();

        // Navigate to Registros
        await page.locator('.menu-item[data-view="cadastros"]').click();

        // Click "+ Agregar Actividad"
        await page.locator('#btn-cadastros-add-row').click();

        // Modal must be visible with Spanish labels
        const modal = page.locator('#modal-add-activity');
        await expect(modal).toBeVisible();
        await expect(modal.locator('[data-i18n="modal_title_new_activity"]')).toHaveText('Nueva Actividad');

        // RPA container must be HIDDEN in Hispana
        await expect(modal.locator('#modal-add-rpa-container')).toBeHidden();

        // Close modal
        await modal.locator('.modal-close').click();
        await expect(modal).toBeHidden();
    });
});

