$baseDir = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $baseDir "index.html"
$cssPath = Join-Path $baseDir "style.css"
$jsPath = Join-Path $baseDir "app.js"
$outPath = Join-Path $baseDir "single_file_google_sites.html"

$html = Get-Content -Path $htmlPath -Raw -Encoding UTF8
$css = Get-Content -Path $cssPath -Raw -Encoding UTF8
$js = Get-Content -Path $jsPath -Raw -Encoding UTF8

# Replace style.css link (with or without ?v=...) with inline style tag
$html = [regex]::Replace($html, '<link\s+rel="stylesheet"\s+href="style\.css(\?[^"]*)?"\s*/?>', "<style>`n$css`n</style>")

# Replace app.js script (with or without ?v=...) with inline script tag
$html = [regex]::Replace($html, '<script\s+src="app\.js(\?[^"]*)?">\s*</script>', "<script>`n$js`n</script>")

# Verify inlining succeeded
if ($html -match '<script\s+src="app\.js') {
    Write-Host "ERROR: app.js was NOT inlined! Check the script tag format in index.html." -ForegroundColor Red
    exit 1
}
if ($html -match 'href="style\.css') {
    Write-Host "ERROR: style.css was NOT inlined! Check the link tag format in index.html." -ForegroundColor Red
    exit 1
}

Set-Content -Path $outPath -Value $html -Encoding UTF8
Write-Host "Bundle compiled successfully at: $outPath"
