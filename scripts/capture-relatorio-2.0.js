const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/331262/.gemini/antigravity/brain/0cf73b4e-0602-4d7d-a92e-6a4591451db0';

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + path.resolve(__dirname, '../single_file_google_sites.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  // Autenticar e preparar ambiente
  await page.evaluate(() => {
    // @ts-ignore
    if (typeof hideAuthOverlay === 'function') hideAuthOverlay();
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.setProperty('display', 'none', 'important');
    // @ts-ignore
    currentUser = { nome: 'Lucas Machiori', email: 'lucas.machiori@natura.net', perfil: 'ADMIN', assignedTeam: '' };
    // @ts-ignore
    if (typeof selectModule === 'function') selectModule('atendimento');

    // Top Motivos fiéis ao relatório (Pág. 10)
    const motivosReport = [
      { prod: 'Cartão de Crédito', mot: 'Fatura e Limite', sub: 'Fatura', m0: 12450, m1: 11800, m2: 10900 },
      { prod: 'Conta Digital', mot: 'Acesso e Login', sub: 'Token e Senha', m0: 8900, m1: 8400, m2: 7800 },
      { prod: 'Prevenção', mot: 'Transação Não Reconhecida', sub: 'Bloqueio Preventivo', m0: 6200, m1: 5900, m2: 5500 },
      { prod: 'Cobrança', mot: 'Negociação de Dívida', sub: 'Acordo', m0: 4800, m1: 5100, m2: 4900 },
      { prod: 'Crédito', mot: 'Empréstimo', sub: 'Simulação', m0: 3600, m1: 3400, m2: 3200 },
      { prod: 'Seguros', mot: 'Sinistro', sub: 'Abertura', m0: 2700, m1: 2500, m2: 2300 },
      { prod: 'Operações', mot: 'Pix e TED', sub: 'Comprovante', m0: 2100, m1: 1950, m2: 1800 },
      { prod: 'Benefícios', mot: 'Campanha', sub: 'Pontuação', m0: 1650, m1: 1500, m2: 1400 },
      { prod: 'Outros', mot: 'Geral', sub: 'Informações', m0: 1200, m1: 1100, m2: 1000 }
    ];

    const volList = [];
    motivosReport.forEach((m, idx) => {
      ['2026-08', '2026-07', '2026-06'].forEach(mes => {
        const baseVol = mes === '2026-08' ? m.m0 : (mes === '2026-07' ? m.m1 : m.m2);
        volList.push({ id: `chat_${idx}_${mes}`, canal: 'CHAT', mes: mes, produto: m.prod, motivo: m.mot, submotivo: m.sub, volume: Math.round(baseVol * 0.40) });
        volList.push({ id: `wpp_${idx}_${mes}`, canal: 'WHATSAPP', mes: mes, produto: m.prod, motivo: m.mot, submotivo: m.sub, volume: Math.round(baseVol * 0.35) });
        volList.push({ id: `ura_${idx}_${mes}`, canal: 'URA', mes: mes, produto: m.prod, motivo: m.mot, submotivo: m.sub, volume: Math.round(baseVol * 0.10) });
        volList.push({ id: `lig_${idx}_${mes}`, canal: 'LIGACOES', mes: mes, produto: m.prod, motivo: m.mot, submotivo: m.sub, volume: Math.round(baseVol * 0.15) });
      });
    });
    // @ts-ignore
    DiagStorage.saveVolume(volList);

    // Efetividade com 12 grupos do relatório (Pág. 20)
    const grupos = [
      'Dock', 'N3 Benefícios', 'N3 Campanhas', 'N3 Cobrança', 'N3 Conta/App',
      'N3 Crédito', 'N3 Operações', 'N3 PJ', 'N3 Prevenção', 'N3 Seguros',
      'N3 Subadquirencia', 'N3 T2P'
    ];

    const ticketsList = [];
    let ticketIdSeq = 1000;

    for (let m = 1; m <= 8; m++) {
      const mStr = String(m).padStart(2, '0');
      const mesFmt = `2026-${mStr}`;

      grupos.forEach(grp => {
        let rate = 0.97;
        if (grp === 'Dock') rate = 0.985;
        if (grp === 'N3 Cobrança') rate = 0.89;
        if (grp === 'N3 Seguros') rate = 0.76;
        if (grp === 'N3 PJ') rate = 0.99;

        const totalTickets = 100;
        const dentroCount = Math.round(totalTickets * rate);
        const foraCount = totalTickets - dentroCount;

        for (let i = 0; i < dentroCount; i++) {
          ticketsList.push({
            id_ticket: `TK_${ticketIdSeq++}`,
            mes_fechamento: mesFmt,
            mes_abertura: mesFmt,
            data_abertura: `${mesFmt}-05`,
            data_fechamento: `${mesFmt}-08`,
            grupo_ticket: grp,
            status: 'Fechado',
            dias_corridos: 3,
            dentro_prazo: true
          });
        }

        for (let i = 0; i < foraCount; i++) {
          ticketsList.push({
            id_ticket: `TK_${ticketIdSeq++}`,
            mes_fechamento: mesFmt,
            mes_abertura: mesFmt,
            data_abertura: `${mesFmt}-01`,
            data_fechamento: `${mesFmt}-12`,
            grupo_ticket: grp,
            status: 'Fechado',
            dias_corridos: 11,
            dentro_prazo: false
          });
        }
      });
    }

    // Tickets em aberto diários para alimentar o gráfico de atraso (> 7 dias)
    for (let i = 1; i <= 60; i++) {
      ticketsList.push({
        id_ticket: `TK_ATRASO_${i}`,
        mes_fechamento: null,
        mes_abertura: '2026-07',
        data_abertura: '2026-07-01',
        data_fechamento: null,
        grupo_ticket: 'N3 Conta/App',
        status: 'Aberto',
        dias_corridos: 45,
        dentro_prazo: false
      });
    }

    // @ts-ignore
    DiagStorage.saveTickets(ticketsList);

    // @ts-ignore
    switchToView('diag-dashboard');
  });

  await page.waitForTimeout(1000);

  // 1. Centrais de Atendimento Pay - Tema Dark
  const topMotivosSec = page.locator('#section-diag-top-motivos');
  await topMotivosSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await topMotivosSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_top_motivos_dark.png')
  });

  const motivoDetalhesSec = page.locator('#section-diag-motivo-detalhes');
  await motivoDetalhesSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await motivoDetalhesSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_motivo_detalhes_dark.png')
  });

  // 2. Performance NFCR - Tema Dark
  await page.click('#btn-diag-tab-efet');
  await page.waitForTimeout(1000);

  const efetBarrasSec = page.locator('#section-diag-efetividade-barras');
  await efetBarrasSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await efetBarrasSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_efetividade_barras_dark.png')
  });

  const atrasoSec = page.locator('#section-diag-chamados-atraso');
  await atrasoSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await atrasoSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_chamados_atraso_dark.png')
  });

  const matrizGruposSec = page.locator('#section-diag-matriz-grupos');
  await matrizGruposSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await matrizGruposSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_matriz_grupos_dark.png')
  });

  // Alternar para Tema Light
  await page.click('#theme-toggle');
  await page.waitForTimeout(1000);

  // 3. Performance NFCR - Tema Light
  await efetBarrasSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await efetBarrasSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_efetividade_barras_light.png')
  });

  await matrizGruposSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await matrizGruposSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_matriz_grupos_light.png')
  });

  // 4. Centrais de Atendimento Pay - Tema Light
  await page.click('#btn-diag-tab-vol');
  await page.waitForTimeout(1000);

  await topMotivosSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await topMotivosSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_top_motivos_light.png')
  });

  await motivoDetalhesSec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await motivoDetalhesSec.screenshot({
    path: path.join(ARTIFACTS_DIR, 'relatorio_motivo_detalhes_light.png')
  });

  console.log('[SUCESSO] Todos os componentes do relatório capturados com sucesso!');
  await browser.close();
})();
