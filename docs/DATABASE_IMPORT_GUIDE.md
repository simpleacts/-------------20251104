# データベーステーブルのインポート方法

## インポート方法の選択

データベースにテーブル構造とデータをインポートする方法はいくつかあります。

## 方法1: SQLファイルからインポート（推奨）

### ステップ1: データベースに接続

```bash
mysql -u root -p
```

### ステップ2: データベースを選択

```sql
USE simpleacts_quotenassen;
```

### ステップ3: SQLファイルを実行

#### テーブル構造の作成

```sql
SOURCE C:/Users/yosuke/Downloads/プリント屋バックオフィス-20251104/プリント屋バックオフィス-20251104/dist/database_setup.sql.txt;
```

または、コマンドラインから直接実行：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

#### データのインポート

```sql
SOURCE C:/Users/yosuke/Downloads/プリント屋バックオフィス-20251104/プリント屋バックオフィス-20251104/dist/database_data_import.sql;
```

または、コマンドラインから直接実行：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
```

### ステップ4: 接続を終了

```sql
exit;
```

## 方法2: コマンドラインから直接インポート

プロジェクトのルートディレクトリから：

```bash
# テーブル構造の作成
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt

# データのインポート
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
```

**注意**: パスワードを入力する必要があります。

## 方法3: ツール依存性の設定

ツール依存性管理の設定をインポートする場合：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < scripts/setup-all-tool-dependencies-full-access.sql
```

このスクリプトは、全てのツールと全てのテーブルに対して完全なアクセス権限を設定します。

## 方法4: CSVファイルからインポート（手動）

CSVファイルからデータをインポートする場合、以下の方法があります：

### 4.1 MySQL Workbenchを使用

1. MySQL Workbenchでデータベースに接続
2. テーブルを右クリック → 「Table Data Import Wizard」
3. CSVファイルを選択してインポート

### 4.2 LOAD DATA INFILEを使用（MySQL/MariaDBコマンド）

```sql
LOAD DATA LOCAL INFILE 'C:/Users/yosuke/Downloads/プリント屋バックオフィス-20251104/プリント屋バックオフィス-20251104/templates/common/manufacturers.csv'
INTO TABLE manufacturers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

**注意**: `LOAD DATA LOCAL INFILE`を使用するには、MySQL/MariaDBの設定で`local_infile`が有効になっている必要があります。

## インポートの順序

推奨されるインポート順序：

1. **テーブル構造の作成**
   ```bash
   mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
   ```

2. **基本データのインポート**
   ```bash
   mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
   ```

3. **ツール依存性の設定（オプション）**
   ```bash
   mysql -u simpleacts_quote -p simpleacts_quotenassen < scripts/setup-all-tool-dependencies-full-access.sql
   ```

## インポートの確認

インポートが成功したか確認：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

```sql
-- テーブル一覧を表示
SHOW TABLES;

-- 特定のテーブルのデータ数を確認
SELECT COUNT(*) FROM manufacturers;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM tool_dependencies;
```

## トラブルシューティング

### エラー: "Table doesn't exist"

テーブルが存在しない場合は、まずテーブル構造を作成してください：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

### エラー: "Access denied"

データベースユーザーの権限を確認：

```sql
SHOW GRANTS FOR 'simpleacts_quote'@'localhost';
```

権限が不足している場合：

```sql
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
FLUSH PRIVILEGES;
```

### エラー: "File not found"

SQLファイルのパスを確認してください。相対パスではなく、絶対パスを使用することを推奨します。

### エラー: "Duplicate entry"

既にデータが存在する場合、以下のいずれかを実行：

1. **既存のデータを削除してからインポート**
   ```sql
   TRUNCATE TABLE table_name;
   ```

2. **既存のデータを保持してインポート（重複をスキップ）**
   - SQLファイルを編集して、`INSERT`を`INSERT IGNORE`に変更

## 本番環境からのデータインポート

本番環境のデータをローカル環境にインポートする場合：

### ステップ1: 本番環境からエクスポート

```bash
mysqldump -u username -p database_name > backup.sql
```

### ステップ2: ローカル環境にインポート

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < backup.sql
```

## まとめ

1. **テーブル構造**: `dist/database_setup.sql.txt`を実行
2. **データ**: `dist/database_data_import.sql`を実行
3. **ツール依存性**: `scripts/setup-all-tool-dependencies-full-access.sql`を実行（オプション）

これで、ローカル環境のデータベースがセットアップされます。

