$baseDir = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $baseDir "index.html"
$cssPath = Join-Path $baseDir "style.css"
$jsPath = Join-Path $baseDir "app.js"
$outPath = Join-Path $baseDir "single_file_google_sites.html"

$html = Get-Content -Path $htmlPath -Raw -Encoding UTF8
$css = Get-Content -Path $cssPath -Raw -Encoding UTF8
$js = Get-Content -Path $jsPath -Raw -Encoding UTF8

# Replace style.css link with inline style tag
$html = $html.Replace('<link rel="stylesheet" href="style.css">', "<style>`n$css`n</style>")

# Replace app.js script with inline script tag
$html = $html.Replace('<script src="app.js"></script>', "<script>`n$js`n</script>")

Set-Content -Path $outPath -Value $html -Encoding UTF8
Write-Host "Bundle compiled successfully at: $outPath"
