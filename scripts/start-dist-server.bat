@echo off
chcp 65001 >nul
REM Start PHP Development Server with dist directory as document root

echo ========================================
echo Starting Local Development Server (dist)
echo ========================================
echo.

REM Check if PHP is available
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP is not installed or not in PATH.
    echo Please install PHP and add it to your PATH environment variable.
    echo Download PHP from: https://windows.php.net/download/
    echo.
    pause
    exit /b 1
)

REM Check if dist directory exists
if not exist "dist" (
    echo ERROR: dist directory not found.
    echo Please run 'npm run build' first to build the application.
    echo.
    pause
    exit /b 1
)

REM Check if port 8000 is available
echo Checking if port 8000 is available...
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 8000 is already in use.
    echo Using port 8080 instead...
    set PORT=8080
) else (
    set PORT=8000
)

REM Start PHP development server with dist as document root
echo Starting PHP development server (port %PORT%, document root: dist)...
start "PHP Server (dist)" cmd /k "php -S localhost:%PORT% -t dist"

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Open browser
echo Opening http://localhost:%PORT% in browser...
start http://localhost:%PORT%

echo.
echo Server started successfully.
echo Document root: dist
echo To stop the server, close the PHP Server window.
echo.
pause

