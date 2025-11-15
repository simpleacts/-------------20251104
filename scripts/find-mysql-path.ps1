# MySQL/MariaDBのインストール場所を検索するスクリプト

Write-Host "MySQL/MariaDBのインストール場所を検索中..." -ForegroundColor Yellow
Write-Host ""

# 一般的なインストール場所を確認
$commonPaths = @(
    "C:\Program Files\MariaDB\bin",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin",
    "C:\Program Files\MySQL\MySQL Server 8.3\bin",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin",
    "C:\Program Files (x86)\MariaDB\bin",
    "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin"
)

Write-Host "一般的なインストール場所を確認中..." -ForegroundColor Cyan
foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        $mysqlExe = Join-Path $path "mysql.exe"
        if (Test-Path $mysqlExe) {
            Write-Host "✓ 見つかりました: $path" -ForegroundColor Green
            Write-Host "  完全パス: $mysqlExe" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "システム全体を検索中（時間がかかる場合があります）..." -ForegroundColor Cyan

# システム全体を検索（時間がかかる場合がある）
try {
    $results = Get-ChildItem "C:\Program Files" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 5
    if ($results) {
        Write-Host "✓ 追加で見つかった場所:" -ForegroundColor Green
        foreach ($result in $results) {
            $binPath = $result.DirectoryName
            Write-Host "  $binPath" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "検索中にエラーが発生しました（権限の問題の可能性があります）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "サービスを確認中..." -ForegroundColor Cyan
$services = Get-Service | Where-Object {$_.Name -like "*mysql*" -or $_.Name -like "*mariadb*"}
if ($services) {
    Write-Host "✓ 実行中のサービス:" -ForegroundColor Green
    foreach ($service in $services) {
        Write-Host "  $($service.Name) - $($service.Status)" -ForegroundColor Gray
    }
} else {
    Write-Host "MySQL/MariaDBサービスが見つかりませんでした" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "1. 上記で見つかったbinディレクトリのパスをコピー" -ForegroundColor White
Write-Host "2. システム環境変数のPathに追加" -ForegroundColor White
Write-Host "3. 新しいPowerShellウィンドウを開いて確認" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

