# エラー自動修正スクリプト
# 検出されたエラーを解析して、可能な範囲で自動修正を試みます

param(
    [string]$ErrorLogFile = "build-errors.log",
    [string]$ErrorType = ""
)

$ErrorActionPreference = "Continue"

function Fix-TypeScriptImportError {
    param([string]$ErrorLine)
    
    # Cannot find module エラーの修正
    if ($ErrorLine -match "Cannot find module ['\""]([^'\""]+)['\""]") {
        $moduleName = $matches[1]
        $filePath = $ErrorLine -replace ".*?([a-zA-Z0-9_\\/]+\.tsx?):.*", '$1'
        
        if ($filePath -and (Test-Path $filePath)) {
            Write-Host "  インポートエラーを検出: $moduleName" -ForegroundColor Yellow
            
            # よくあるインポートパスの修正
            $fixes = @{
                "react" = "react"
                "react-dom" = "react-dom"
                "../../core/utils/stockProductInfo" = "@core/utils/stockProductInfo"
                "../../shared/ui" = "@shared/ui"
                "../../features" = "@features"
            }
            
            foreach ($key in $fixes.Keys) {
                if ($moduleName -like "*$key*") {
                    Write-Host "    修正候補: $key -> $($fixes[$key])" -ForegroundColor Gray
                }
            }
            
            return $true
        }
    }
    return $false
}

function Fix-TypeScriptTypeError {
    param([string]$ErrorLine)
    
    # 型エラーの修正
    if ($ErrorLine -match "Property ['\""]([^'\""]+)['\""] does not exist") {
        $propertyName = $matches[1]
        Write-Host "  型エラーを検出: プロパティ '$propertyName' が存在しません" -ForegroundColor Yellow
        return $true
    }
    
    return $false
}

function AnalyzeAndFixErrors {
    param([string]$ErrorLog)
    
    if (-not (Test-Path $ErrorLog)) {
        return $false
    }
    
    $errors = Get-Content $ErrorLog -Raw
    $fixed = $false
    
    Write-Host ""
    Write-Host "エラー解析中..." -ForegroundColor Cyan
    
    # TypeScriptエラーの解析
    if ($errors -match "error TS\d+") {
        Write-Host "TypeScriptエラーを検出しました" -ForegroundColor Yellow
        
        $errorLines = $errors -split "`n"
        foreach ($line in $errorLines) {
            if ($line -match "error TS\d+") {
                if (Fix-TypeScriptImportError -ErrorLine $line) {
                    $fixed = $true
                }
                if (Fix-TypeScriptTypeError -ErrorLine $line) {
                    $fixed = $true
                }
            }
        }
    }
    
    return $fixed
}

# メイン処理
if ($ErrorType -eq "typescript" -or $ErrorType -eq "") {
    $fixed = AnalyzeAndFixErrors -ErrorLog $ErrorLogFile
    if ($fixed) {
        Write-Host ""
        Write-Host "一部のエラーを自動修正しました。再度ビルドを実行してください。" -ForegroundColor Green
        return 0
    }
}

Write-Host ""
Write-Host "自動修正できないエラーがあります。手動での修正が必要です。" -ForegroundColor Yellow
return 1

