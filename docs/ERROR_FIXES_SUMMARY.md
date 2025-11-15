# エラー修正のまとめ

## 概要

管理用フロントエンドで発生しているエラーの原因と修正方法をまとめています。

## 修正が必要なエラー一覧

### 1. `payment_methods` テーブルエラー

**エラー内容**: `#1146 - Table 'simpleacts_quotenassen.payment_methods' doesn't exist`

**原因**: `templates/database_setup.sql.txt` と `dist/database_setup.sql.txt` に `CREATE TABLE payment_methods` の定義が欠落している

**修正方法**:
`templates/database_setup.sql.txt` の `payment_status_master` テーブル定義の後に以下を追加：

```sql
CREATE TABLE `payment_methods` (
  `id` VARCHAR(255) NOT NULL,
  `value` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

**使用箇所**: `src/features/estimator/organisms/DocumentSettingsSection.tsx`

---

### 2. `getProductsMasterFromStock` 未定義エラー

**エラー内容**: `ReferenceError: getProductsMasterFromStock is not defined`

**原因**: `src/features/estimator/document/hooks/useDocumentData.ts` で関数を使用しているが、インポートされていない

**修正方法**:
`src/features/estimator/document/hooks/useDocumentData.ts` の先頭に以下を追加：

```typescript
import { getProductsMasterFromStock, getProductDetailsFromStock } from '../../../../core/utils/stockProductInfo';
```

**使用箇所**: 
- `getProductsMasterFromStock`: 商品マスタデータの取得
- `getProductDetailsFromStock`: 商品詳細データの取得

---

### 3. Production Scheduling のちらつき（再レンダリング）

**エラー内容**: ページが頻繁に再レンダリングされ、ちらつきが発生

**原因**: 
- `useEffect` の依存配列に `database` が含まれており、データ更新のたびに再実行される
- 既に読み込み済みのテーブルを再取得している
- 削除済みテーブル（`products_master`, `product_details`）を参照している

**修正方法**:
`src/features/production-scheduler/pages/ProductionSchedulerPage.tsx` を以下のように修正：

```typescript
const loadedTablesRef = useRef<Set<string>>(new Set());

useEffect(() => {
  const loadData = async () => {
    if (!database) {
      setIsLoading(true);
      return;
    }
    
    const requiredTables = [
      'quotes', 'quote_tasks', 'task_master', 'customers', 'quote_items', 
      'settings', 'quote_designs', 'quote_history', 'quote_status_master', 
      'payment_status_master', 'production_status_master', 'shipping_status_master', 
      'data_confirmation_status_master', 'shipping_carriers', 'company_info', 
      'pdf_templates', 'pdf_item_display_configs', 'brands', 'print_locations', 'stock'
      // products_master, product_detailsを削除（stockテーブルを使用）
    ];
    
    // 既に読み込み済みのテーブルはスキップ
    const missingTables = requiredTables.filter(t => {
      if (loadedTablesRef.current.has(t)) return false;
      if (database[t]) {
        loadedTablesRef.current.add(t);
        return false;
      }
      return true;
    });
    
    if (missingTables.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      missingTables.forEach(t => loadedTablesRef.current.add(t));
      const data = await fetchTables(missingTables, { toolName: 'production-scheduler' });
      setDatabase(prev => ({...(prev || {}), ...data}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };
  loadData();
}, []); // 依存配列を空にして、初回のみ実行
```

**注意**: `products_master` と `product_details` は削除済みテーブルのため、`stock` テーブルを使用する

---

### 4. Estimator の読み込みが進まない

**エラー内容**: ページが読み込み状態から進まない

**原因**: メーカー依存テーブルのチェックが不十分

**修正方法**:
`src/features/estimator/pages/EstimatorPage.tsx` の `missingEssentialTables` フィルタを以下のように修正：

```typescript
const missingEssentialTables = essentialTables.filter(t => {
  // メーカー依存テーブルの場合は、getAllManufacturerTableDataを使用してデータが存在するかどうかを確認
  if (isManufacturerDependentTable(t)) {
    const allData = getAllManufacturerTableData(database, t);
    return allData.length === 0;
  }
  // 通常のテーブルの場合は、直接チェック
  const table = database[t];
  return !table || !table.data || table.data.length === 0;
});
```

**参考**: `EstimatorPageV2.tsx` の実装を参照

---

### 5. Product Data の React Error #310

**エラー内容**: `Minified React error #310` - 通常は `null` または `undefined` の値に対して操作を実行しようとした場合に発生

**原因**: `database` が `null` の状態で `getProductDetailsFromStock` を呼び出している可能性

**修正方法**:
`src/features/product-management/organisms/ProductManager.tsx` の `onUpdateRow` に `null` チェックを追加：

```typescript
onUpdateRow={(rowIndex, newRow) => {
  if (!database) {
    handleUpdateRow(rowIndex, newRow, {});
    return;
  }
  // メーカーごとに分離されたproduct_detailsテーブルから検索
  const allProductDetails = getProductDetailsFromStock(database);
  const productDetail = allProductDetails.find((d: Row) => d.product_id === newRow.id) || {};
  handleUpdateRow(rowIndex, newRow, productDetail);
}}
```

---

### 6. PDF Preview Settings のテーブルが見つからない

**エラー内容**: `'pdf_preview_zoom_configs' テーブルが見つかりません`

**原因**: テーブルはデータベーススキーマに定義されているが、フロントエンドで明示的に取得していない

**修正方法**:
`src/features/pdf-preview-settings/pages/PdfPreviewSettingsPage.tsx` に `useEffect` を追加：

```typescript
useEffect(() => {
  const loadData = async () => {
    if (!database || database.pdf_preview_zoom_configs) return;
    
    try {
      const data = await fetchTables(['pdf_preview_zoom_configs'], { toolName: 'pdf-preview-settings' });
      setDatabase(prev => ({...(prev || {}), ...data}));
    } catch (err) {
      console.error('Failed to load pdf_preview_zoom_configs:', err);
    }
  };
  loadData();
}, [database, setDatabase]);
```

---

## 修正の優先順位

1. **高**: `payment_methods` テーブルエラー、`getProductsMasterFromStock` 未定義エラー
2. **中**: Production Scheduling のちらつき、Estimator の読み込み問題
3. **低**: Product Data の React Error #310、PDF Preview Settings のテーブルエラー

## 注意事項

- 修正後は必ず動作確認を行う
- データベーススキーマの変更は、`templates/database_setup.sql.txt` と `dist/database_setup.sql.txt` の両方を更新する
- メーカー依存テーブルを使用する場合は、`getAllManufacturerTableData` などのユーティリティ関数を使用する
- 削除済みテーブル（`products_master`, `product_details`）への参照はすべて `stock` テーブルに置き換える


