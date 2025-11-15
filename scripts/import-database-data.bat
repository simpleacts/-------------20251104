@echo off
chcp 65001 >nul
REM Database Data Import Script
REM This script imports data into the database

echo ========================================
echo Database Data Import
echo ========================================
echo.

echo [1/2] Importing table structure...
echo Please enter password (cj708d) when prompted:
echo.

mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Table structure import failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Importing data...
echo Please enter password (cj708d) when prompted:
echo.

mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Data import failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Import completed!
echo ========================================
echo.
pause

