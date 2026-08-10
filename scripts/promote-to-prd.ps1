# Script de Promoção de Homologação (HML) para Produção (PRD) - Painel OPS

$ErrorActionPreference = "Stop"

$hmlDir = "C:\Users\331262\.gemini\antigravity\scratch\Painel-OPS-HML"
$prdDir = "C:\Users\331262\.gemini\antigravity\scratch\capacity-fte-calculator-v2"
$mergeScript = "C:\Users\331262\.gemini\antigravity\brain\0cf73b4e-0602-4d7d-a92e-6a4591451db0\scratch\merge_v2.ps1"

Write-Host "=========================================================="
Write-Host "🚀 INICIANDO PROMOÇÃO: HOMOLOGAÇÃO (HML) ➔ PRODUÇÃO (PRD)"
Write-Host "=========================================================="

# 1. Validar código em HML
Write-Host "`n1. Validando sintaxe do código em HML..."
Set-Location $hmlDir
& "$hmlDir\scripts\validate-code.ps1"

# 2. Compilar versão single file em HML
Write-Host "`n2. Recompilando single_file_google_sites.html em HML..."
& $mergeScript

# 3. Copiar arquivos de HML para PRD
Write-Host "`n3. Copiando arquivos homologados para Produção..."
Copy-Item -Path "$hmlDir\app.js" -Destination "$prdDir\app.js" -Force
Copy-Item -Path "$hmlDir\index.html" -Destination "$prdDir\index.html" -Force
Copy-Item -Path "$hmlDir\style.css" -Destination "$prdDir\style.css" -Force

# 4. Remover marcações de HML do index.html em PRD
Write-Host "`n4. Removendo marcações de HML dos arquivos de Produção..."
$prdHtml = Get-Content "$prdDir\index.html" -Raw -Encoding UTF8
$prdHtmlClean = $prdHtml -replace '<div id="hml-banner-fixed".*?</div>', ''
$prdHtmlClean = $prdHtmlClean -replace 'style="margin-top: 32px;"', ''
Set-Content -Path "$prdDir\index.html" -Value $prdHtmlClean -Encoding UTF8

# 5. Ajustar Supabase ID de HML para default em PRD app.js
$prdApp = Get-Content "$prdDir\app.js" -Raw -Encoding UTF8
$prdAppClean = $prdApp -replace "'hml_default'", "'default'"
Set-Content -Path "$prdDir\app.js" -Value $prdAppClean -Encoding UTF8

# 6. Recompilar single file em PRD
Write-Host "`n5. Recompilando single_file_google_sites.html em Produção..."
Set-Location $prdDir
& $mergeScript

# 7. Validar código em PRD
Write-Host "`n6. Validando sintaxe do código em Produção..."
& "$prdDir\scripts\validate-code.ps1"

# 8. Git Commit e Push em PRD
Write-Host "`n7. Efetuando commit e push no repositório de Produção..."
git add .
git commit -m "feat(deploy): promover alteracoes homologadas de HML para Producao"
git push origin main

Write-Host "`n=========================================================="
Write-Host "✅ PROMOÇÃO PARA PRODUÇÃO CONCLUÍDA COM SUCESSO!"
Write-Host "=========================================================="
