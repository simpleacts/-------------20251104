# PHP拡張機能セットアップガイド

## 問題

ComposerでmPDFをインストールする際、以下のエラーが発生する場合があります：

```
mpdf/mpdf[v8.2.5, ..., v8.2.6] require ext-gd * -> it is missing from your system.
```

これは、PHPの`gd`拡張機能が有効になっていないことを示しています。

## 解決方法

### 1. PHPの設定ファイル（php.ini）を確認

まず、PHPが使用している設定ファイルの場所を確認します：

```bash
php --ini
```

出力例：
```
Configuration File (php.ini) Path: C:\php
Loaded Configuration File:         C:\php\php.ini
```

### 2. php.iniファイルを編集

1. 上記で表示された`php.ini`ファイルを開く（メモ帳などで編集可能）

2. `gd`拡張機能の行を探す：
   ```ini
   ;extension=gd
   ```

3. 行頭のセミコロン（`;`）を削除して有効化：
   ```ini
   extension=gd
   ```

4. ファイルを保存

### 3. PHPの再起動

- **コマンドプロンプト/PowerShell**: 新しいウィンドウを開く
- **Webサーバー（Apache/Nginx）**: サービスを再起動

### 4. 拡張機能の確認

以下のコマンドで`gd`拡張機能が有効になっているか確認：

```bash
php -m | findstr gd
```

または、より詳細な情報を取得：

```bash
php -i | findstr -i "gd"
```

### 注意: コメントアウトされた行について

`php.ini`ファイルには、セミコロン（`;`）で始まるコメント行が多数あります。例えば：

```ini
; Default: mbstring.http_output_conv_mimetypes=^(text/|application/xhtml\+xml)
```

このような行は**説明やデフォルト値の記載**であり、拡張機能を有効化するものではありません。**そのままにしておいて問題ありません**。

拡張機能を有効化するには、以下のような形式の行を探してください：

```ini
;extension=mbstring
```

この行のセミコロンを削除して：

```ini
extension=mbstring
```

これが拡張機能を有効化する正しい方法です。

## その他の必要な拡張機能

mPDFを使用するために、以下の拡張機能も必要になる場合があります：

- `gd` - 画像処理
- `mbstring` - マルチバイト文字列処理
- `xml` - XML処理
- `zip` - ZIPファイル処理（**Composerで必須**）
- `pdo` - PHP Data Objects（**データベース接続に必須**）
- `pdo_mysql` - PDO MySQLドライバ（**MySQL接続に必須**）

これらも同様に`php.ini`で有効化してください：

```ini
extension=gd
extension=mbstring
extension=xml
extension=zip
extension=pdo
extension=pdo_mysql
```

**重要**: 
- Composerを使用する場合、`zip`拡張機能は**必須**です。ComposerはパッケージをZIP形式でダウンロードするため、`zip`拡張機能がないとエラーが発生します。
- データベース接続には`pdo`と`pdo_mysql`拡張機能が**必須**です。これらがないと、アプリケーションがデータベースに接続できません。

## PDO MySQLドライバのセットアップ

### エラーメッセージ

以下のようなエラーが表示される場合：

```
PDO MySQL driver is not available. Available drivers: none. 
Please install php-pdo-mysql package (or php-mysql on some systems).
```

または

```
Database setup failed: could not find driver
```

これは、PDO MySQLドライバがインストールされていない、または有効になっていないことを示しています。

### 解決方法

#### Windowsの場合

1. **php.iniファイルを編集**
   - `php.ini`ファイルを開く（`php --ini`コマンドで場所を確認）
   - **重要**: まず`pdo`拡張機能を有効化し、その後に`pdo_mysql`を有効化します
   
   **現在の状態を確認:**
   - `extension=pdo_mysql`が有効になっている場合でも、`extension=pdo`の行が存在しないことがあります
   - 以下のような行を探してください：
     ```ini
     extension=pdo_firebird
     extension=pdo_mysql
     ;extension=pdo_odbc
     ;extension=pdo_pgsql
     ;extension=pdo_sqlite
     ```
   
   **修正方法:**
   - `extension=pdo_mysql`の**前**に`extension=pdo`の行を追加してください：
     ```ini
     extension=pdo
     extension=pdo_firebird
     extension=pdo_mysql
     ;extension=pdo_odbc
     ;extension=pdo_pgsql
     ;extension=pdo_sqlite
     ```
   - または、`;extension=pdo`という行があれば、セミコロンを削除：
     ```ini
     extension=pdo
     ```
   - **注意**: `extension=pdo`が`extension=pdo_mysql`より**前に**記述されていることを確認してください

2. **拡張機能のDLLファイルを確認**
   - PHPのインストールディレクトリの`ext`フォルダに以下が存在するか確認：
     - `php_pdo.dll` - PDO拡張機能（**必須**）
     - `php_pdo_mysql.dll` - PDO MySQLドライバ
   - 存在しない場合は、PHPを再インストールするか、拡張機能のDLLをダウンロード

3. **PHPの再起動**
   - コマンドプロンプト/PowerShell: 新しいウィンドウを開く
   - Webサーバー（Apache/Nginx）: サービスを再起動

4. **確認**
   ```bash
   php -m | findstr pdo
   ```
   出力に`pdo`と`pdo_mysql`の**両方**が表示されればOKです。
   
   **`pdo`が表示されない場合**:
   - `php.ini`で`extension=pdo`が有効になっているか再確認
   - `extension_dir`の設定が正しいか確認
   - PHPを再起動

#### Linuxの場合

**Ubuntu/Debian:**
```bash
sudo apt update
# PDO拡張機能とMySQLドライバの両方をインストール
sudo apt install php-pdo php-mysql
```

**CentOS/RHEL:**
```bash
# PDO拡張機能とMySQLドライバの両方をインストール
sudo yum install php-pdo php-mysql
# または（PHP 7.4以降）
sudo dnf install php-pdo php-mysql
```

**確認:**
```bash
php -m | grep pdo
```
出力に`pdo`と`pdo_mysql`の**両方**が表示されればOKです。

#### macOSの場合

Homebrewを使用している場合：
```bash
brew install php
# または既にインストール済みの場合
brew reinstall php
```

確認:
```bash
php -m | grep pdo
```

## トラブルシューティング

### 拡張機能のDLLファイルが見つからない場合

1. PHPのインストールディレクトリに`ext`フォルダがあるか確認
2. `ext`フォルダに必要なDLLファイルが存在するか確認：
   - `php_gd.dll` - GD拡張機能
   - `php_pdo_mysql.dll` - PDO MySQLドライバ
3. 存在しない場合は、PHPを再インストールするか、拡張機能のDLLをダウンロード

### 拡張機能を有効にしても動作しない場合

1. PHPのバージョンと拡張機能のDLLのバージョンが一致しているか確認
2. `php.ini`の`extension_dir`設定を確認：
   ```ini
   extension_dir = "ext"
   ```
   または絶対パス：
   ```ini
   extension_dir = "C:\php\ext"
   ```

### PDO MySQLドライバが有効にならない場合

1. **PDO拡張機能自体が有効になっているか確認**
   - **最も重要**: `pdo_mysql`が表示されても`pdo`が表示されない場合、PDO拡張機能が有効になっていません
   - `php.ini`で`extension=pdo`が有効になっているか確認：
     ```ini
     extension=pdo
     extension=pdo_mysql
     ```
   - `extension=pdo`が`extension=pdo_mysql`より**前に**記述されていることを確認
   - 順序が重要です

2. **PDO拡張機能の確認**
   ```bash
   php -m | findstr pdo
   ```
   - `pdo`が表示されない場合、`extension=pdo`を有効化してください
   - `pdo_mysql`だけが表示される場合は、PDO拡張機能が有効になっていません

3. **利用可能なドライバを確認**
   ```bash
   php -r "print_r(PDO::getAvailableDrivers());"
   ```
   - このコマンドがエラーになる場合、PDO拡張機能が有効になっていません
   - 正常な場合、出力に`mysql`が含まれていればOKです

4. **エラーログを確認**
   - PHPのエラーログ（`error_log`）を確認
   - Webサーバーのエラーログも確認
   - `php_pdo.dll`が見つからないというエラーが出る場合、DLLファイルが存在するか確認

5. **PHPの再インストールを検討**
   - 拡張機能が正しくインストールされていない可能性があります
   - PHPの完全な再インストールを検討してください

## 一時的な回避策

拡張機能を有効化できない場合、Composerのインストール時にプラットフォーム要件を無視することができます：

```bash
composer install --ignore-platform-req=ext-gd
```

ただし、これは一時的な回避策であり、実際にmPDFを使用する際には`gd`拡張機能が必要です。

