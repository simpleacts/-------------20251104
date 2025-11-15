# MySQL/MariaDB 接続ガイド

## 接続方法の選択

MySQL/MariaDBに接続する方法はいくつかあります。用途に応じて選択してください。

## 方法1: コマンドライン（mysqlコマンド）

### 前提条件

MySQL/MariaDBのコマンドラインツールがインストールされている必要があります。

**重要**: `mysql`コマンドが認識されない場合は、`docs/MYSQL_PATH_SETUP.md`を参照してPATH設定を行ってください。

### 接続手順

1. **コマンドプロンプトまたはPowerShellを開く**
   
   **重要**: コマンドはどのディレクトリからでも実行できます。プロジェクトのルートディレクトリにいる必要はありません。
   
   - プロジェクトのルートディレクトリから実行してもOK
   - デスクトップから実行してもOK
   - どこからでも実行可能です

2. **rootユーザーで接続**（インストール時に設定したパスワードを使用）:
   ```bash
   mysql -u root -p
   ```
   
   `-p`オプションを指定すると、パスワードの入力が求められます。
   
   **注意**: MySQL/MariaDBのコマンドラインツールがPATHに追加されている必要があります。
   インストール時に「Add to PATH」オプションを選択していれば、どこからでも実行できます。

3. **パスワードを入力**
   - インストール時に設定したrootパスワードを入力
   - 入力中は文字が表示されません（正常です）

4. **接続成功**
   - 以下のようなプロンプトが表示されれば成功です：
   ```
   Welcome to the MariaDB monitor.  Commands end with ; or \g.
   Your MariaDB connection id is 123
   Server version: 10.x.x-MariaDB
   
   Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.
   
   Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
   
   MariaDB [(none)]>
   ```

### データベースの作成とユーザー設定

接続後、以下のSQLコマンドを実行：

```sql
-- データベースの作成
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ユーザーの作成
CREATE USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'your_password_here';

-- 権限の付与
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';

-- 権限の反映
FLUSH PRIVILEGES;

-- 確認
SHOW DATABASES;
```

### 接続の終了

```sql
exit;
```
または
```sql
quit;
```

## 方法2: MySQL Workbench（GUIツール）

### インストール

1. [MySQL Workbench公式サイト](https://dev.mysql.com/downloads/workbench/)からダウンロード
2. インストール

### 接続手順

1. **MySQL Workbenchを起動**

2. **新しい接続を作成**
   - 「MySQL Connections」の横の「+」ボタンをクリック

3. **接続情報を入力**
   - **Connection Name**: 任意の名前（例: "Local Development"）
   - **Hostname**: `localhost` または `127.0.0.1`
   - **Port**: `3306`（デフォルト）
   - **Username**: `root`
   - **Password**: 「Store in Keychain」をクリックしてパスワードを保存

4. **接続をテスト**
   - 「Test Connection」ボタンをクリック
   - 成功メッセージが表示されればOK

5. **接続**
   - 「OK」をクリックして保存
   - 接続一覧から接続をダブルクリック

### データベースの作成（MySQL Workbench）

1. 接続後、左側の「SCHEMAS」パネルで右クリック
2. 「Create Schema」を選択
3. 以下の情報を入力：
   - **Name**: `simpleacts_quotenassen`
   - **Charset**: `utf8mb4`
   - **Collation**: `utf8mb4_unicode_ci`
4. 「Apply」をクリック

### ユーザーの作成（MySQL Workbench）

1. 上部メニューから「Server」→「Users and Privileges」を選択
2. 「Add Account」をクリック
3. 以下の情報を入力：
   - **Login Name**: `simpleacts_quote`
   - **Authentication**: `Standard`
   - **Password**: パスワードを設定
4. 「Administrative Roles」タブで権限を設定
5. 「Schema Privileges」タブで：
   - 「Add Entry」をクリック
   - 「Selected schema」で`simpleacts_quotenassen`を選択
   - 「Select "ALL"」をクリック
   - 「Apply」をクリック

## 方法3: phpMyAdmin（Webベース）

### インストール

1. [phpMyAdmin公式サイト](https://www.phpmyadmin.net/downloads/)からダウンロード
2. PHPのWebサーバー（Apache/Nginx）が必要です

### セットアップ

1. **phpMyAdminを解凍**
   - Webサーバーのドキュメントルート（例: `C:\Apache\htdocs`）に配置

2. **設定ファイルの編集**
   - `config.inc.php`を編集して接続情報を設定

3. **ブラウザでアクセス**
   - `http://localhost/phpmyadmin`

## 方法4: HeidiSQL（Windows専用GUIツール）

### インストール

1. [HeidiSQL公式サイト](https://www.heidisql.com/download.php)からダウンロード
2. インストール（ポータブル版も利用可能）

### 接続手順

1. **HeidiSQLを起動**

2. **新しいセッションを作成**
   - 「新規」ボタンをクリック

3. **接続情報を入力**
   - **ネットワークタイプ**: `MySQL (TCP/IP)`
   - **ホスト名 / IP**: `localhost` または `127.0.0.1`
   - **ユーザー**: `root`
   - **パスワード**: rootパスワードを入力
   - **ポート**: `3306`

4. **接続**
   - 「開く」ボタンをクリック

## 接続できない場合のトラブルシューティング

### エラー: "Access denied for user"

**原因**: ユーザー名またはパスワードが間違っている

**解決方法**:
1. パスワードを確認
2. ユーザー名を確認（大文字小文字を区別）
3. 必要に応じてパスワードをリセット

### エラー: "Can't connect to MySQL server"

**原因**: MySQL/MariaDBサービスが起動していない

**解決方法**:
1. Windowsのサービス管理を開く（`services.msc`）
2. 「MySQL」または「MariaDB」サービスを探す
3. サービスを右クリックして「開始」を選択

または、コマンドラインから：
```bash
net start MySQL
```
または
```bash
net start MariaDB
```

### エラー: "Unknown database"

**原因**: データベースが存在しない

**解決方法**:
1. データベースを作成（上記の手順を参照）
2. データベース名のスペルを確認

## 推奨ツール

- **初心者**: MySQL Workbench または HeidiSQL
- **コマンドラインに慣れている人**: mysqlコマンド
- **Webベースで管理したい人**: phpMyAdmin

## 次のステップ

データベースに接続できたら、以下の手順を実行：

1. データベースの作成
2. ユーザーの作成と権限設定
3. `templates/server_config.csv`の編集
4. データベースの初期化（SQLファイルの実行）

詳細は`docs/LOCAL_DEVELOPMENT_SETUP.md`を参照してください。

