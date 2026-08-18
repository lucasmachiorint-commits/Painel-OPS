# Script de Promoção de Homologação (HML) para Produção (PRD) - Painel OPS
$ErrorActionPreference = "Stop"

$hmlDir = "C:\Users\331262\.gemini\antigravity\scratch\Painel-OPS-HML"
$prdDir = "C:\Users\331262\.gemini\antigravity\scratch\capacity-fte-calculator-v2"
$compileHmlScript = "C:\Users\331262\.gemini\antigravity\brain\0cf73b4e-0602-4d7d-a92e-6a4591451db0\scratch\compile_hml.ps1"

Write-Host "=========================================================="
Write-Host "INICIANDO PROMOCAO: HOMOLOGACAO (HML) -> PRODUCAO (PRD)"
Write-Host "=========================================================="

# 1. Validar código em HML
Write-Host "`n1. Validando sintaxe do codigo em HML..."
Set-Location $hmlDir
& "$hmlDir\scripts\validate-code.ps1"

# 2. Compilar bundles em HML
Write-Host "`n2. Compilando bundles de Homologacao..."
& $compileHmlScript

# 3. Copiar arquivos de HML para PRD
Write-Host "`n3. Copiando arquivos homologados para Producao..."
Copy-Item -Path "$hmlDir\app.js" -Destination "$prdDir\app.js" -Force
Copy-Item -Path "$hmlDir\index.html" -Destination "$prdDir\index.html" -Force
Copy-Item -Path "$hmlDir\style.css" -Destination "$prdDir\style.css" -Force

# 4. Remover marcações e elementos específicos de HML do index.html em PRD
Write-Host "`n4. Removendo marcacoes de HML dos arquivos de Producao..."
$prdHtml = Get-Content -Path "$prdDir\index.html" -Raw -Encoding UTF8
$prdHtmlClean = [System.Text.RegularExpressions.Regex]::Replace($prdHtml, '(?s)<div id="hml-banner-fixed".*?</div>', '')
$prdHtmlClean = $prdHtmlClean.Replace('style="margin-top: 32px;"', '')
$prdHtmlClean = [System.Text.RegularExpressions.Regex]::Replace($prdHtmlClean, '(?s)<button id="btn-cadastros-sync-prd".*?</button>', '')
Set-Content -Path "$prdDir\index.html" -Value $prdHtmlClean -Encoding UTF8

# 5. Ajustar Supabase ID e canais de HML para Produção no app.js
$prdApp = Get-Content -Path "$prdDir\app.js" -Raw -Encoding UTF8
$prdAppClean = $prdApp.Replace("'hml_default'", "'default'")
$prdAppClean = $prdAppClean.Replace("'board-changes-hml'", "'board-changes'")
$prdAppClean = $prdAppClean.Replace("filter: 'id=eq.hml_default'", "filter: 'id=eq.default'")
$prdAppClean = $prdAppClean.Replace('[Realtime HML]', '[Realtime]')
Set-Content -Path "$prdDir\app.js" -Value $prdAppClean -Encoding UTF8

# 6. Recompilar single file em PRD
Write-Host "`n5. Recompilando single_file_google_sites.html em Producao..."
$htmlPrd = Get-Content -Path "$prdDir\index.html" -Raw -Encoding UTF8
$cssPrd = Get-Content -Path "$prdDir\style.css" -Raw -Encoding UTF8
$jsPrd = Get-Content -Path "$prdDir\app.js" -Raw -Encoding UTF8

$singlePrd = $htmlPrd.Replace('<link rel="stylesheet" href="style.css">', "<style>`n$cssPrd`n</style>")
$singlePrd = $singlePrd.Replace('<script src="app.js"></script>', "<script>`n$jsPrd`n</script>")
Set-Content -Path "$prdDir\single_file_google_sites.html" -Value $singlePrd -Encoding UTF8

# 7. Validar código em PRD
Write-Host "`n6. Validando sintaxe do codigo em Producao..."
Set-Location $prdDir
& "$prdDir\scripts\validate-code.ps1"

# 8. Atualizar hml.html no diretório de PRD para manter GitHub Pages sincronizado
Copy-Item -Path "$hmlDir\single_file_google_sites.html" -Destination "$prdDir\hml.html" -Force

# 9. Git Commit e Push em PRD
Write-Host "`n7. Efetuando commit e push no repositorio de Producao..."
git add .
git commit -m "feat(deploy): promover todas melhorias homologadas de HML para Producao (PRD)"
git push origin main

Write-Host "`n=========================================================="
Write-Host "PROMOCAO PARA PRODUCAO CONCLUIDA COM SUCESSO!"
Write-Host "=========================================================="
