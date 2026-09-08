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

    expect(parseInt(vozText)).toBe(23);
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

  test('4. Alterar volume no Quadro Chat recalcula Erlang C e PAs de Chat em tempo real', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const inputVolChat = page.locator('#input-sizing-vol-chat');
    await expect(inputVolChat).toBeVisible();

    const initialTotal = parseInt(await page.locator('#widget-sizing-total-pas').innerText());

    // Preenche volume no Chat
    await inputVolChat.fill('5000');
    await inputVolChat.dispatchEvent('input');
    await page.waitForTimeout(300);

    const newTotal = parseInt(await page.locator('#widget-sizing-total-pas').innerText());
    expect(newTotal).toBeGreaterThan(initialTotal);

    // Verifica que as PAs de Chat foram calculadas
    const pasChat = parseInt(await page.locator('#input-sizing-pas-chat').inputValue());
    expect(pasChat).toBeGreaterThan(0);
  });

  test('5. Subtítulo do Total de PAs exibe detalhamento individual de canais', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const subTotal = page.locator('#widget-sizing-total-sub');
    await expect(subTotal).toBeVisible();
    await expect(subTotal).toContainText('Voz:');
    await expect(subTotal).toContainText('Chat:');
    await expect(subTotal).toContainText('BKO:');
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
      state.sizingHistory['2026-11'] = Object.assign({}, state.sizingParams, { mesReferencia: '2026-11' });
      // @ts-ignore
      state.sizingHistory['2026-12'] = Object.assign({}, state.sizingParams, { mesReferencia: '2026-12' });
      // @ts-ignore
      onSizingMonthSelect('2026-11'); // 2026-11 is earlier than 2026-12, so it is locked
    });
    await page.waitForTimeout(300);

    const lockBadge = page.locator('#sizing-lock-badge');
    await expect(lockBadge).toContainText('Somente Visualização');
    await expect(page.locator('#sizing-history-banner')).toBeVisible();

    // Inputs inside sheet tables should be disabled
    const volVozInput = page.locator('#input-sizing-vol-voz');
    await expect(volVozInput).toBeDisabled();

    // Switch to the latest projected month (2026-12)
    await page.evaluate(() => {
      // @ts-ignore
      onSizingMonthSelect('2026-12');
    });
    await page.waitForTimeout(300);

    await expect(lockBadge).toContainText('Aberto para edição');
    await expect(page.locator('#sizing-history-banner')).toBeHidden();
    await expect(volVozInput).toBeEnabled();

    // Reset back to baseline 2026-11 for subsequent tests
    await page.evaluate(() => {
      // @ts-ignore
      delete state.sizingHistory['2026-12'];
      // @ts-ignore
      onSizingMonthSelect('2026-11');
    });
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

  test('9. Campos editaveis permitem alteracao e campos calculados recalculam em tempo real', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    // 1. Verify calculated fields have readonly and cell-calculated class
    const volAtendidasVoz = page.locator('#input-sizing-vol-atendidas');
    await expect(volAtendidasVoz).toHaveAttribute('readonly', '');
    await expect(volAtendidasVoz).toHaveClass(/cell-calculated/);

    const erlangVoz = page.locator('#input-sizing-erlang');
    await expect(erlangVoz).toHaveAttribute('readonly', '');
    await expect(erlangVoz).toHaveClass(/cell-calculated/);

    const pasBo = page.locator('#input-sizing-pas-bo');
    await expect(pasBo).toHaveAttribute('readonly', '');
    await expect(pasBo).toHaveClass(/cell-calculated/);

    // 2. Change Volume Mês Voz to 50000
    const volVoz = page.locator('#input-sizing-vol-voz');
    await expect(volVoz).not.toHaveAttribute('readonly', '');
    await volVoz.fill('50000');
    await volVoz.dispatchEvent('input');
    await page.waitForTimeout(300);

    // Volume Atendidas Voz should recalculate to 50000 * (1 - 0.035) = 48250
    await expect(volAtendidasVoz).toHaveValue('48250');
    
    // Volume DMM should recalculate to 50000 * 0.0562 = 2810
    await expect(page.locator('#input-sizing-vol-dmm')).toHaveValue('2810');

    // PA's Necessárias Voz should have increased
    const pasVozVal = parseInt(await page.locator('#input-sizing-pas-voz').inputValue(), 10);
    expect(pasVozVal).toBeGreaterThan(23);

    // 3. Change Volume Mês Chat to 20000
    const volChat = page.locator('#input-sizing-vol-chat');
    await expect(volChat).not.toHaveAttribute('readonly', '');
    await volChat.fill('20000');
    await volChat.dispatchEvent('input');
    await page.waitForTimeout(300);

    // Volume Atendidas Chat should recalculate to 20000 * (1 - 0.035) = 19300
    await expect(page.locator('#input-sizing-vol-atendidas-chat')).toHaveValue('19300');
    const pasChatVal = parseInt(await page.locator('#input-sizing-pas-chat').inputValue(), 10);
    expect(pasChatVal).toBeGreaterThan(0);
  });

  test('10. Alterar parametros de BKO (TMA e Dias Uteis) recalcula produtividade e PAs', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const initialProd = parseInt(await page.locator('#input-sizing-prod-max-dia').inputValue(), 10);
    expect(initialProd).toBe(22);

    // Change TMA BO to 300 seconds (half of 600s) -> prod per day should double
    const tmaBo = page.locator('#input-sizing-tma-bo');
    await tmaBo.fill('300');
    await tmaBo.dispatchEvent('input');
    await page.waitForTimeout(300);

    const newProd = parseInt(await page.locator('#input-sizing-prod-max-dia').inputValue(), 10);
    expect(newProd).toBeGreaterThan(initialProd);

    // TMA real em minutos should update to 00:05:00
    await expect(page.locator('#input-sizing-tma-real-min')).toHaveValue('00:05:00');
  });

  test('11. Caso de referencia da planilha: Volume 3000 gera exatamente 7 PAs e 10 chamadas/operador', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const volVoz = page.locator('#input-sizing-vol-voz');
    await volVoz.fill('3000');
    await volVoz.dispatchEvent('input');
    await page.waitForTimeout(300);

    // Matches spreadsheet exactly:
    // Volume Atendidas = 2895
    // Volume DMM = 168
    // Volume HMM = 16
    // Erlang = 2
    // PA's Necessárias = 7
    // PA Contratada = 7
    // Chamadas / Operador = 10
    await expect(page.locator('#input-sizing-vol-atendidas')).toHaveValue('2895');
    await expect(page.locator('#input-sizing-vol-dmm')).toHaveValue('168');
    await expect(page.locator('#input-sizing-vol-hmm')).toHaveValue('16');
    await expect(page.locator('#input-sizing-erlang')).toHaveValue('2');
    await expect(page.locator('#input-sizing-pas-voz')).toHaveValue('7');
    await expect(page.locator('#input-sizing-pa-contratada-voz')).toHaveValue('7');
    await expect(page.locator('#input-sizing-chamadas-op-voz')).toHaveValue('10');
  });

  test('12. Modal de Nova Projecao cria mes subsequente e trava o anterior como historico', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      state.sizingBaselineNov26 = true;
      // @ts-ignore
      state.sizingHistory = {};
      // @ts-ignore
      state.sizingCurrentMonth = '2026-11';
      // @ts-ignore
      switchToView('sizing');
    });

    const btnNew = page.locator('#btn-sizing-new-month');
    await expect(btnNew).toBeVisible();
    await btnNew.click();

    const modal = page.locator('#modal-new-sizing-projection');
    await expect(modal).toBeVisible();

    // Suggested next month should be 2026-12 (after 2026-11)
    const inputMonth = page.locator('#modal-input-new-sizing-month');
    await expect(inputMonth).toHaveValue('2026-12');

    // Confirm creation
    const btnConfirm = page.locator('#btn-confirm-new-sizing-month');
    await btnConfirm.click();

    // Modal should close
    await expect(modal).toBeHidden();

    // New active month is 2026-12 and open for edition
    await expect(page.locator('#sizing-lock-badge')).toContainText('Aberto para edição');
    await expect(page.locator('#sizing-mes-select')).toHaveValue('2026-12');

    // Switch back to 2026-11 via select dropdown
    const selectMes = page.locator('#sizing-mes-select');
    await selectMes.selectOption('2026-11');
    await page.waitForTimeout(300);

    // 2026-11 should now be locked (Somente Visualização / Histórico)
    await expect(page.locator('#sizing-lock-badge')).toContainText('Somente Visualização');
    await expect(page.locator('#sizing-history-banner')).toBeVisible();
    await expect(page.locator('#input-sizing-vol-voz')).toBeDisabled();

    // Switch back to 2026-12
    await selectMes.selectOption('2026-12');
    await page.waitForTimeout(300);
    await expect(page.locator('#sizing-lock-badge')).toContainText('Aberto para edição');
    await expect(page.locator('#sizing-history-banner')).toBeHidden();
    await expect(page.locator('#input-sizing-vol-voz')).toBeEnabled();
  });

  test('13. Reversao de erro manual: descartar projecao e desbloquear historico para ajustes', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      state.sizingBaselineNov26 = true;
      // @ts-ignore
      state.sizingHistory = {};
      // @ts-ignore
      state.sizingCurrentMonth = '2026-11';
      // @ts-ignore
      switchToView('sizing');
    });

    // 1. Em 2026-11, o botao descartar NAO deve aparecer (baseline protegido)
    const btnDiscard = page.locator('#btn-sizing-discard-month');
    await expect(btnDiscard).toBeHidden();

    // 2. Cria 2026-12 por engano
    const btnNew = page.locator('#btn-sizing-new-month');
    await btnNew.click();
    await page.locator('#btn-confirm-new-sizing-month').click();
    await page.waitForTimeout(300);

    // Em 2026-12, o botao descartar DEVE aparecer
    await expect(btnDiscard).toBeVisible();

    // Clica em descartar
    await btnDiscard.click();
    const modalDiscard = page.locator('#modal-confirm-discard-sizing');
    await expect(modalDiscard).toBeVisible();

    // Confirma o descarte
    await page.locator('#btn-confirm-discard-sizing').click();
    await page.waitForTimeout(300);
    await expect(modalDiscard).toBeHidden();

    // Deve ter retornado para 2026-11 aberto para edicao
    await expect(page.locator('#sizing-mes-select')).toHaveValue('2026-11');
    await expect(page.locator('#sizing-lock-badge')).toContainText('Aberto para edição');
    await expect(page.locator('#input-sizing-vol-voz')).toBeEnabled();
    await expect(btnDiscard).toBeHidden();

    // 3. Cria 2026-12 novamente
    await btnNew.click();
    await page.locator('#btn-confirm-new-sizing-month').click();
    await page.waitForTimeout(300);

    // Navega para o historico 2026-11
    await page.locator('#sizing-mes-select').selectOption('2026-11');
    await page.waitForTimeout(300);
    await expect(page.locator('#input-sizing-vol-voz')).toBeDisabled();

    // Clica em "Desbloquear para Ajustes"
    const btnUnlock = page.locator('#btn-sizing-unlock-history');
    await expect(btnUnlock).toBeVisible();
    await btnUnlock.click();
    await page.waitForTimeout(200);

    // Deve reabrir os campos para edicao
    await expect(page.locator('#sizing-lock-badge')).toContainText('Reaberto para Ajustes');
    await expect(page.locator('#input-sizing-vol-voz')).toBeEnabled();

    // Clica em "Concluir e Bloquear"
    const btnRelock = page.locator('#btn-sizing-relock-history');
    await expect(btnRelock).toBeVisible();
    await btnRelock.click();
    await page.waitForTimeout(200);

    // Deve voltar a ficar travado
    await expect(page.locator('#sizing-lock-badge')).toContainText('Somente Visualização');
    await expect(page.locator('#input-sizing-vol-voz')).toBeDisabled();
  });

  test('14. Fluxo oficial de Confirmar Projecao: trava mes com selo, atualiza alertas e encadeia novo mes', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      state.sizingBaselineNov26 = true;
      // @ts-ignore
      state.sizingHistory = {};
      // @ts-ignore
      state.sizingConfirmedMonths = {};
      // @ts-ignore
      state.sizingCurrentMonth = '2026-11';
      // @ts-ignore
      switchToView('sizing');
    });

    const btnConfirmProj = page.locator('#btn-sizing-confirm-month');
    await expect(btnConfirmProj).toBeVisible();

    // Clica no botão Confirmar Projeção
    await btnConfirmProj.click();

    const modalConfirm = page.locator('#modal-confirm-sizing-projection');
    await expect(modalConfirm).toBeVisible();
    await expect(page.locator('#modal-confirm-proj-month-name')).toContainText('Nov/26');
    await expect(page.locator('#modal-confirm-summary-total')).not.toHaveText('-');

    // Confirma no modal
    await page.locator('#btn-submit-confirm-sizing').click();
    await page.waitForTimeout(600);

    // Modal de confirmação fecha e abre modal de nova projeção sugerindo o próximo mês
    await expect(modalConfirm).toBeHidden();
    const modalNew = page.locator('#modal-new-sizing-projection');
    await expect(modalNew).toBeVisible();

    // Fecha o modal de nova projeção para inspecionar o mês confirmado
    await page.locator('#modal-new-sizing-projection .modal-close').click();
    await page.waitForTimeout(300);

    // 2026-11 agora deve estar travado como Projeção Confirmada
    await expect(page.locator('#sizing-lock-badge')).toContainText('Projeção Confirmada');
    await expect(page.locator('#sizing-history-banner')).toBeVisible();
    await expect(page.locator('#sizing-history-banner')).toContainText('confirmada e fechada');
    await expect(page.locator('#input-sizing-vol-voz')).toBeDisabled();
    await expect(btnConfirmProj).toBeHidden();

    // Cards de alerta devem exibir rodapé com referência à confirmação
    const alertsContainer = page.locator('#sizing-alerts-container');
    await expect(alertsContainer).toContainText('Ref.: Projeção de Nov/26 confirmada em');
  });

  test('15. Card explicativo da Regra de Erlang C deve estar visivel na secao tecnica', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const erlangCard = page.locator('.sizing-erlang-info-card');
    await expect(erlangCard).toBeVisible();
    await expect(erlangCard).toContainText('O que é a Regra de Erlang C?');
    await expect(erlangCard).toContainText('Agner Krarup Erlang');
    await expect(erlangCard).toContainText('Padrão WFM');
  });

  test('16. Acordeoes de Memoria de Calculo devem iniciar compactados por padrao e expandir ao clicar', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const bodyVoz = page.locator('#body-acc-voz');
    const bodyChat = page.locator('#body-acc-chat');
    const bodyBo = page.locator('#body-acc-bo');

    // Devem iniciar fechados (ocultos)
    await expect(bodyVoz).toBeHidden();
    await expect(bodyChat).toBeHidden();
    await expect(bodyBo).toBeHidden();

    // Clica no header de Voz para expandir
    const headerVoz = page.locator('.sizing-acc-header').filter({ hasText: 'Memória N1 Voz' });
    await headerVoz.click();
    await page.waitForTimeout(200);

    // Agora Voz deve estar visível
    await expect(bodyVoz).toBeVisible();
    await expect(page.locator('#arrow-acc-voz')).toHaveClass(/open/);

    // Clica novamente para fechar
    await headerVoz.click();
    await page.waitForTimeout(200);
    await expect(bodyVoz).toBeHidden();
    await expect(page.locator('#arrow-acc-voz')).not.toHaveClass(/open/);
  });

  test('17. Quadro Backoffice valida com precisao todas as formulas da planilha (500 demandas -> 1 PA, 8 cham/op)', async ({ page }) => {
    await page.evaluate(() => {
      // @ts-ignore
      switchToView('sizing');
    });

    const volBo = page.locator('#input-sizing-vol-bo');
    const diasUteis = page.locator('#input-sizing-dias-uteis-bo');
    
    // Configura Volume Mês = 500 e Dias Úteis = 30 conforme imagem da planilha
    await volBo.fill('500');
    await volBo.dispatchEvent('input');
    await diasUteis.fill('30');
    await diasUteis.dispatchEvent('input');
    await page.waitForTimeout(300);

    // Validações exatas das células da planilha:
    // E8 (Volume Dia) = 17 (=E6/E7 = 500/30)
    await expect(page.locator('#input-sizing-vol-dia-bo')).toHaveValue('17');

    // E9 (Prod. Máx. Operador/Dia) = 22 (=E24/E14 = 03:42:36 / 00:10:00)
    await expect(page.locator('#input-sizing-prod-max-dia')).toHaveValue('22');

    // E10 (PA's Necessárias) = 1 (=ARREDONDAR.PARA.CIMA(E8/E9/2;0))
    await expect(page.locator('#input-sizing-pas-bo')).toHaveValue('1');

    // E12 (PA CONTRATADA) = 1 (=E10+E11)
    await expect(page.locator('#input-sizing-pa-contratada-bo')).toHaveValue('1');

    // E13 (CHAMADAS / OPERADOR) = 8 (=E8/(E12*2) = 16.666 / 2 = 8)
    await expect(page.locator('#input-sizing-chamadas-op-bo')).toHaveValue('8');

    // Células de tempo e jornada:
    await expect(page.locator('#input-sizing-tma-real-min')).toHaveValue('00:10:00');
    await expect(page.locator('#input-sizing-ch-nominal-fmt')).toHaveValue('06:20:00');
    await expect(page.locator('#input-sizing-ch-trabalho')).toHaveValue('05:40:00');
    await expect(page.locator('#input-sizing-horas-mes')).toHaveValue('170:00:00');
    await expect(page.locator('#input-sizing-ch-efetivo')).toHaveValue('03:42:36');
  });
});
