@echo off
REM バッチファイルがあるディレクトリに移動
cd /d "%~dp0"
REM コードページをUTF-8に設定（エラーを無視）
if exist "%SystemRoot%\System32\chcp.com" (
    "%SystemRoot%\System32\chcp.com" 65001 >nul 2>&1
) else if exist "%SystemRoot%\System32\chcp.exe" (
    "%SystemRoot%\System32\chcp.exe" 65001 >nul 2>&1
) else (
    chcp 65001 >nul 2>&1
)
REM 自動リトライを無効化（1回実行で失敗したらエラーログを出力して終了）
set MAX_AUTO_RETRIES=0
set AUTO_RETRY_COUNT=0

%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Cyan"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'ビルドスクリプト（エラーチェック付き）を実行します' -ForegroundColor Cyan"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Cyan"
echo.

REM PowerShellで実行ポリシーを設定（確認プロンプトでyesを選択してください）
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '[1/5] 実行ポリシーを設定中...' -ForegroundColor Yellow"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '確認プロンプトが表示されたら Y を入力してください' -ForegroundColor Gray"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Set-ExecutionPolicy RemoteSigned -Scope Process"
if %errorlevel% neq 0 (
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラー: 実行ポリシーの設定に失敗しました' -ForegroundColor Red"
    pause
    exit /b 1
)
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '実行ポリシーの設定が完了しました' -ForegroundColor Green"
echo.

REM TypeScriptの構文チェック
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '[2/5] TypeScriptの構文チェック中...' -ForegroundColor Yellow"
set HAS_TSC_ERRORS=0
if exist tsconfig.json (
    call npx tsc --noEmit --skipLibCheck 2>tsc-errors.txt
    if %errorlevel% neq 0 (
        set HAS_TSC_ERRORS=1
        echo.
        echo ========================================
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '警告: TypeScriptのエラーが検出されました' -ForegroundColor Yellow"
        echo ========================================
        echo.
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラー内容:' -ForegroundColor Yellow"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "if (Test-Path tsc-errors.txt) { Get-Content tsc-errors.txt | Select-Object -First 30 }"
        echo.
        
        REM エラーログファイルに保存
        if exist tsc-errors.txt (
            copy /Y tsc-errors.txt build-errors.log >nul 2>&1
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラーログを build-errors.log に保存しました' -ForegroundColor Gray"
        )
        echo.
        
        REM 自動修正を試みる
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '自動修正を試みます...' -ForegroundColor Cyan"
        if exist scripts\auto-fix-errors.ps1 (
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File scripts\auto-fix-errors.ps1 -ErrorLogFile build-errors.log -ErrorType typescript
        ) else (
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '警告: auto-fix-errors.ps1が見つかりません。自動修正をスキップします。' -ForegroundColor Yellow"
        )
        echo.
        
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラーを修正しますか？ (Y/N)' -ForegroundColor Yellow"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '  Y: エラー内容をAIに送信して修正を依頼します' -ForegroundColor Gray"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '  N: エラーを無視してビルドを続行します' -ForegroundColor Gray"
        set /p fixErrors="> "
        if /i "%fixErrors%"=="Y" (
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラー内容をAIに送信して修正を依頼してください。' -ForegroundColor Cyan"
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'build-errors.log ファイルの内容を共有してください。' -ForegroundColor Gray"
            echo.
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラーログファイルの内容:' -ForegroundColor Yellow"
            %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "if (Test-Path build-errors.log) { Get-Content build-errors.log }"
            echo.
            pause
            exit /b 1
        )
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '警告を無視して続行します...' -ForegroundColor Yellow"
    ) else (
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'TypeScriptの構文チェックが完了しました（エラーなし）' -ForegroundColor Green"
        if exist tsc-errors.txt del tsc-errors.txt
        if exist build-errors.log del build-errors.log
    )
) else (
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'tsconfig.jsonが見つかりません。TypeScriptチェックをスキップします。' -ForegroundColor Yellow"
)
echo.

REM SQLファイルの基本チェック
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '[3/5] SQLファイルの基本チェック中...' -ForegroundColor Yellow"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$sqlFiles = Get-ChildItem -Path 'dist' -Filter '*.sql' -Recurse -ErrorAction SilentlyContinue; if ($sqlFiles) { Write-Host ('SQLファイルを検出: ' + $sqlFiles.Count + '個') -ForegroundColor Green } else { Write-Host 'distディレクトリにSQLファイルが見つかりません（ビルド後に生成される可能性があります）' -ForegroundColor Yellow }"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'SQLファイルのチェックが完了しました' -ForegroundColor Green"
echo.

REM npm installを実行
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '[4/5] npm installを実行中...' -ForegroundColor Yellow"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラー: npm installに失敗しました' -ForegroundColor Red"
    echo ========================================
    echo.
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '対処法:' -ForegroundColor Cyan"
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '  1. インターネット接続を確認してください' -ForegroundColor White"
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '  2. node_modulesフォルダを削除してから再実行してください' -ForegroundColor White"
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '  3. npm cache clean --force を実行してから再試行してください' -ForegroundColor White"
    echo.
    pause
    exit /b 1
)
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'npm installが完了しました' -ForegroundColor Green"
echo.

REM npm run buildを実行（1回のみ）
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '[5/5] npm run buildを実行中...' -ForegroundColor Yellow"
call npm run build >build-output.log 2>&1
set BUILD_EXIT_CODE=%errorlevel%
if %BUILD_EXIT_CODE% equ 0 (
    goto BUILD_SUCCESS
)

REM エラーが発生した場合（1回実行で失敗したらエラーログを出力して終了）
echo.
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Red"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'ビルドエラーが発生しました' -ForegroundColor Red"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Red"
echo.

REM エラーをログファイルに保存
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Get-Content build-output.log | Select-String -Pattern 'error|Error|ERROR|失敗|失敗しました|ERROR|エラー' | Out-File -FilePath build-errors.log -Encoding UTF8"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラーログを build-errors.log に保存しました' -ForegroundColor Gray"
echo.

REM エラー内容を表示
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラー内容:' -ForegroundColor Yellow"
if exist build-errors.log (
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Get-Content build-errors.log"
) else if exist build-output.log (
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Get-Content build-output.log | Select-String -Pattern 'error|Error|ERROR|失敗' | Select-Object -First 30"
)
echo.

REM ビルド出力の最後の50行も表示（エラーの詳細確認用）
if exist build-output.log (
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'ビルド出力の最後の50行:' -ForegroundColor Yellow"
    %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Get-Content build-output.log | Select-Object -Last 50"
    echo.
)

REM エラーログファイルの場所を表示して終了（自動リトライなし、プロンプトなし）
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'エラーログファイル: build-errors.log' -ForegroundColor Cyan"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'ビルド出力ファイル: build-output.log' -ForegroundColor Cyan"
echo.
pause
exit /b 1

:BUILD_SUCCESS
REM ビルド成功時は一時ファイルを削除
if exist build-output.log del build-output.log
if exist build-errors.log del build-errors.log
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'npm run buildが完了しました' -ForegroundColor Green"
echo.

%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Green"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'すべての処理が完了しました！' -ForegroundColor Green"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '========================================' -ForegroundColor Green"
echo.

REM ビルド成功時のみサーバーを起動
if %BUILD_EXIT_CODE% equ 0 (
    REM PHPコマンドの存在確認
    where php >nul 2>&1
    if %errorlevel% neq 0 (
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '警告: PHPコマンドが見つかりません。サーバーの起動をスキップします。' -ForegroundColor Yellow"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'PHPをインストールするか、PATHに追加してください。' -ForegroundColor Gray"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'サーバーを手動で起動する場合: php -S localhost:8080 -t dist' -ForegroundColor White"
        echo.
    ) else (
        REM サーバーを自動起動
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'PHP開発サーバーを起動中...' -ForegroundColor Yellow"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'サーバーURL: http://localhost:8080' -ForegroundColor Green"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '停止するにはサーバーウィンドウを閉じるか、Ctrl+C を押してください' -ForegroundColor Gray"
        echo.
        start "PHP Development Server" cmd /k "php -S localhost:8080 -t dist"
        %SystemRoot%\System32\timeout.exe /t 2 >nul 2>&1
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'サーバーが起動しました。ブラウザで http://localhost:8080 にアクセスしてください。' -ForegroundColor Green"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '注意: サーバーを停止するには、サーバーウィンドウを閉じるか、Ctrl+C を押してください。' -ForegroundColor Yellow"
        echo.
    )
)
pause
