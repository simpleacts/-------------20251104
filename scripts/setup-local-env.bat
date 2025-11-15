@echo off
chcp 65001 >nul
REM Local Development Environment Setup Script (Windows)

echo ========================================
echo Local Development Environment Setup
echo ========================================
echo.

REM Check PHP version
echo [1/6] Checking PHP version...
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PHP is not installed or not in PATH.
    echo Please install PHP and add it to your PATH environment variable.
    echo Download PHP from: https://windows.php.net/download/
    echo.
    pause
    exit /b 1
)
php -v
if %errorlevel% neq 0 (
    echo ERROR: PHP is not working correctly.
    echo Please check your PHP installation.
    pause
    exit /b 1
)
echo.

REM Check and install Composer dependencies
echo [2/6] Installing Composer dependencies...
where composer >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Composer is not installed or not in PATH.
    echo Skipping Composer installation.
    echo Install Composer from: https://getcomposer.org/download/
) else (
    if exist composer.json (
        composer install
        if %errorlevel% neq 0 (
            echo WARNING: Composer installation failed.
            echo Please check if Composer is installed correctly.
        )
    ) else (
        echo WARNING: composer.json not found.
    )
)
echo.

REM Install Node.js dependencies
echo [3/6] Installing Node.js dependencies...
if exist package.json (
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
) else (
    echo ERROR: package.json not found.
    pause
    exit /b 1
)
echo.

REM Check configuration file
echo [4/6] Checking configuration file...
if not exist templates\server_config.csv (
    echo ERROR: templates\server_config.csv not found.
    pause
    exit /b 1
)
echo Configuration file found: templates\server_config.csv
echo.

REM Database connection check (optional)
echo [5/6] Database connection check...
echo NOTE: This step will be skipped if database is not configured.
echo.

REM Build application
echo [6/6] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo WARNING: Build failed. You can still run in development mode.
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Set up database (see docs\LOCAL_DEVELOPMENT_SETUP.md)
echo 2. Edit templates\server_config.csv for local environment settings
echo 3. Start PHP development server: php -S localhost:8000
echo 4. In another terminal: npm run dev
echo 5. Open browser: http://localhost:8000
echo.
pause

