# Script de Promoção de Homologação (HML) para Produção (PRD) - Painel OPS
# SEGURANÇA: Apenas código (HTML/CSS/JS) é promovido. Dados do Supabase (board_state id='default') 
# e localStorage de PRD NÃO são afetados.
$ErrorActionPreference = "Stop"

$hmlDir = "C:\Users\331262\.gemini\antigravity\scratch\Painel-OPS-HML"
$prdDir = "C:\Users\331262\.gemini\antigravity\scratch\capacity-fte-calculator-v2"
$compileHmlScript = "$hmlDir\scripts\compile-bundle.ps1"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Write-Host "=========================================================="
Write-Host "INICIANDO PROMOCAO: HOMOLOGACAO (HML) -> PRODUCAO (PRD)"
Write-Host "=========================================================="

# 1. Validar código em HML
Write-Host "`n1. Validando sintaxe do codigo em HML..."
Push-Location $hmlDir
& "$hmlDir\scripts\validate-code.ps1"
Pop-Location

# 2. Compilar bundles em HML (para ter o hml.html atualizado)
Write-Host "`n2. Compilando bundles de Homologacao..."
Push-Location $hmlDir
& $compileHmlScript
Pop-Location

# 3. Copiar arquivos de código de HML para PRD
Write-Host "`n3. Copiando arquivos homologados para Producao..."
Copy-Item -Path "$hmlDir\app.js" -Destination "$prdDir\app.js" -Force
Copy-Item -Path "$hmlDir\index.html" -Destination "$prdDir\index.html" -Force
Copy-Item -Path "$hmlDir\style.css" -Destination "$prdDir\style.css" -Force

# 4. Remover marcações e elementos específicos de HML do index.html em PRD
Write-Host "`n4. Removendo marcacoes de HML do index.html de Producao..."
$prdHtml = [System.IO.File]::ReadAllText("$prdDir\index.html", [System.Text.Encoding]::UTF8)
# Remover banner fixo de HML
$prdHtml = [System.Text.RegularExpressions.Regex]::Replace($prdHtml, '(?s)<div id="hml-banner-fixed".*?</div>', '')
# Remover style inline do app-container (margin-top e height calc do banner HML)
$prdHtml = [regex]::Replace($prdHtml, '<div class="app-container"[^>]*>', '<div class="app-container">')
# Remover botão de sync PRD se existir
$prdHtml = [System.Text.RegularExpressions.Regex]::Replace($prdHtml, '(?s)<button id="btn-cadastros-sync-prd".*?</button>', '')
# Remover botão de sync HML se existir
$prdHtml = [System.Text.RegularExpressions.Regex]::Replace($prdHtml, '(?s)<button id="btn-hml-sync-prd".*?</button>', '')
[System.IO.File]::WriteAllText("$prdDir\index.html", $prdHtml, $utf8NoBom)
Write-Host "   index.html limpo de marcacoes HML."

# 5. Ajustar app.js: converter constantes HML para PRD
Write-Host "`n5. Convertendo constantes e referencias de HML para PRD no app.js..."
$prdApp = [System.IO.File]::ReadAllText("$prdDir\app.js", [System.Text.Encoding]::UTF8)

# 5a. Remover as constantes HML-specific e o comentário sobre HML usando regex
$prdApp = [regex]::Replace($prdApp, '(?m)^// Configura[^\r\n]*\r?\n', '')
$prdApp = [regex]::Replace($prdApp, '(?m)^const HML_AUTH_STORAGE_KEY[^\r\n]*\r?\n', '')
$prdApp = [regex]::Replace($prdApp, '(?m)^const HML_ACTIVITY_STORAGE_KEY[^\r\n]*\r?\n', '')
$prdApp = [regex]::Replace($prdApp, '(?m)^const HML_SESSION_ACTIVE_KEY[^\r\n]*\r?\n', '')

# 5b. Reverter createClient customizado (com auth options) para padrão PRD
$prdApp = [regex]::Replace($prdApp, "(?s)supabaseClient = window\.supabase\.createClient\(SUPABASE_URL, SUPABASE_ANON_KEY, \{.*?\}\);", "supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);")

# 5c. Substituir referências restantes de HML_ACTIVITY_STORAGE_KEY para string literal PRD
$prdApp = $prdApp.Replace("HML_ACTIVITY_STORAGE_KEY", "'painel_ops_last_activity'")
$prdApp = $prdApp.Replace("HML_SESSION_ACTIVE_KEY", "'painel_ops_session_active'")

# 5d. Substituir referências restantes de HML_AUTH_STORAGE_KEY (se houver)
$prdApp = $prdApp.Replace("HML_AUTH_STORAGE_KEY", "'sb-maguyzjhldcgpcvkvkqe-auth-token'")

# 5e. Substituir board_state IDs de HML para PRD
$prdApp = $prdApp.Replace("'hml_default'", "'default'")
$prdApp = $prdApp.Replace("filter: 'id=eq.hml_default'", "filter: 'id=eq.default'")
$prdApp = $prdApp.Replace("'hml_hispana'", "'hispana_default'")
$prdApp = $prdApp.Replace("filter: 'id=eq.hml_hispana'", "filter: 'id=eq.hispana_default'")

# 5f. Substituir canal realtime
$prdApp = $prdApp.Replace("'board-changes-hml'", "'board-changes'")
$prdApp = $prdApp.Replace("'board-changes-hml-hispana'", "'board-changes-hispana'")

# 5g. Substituir logs com prefixo HML
$prdApp = $prdApp.Replace('[Realtime HML]', '[Realtime]')

# 5h. Substituir mensagem de erro do Supabase Client
$prdApp = $prdApp.Replace('Erro ao inicializar Supabase Client em HML:', 'Erro ao inicializar Supabase Client:')

# 5i. Remover função importPrdDataToHml() inteira (exclusiva de HML)
$prdApp = [regex]::Replace($prdApp, '(?s)// IMPORT PRD DATA TO HML.*?function importPrdDataToHml\(\).*?\n\}\r?\n', '')
# Fallback
$prdApp = [regex]::Replace($prdApp, '(?s)async function importPrdDataToHml\(\) \{.*?\n\}\r?\n', '')

[System.IO.File]::WriteAllText("$prdDir\app.js", $prdApp, $utf8NoBom)
Write-Host "   app.js convertido para constantes de Producao."

# 6. Recompilar single_file_google_sites.html em PRD
Write-Host "`n6. Recompilando single_file_google_sites.html em Producao..."
$htmlPrd = [System.IO.File]::ReadAllText("$prdDir\index.html", [System.Text.Encoding]::UTF8)
$cssPrd = [System.IO.File]::ReadAllText("$prdDir\style.css", [System.Text.Encoding]::UTF8)
$jsPrd = [System.IO.File]::ReadAllText("$prdDir\app.js", [System.Text.Encoding]::UTF8)

$singlePrd = [regex]::Replace($htmlPrd, '<link\s+rel="stylesheet"\s+href="style\.css[^"]*">', "<style>`n$cssPrd`n</style>")
$singlePrd = [regex]::Replace($singlePrd, '<script\s+src="app\.js[^"]*">\s*</script>', "<script>`n$jsPrd`n</script>")
[System.IO.File]::WriteAllText("$prdDir\single_file_google_sites.html", $singlePrd, $utf8NoBom)
Write-Host "   single_file_google_sites.html recompilado com sucesso."

# 7. Validar código em PRD
Write-Host "`n7. Validando sintaxe do codigo em Producao..."
Push-Location $prdDir
& "$prdDir\scripts\validate-code.ps1"
Pop-Location

# 8. Atualizar hml.html no diretório de PRD para manter GitHub Pages sincronizado
Copy-Item -Path "$hmlDir\single_file_google_sites.html" -Destination "$prdDir\hml.html" -Force
Write-Host "   hml.html sincronizado."

# 9. Garantir que TODOS os arquivos em PRD estão estritamente sem BOM
Write-Host "`n8. Garantindo encoding UTF-8 sem BOM em todos os arquivos..."
$prdFiles = @("$prdDir\app.js", "$prdDir\index.html", "$prdDir\style.css", "$prdDir\single_file_google_sites.html", "$prdDir\hml.html")
foreach ($pf in $prdFiles) {
    if (Test-Path $pf) {
        $txt = [System.IO.File]::ReadAllText($pf, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($pf, $txt, $utf8NoBom)
    }
}
Write-Host "   Encoding normalizado."

# 10. Verificação final: confirmar que NÃO há resíduos de HML no app.js PRD
Write-Host "`n9. Verificacao final de residuos HML..."
$finalCheck = [System.IO.File]::ReadAllText("$prdDir\app.js", [System.Text.Encoding]::UTF8)
$residuos = @("HML_AUTH_STORAGE_KEY", "HML_ACTIVITY_STORAGE_KEY", "HML_SESSION_ACTIVE_KEY", "hml_default", "hml_hispana", "board-changes-hml", "importPrdDataToHml")
$hasResidues = $false
foreach ($r in $residuos) {
    if ($finalCheck.Contains($r)) {
        Write-Host "   [AVISO] Residuo encontrado: $r" -ForegroundColor Yellow
        $hasResidues = $true
    }
}
if (-not $hasResidues) {
    Write-Host "   Nenhum residuo de HML encontrado. Codigo limpo para PRD!" -ForegroundColor Green
}

Write-Host "`n=========================================================="
Write-Host "PROMOCAO PARA PRODUCAO PREPARADA COM SUCESSO!"
Write-Host "Os arquivos foram convertidos. Pronto para commit e push."
Write-Host "=========================================================="
