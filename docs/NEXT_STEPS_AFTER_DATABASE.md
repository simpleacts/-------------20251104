# データベース設定後の次のステップ

## 現在の状況

✅ PHPがインストール済み  
✅ Composerがインストール済み  
✅ mPDFがインストール済み  
✅ MySQL/MariaDBがインストール済み  
✅ PATH設定が完了  
✅ mysqlコマンドが動作確認済み  

## 次のステップ

### ステップ1: データベースとユーザーの作成

まだ作成していない場合、以下のコマンドでデータベースに接続：

```bash
mysql -u root -p
```

**重要**: パスワードを入力すると、`MariaDB [(none)]>`というプロンプトが表示されます。このプロンプトが表示されたら、以下のSQLコマンドを**1つずつ**実行してください。

接続後、以下のSQLコマンドを**1つずつ**実行（各コマンドの後にEnterキーを押す）：

```sql
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```sql
CREATE USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'your_password_here';
```

```sql
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
```

```sql
FLUSH PRIVILEGES;
```

確認：

```sql
SHOW DATABASES;
```

接続を終了：

```sql
exit;
```

**注意**: 
- 各SQLコマンドの末尾にセミコロン（`;`）が必要です
- PowerShellで直接SQLコマンドを実行することはできません
- `mysql`コマンドに接続してから実行してください

詳細は`docs/EXECUTE_SQL_COMMANDS.md`を参照してください。

### ステップ2: 設定ファイルの編集

`templates/server_config.csv`を開いて、ローカル環境の設定に変更：

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
DB_PASSWORD,"your_password_here"
DB_TYPE,"MariaDB"
```

**重要**: `DB_PASSWORD`をステップ1で設定したパスワードに変更してください。

### ステップ3: データベースの初期化（オプション）

データベースのテーブル構造を初期化する場合：

```bash
# プロジェクトのルートディレクトリから実行
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

または、`scripts`ディレクトリにSQLファイルがある場合：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < scripts/database_setup.sql
```

**注意**: SQLファイルが存在しない場合は、このステップはスキップできます。アプリケーションは必要に応じてテーブルを作成します。

### ステップ4: アプリケーションのビルド

**重要**: ビルド済みのファイルを使用する場合は、`dist`ディレクトリをドキュメントルートとして起動する必要があります。

#### 最新の変更を反映する場合（再ビルド）

**推奨方法: バッチファイルを使用**
```bash
build.bat
```

このバッチファイルは以下を自動実行します：
1. 実行ポリシーの設定（`Set-ExecutionPolicy RemoteSigned -Scope Process -Force`）
2. `npm install`（依存関係の更新）
3. `npm run build`（アプリケーションのビルド）

**エラーチェック付きビルド（推奨）**
```bash
build-with-check.bat
```

このバッチファイルは、通常のビルドに加えて以下も実行します：
- TypeScriptの構文チェック
- SQLファイルの存在確認
- エラーパターンの解析と対処法の提示

**手動で実行する場合**
```bash
npm run build
```

#### 既存のビルド済みファイルを使用する場合

`dist`ディレクトリに既にビルド済みファイルがある場合は、このステップは不要です。

### ステップ5: ローカルサーバーの起動

#### 方法1: distディレクトリをドキュメントルートとして起動（推奨）

プロジェクトのルートディレクトリで：

```bash
php -S localhost:8080 -t dist
```

`-t dist`オプションで、`dist`ディレクトリをドキュメントルートとして指定します。

#### 方法2: distディレクトリに移動して起動

```bash
cd dist
php -S localhost:8080
```

#### 方法3: スクリプトを使用（推奨）

```bash
scripts\start-dist-server.bat
```

このスクリプトは自動的に`dist`ディレクトリをドキュメントルートとして起動します。

**注意**: ルートディレクトリから起動すると、`index.tsx`を直接読み込もうとしてエラーが発生します。必ず`dist`ディレクトリをドキュメントルートとして起動してください。

### ステップ6: ブラウザでアクセス

サーバーが起動したら、ブラウザで以下のURLにアクセス：

- ポート8000を使用した場合: `http://localhost:8000`
- ポート8080を使用した場合: `http://localhost:8080`

**注意**: ポートを変更した場合、`templates/server_config.csv`の`APP_BASE_URL`も変更する必要があります。

## 動作確認

1. **アプリケーションが起動するか確認**
   - ブラウザで `http://localhost:8000` にアクセス
   - ログイン画面が表示されれば成功

2. **データベース接続を確認**
   - アプリケーション内でデータを表示できるか確認
   - エラーが表示される場合は、`templates/server_config.csv`の設定を確認

## トラブルシューティング

### データベース接続エラーが発生する場合

1. `templates/server_config.csv`の設定を確認
2. データベースとユーザーが正しく作成されているか確認：
   ```bash
   mysql -u root -p
   ```
   ```sql
   SHOW DATABASES;
   SELECT User, Host FROM mysql.user WHERE User = 'simpleacts_quote';
   ```

### PHPエラーが表示される場合

1. PHPの拡張機能（`zip`, `gd`, `mbstring`, `xml`）が有効になっているか確認
2. `php.ini`の設定を確認（`docs/PHP_EXTENSIONS_SETUP.md`を参照）

### ページが表示されない場合

1. PHP開発サーバーが起動しているか確認
2. ポート8000が使用されていないか確認
3. ブラウザのコンソールでエラーを確認

## 開発モードの切り替え

アプリケーションには2つのモードがあります：

1. **liveモード**: PHP APIを使用してデータベースからデータを取得
2. **csv-debugモード**: CSVファイルからデータを読み込む（データベース不要）

モードの切り替えは、ブラウザの開発者ツールのコンソールで：

```javascript
// liveモードに切り替え
localStorage.setItem('appMode', 'live');

// csv-debugモードに切り替え
localStorage.setItem('appMode', 'csv-debug');

// ページをリロード
location.reload();
```

## まとめ

1. ✅ データベースとユーザーを作成
2. ✅ `templates/server_config.csv`を編集
3. ⚙️ データベースの初期化（オプション）
4. ⚙️ アプリケーションのビルド（オプション）
5. 🚀 ローカルサーバーを起動
6. 🌐 ブラウザでアクセス

これで、ローカル開発環境のセットアップが完了です！

