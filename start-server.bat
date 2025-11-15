@echo off
chcp 932 >nul
REM サーバー起動バッチファイル

echo ========================================
echo サーバー起動
echo ========================================
echo.

REM PHPが利用可能か確認
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: PHPが見つかりません。PHP APIは使用できません。
    echo http-serverのみを起動します。
    echo.
    goto :start_http_server
)

REM ポート8080が使用中か確認
echo ポート8080の使用状況を確認中...
netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo 警告: ポート8080は既に使用されています。
    echo 別のポートを使用するか、既存のサーバーを停止してください。
    echo.
    pause
    exit /b 1
)

REM PHPサーバーをバックグラウンドで起動（ポート8080で起動、http-serverと競合しないように）
echo PHPサーバーを起動中（ポート8080）...
start "PHP Server" cmd /k "php -S localhost:8080"
timeout /t 2 /nobreak >nul

:start_http_server
REM http-serverを起動（フロントエンド用、ポート8080）
echo http-serverを起動中（ポート8080）...
echo.
echo ========================================
echo サーバー情報
echo ========================================
echo フロントエンド: http://localhost:8080
echo PHP API: http://localhost:8080
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo PHPサーバーを停止するには、別ウィンドウを閉じてください
echo ========================================
echo.

npm run dev

pause

