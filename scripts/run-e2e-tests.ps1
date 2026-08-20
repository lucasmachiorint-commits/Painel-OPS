param (
    [string]$TestFile = ""
)

$ErrorActionPreference = "Stop"
$nodeDir = "C:\Users\331262\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64"
$hmlDir = "C:\Users\331262\.gemini\antigravity\scratch\Painel-OPS-HML"

$env:PATH = "$nodeDir;$env:PATH"

Write-Host "=========================================================="
Write-Host "EXECUTANDO TESTES E2E COM PLAYWRIGHT (HML)"
Write-Host "=========================================================="

Set-Location $hmlDir

# 1. Validar sintaxe base
& "$hmlDir\scripts\validate-code.ps1"

# 2. Executar suíte Playwright
if ($TestFile -ne "") {
    & "$nodeDir\node.exe" "$hmlDir\node_modules\@playwright\test\cli.js" test $TestFile
} else {
    & "$nodeDir\node.exe" "$hmlDir\node_modules\@playwright\test\cli.js" test
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================================="
    Write-Host "TODOS OS TESTES E2E PASSARAM COM 100% DE SUCESSO!"
    Write-Host "=========================================================="
} else {
    Write-Host "`nFALHA NOS TESTES E2E!" -ForegroundColor Red
    exit 1
}
