@echo off
REM MySQL/MariaDBのインストール場所を検索するバッチファイル

echo MySQL/MariaDBのインストール場所を検索中...
echo.

REM 一般的なインストール場所を確認
echo 一般的なインストール場所を確認中...
if exist "C:\Program Files\MariaDB\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files\MariaDB\bin
    echo    完全パス: C:\Program Files\MariaDB\bin\mysql.exe
    echo.
)

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo    完全パス: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
    echo.
)

if exist "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files\MySQL\MySQL Server 8.1\bin
    echo    完全パス: C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe
    echo.
)

if exist "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files\MySQL\MySQL Server 8.2\bin
    echo    完全パス: C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe
    echo.
)

if exist "C:\Program Files (x86)\MariaDB\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files (x86)\MariaDB\bin
    echo    完全パス: C:\Program Files (x86)\MariaDB\bin\mysql.exe
    echo.
)

if exist "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    echo [OK] 見つかりました: C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin
    echo    完全パス: C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe
    echo.
)

echo ========================================
echo 次のステップ:
echo 1. 上記で見つかったbinディレクトリのパスをコピー
echo 2. システム環境変数のPathに追加
echo 3. 新しいコマンドプロンプト/PowerShellウィンドウを開いて確認
echo ========================================
echo.

pause

