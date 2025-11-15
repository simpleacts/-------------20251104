echo.
        start "PHP Development Server" cmd /k "php -S localhost:8080 -t dist"
        %SystemRoot%\System32\timeout.exe /t 2 >nul 2>&1
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host 'サーバーが起動しました。ブラウザで http://localhost:8080 にアクセスしてください。' -ForegroundColor Green"
        %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -Command "Write-Host '注意: サーバーを停止するには、サーバーウィンドウを閉じるか、Ctrl+C を押してください。' -ForegroundColor Yellow"
        echo.