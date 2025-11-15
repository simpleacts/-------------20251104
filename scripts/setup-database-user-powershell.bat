@echo off
chcp 65001 >nul
REM Database and User Setup Script for PowerShell
REM This script sets up the database and user with proper permissions

echo ========================================
echo Database and User Setup
echo ========================================
echo.

echo [1/2] Setting up database and user...
echo Please enter MariaDB root password when prompted:
echo.

mysql -u root -p < scripts/setup-database-user.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database setup failed.
    echo Please check your root password and try again.
    pause
    exit /b 1
)

echo.
echo [2/2] Verifying setup...
echo.

mysql -u root -p -e "SHOW GRANTS FOR 'simpleacts_quote'@'localhost';"

echo.
echo ========================================
echo Setup completed!
echo ========================================
echo.
echo You can now connect using:
echo   mysql -u simpleacts_quote -p simpleacts_quotenassen
echo.
echo Password: cj708d
echo.
pause

