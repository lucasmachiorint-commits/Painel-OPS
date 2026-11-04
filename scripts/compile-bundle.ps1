$baseDir = Split-Path -Parent $PSScriptRoot
$nodeExe = "C:\Users\331262\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64\node.exe"
$cleanScript = Join-Path $PSScriptRoot "compile-clean-utf8.js"

if (Test-Path $nodeExe) {
    & $nodeExe $cleanScript
} else {
    node $cleanScript
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao compilar bundle UTF-8!" -ForegroundColor Red
    exit 1
}
