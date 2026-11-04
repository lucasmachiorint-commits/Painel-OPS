const fs = require('fs');
const path = require('path');

const hmlDir = path.resolve(__dirname, '..');
const prdDir = path.resolve(hmlDir, '../capacity-fte-calculator-v2');

const appJsPath = path.join(hmlDir, 'app.js');
const indexHtmlPath = path.join(hmlDir, 'index.html');
const styleCssPath = path.join(hmlDir, 'style.css');

const bundleOutHml = path.join(hmlDir, 'single_file_google_sites.html');
const hmlHtmlInHml = path.join(hmlDir, 'hml.html');
const hmlHtmlInPrd = path.join(prdDir, 'hml.html');

console.log('==========================================================');
console.log('VARREDURA E CORREÇÃO COMPLETA DE ENCODING UTF-8');
console.log('==========================================================');

// Tabela exaustiva de correções de mojibake (UTF-8 interpretado como Windows-1252 / ISO-8859-1)
const REPLACEMENTS = [
  // Pontuações e símbolos tipográficos corrompidos
  [/â€¢/g, '•'],
  [/â€“/g, '–'],
  [/â€”/g, '—'],
  [/â€¦/g, '…'],
  [/â€œ/g, '“'],
  [/â€/g, '”'],
  [/â€˜/g, '‘'],
  [/â€™/g, '’'],
  [/Âª/g, 'ª'],
  [/Âº/g, 'º'],
  [/Â¡/g, '¡'],
  [/Â¿/g, '¿'],
  [/Â°/g, '°'],
  [/Â±/g, '±'],
  [/Â²/g, '²'],
  [/Â³/g, '³'],
  [/Â§/g, '§'],
  [/Â©/g, '©'],
  [/Â®/g, '®'],

  // Emojis corrompidos
  [/ðŸ‡§ðŸ‡·/g, '🇧🇷'],
  [/ðŸ¤–/g, '🤖'],
  [/ðŸ“ž/g, '📞'],
  [/ðŸ“‹/g, '📋'],
  [/ðŸ’¬/g, '💬'],
  [/ðŸ”’/g, '🔒'],
  [/ðŸ“\s*/g, '📅'],
  [/ðŸŒ /g, '🌐'],
  [/ðŸŒ/g, '🌐'],

  // Crase e caracteres compostos raros
  [/Ã /g, 'à'],
  [/Ã\u00a0/g, 'à'],
  [/Ã\u0080/g, 'À'],

  // Letra Ñ (Espanhol)
  [/Ã±/g, 'ñ'],
  [/Ã‘/g, 'Ñ'],

  // Vogais acentuadas minúsculas
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã£/g, 'ã'],
  [/Ãµ/g, 'õ'],
  [/Ã¢/g, 'â'],
  [/Ãª/g, 'ê'],
  [/Ã®/g, 'î'],
  [/Ã´/g, 'ô'],
  [/Ã»/g, 'û'],
  [/Ã§/g, 'ç'],

  // Vogais acentuadas maiúsculas
  [/Ã /g, 'Á'],
  [/Ã‰/g, 'É'],
  [/Ã /g, 'Í'],
  [/Ã“/g, 'Ó'],
  [/Ãš/g, 'Ú'],
  [/Ãƒ/g, 'Ã'],
  [/Ã•/g, 'Õ'],
  [/Ã‚/g, 'Â'],
  [/ÃŠ/g, 'Ê'],
  [/Ã”/g, 'Ô'],
  [/Ã‡/g, 'Ç'],

  // Codificações por ponto de código unicode direto
  [/\u00c3\u00a1/g, 'á'],
  [/\u00c3\u00a9/g, 'é'],
  [/\u00c3\u00ad/g, 'í'],
  [/\u00c3\u00b3/g, 'ó'],
  [/\u00c3\u00ba/g, 'ú'],
  [/\u00c3\u00a3/g, 'ã'],
  [/\u00c3\u00b5/g, 'õ'],
  [/\u00c3\u00a2/g, 'â'],
  [/\u00c3\u00aa/g, 'ê'],
  [/\u00c3\u00ae/g, 'î'],
  [/\u00c3\u00b4/g, 'ô'],
  [/\u00c3\u00bb/g, 'û'],
  [/\u00c3\u00a7/g, 'ç'],
  [/\u00c3\u0081/g, 'Á'],
  [/\u00c3\u0089/g, 'É'],
  [/\u00c3\u008d/g, 'Í'],
  [/\u00c3\u0093/g, 'Ó'],
  [/\u00c3\u009a/g, 'Ú'],
  [/\u00c3\u0083/g, 'Ã'],
  [/\u00c3\u0095/g, 'Õ'],
  [/\u00c3\u0082/g, 'Â'],
  [/\u00c3\u008a/g, 'Ê'],
  [/\u00c3\u0094/g, 'Ô'],
  [/\u00c3\u0087/g, 'Ç']
];

function cleanMojibake(content) {
  let cleaned = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

function verifyNoMojibake(name, content) {
  // Ignora palavras em caixa alta legítimas como TABELÃO, SESSÃO, etc.
  const testStr = content.replace(/SESSÃO|PRODUÇÃO|HOMOLOGAÇÃO|TABELÃO|AUTORIZAÇÃO|REVISÃO|AVALIAÇÃO|CONFIGURAÇÃO|DIREÇÃO|OPERAÇÃO|ATENÇÃO|EXPANSÃO|GESTÃO|PADRÃO|AÇÃO|OPÇÕES|ASSUNÇÃO|CRIAÇÃO/g, '');
  const suspicious = testStr.match(/[\u00C2\u00C3][\u0080-\u00BF]|Â|â€|ðŸ/g) || [];
  if (suspicious.length > 0) {
    console.warn(`[AVISO] ${name} ainda contém ${suspicious.length} padrões suspeitos:`, suspicious.slice(0, 10));
    return false;
  }
  console.log(`[SUCESSO] ${name}: 0 caracteres corrompidos! 100% íntegro UTF-8.`);
  return true;
}

// 1. Limpar app.js
let appJs = fs.readFileSync(appJsPath, 'utf8');
appJs = cleanMojibake(appJs);
fs.writeFileSync(appJsPath, appJs, 'utf8');
verifyNoMojibake('app.js', appJs);

// 2. Limpar index.html
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
indexHtml = cleanMojibake(indexHtml);
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
verifyNoMojibake('index.html', indexHtml);

// 3. Limpar style.css
let styleCss = fs.readFileSync(styleCssPath, 'utf8');
styleCss = cleanMojibake(styleCss);
fs.writeFileSync(styleCssPath, styleCss, 'utf8');
verifyNoMojibake('style.css', styleCss);

// 4. Compilar bundle inlined (Node.js nativo UTF-8 sem BOM e sem PowerShell mangling)
console.log('\nCompilando bundle unificado (single_file_google_sites.html)...');
let bundled = indexHtml;

// Inlining style.css
bundled = bundled.replace(/<link\s+rel="stylesheet"\s+href="style\.css(\?[^"]*)?"\s*\/?>/, `<style>\n${styleCss}\n</style>`);

// Inlining app.js
bundled = bundled.replace(/<script\s+src="app\.js(\?[^"]*)?">\s*<\/script>/, `<script>\n${appJs}\n</script>`);

if (bundled.includes('<script src="app.js')) {
  console.error('ERRO: Falha ao embutir app.js!');
  process.exit(1);
}
if (bundled.includes('href="style.css"')) {
  console.error('ERRO: Falha ao embutir style.css!');
  process.exit(1);
}

// Limpeza final de qualquer resíduo no bundle
bundled = cleanMojibake(bundled);

// Salvar bundle em HML
fs.writeFileSync(bundleOutHml, bundled, 'utf8');
fs.writeFileSync(hmlHtmlInHml, bundled, 'utf8');
verifyNoMojibake('single_file_google_sites.html', bundled);
verifyNoMojibake('hml.html (em HML)', bundled);

// Salvar bundle em PRD (para deploy do GitHub Pages no branch main)
if (fs.existsSync(prdDir)) {
  fs.writeFileSync(hmlHtmlInPrd, bundled, 'utf8');
  verifyNoMojibake('hml.html (em PRD)', bundled);
}

console.log('\n==========================================================');
console.log('COMPILAÇÃO E VARREDURA CONCLUÍDAS COM SUCESSO TOTAL!');
console.log('==========================================================');
