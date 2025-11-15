# CSV書き込みモード実装完了報告

**実装日**: 2025年1月  
**対象**: CSV書き込みモード（csv-writable）の完全実装

## 概要

CSV書き込みモード仕様書（`docs/csv-app-mode-spec.md`）に基づき、以下の実装を完了しました：

1. tool_dependencies.csvの棚卸しと更新
2. Routes.tsxのフォールバック定義の更新
3. AppMode切り替えの共通ヘルパ実装
4. 代表的な更新系ツールへのAppMode分岐実装
5. CIワークフローの設定

## 実装内容詳細

### 1. tool_dependencies.csvの棚卸しと更新

#### 実施内容
- `templates/` 配下のCSVファイル一覧と `tool_dependencies.csv` を比較
- 不足しているテーブルと不要なテーブルを洗い出し

#### 結果
- **追加したテーブル**: 20件
  - 不足していたテーブル: 8件（invoice_parsing_templates, size_order_master, email_general_settings, bill_items, print_location_metrics, google_fonts, icons, mobile_tool_mappings）
  - 不足していた言語設定テーブル: 8件（language_settings_accounting, language_settings_ai_task_management, language_settings_document, language_settings_id_manager, language_settings_module_catalog, language_settings_pricing_management, language_settings_shipping_logic_tool, language_settings_silkscreen）
  - その他: 4件

- **削除したテーブル**: 106件
  - stockテーブルに統合されたテーブル（colors, sizes, product_colors, product_details, product_price_group_items, product_price_groups, product_prices, product_tags, products_master, importer_mappings, incoming_stock, skus, stock, stock_history, product_color_sizes, product_sizes）

#### 作成したスクリプト
- `scripts/check-tool-dependencies.js` - CSVファイルとtool_dependencies.csvの比較スクリプト
- `scripts/update-tool-dependencies.js` - tool_dependencies.csvの自動更新スクリプト

#### ファイル
- `templates/system/tool_dependencies.csv` - 更新済み

### 2. Routes.tsxのフォールバック定義の更新

#### 実施内容
- `src/core/config/Routes.tsx` の `getRequiredTablesForPageManual()` 関数を更新
- tool_dependencies.csvに追加されたテーブルをフォールバック定義に反映

#### 更新内容
- `accounts-payable`, `accounts-receivable`, `cash-flow-analysis`: `bill_items` を追加
- `data-io`: `invoice_parsing_templates` を追加（`importer_mappings` は削除済み）
- `email-settings`: `email_general_settings` を追加
- `display-settings`: `google_fonts`, `icons` を追加
- `database-schema-manager`: `settings`, `tool_dependencies`, `tool_migrations`, `app_logs` を追加
- `print-history`: `print_location_metrics` を含むフォールバック定義を追加
- `estimator`, `proofing`: `size_order_master` を追加
- `product-definition-tool`: `size_order_master` を追加

#### ファイル
- `src/core/config/Routes.tsx` - 更新済み

### 3. AppMode切り替えの共通ヘルパ実装

#### 新規作成ファイル

**`src/core/utils/csvSaveHelper.ts`**
- `saveTableToCsv()` - テーブルデータをCSVファイルに保存する共通ヘルパ関数
- `saveMultipleTablesToCsv()` - 複数テーブルを一度に保存する関数
- csv-writableモードでのみ動作し、それ以外のモードでは何もしない
- メーカー依存テーブル、stockテーブルから派生するテーブル（colors, sizes）などの特別処理を含む

**主な機能:**
```typescript
export async function saveTableToCsv(
    tableName: string,
    tableData: Table | { data: Row[]; schema: any[] },
    manufacturerId?: string
): Promise<boolean>
```

#### 更新ファイル

**`src/core/utils/appMode.ts`**
- `getAppMode()` エイリアスを追加（`getStoredAppMode()` のエイリアス）
- 仕様書に記載されている `getAppMode()` に対応

### 4. 代表的な更新系ツールへのAppMode分岐実装

#### 4.1 data-io (StockImporter.tsx)

**更新内容:**
- `importer_mappings` 保存時にAppMode分岐を追加
- csv-writableモード: `setDatabase()` + `saveTableToCsv()` を使用
- liveモード: 既存の `updateDatabase()` を使用

**実装箇所:**
- `handleSaveMapping()` 関数内（約510行目）

**コード例:**
```typescript
// AppMode分岐: csv-writableモードの場合はCSVに直接保存
const appMode = getStoredAppMode();
if (isCsvWritableMode(appMode)) {
    // CSVモード: setDatabaseで更新し、saveTableToCsvで保存
    const updatedMappings = /* ... */;
    setDatabase(prev => ({ ...prev, importer_mappings: { ... } }));
    const saved = await saveTableToCsv('importer_mappings', { data: updatedMappings, schema: ... });
    result = { success: saved };
} else {
    // Liveモード: 既存のAPIを使用
    result = await updateDatabase(currentPage, 'importer_mappings', operation, database);
}
```

#### 4.2 language-manager (LanguageManagerPage.tsx)

**更新内容:**
- 言語設定保存時にAppMode分岐を追加
- csv-writableモード: `saveTableToCsv()` を使用して `language_settings_*` CSVを直接上書き
- liveモード: 既存の `updateDatabase()` を使用

**実装箇所:**
- `handleSave()` 関数内（約241行目）

**コード例:**
```typescript
// AppMode分岐: csv-writableモードの場合はCSVに直接保存
const appMode = getStoredAppMode();
if (isCsvWritableMode(appMode)) {
    // CSVモード: saveTableToCsvで直接保存
    const saved = await saveTableToCsv(selectedTableName, {
        data: localData,
        schema: schema
    });
    if (!saved) {
        throw new Error('Failed to save language settings to CSV');
    }
} else {
    // Liveモード: 既存のAPIを使用
    const operations = [/* ... */];
    const result = await updateDatabase(currentPage, selectedTableName, operations, database);
}
```

#### 4.3 database-schema-manager (useSchemaManager.ts)

**更新内容:**
- スキーマ保存時にAppMode分岐を追加
- csv-writableモード: CSVにスキーマを保存（ALTER SQLは生成のみ、実DBは変更しない）
- liveモード: `/api/alter-table.php` を使用して実DBを変更

**実装箇所:**
- `saveSchema()` 関数内（約341行目）

**コード例:**
```typescript
// AppMode分岐: csv-writableモードの場合はCSVにスキーマを保存
const appMode = getStoredAppMode();
if (isCsvWritableMode(appMode)) {
    // CSVモード: スキーマをCSVに保存（ALTER SQLは生成のみ）
    const currentTable = database?.[selectedTable || ''];
    if (currentTable) {
        const saved = await saveTableToCsv(selectedTable || '', {
            data: currentTable.data || [],
            schema: frontendSchema
        });
        if (!saved) {
            throw new Error('CSVへのスキーマ保存に失敗しました。');
        }
    }
    // ALTER SQLは生成のみ（プレビュー表示用）
    console.log('[SchemaManager] Generated ALTER SQL (CSV mode):', preview.changes.map(c => c.sql).join(';\n'));
} else {
    // Liveモード: 既存のAPIを使用して実DBを変更
    const response = await fetch('/api/alter-table.php', { /* ... */ });
}
```

### 5. CSV→SQLエクスポートスクリプト

#### 実装状況
- **実装済み**: `scripts/generate-sql-from-csv.js`
- **実装済み**: `scripts/generate-database-setup.js`
- **実装済み**: `scripts/verify-csv-sql-consistency.js`

#### package.jsonへの追加
- `export:setup-sql` - CSV→SQLエクスポートスクリプト
  ```json
  "export:setup-sql": "node scripts/generate-database-setup.js && node scripts/generate-sql-from-csv.js"
  ```
- `verify:csv-sql` - CSV/SQL整合性チェックスクリプト
  ```json
  "verify:csv-sql": "node scripts/verify-csv-sql-consistency.js"
  ```

### 6. CIワークフローの設定

#### 新規作成ファイル

**`.github/workflows/ci.yml`**
- GitHub Actions ワークフローを新規作成
- プッシュ/PR時に自動実行
- CSV→SQL生成と整合性チェックを自動実行
- 生成ファイルの変更を検出してCIを失敗させる

**主な処理:**
1. Node.js環境のセットアップ
2. 依存関係のインストール
3. CSV→SQL生成（`npm run export:setup-sql`）
4. CSV/SQL整合性チェック（`npm run verify:csv-sql`）
5. 生成ファイルの変更チェック（`dist/` と `templates/database_setup.sql.txt`）

**実行タイミング:**
- `main`, `develop` ブランチへのプッシュ
- `main`, `develop` ブランチへのプルリクエスト

## 実装ファイル一覧

### 新規作成ファイル
1. `src/core/utils/csvSaveHelper.ts` - CSV保存用共通ヘルパ
2. `.github/workflows/ci.yml` - GitHub Actions CIワークフロー
3. `scripts/check-tool-dependencies.js` - tool_dependencies.csv比較スクリプト
4. `scripts/update-tool-dependencies.js` - tool_dependencies.csv自動更新スクリプト

### 更新ファイル
1. `templates/system/tool_dependencies.csv` - 依存テーブル定義（追加20件、削除106件）
2. `src/core/config/Routes.tsx` - フォールバック定義の更新
3. `src/core/utils/appMode.ts` - `getAppMode()` エイリアス追加
4. `src/features/data-io/organisms/StockImporter.tsx` - AppMode分岐追加
5. `src/features/language-manager/pages/LanguageManagerPage.tsx` - AppMode分岐追加
6. `src/features/database-schema-manager/hooks/useSchemaManager.ts` - AppMode分岐追加
7. `package.json` - スクリプト追加（`export:setup-sql`, `verify:csv-sql`）

## 使用方法

### CSV書き込みモードでの保存

各ツールから `saveTableToCsv()` を使用：

```typescript
import { getAppMode } from '@core/utils/appMode';
import { saveTableToCsv } from '@core/utils/csvSaveHelper';

const appMode = getAppMode();
if (appMode === 'csv-writable') {
    await saveTableToCsv('language_settings_proofing', {
        data: updatedRows,
        schema: schema
    });
} else {
    // Liveモード: 既存のAPIを使用
    await updateDatabase(/* ... */);
}
```

### CSV→SQLエクスポート

```bash
# SQLファイルを生成
npm run export:setup-sql

# CSV/SQL整合性をチェック
npm run verify:csv-sql
```

### CIでの自動チェック

GitHubにプッシュすると、自動的に以下が実行されます：
1. CSV→SQL生成
2. CSV/SQL整合性チェック
3. 生成ファイルの変更検出

## 注意事項

### メーカー依存テーブル
- `saveTableToCsv()` を使用する際、メーカー依存テーブル（stock, product_details, tagsなど）の場合は `manufacturerId` を指定する必要があります

### スキップされるテーブル
以下のテーブルは自動的にスキップされます：
- `colors`, `sizes` - stockテーブルから取得されるため
- `products_master`, `product_tags` - 削除済み（stockテーブルに統合）

### CSVモードでの制限
- csv-writableモードでは、PHPの更新API（`/api/update-data.php`, `/api/alter-table.php`）は呼ばれません
- すべての変更はCSVファイルに直接保存されます
- CSVが「真実のソース」となり、後段でSQLを自動生成します

## 関連ドキュメント

- `docs/csv-app-mode-spec.md` - CSV書き込みモード運用仕様
- `docs/DATABASE_IMPORT_GUIDE.md` - データベースインポートガイド

## 今後の拡張

以下のツールにもAppMode分岐を追加することを推奨します：
- その他の更新系ツール（product-management, order-management など）
- 各ツールの個別実装に応じた分岐処理

## 変更履歴

- 2025-01: 初回実装完了
  - tool_dependencies.csvの棚卸しと更新
  - Routes.tsxのフォールバック定義更新
  - AppMode共通ヘルパ実装
  - 代表的な更新系ツールへのAppMode分岐実装
  - CIワークフロー設定

