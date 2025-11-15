# データベースアクセス権限エラーの解決方法

## エラー内容

```
ERROR 1044 (42000): Access denied for user 'simpleacts_quote'@'localhost' to database 'simpleacts_quotenassen'
```

このエラーは、`simpleacts_quote`ユーザーが`simpleacts_quotenassen`データベースにアクセスする権限がないことを示しています。

## 解決方法

### ステップ1: rootユーザーでデータベースに接続

```bash
mysql -u root -p
```

パスワードを入力します（MariaDBのrootパスワード）。

### ステップ2: データベースの存在を確認

```sql
SHOW DATABASES;
```

`simpleacts_quotenassen`が存在するか確認してください。

### ステップ3: データベースが存在しない場合

データベースを作成：

```sql
CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ステップ4: ユーザーの存在を確認

```sql
SELECT User, Host FROM mysql.user WHERE User = 'simpleacts_quote';
```

ユーザーが存在しない場合は、次のステップで作成します。

### ステップ5: ユーザーが存在しない場合

ユーザーを作成し、権限を付与：

```sql
-- ユーザーを作成（パスワードは適宜変更してください）
CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost' IDENTIFIED BY 'your_password_here';

-- データベースへの全権限を付与
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';

-- 権限を反映
FLUSH PRIVILEGES;
```

**注意**: `your_password_here`を実際のパスワードに置き換えてください。既存のパスワードがわからない場合は、新しいパスワードを設定してください。

### ステップ6: ユーザーが存在するが権限がない場合

既存のユーザーに権限を付与：

```sql
-- データベースへの全権限を付与
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';

-- 権限を反映
FLUSH PRIVILEGES;
```

### ステップ7: 接続を終了

```sql
exit;
```

### ステップ8: 再度接続を試す

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

パスワードを入力して、接続できるか確認してください。

## クイックセットアップ（全てを一括で実行）

### 方法1: SQLスクリプトを使用（推奨）

プロジェクトのルートディレクトリから：

```bash
mysql -u root -p < scripts/setup-database-user.sql
```

### 方法2: 手動でSQLを実行

rootユーザーで接続後、以下のSQLを実行：

```sql
-- データベースを作成
CREATE DATABASE IF NOT EXISTS simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ユーザーを作成（パスワードは server_config.csv の DB_PASSWORD に合わせてください）
CREATE USER IF NOT EXISTS 'simpleacts_quote'@'localhost' IDENTIFIED BY 'cj708d';

-- 権限を付与
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';

-- 権限を反映
FLUSH PRIVILEGES;

-- 確認
SHOW GRANTS FOR 'simpleacts_quote'@'localhost';

exit;
```

**注意**: パスワード`cj708d`は`templates/server_config.csv`の`DB_PASSWORD`に合わせています。異なるパスワードを使用している場合は、適宜変更してください。

## パスワードがわからない場合

既存のパスワードがわからない場合は、新しいパスワードを設定：

```sql
-- rootユーザーで接続
mysql -u root -p

-- パスワードを変更
ALTER USER 'simpleacts_quote'@'localhost' IDENTIFIED BY 'new_password_here';

-- 権限を反映
FLUSH PRIVILEGES;

exit;
```

その後、新しいパスワードで接続してください。

## 確認方法

接続が成功したら、以下のコマンドで確認：

```sql
-- 現在のデータベースを確認
SELECT DATABASE();

-- テーブル一覧を確認
SHOW TABLES;

exit;
```

