const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../index.html');
let html = fs.readFileSync(filePath, 'utf8');

html = html.replace(
  '<!-- NOVO PAINEL 2: 2º E 3º MAIOR MOTIVO DE CONTATO :: DETALHES (PÁG. 11 DO REPORT) -->\r\n                        <section class="panel glass-panel" id="section-diag-top-motivos"',
  '<!-- NOVO PAINEL 2: 2º E 3º MAIOR MOTIVO DE CONTATO :: DETALHES (PÁG. 11 DO REPORT) -->\r\n                        <section class="panel glass-panel" id="section-diag-motivo-detalhes"'
);

html = html.replace(
  '<!-- GRÁFICO 1: INDICADOR DE EFETIVIDADE (META: 96,1%) COM BARRA YTD (PÁG. 19 TOPO) -->\r\n                        <section class="panel glass-panel" id="section-diag-top-motivos"',
  '<!-- GRÁFICO 1: INDICADOR DE EFETIVIDADE (META: 96,1%) COM BARRA YTD (PÁG. 19 TOPO) -->\r\n                        <section class="panel glass-panel" id="section-diag-efetividade-barras"'
);

html = html.replace(
  '<!-- GRÁFICO 2: CHAMADOS EM ATRASO (PENDENTES COM >7 DIAS DA DATA DE ABERTURA) (PÁG. 19 BASE) -->\r\n                        <section class="panel glass-panel" id="section-diag-top-motivos"',
  '<!-- GRÁFICO 2: CHAMADOS EM ATRASO (PENDENTES COM >7 DIAS DA DATA DE ABERTURA) (PÁG. 19 BASE) -->\r\n                        <section class="panel glass-panel" id="section-diag-chamados-atraso"'
);

html = html.replace(
  '<!-- MATRIZ DE EFETIVIDADE POR GRUPO (PÁGINA 20 DO REPORT) -->\r\n                        <section class="panel glass-panel" id="section-diag-top-motivos"',
  '<!-- MATRIZ DE EFETIVIDADE POR GRUPO (PÁGINA 20 DO REPORT) -->\r\n                        <section class="panel glass-panel" id="section-diag-matriz-grupos"'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('[SUCCESS] Unique section IDs configured.');
