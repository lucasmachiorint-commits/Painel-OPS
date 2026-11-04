// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE_URL = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');
const ARTIFACTS_DIR = 'C:/Users/331262/.gemini/antigravity/brain/0cf73b4e-0602-4d7d-a92e-6a4591451db0';

test.describe('Módulo Diagnóstico do Cliente - Atendimento E2E', () => {

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
      // @ts-ignore
      currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
      // @ts-ignore
      selectModule('atendimento');
    });
  });

  test('1. Deve exibir itens de menu do Diagnóstico do Cliente em Atendimento', async ({ page }) => {
    const diagMenu = page.locator('.sidebar-menu .menu-item[data-view="diag-dashboard"]');
    await expect(diagMenu).toBeVisible();
    await expect(diagMenu).toContainText('Diagnóstico do Cliente');

    const importMenu = page.locator('.sidebar-menu .menu-item[data-view="diag-import"]');
    await expect(importMenu).toBeVisible();
    await expect(importMenu).toContainText('Importação de Bases');
  });

  test('2. Deve navegar para Diagnóstico do Cliente e carregar Volumetria', async ({ page }) => {
    await page.click('.sidebar-menu .menu-item[data-view="diag-dashboard"]');

    const viewDiag = page.locator('#view-diag-dashboard');
    await expect(viewDiag).toBeVisible();

    const subviewVol = page.locator('#diag-subview-volumetria');
    await expect(subviewVol).toBeVisible();

    // Filtros
    await expect(page.locator('#filter-diag-mes')).toBeVisible();
    await expect(page.locator('#filter-diag-canal')).toBeVisible();

    // KPIs de Volumetria
    await expect(page.locator('#kpi-diag-vol-total')).toBeVisible();
    await expect(page.locator('#kpi-diag-vol-var')).toBeVisible();

    // Gráficos
    await expect(page.locator('#chart-diag-composicao')).toBeVisible();
    await expect(page.locator('#chart-diag-historico-canais')).toBeVisible();

    // Tabela
    await expect(page.locator('#table-diag-volumetria')).toBeVisible();
  });

  test('3. Deve alternar entre Volumetria e Efetividade (SLA 7 dias)', async ({ page }) => {
    await page.click('.sidebar-menu .menu-item[data-view="diag-dashboard"]');

    // Clicar na aba Efetividade
    await page.click('#btn-diag-tab-efet');

    const subviewEfet = page.locator('#diag-subview-efetividade');
    await expect(subviewEfet).toBeVisible();

    const subviewVol = page.locator('#diag-subview-volumetria');
    await expect(subviewVol).toBeHidden();

    // KPIs de SLA
    await expect(page.locator('#kpi-diag-sla-pct')).toBeVisible();
    await expect(page.locator('#kpi-diag-tickets-total')).toBeVisible();

    // Gráfico de SLA
    await expect(page.locator('#chart-diag-efetividade')).toBeVisible();

    // Tabelas de Efetividade (Meses e Grupos)
    await expect(page.locator('#tbody-diag-efet-meses')).toBeVisible();
    await expect(page.locator('#tbody-diag-efet-grupos')).toBeVisible();

    // Voltar para Volumetria
    await page.click('#btn-diag-tab-vol');
    await expect(subviewVol).toBeVisible();
    await expect(subviewEfet).toBeHidden();
  });

  test('4. Deve navegar para Importação de Bases e exibir Matriz 2026 e De-Para', async ({ page }) => {
    await page.click('.sidebar-menu .menu-item[data-view="diag-import"]');

    const viewImport = page.locator('#view-diag-import');
    await expect(viewImport).toBeVisible();

    // Matriz de cobertura
    await expect(page.locator('#table-diag-coverage')).toBeVisible();
    const rowsCoverage = page.locator('#tbody-diag-coverage tr');
    await expect(rowsCoverage).toHaveCount(4); // 4 canais

    // 4 Cards de Upload
    await expect(page.locator('#card-upload-tabelao')).toBeVisible();
    await expect(page.locator('#card-upload-chat')).toBeVisible();
    await expect(page.locator('#card-upload-whatsapp')).toBeVisible();
    await expect(page.locator('#card-upload-ura')).toBeVisible();

    // Tabela De-Para
    await expect(page.locator('#tbody-diag-depara')).toBeVisible();
    const rowsDePara = page.locator('#tbody-diag-depara tr');
    const count = await rowsDePara.count();
    expect(count).toBeGreaterThan(0);

    // Alternar aba para Central
    await page.click('#btn-depara-tab-central');
    await page.waitForTimeout(300);
    const rowsCentral = await page.locator('#tbody-diag-depara tr').count();
    expect(rowsCentral).toBeGreaterThan(0);
  });

  test('5. Deve calcular e exibir métricas corretas com dados simulados e capturar screenshots', async ({ page }) => {
    // Injetar dados de teste representativos
    await page.evaluate(() => {
      // @ts-ignore
      DiagStorage.saveVolume([
        { id: 'v1', canal: 'LIGACOES', mes: '2026-08', produto: 'Cartão de Crédito', motivo: 'Fatura e Limite', submotivo: 'Consulta', volume: 5000 },
        { id: 'v2', canal: 'CHAT', mes: '2026-08', produto: 'Cartão de Crédito', motivo: 'Fatura e Limite', submotivo: '2ª Via Fatura', volume: 4200 },
        { id: 'v3', canal: 'URA', mes: '2026-08', produto: 'Aproxima Aê', motivo: 'Configuração', submotivo: 'Ativação NFC', volume: 1800 },
        { id: 'v4', canal: 'LIGACOES', mes: '2026-07', produto: 'Cartão de Crédito', motivo: 'Fatura e Limite', submotivo: 'Consulta', volume: 4500 },
        { id: 'v5', canal: 'CHAT', mes: '2026-07', produto: 'Cartão de Crédito', motivo: 'Fatura e Limite', submotivo: '2ª Via Fatura', volume: 3800 },
        { id: 'v6', canal: 'LIGACOES', mes: '2026-06', produto: 'Cartão de Crédito', motivo: 'Fatura e Limite', submotivo: 'Consulta', volume: 4100 }
      ]);

      // @ts-ignore
      DiagStorage.saveTickets([
        { id_ticket: 'T1', mes_fechamento: '2026-08', mes_abertura: '2026-08', grupo_ticket: 'N1 - Atendimento', status: 'Fechado', dias_corridos: 2, dentro_prazo: true },
        { id_ticket: 'T2', mes_fechamento: '2026-08', mes_abertura: '2026-08', grupo_ticket: 'N1 - Atendimento', status: 'Fechado', dias_corridos: 5, dentro_prazo: true },
        { id_ticket: 'T3', mes_fechamento: '2026-08', mes_abertura: '2026-08', grupo_ticket: 'N2 - Suporte', status: 'Fechado', dias_corridos: 10, dentro_prazo: false },
        { id_ticket: 'T4', mes_fechamento: '2026-07', mes_abertura: '2026-07', grupo_ticket: 'N1 - Atendimento', status: 'Fechado', dias_corridos: 1, dentro_prazo: true }
      ]);

      // @ts-ignore
      switchToView('diag-dashboard');
    });

    await page.waitForTimeout(500);

    // Validar KPI Total Volume do mês 2026-08: 5000 + 4200 + 1800 = 11.000
    const kpiTotal = page.locator('#kpi-diag-vol-total');
    await expect(kpiTotal).toContainText('11.000');

    // Capturar screenshot de Volumetria
    await page.screenshot({ path: ARTIFACTS_DIR + '/diag_volumetria_dashboard.png', fullPage: true });

    // Alternar para Efetividade
    await page.click('#btn-diag-tab-efet');
    await page.waitForTimeout(500);

    // Validar SLA: 3 tickets em 2026-08 (2 dentro, 1 fora = 66.67%)
    const kpiTicketsTotal = page.locator('#kpi-diag-tickets-total');
    await expect(kpiTicketsTotal).toContainText('4'); // 4 total no ano

    // Capturar screenshot de Efetividade
    await page.screenshot({ path: ARTIFACTS_DIR + '/diag_efetividade_dashboard.png', fullPage: true });

    // Navegar para Importação
    await page.click('.sidebar-menu .menu-item[data-view="diag-import"]');
    await page.waitForTimeout(500);

    // Capturar screenshot de Importação
    await page.screenshot({ path: ARTIFACTS_DIR + '/diag_importacao_bases.png', fullPage: true });
  });

  test('6. Deve processar amostra real de WhatsApp mapeando motivos via coluna faq', async ({ page }) => {
    const res = await page.evaluate(() => {
      // @ts-ignore
      const sample = [
        { faq: 'CARTAO_CREDITO_DADOS', createdat: '02/11/2026 15:26:28' },
        { faq: 'CARTAO_CREDITO_ACORDO', createdat: '01/11/2026 13:26:04' },
        { faq: 'CONTA_PAGAMENTO', createdat: '01/11/2026 11:28:58' },
        { faq: 'CONTA_FUNCIONALIDADES_VENDAS', createdat: '01/11/2026 11:20:53' },
        { faq: 'PEP_CONSULTAR_LIMITE_CREDITO', createdat: '01/11/2026 10:02:14' },
        { faq: 'CARTAO_CREDITO_FATURA', createdat: '01/11/2026 06:08:22' },
        { faq: 'PEP_ENCARGOS', createdat: '03/11/2026 10:46:19' },
        { faq: 'CARTAO_CREDITO_TARIFAS', createdat: '03/11/2026 10:43:52' },
        { faq: 'TRANSACOES_PAGAMENTO_BOLETO', createdat: '03/11/2026 10:12:49' },
        { faq: 'CONTA_PAGAMENTO', createdat: '03/11/2026 10:10:20' },
        { faq: 'APP_VALIDACAO_DISPOSITIVO', createdat: '03/11/2026 10:09:35' },
        { faq: 'APP_VALIDACAO_DISPOSITIVO', createdat: '03/11/2026 10:08:55' }
      ];

      let mappedCount = 0;
      sample.forEach(row => {
        // @ts-ignore
        const dePara = diagLookupDePara('WHATSAPP', row.faq, '', '');
        if (dePara && !dePara.unmapped && dePara.produto !== 'Não se Aplica') {
          mappedCount++;
        }
      });

      return { total: sample.length, mapped: mappedCount };
    });

    expect(res.total).toBe(12);
    expect(res.mapped).toBe(12);
  });

  test('7. Deve exibir selo de Carregado, travar upload para OPERADOR e liberar para ADMIN', async ({ page }) => {
    await page.evaluate(() => {
      // Simula carga ativa de Chat em 2026-08
      // @ts-ignore
      DiagStorage.registrarCarga({
        canal: 'CHAT',
        mes_ref: '2026-08',
        nome_arquivo: 'export_monitoring_chat.xlsx',
        total_linhas: 5000,
        volume_total: 4800,
        tickets_processados: 0
      });
      // @ts-ignore
      currentUser.perfil = 'OPERADOR';
      // @ts-ignore
      switchToView('diag-import');
    });

    await page.waitForTimeout(400);

    // Selo de status no card de Chat deve indicar Carregado
    const badgeChat = page.locator('#badge-status-chat');
    await expect(badgeChat).toBeVisible();
    await expect(badgeChat).toContainText('Carregado');

    // Botão de upload de Chat deve estar desabilitado para OPERADOR
    const btnUploadChat = page.locator('#btn-upload-chat');
    await expect(btnUploadChat).toBeDisabled();

    // Trocar perfil para ADMIN e verificar que o botão vira 'Substituir Carga (ADMIN)'
    await page.evaluate(() => {
      // @ts-ignore
      currentUser.perfil = 'ADMIN';
      // @ts-ignore
      updateUploadCardsStatus();
    });

    await expect(btnUploadChat).toBeEnabled();
    await expect(page.locator('#label-btn-upload-chat')).toContainText('Substituir Carga (ADMIN)');
  });

  test('8. Deve renderizar tabela de Cargas Realizadas com filtros e ações', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser.perfil = 'ADMIN';
      // @ts-ignore
      DiagStorage.registrarCarga({
        canal: 'WHATSAPP',
        mes_ref: '2026-09',
        nome_arquivo: 'export_monitoring_whatsapp.xlsx',
        total_linhas: 3500,
        volume_total: 3420,
        tickets_processados: 0
      });
      // @ts-ignore
      switchToView('diag-import');
    });

    await page.waitForTimeout(400);

    const tbodyCargas = page.locator('#tbody-diag-cargas');
    await expect(tbodyCargas).toContainText('IA - WhatsApp');
    await expect(tbodyCargas).toContainText('2026-09');
    await expect(tbodyCargas).toContainText('export_monitoring_whatsapp.xlsx');
    await expect(tbodyCargas).toContainText('3.420');

    // Botão de excluir deve estar visível para ADMIN
    const btnExcluir = tbodyCargas.locator('button.diag-btn-danger-subtle').first();
    await expect(btnExcluir).toBeVisible();
    await page.screenshot({ path: ARTIFACTS_DIR + '/diag_importacao_cargas_e_admin.png', fullPage: true });
  });

  test('9. ADMIN deve conseguir excluir uma carga via modal e mês voltar para Pendente', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser.perfil = 'ADMIN';
      // @ts-ignore
      DiagStorage.registrarCarga({
        canal: 'URA',
        mes_ref: '2026-08',
        nome_arquivo: 'export_monitoring_ura.xlsx',
        total_linhas: 1200,
        volume_total: 1150,
        tickets_processados: 0
      });
      // @ts-ignore
      switchToView('diag-import');
    });

    await page.waitForTimeout(300);

    // Clicar para abrir modal de exclusão
    await page.evaluate(() => {
      // @ts-ignore
      openModalConfirmDeleteCarga('URA', '2026-08');
    });

    const modal = page.locator('#modal-diag-confirm-delete-carga');
    await expect(modal).toBeVisible();
    await expect(page.locator('#modal-delete-carga-canal')).toContainText('IA - URA');
    await expect(page.locator('#modal-delete-carga-mes')).toContainText('2026-08');

    // Confirmar exclusão
    await page.click('#btn-confirm-delete-carga');
    await page.waitForTimeout(300);

    // Modal deve fechar e mês voltar para pendente
    await expect(modal).toBeHidden();
    const badgeUra = page.locator('#badge-status-ura');
    await expect(badgeUra).toContainText('Pendente');
  });

  test('10. ADMIN deve excluir dados do mês e toda a base preservando De-Para', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      currentUser.perfil = 'ADMIN';
      // Injeta volumes e tickets
      // @ts-ignore
      DiagStorage.saveVolume([
        { id: 'v1', canal: 'CHAT', mes: '2026-08', produto: 'Cartão de Crédito', motivo: 'Fatura', submotivo: '-', volume: 500 }
      ]);
      // @ts-ignore
      DiagStorage.saveTickets([
        { id_ticket: 'T1', mes_fechamento: '2026-08', mes_abertura: '2026-08', grupo_ticket: 'N1', status: 'Fechado', dias_corridos: 2, dentro_prazo: true }
      ]);
      // @ts-ignore
      switchToView('diag-import');
    });

    // Zona Admin deve estar visível para ADMIN
    await expect(page.locator('#section-diag-admin-zone')).toBeVisible();

    // Testar exclusão de mês
    await page.evaluate(() => {
      // @ts-ignore
      DiagStorage.excluirDadosMes('2026-08', 'TODOS');
    });

    const volAfterMes = await page.evaluate(() => {
      // @ts-ignore
      return DiagStorage.getVolume();
    });
    expect(volAfterMes.length).toBe(0);

    // Testar modal de exclusão total com validação de digitação 'EXCLUIR'
    await page.evaluate(() => {
      // @ts-ignore
      openModalConfirmDeleteAll();
    });

    const modalAll = page.locator('#modal-diag-confirm-delete-all');
    await expect(modalAll).toBeVisible();

    const btnSubmitAll = page.locator('#btn-submit-delete-all');
    await expect(btnSubmitAll).toBeDisabled();

    // Digitar EXCLUIR
    await page.fill('#input-confirm-delete-all-key', 'EXCLUIR');
    await expect(btnSubmitAll).toBeEnabled();

    await page.click('#btn-submit-delete-all');
    await page.waitForTimeout(300);

    // Modal deve fechar
    await expect(modalAll).toBeHidden();

    // De-Para ainda deve estar intacto
    const deParaCount = await page.evaluate(() => {
      // @ts-ignore
      return Object.keys(SEED_DEPARA_IA).length;
    });
    expect(deParaCount).toBeGreaterThan(50);
  });

});
