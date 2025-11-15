# 不足しているテーブルの解決方法

## エラー内容

以下のテーブルが不足しているというエラーが発生しています：

- `brands`
- `colors`
- `sizes`
- `payment_methods`

## 原因

これらのテーブルは**メーカー依存テーブル**の可能性があります。メーカー依存テーブルは、メーカーID付きのテーブル名（例: `colors_manu_0001`）として存在します。

**注意**: `payment_methods`はメーカー非依存テーブルですが、エラーメッセージには含まれています。実際には`brands`、`colors`、`sizes`が不足している可能性が高いです。

## 解決方法

### ステップ1: データベースの状態を確認

データベースに接続して、テーブルの存在を確認：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

確認用SQLスクリプトを実行：

```sql
SOURCE C:/Users/yosuke/Downloads/プリント屋バックオフィス-20251104/プリント屋バックオフィス-20251104/scripts/check-missing-tables.sql;
```

または、手動で確認：

```sql
-- メーカー一覧を確認
SELECT * FROM manufacturers;

-- colorsテーブル（メーカー依存）を確認
SHOW TABLES LIKE 'colors_%';

-- sizesテーブル（メーカー依存）を確認
SHOW TABLES LIKE 'sizes_%';

-- brandsテーブル（メーカー依存）を確認
SHOW TABLES LIKE 'brands_%';

-- payment_methodsテーブルを確認（メーカー非依存）
SHOW TABLES LIKE 'payment_methods';

exit;
```

### ステップ2: 不足しているテーブルをインポート

#### 方法1: データインポートSQLを実行

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
```

このSQLファイルには、メーカー依存テーブルのデータも含まれています。

#### 方法2: テーブル構造のみ作成（データなし）

テーブル構造が存在しない場合：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt
```

### ステップ3: メーカー依存テーブルの確認

メーカー依存テーブルが正しく作成されているか確認：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

```sql
-- メーカーIDを確認
SELECT id, name FROM manufacturers;

-- メーカー依存テーブルの一覧を確認
SHOW TABLES LIKE 'colors_%';
SHOW TABLES LIKE 'sizes_%';
SHOW TABLES LIKE 'brands_%';
SHOW TABLES LIKE 'products_master_%';

exit;
```

### ステップ4: メーカーが存在しない場合

メーカーが存在しない場合、まずメーカーを作成する必要があります：

```sql
INSERT INTO manufacturers (id, name) VALUES ('manu_0001', 'メーカー1');
```

その後、メーカー依存テーブルが自動的に作成されるか、手動で作成する必要があります。

## クイックフィックス

### 全てのテーブルを再インポート

既存のデータを削除して、全てのテーブルを再インポート：

```bash
# データベースを削除して再作成
mysql -u root -p
```

```sql
DROP DATABASE IF EXISTS simpleacts_quotenassen;
CREATE DATABASE simpleacts_quotenassen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON simpleacts_quotenassen.* TO 'simpleacts_quote'@'localhost';
FLUSH PRIVILEGES;
exit;
```

```bash
# テーブル構造を作成
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_setup.sql.txt

# データをインポート
mysql -u simpleacts_quote -p simpleacts_quotenassen < dist/database_data_import.sql
```

## 確認方法

インポート後、以下のコマンドで確認：

```bash
mysql -u simpleacts_quote -p simpleacts_quotenassen
```

```sql
-- メーカー一覧
SELECT * FROM manufacturers;

-- メーカー依存テーブルの確認
SHOW TABLES LIKE 'colors_%';
SHOW TABLES LIKE 'sizes_%';
SHOW TABLES LIKE 'brands_%';

-- 各テーブルのデータ数を確認
SELECT 'colors_manu_0001' AS table_name, COUNT(*) AS count FROM colors_manu_0001
UNION ALL
SELECT 'sizes_manu_0001', COUNT(*) FROM sizes_manu_0001
UNION ALL
SELECT 'brands_manu_0001', COUNT(*) FROM brands_manu_0001;

exit;
```

## 注意事項

- `brands`、`colors`、`sizes`はメーカー依存テーブルです
- メーカーID（例: `manu_0001`）が存在する必要があります
- メーカー依存テーブルは、`{table_name}_{manufacturer_id}`形式で存在します

