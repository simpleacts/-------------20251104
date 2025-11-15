# プリント単価表管理 - データ読み込み問題の修正

## 問題の原因

プリント単価表管理がデータを読み込めない問題には、以下の3つの原因がありました：

### 1. APIのホワイトリスト不足
- **`api/pricing-manager-data.php`**: `print_pricing_schedules`のみホワイトリストに含まれていましたが、実際には`print_pricing_tiers`、`users`、`roles`も必要でした
- **`api/pricing-assistant-data.php`**: `category_pricing_schedules`のみホワイトリストに含まれていましたが、他の多くのテーブルが必要でした

### 2. データ読み込み処理の欠如
- `PricingManagerPage.tsx`と`PricingAssistantPage.tsx`には、データを読み込むための`useEffect`処理がありませんでした

### 3. データベーススキーマの型不一致
- `print_pricing_schedules`と`print_pricing_tiers`テーブルの`id`フィールドが`INT AUTO_INCREMENT`として定義されていましたが、JavaScriptコードでは文字列ID（例：`ppsc_${Date.now()}`）を使用していました

## 修正内容

### ✅ 1. APIホワイトリストの更新

**`api/pricing-manager-data.php`**
```php
$all_tables_whitelist = [
    'print_pricing_schedules',
    'print_pricing_tiers',    // 追加
    'users',                   // 追加
    'roles'                    // 追加
];
```

**`api/pricing-assistant-data.php`**
```php
$all_tables_whitelist = [
    'category_pricing_schedules',
    'customer_groups',         // 追加
    'manufacturers',           // 追加
    'categories',              // 追加
    'pricing_rules',           // 追加
    'print_pricing_schedules', // 追加
    'pricing_assignments',     // 追加
    // 基本料金設定で使用するテーブル
    'plate_costs',                          // 追加
    'special_ink_costs',                    // 追加
    'additional_print_costs_by_size',       // 追加
    'additional_print_costs_by_location',   // 追加
    'additional_print_costs_by_tag',        // 追加
    'shipping_costs',                       // 追加
    'tags'                                  // 追加
];
```

### ✅ 2. データ読み込み処理の追加

**`src/features/pricing-management/pages/PricingManagerPage.tsx`**
- `useEffect`でデータ読み込み処理を追加
- ローディング状態とエラー表示を実装

**`src/features/pricing-management/pages/PricingAssistantPage.tsx`**
- `useEffect`でデータ読み込み処理を追加
- ローディング状態とエラー表示を実装
- 基本料金設定で使用する7つのテーブル（`plate_costs`, `special_ink_costs`, `additional_print_costs_by_size`, `additional_print_costs_by_location`, `additional_print_costs_by_tag`, `shipping_costs`, `tags`）をrequiredTablesに追加

**`src/features/task-settings/pages/TaskSettingsPage.tsx`**
- `useEffect`でデータ読み込み処理を追加
- ローディング状態とエラー表示を実装
- 必要な5つのテーブル（`task_master`, `task_generation_rules`, `task_time_settings`, `time_units`, `calculation_logic_types`）をrequiredTablesに追加

### ✅ 3. データベーススキーマの修正

**修正したファイル:**
- `templates/database_setup.sql.txt`
- `dist/database_setup.sql.txt`

**変更内容:**
```sql
-- 修正前
CREATE TABLE `print_pricing_schedules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  ...
);

CREATE TABLE `print_pricing_tiers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schedule_id` INT,
  ...
);

-- 修正後
CREATE TABLE `print_pricing_schedules` (
  `id` VARCHAR(255) NOT NULL,
  ...
);

CREATE TABLE `print_pricing_tiers` (
  `id` VARCHAR(255) NOT NULL,
  `schedule_id` VARCHAR(255),
  ...
);
```

### ✅ 4. データベース移行スクリプトの作成

`scripts/fix-pricing-tables-schema.sql`を作成しました。このスクリプトは：
- 既存のテーブルをバックアップ
- 新しいスキーマでテーブルを再作成
- データ移行の手順を含む

## 次に行うべきこと

### 🔧 データベースの修正（重要）

既存のデータベースを使用している場合は、以下のスクリプトを実行してください：

```bash
# MySQLにログイン
mysql -u ユーザー名 -p データベース名

# スクリプトを実行
source scripts/fix-pricing-tables-schema.sql
```

**注意:** 
- このスクリプトはテーブルを再作成するため、既存データがある場合は注意が必要です
- バックアップテーブル（`_backup`サフィックス）が作成されます
- データを移行する場合は、スクリプト内のINSERT文のコメントを参照してください

### 🧪 テスト手順

1. **データベースの準備**
   - 上記のスクリプトを実行するか、新しい`database_setup.sql.txt`でデータベースを再作成

2. **アプリケーションの起動**
   ```bash
   npm run dev
   ```

3. **プリント単価表管理ページの確認**
   - ページが正常に読み込まれることを確認
   - ローディング表示が表示されることを確認
   - 単価表の一覧が表示されることを確認

4. **新規単価表の作成**
   - 「新規単価表を作成」ボタンをクリック
   - 単価表を作成してデータが保存されることを確認

5. **価格設定アシスタントの確認**
   - 価格設定アシスタントページに移動
   - ウィザードが正常に動作することを確認
   - 基本料金設定タブのすべての項目が表示されることを確認

6. **タスク設定の確認**
   - タスク設定ページに移動
   - タスク一覧が表示されることを確認
   - 時間単位と計算ロジックのドロップダウンが正しく表示されることを確認

## 影響範囲

- ✅ プリント単価表管理ページ
- ✅ 価格設定アシスタントページ（ルール設定・基本料金設定）
- ✅ タスク設定ページ
- ⚠️ `print_pricing_schedules`、`print_pricing_tiers`テーブルを参照する他の機能（もしあれば）

## 備考

- この修正により、プリント単価表管理機能が正常に動作するようになります
- 今後、新しいページを追加する際は、必ずデータ読み込み処理（`useEffect`）を実装してください
- APIのホワイトリストには、ページで使用するすべてのテーブルを含める必要があります

