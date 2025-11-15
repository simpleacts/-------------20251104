# ローカル開発環境セットアップガイド

このガイドでは、Xserverと同じ環境をローカル（パソコン上）で構築する方法を説明します。

## 必要なソフトウェア

1. **PHP 7.4以上** (PHP 8.x推奨)
2. **MySQL/MariaDB 5.7以上**
3. **Node.js 18以上** (既にインストール済み)
4. **Composer** (PHP依存関係管理)

## セットアップ手順

### 1. PHPのインストール（Windows）

1. [PHP公式サイト](https://windows.php.net/download/)からPHPをダウンロード
2. 解凍して適切な場所（例: `C:\php`）に配置
3. 環境変数PATHにPHPのパスを追加
4. コマンドプロンプトで確認:
   ```bash
   php -v
   ```

### 2. MySQL/MariaDBのインストール（Windows）

1. [MariaDB公式サイト](https://mariadb.org/download/)からダウンロード
2. インストール時にrootパスワードを設定
3. サービスとして起動

### 3. Composerのインストール

1. [Composer公式サイト](https://getcomposer.org/download/)からダウンロード
2. インストール後、プロジェクトディレクトリで実行:
   ```bash
   composer install
   ```

   **注意**: PHP 8.4を使用している場合、以下のコマンドを使用してください:
   ```bash
   composer install --ignore-platform-reqs
   ```
   
   また、PHPの`gd`拡張機能を有効化する必要があります（詳細は`docs/PHP_EXTENSIONS_SETUP.md`を参照）

### 4. データベースのセットアップ

#### 4.1 MySQL/MariaDBに接続

データベースに接続する方法は複数あります。詳細は`docs/DATABASE_CONNECTION_GUIDE.md`を参照してください。

**簡単な方法（コマンドライン）**:
```bash
mysql -u root -p
```
パスワードを入力して接続します。

**GUIツールを使用する場合**:
- MySQL Workbench（推奨）
- HeidiSQL
- phpMyAdmin

詳細は`docs/DATABASE_CONNECTION_GUIDE.md`を参照してください。

#### 4.2 データベースの作成

接続後、以下のSQLコマンドを実行:

```sql
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4.3 ユーザーの作成と権限付与

```sql
CREATE USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
FLUSH PRIVILEGES;
```

**注意**: 
- `your_password_here`を実際のパスワードに置き換えてください
- 本番環境と同じパスワードを使用する必要はありません
- ローカル環境では簡単なパスワードでも問題ありません

#### 4.4 データベースの初期化

プロジェクトの`scripts`ディレクトリにあるSQLファイルを実行:

```bash
# データベースセットアップSQLを実行
mysql -u simpleacts_quote -p simpleacts_quotenassen < scripts/database_setup.sql

# または、distディレクトリのSQLファイルを使用
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

### 5. 設定ファイルの設定

`templates/server_config.csv`を編集して、ローカル環境の設定に変更:

```csv
key,value
APP_BASE_URL,"http://localhost:8000"
SMTP_HOST,"localhost"
SMTP_PORT,"587"
SMTP_USER,""
SMTP_PASSWORD,""
SMTP_SECURE,"false"
MAIL_FROM_ADDRESS,"test@localhost"
MAIL_FROM_NAME,"ローカル開発環境"
ADMIN_EMAIL,"admin@localhost"
DB_HOST,"localhost"
DB_NAME,"simpleacts_quotenassen"
DB_USER,"simpleacts_quote"
DB_PASSWORD,"JObZSnpkxytf9cIp"
DB_TYPE,"MariaDB"
```

### 6. PHP開発サーバーの起動

プロジェクトのルートディレクトリで、以下のコマンドを実行:

```bash
# PHP開発サーバーを起動（ポート8000）
php -S localhost:8000
```

または、Apache/Nginxを使用する場合は、ドキュメントルートをプロジェクトのルートディレクトリに設定してください。

### 7. フロントエンドのビルドと起動

別のターミナルで、以下のコマンドを実行:

```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発モードで起動
npm run dev
```

または、ビルド済みのファイルを使用する場合:

```bash
# ビルド
npm run build

# ビルド済みファイルで起動
npm run dev:dist
```

### 8. ブラウザでアクセス

ブラウザで以下のURLにアクセス:

```
http://localhost:8000
```

## トラブルシューティング

### PHPエラーが表示される場合

1. `php.ini`でエラー表示を有効化:
   ```ini
   display_errors = On
   error_reporting = E_ALL
   ```

2. PHPの拡張機能が有効になっているか確認:
   - `pdo_mysql`
   - `mbstring`
   - `json`

### データベース接続エラーが発生する場合

1. MySQL/MariaDBサービスが起動しているか確認
2. `templates/server_config.csv`の設定が正しいか確認
3. データベースユーザーの権限を確認

### CORSエラーが発生する場合

PHPのAPIファイルでCORSヘッダーが正しく設定されているか確認してください。`api/db_connect.php`や各APIファイルでCORS設定を確認してください。

## 本番環境との違い

- **URL**: `https://www.nassenbrothers.com` → `http://localhost:8000`
- **データベース**: 本番環境のデータベースとは別のローカルデータベースを使用
- **メール送信**: ローカル環境ではメール送信機能は動作しません（SMTP設定が必要）

## データのインポート

本番環境のデータをローカル環境にインポートする場合:

1. 本番環境からデータベースをエクスポート
2. ローカル環境のデータベースにインポート

```bash
# エクスポート
mysqldump -u simpleacts_quote -p simpleacts_quotenassen > backup.sql

# インポート
mysql -u simpleacts_quote -p simpleacts_quotenassen < backup.sql
```

## 開発モードの切り替え

アプリケーションには2つのモードがあります:

1. **liveモード**: PHP APIを使用してデータベースからデータを取得
2. **csv-debugモード**: CSVファイルからデータを読み込む（データベース不要）

モードの切り替えは、ブラウザの開発者ツールのコンソールで:

```javascript
// liveモードに切り替え
localStorage.setItem('appMode', 'live');

// csv-debugモードに切り替え
localStorage.setItem('appMode', 'csv-debug');

// ページをリロード
location.reload();
```

## 次のステップ

- データベースのバックアップとリストア
- 本番環境へのデプロイ方法
- 開発時のベストプラクティス

