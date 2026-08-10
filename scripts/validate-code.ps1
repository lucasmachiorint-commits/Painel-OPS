# Script de Validação de Sintaxe e Integridade - Painel OPS

$ErrorActionPreference = "Stop"

function Check-JsSyntax {
    param([string]$filePath)
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Arquivo nao encontrado: $filePath"
        return $true
    }

    $raw = Get-Content -Path $filePath -Raw -Encoding UTF8
    
    $openBraces = 0; $closeBraces = 0
    $openParens = 0; $closeParens = 0
    $openBrackets = 0; $closeBrackets = 0
    
    $mode = "CODE" # CODE, SINGLE, DOUBLE, TEMPLATE_TEXT, LINE_COMMENT, BLOCK_COMMENT, REGEX
    $templateDepthStack = New-Object System.Collections.Generic.Stack[int]
    $lastTokenChar = ''
    
    $len = $raw.Length
    $i = 0
    while ($i -lt $len) {
        $c = $raw[$i]
        $next = if ($i + 1 -lt $len) { $raw[$i + 1] } else { [char]0 }

        if ($mode -eq "LINE_COMMENT") {
            if ($c -eq "`n") { $mode = "CODE" }
            $i++
            continue
        }

        if ($mode -eq "BLOCK_COMMENT") {
            if ($c -eq '*' -and $next -eq '/') {
                $mode = "CODE"
                $i += 2
                continue
            }
            $i++
            continue
        }

        if ($mode -eq "SINGLE") {
            if ($c -eq '\') { $i += 2; continue }
            if ($c -eq "'") { $mode = "CODE"; $lastTokenChar = "'" }
            $i++
            continue
        }

        if ($mode -eq "DOUBLE") {
            if ($c -eq '\') { $i += 2; continue }
            if ($c -eq '"') { $mode = "CODE"; $lastTokenChar = '"' }
            $i++
            continue
        }

        if ($mode -eq "REGEX") {
            if ($c -eq '\') { $i += 2; continue }
            if ($c -eq '/') { $mode = "CODE"; $lastTokenChar = '/' }
            $i++
            continue
        }

        if ($mode -eq "TEMPLATE_TEXT") {
            if ($c -eq '\') { $i += 2; continue }
            if ($c -eq '`') {
                $mode = "CODE"
                $lastTokenChar = '`'
                $i++
                continue
            }
            if ($c -eq '$' -and $next -eq '{') {
                $mode = "CODE"
                $openBraces++
                $templateDepthStack.Push(1)
                $i += 2
                continue
            }
            $i++
            continue
        }

        if ($mode -eq "CODE") {
            if ($c -eq '/' -and $next -eq '/') { $mode = "LINE_COMMENT"; $i += 2; continue }
            if ($c -eq '/' -and $next -eq '*') { $mode = "BLOCK_COMMENT"; $i += 2; continue }

            if ($c -eq '/') {
                # Determine if / is division operator or regex literal
                $isDiv = $false
                if ($lastTokenChar -match '[a-zA-Z0-9_\$\)\]]') {
                    $isDiv = $true
                }
                if ($isDiv) {
                    $lastTokenChar = '/'
                    $i++
                    continue
                } else {
                    $mode = "REGEX"
                    $i++
                    continue
                }
            }

            if ($c -eq "'") { $mode = "SINGLE"; $i++; continue }
            if ($c -eq '"') { $mode = "DOUBLE"; $i++; continue }
            if ($c -eq '`') { $mode = "TEMPLATE_TEXT"; $i++; continue }

            if ($c -notmatch '\s') {
                $lastTokenChar = $c
            }

            if ($c -eq '{') {
                $openBraces++
                if ($templateDepthStack.Count -gt 0) {
                    $top = $templateDepthStack.Pop()
                    $templateDepthStack.Push($top + 1)
                }
            }
            elseif ($c -eq '}') {
                $closeBraces++
                if ($templateDepthStack.Count -gt 0) {
                    $top = $templateDepthStack.Pop()
                    if ($top -eq 1) {
                        $mode = "TEMPLATE_TEXT"
                    } else {
                        $templateDepthStack.Push($top - 1)
                    }
                }
            }
            elseif ($c -eq '(') { $openParens++ }
            elseif ($c -eq ')') { $closeParens++ }
            elseif ($c -eq '[') { $openBrackets++ }
            elseif ($c -eq ']') { $closeBrackets++ }

            $i++
            continue
        }
    }

    Write-Host "Analisando arquivo: $filePath"
    Write-Host "   Chaves { }: $openBraces / $closeBraces"
    Write-Host "   Parenteses ( ): $openParens / $closeParens"
    Write-Host "   Colchetes [ ]: $openBrackets / $closeBrackets"

    if ($openBraces -ne $closeBraces) {
        Write-Host "ERRO DE SINTAXE: Desbalanceamento de chaves em $filePath ($openBraces vs $closeBraces)"
        return $false
    }
    if ($openParens -ne $closeParens) {
        Write-Host "ERRO DE SINTAXE: Desbalanceamento de parenteses em $filePath ($openParens vs $closeParens)"
        return $false
    }
    if ($openBrackets -ne $closeBrackets) {
        Write-Host "ERRO DE SINTAXE: Desbalanceamento de colchetes em $filePath ($openBrackets vs $closeBrackets)"
        return $false
    }

    Write-Host "Arquivo $filePath validado com sucesso!"
    return $true
}

$filesToValidate = @("app.js")
$allValid = $true

foreach ($file in $filesToValidate) {
    $res = Check-JsSyntax -filePath $file
    if (-not $res) {
        $allValid = $false
    }
}

if (-not $allValid) {
    Write-Host "VALIDACAO FALHOU: Corrija os erros acima antes de realizar o deploy!"
    exit 1
} else {
    Write-Host "VALIDACAO CONCLUIDA COM SUCESSO: O codigo esta 100% integro!"
    exit 0
}
