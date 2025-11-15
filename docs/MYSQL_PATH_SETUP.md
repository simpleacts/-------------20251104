# MySQL/MariaDB PATH設定ガイド

## エラー: "mysql は、コマンドレット...として認識されません"

このエラーは、MySQL/MariaDBのコマンドラインツールがPATH環境変数に追加されていないことを示しています。

## 現在の状況

システム環境変数に以下が登録されている場合：
- `C:\ProgramData\ComposerSetup\bin` (Composer)
- `C:\php` (PHP)

これらは正しく設定されています。MySQL/MariaDBのbinディレクトリを追加する必要があります。

## 解決方法

### 方法1: 完全パスで実行（一時的な解決策）

MySQL/MariaDBがインストールされている場合、完全パスで実行できます。

#### MariaDBの場合

通常のインストール場所（バージョンによって異なります）：
```bash
C:\Program Files\MariaDB 12.0\bin\mysql.exe -u root -p
```

または
```bash
"C:\Program Files\MariaDB 12.0\bin\mysql.exe" -u root -p
```

**注意**: バージョン番号（12.0）が含まれている場合があります。

#### MySQLの場合

通常のインストール場所：
```bash
C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe -u root -p
```

または
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

### 方法2: PATH環境変数に追加（推奨・永続的な解決策）

#### ステップ1: MySQL/MariaDBのインストール場所を確認

1. **エクスプローラーで確認**
   - `C:\Program Files\MariaDB\bin` を確認
   - または `C:\Program Files\MySQL\MySQL Server 8.0\bin` を確認

2. **コマンドで確認**
   ```powershell
   Get-ChildItem "C:\Program Files" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue
   ```
   または
   ```powershell
   Get-ChildItem "C:\Program Files" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue
   ```

#### ステップ2: PATH環境変数に追加

1. **Windowsの設定を開く**
   - Windowsキー + X を押す
   - 「システム」を選択
   - または、設定 → システム → 詳細情報

2. **環境変数を開く**
   - 「システムの詳細設定」をクリック
   - 「環境変数」ボタンをクリック

3. **PATHを編集**
   - 「システム環境変数」セクションで「Path」を選択
   - 「編集」ボタンをクリック

4. **新しいパスを追加**
   - 「新規」ボタンをクリック
   - 以下のいずれかを追加：
     - MariaDBの場合: `C:\Program Files\MariaDB\bin`
     - MySQLの場合: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
   - 「OK」をクリックしてすべてのダイアログを閉じる

5. **新しいPowerShell/コマンドプロンプトを開く**
   - 既存のウィンドウは閉じて、新しいウィンドウを開く
   - これにより、新しいPATH設定が読み込まれます

6. **確認**
   ```bash
   mysql --version
   ```
   または
   ```bash
   where mysql
   ```

### 方法3: PowerShellで一時的にPATHに追加

現在のセッションのみ有効な方法：

```powershell
$env:Path += ";C:\Program Files\MariaDB\bin"
```

または

```powershell
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

その後、同じPowerShellウィンドウで：
```bash
mysql -u root -p
```

### 方法4: MySQL/MariaDBを再インストール

PATH設定が面倒な場合、MySQL/MariaDBを再インストールして、インストール時に「Add to PATH」オプションを選択することもできます。

## インストールされているか確認

MySQL/MariaDBがインストールされているか確認：

### 方法1: サービスを確認

```powershell
Get-Service | Where-Object {$_.Name -like "*mysql*" -or $_.Name -like "*mariadb*"}
```

### 方法2: プログラム一覧を確認

1. 設定 → アプリ → アプリと機能
2. 「MySQL」または「MariaDB」を検索

### 方法3: ファイルシステムで確認

エクスプローラーで以下を確認：
- `C:\Program Files\MariaDB`
- `C:\Program Files\MySQL`

## インストールされていない場合

MySQL/MariaDBがインストールされていない場合は、インストールが必要です：

1. [MariaDB公式サイト](https://mariadb.org/download/)からダウンロード
2. インストール時に「Add to PATH」オプションを選択
3. rootパスワードを設定

## まとめ

- **一時的な解決策**: 完全パスで実行
- **永続的な解決策**: PATH環境変数に追加
- **最も簡単**: MySQL/MariaDBを再インストールして「Add to PATH」を選択

## 次のステップ

PATH設定が完了したら、以下のコマンドで接続できます：

```bash
mysql -u root -p
```

