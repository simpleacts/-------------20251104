@echo off
chcp 65001 >nul
echo ========================================
echo ビルドスクリプトを実行します
echo ========================================
echo.

REM PowerShellで実行ポリシーを設定（確認プロンプトを自動で処理）
echo [1/3] 実行ポリシーを設定中...
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Set-ExecutionPolicy RemoteSigned -Scope Process -Force"
if %errorlevel% neq 0 (
    echo エラー: 実行ポリシーの設定に失敗しました
    pause
    exit /b 1
)
echo 実行ポリシーの設定が完了しました
echo.

REM npm installを実行
echo [2/3] npm installを実行中...
call npm install
if %errorlevel% neq 0 (
    echo エラー: npm installに失敗しました
    pause
    exit /b 1
)
echo npm installが完了しました
echo.

REM npm run buildを実行
echo [3/3] npm run buildを実行中...
call npm run build
if %errorlevel% neq 0 (
    echo エラー: npm run buildに失敗しました
    pause
    exit /b 1
)
echo npm run buildが完了しました
echo.

echo ========================================
echo すべての処理が完了しました！
echo ========================================
echo.

REM PHPサーバーを起動するか確認
echo PHP開発サーバーを起動しますか？ (Y/N)
set /p startServer="> "
if /i "%startServer%"=="Y" (
    echo.
    echo PHP開発サーバーを起動中...
    echo サーバーURL: http://localhost:8080
    echo 停止するにはサーバーウィンドウを閉じるか、Ctrl+C を押してください
    echo.
    REM PHPコマンドの存在確認
    where php >nul 2>&1
    if %errorlevel% neq 0 (
        echo 警告: PHPコマンドが見つかりません。サーバーの起動をスキップします。
        echo PHPをインストールするか、PATHに追加してください。
        echo サーバーを手動で起動する場合: php -S localhost:8080 -t dist
        echo.
    ) else (
        start "PHP Development Server" cmd /k "php -S localhost:8080 -t dist"
        timeout /t 2 >nul
        echo サーバーが起動しました。ブラウザで http://localhost:8080 にアクセスしてください。
        echo.
    )
) else (
    echo.
    echo 次のステップ:
    echo 1. PHP開発サーバーを起動: php -S localhost:8080 -t dist
    echo 2. またはスクリプトを使用: scripts\start-dist-server.bat
    echo 3. ブラウザでアクセス: http://localhost:8080
    echo.
)
pause

    echo サーバーが起動しました。ブラウザで http://localhost:8080 にアクセスしてください。
    echo.
) else (
    echo.
    echo 次のステップ:
    echo 1. PHP開発サーバーを起動: php -S localhost:8080 -t dist
    echo 2. またはスクリプトを使用: scripts\start-dist-server.bat
    echo 3. ブラウザでアクセス: http://localhost:8080
    echo.
)
pause
