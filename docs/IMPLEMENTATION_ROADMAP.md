# 実装ロードマップ

## 概要

これまでのチャットで話し合った内容を、実行順序に従って整理したロードマップです。

---

## 📋 全体の流れ

```
フェーズ1: 緊急エラー修正（即座に実施）
    ↓
フェーズ2: パフォーマンス改善（1週間以内）
    ↓
フェーズ3: その他のエラー修正（2週間以内）
    ↓
フェーズ4: コード品質向上（1ヶ月以内）
    ↓
フェーズ5: ウェブサイト統合（管理フロントエンド完成後）
```

---

## 🚨 フェーズ1: 緊急エラー修正（即座に実施）

### 目的
アプリケーションが正常に動作するための最低限の修正

### タスク1: `payment_methods` テーブルの作成

**実行順序**: 1番目

**作業内容**:
1. `templates/database_setup.sql.txt` を開く
2. `payment_status_master` テーブル定義の後に以下を追加：

```sql
CREATE TABLE `payment_methods` (
  `id` VARCHAR(255) NOT NULL,
  `value` VARCHAR(255),
  `sort_order` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

3. `dist/database_setup.sql.txt` にも同じ内容を追加
4. データベースにSQLを実行してテーブルを作成

**確認方法**: Estimator の DocumentSettingsSection で支払い方法が表示されることを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション1

---

### タスク2: `getProductsMasterFromStock` のインポート追加

**実行順序**: 2番目

**作業内容**:
1. `src/features/estimator/document/hooks/useDocumentData.ts` を開く
2. ファイルの先頭（他のインポート文の近く）に以下を追加：

```typescript
import { getProductsMasterFromStock, getProductDetailsFromStock } from '../../../../core/utils/stockProductInfo';
```

**確認方法**: Estimator の DocumentManager でエラーが発生しないことを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション2

---

## ⚡ フェーズ2: パフォーマンス改善（1週間以内）

### 目的
ユーザー体験を向上させるためのパフォーマンス最適化

### タスク3: Production Scheduling のちらつき修正

**実行順序**: 3番目

**作業内容**:
1. `src/features/production-scheduler/pages/ProductionSchedulerPage.tsx` を開く
2. `useRef` をインポート（既にある場合はスキップ）
3. `useEffect` を以下のように修正：

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

**確認方法**: Production Scheduling ページでちらつきが解消されることを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション3

---

### タスク4: Estimator の読み込み問題修正

**実行順序**: 4番目

**作業内容**:
1. `src/features/estimator/pages/EstimatorPage.tsx` を開く
2. `getAllManufacturerTableData` と `isManufacturerDependentTable` をインポート（必要に応じて）
3. `missingEssentialTables` のフィルタロジックを以下のように修正：

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

**確認方法**: Estimator ページが正常に読み込まれることを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション4、`EstimatorPageV2.tsx` の実装

---

### タスク5: パスエイリアスの拡張

**実行順序**: 5番目

**作業内容**:
1. `vite.config.ts` を開く
2. `resolve.alias` を以下のように更新：

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
    '@core': path.resolve(__dirname, './src/core'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@features': path.resolve(__dirname, './src/features'),
    '@components': path.resolve(__dirname, './src/shared/ui'),
  }
}
```

3. `tsconfig.json` を開く
4. `compilerOptions.paths` を以下のように更新：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@core/*": ["./src/core/*"],
      "@shared/*": ["./src/shared/*"],
      "@features/*": ["./src/features/*"],
      "@components/*": ["./src/shared/ui/*"]
    }
  }
}
```

**確認方法**: 開発サーバーを再起動して、エラーが発生しないことを確認

**参考**: `docs/FILE_PATH_MANAGEMENT.md` セクション1

---

## 🔧 フェーズ3: その他のエラー修正（2週間以内）

### 目的
残っているエラーを解消し、安定性を向上させる

### タスク6: Product Data の React Error #310 修正

**実行順序**: 6番目

**作業内容**:
1. `src/features/product-management/organisms/ProductManager.tsx` を開く
2. `onUpdateRow` に `null` チェックを追加：

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

**確認方法**: Product Data ページでエラーが発生しないことを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション5

---

### タスク7: PDF Preview Settings のテーブルエラー修正

**実行順序**: 7番目

**作業内容**:
1. `src/features/pdf-preview-settings/pages/PdfPreviewSettingsPage.tsx` を開く
2. `useEffect` を追加（既存の `useEffect` の近くに）：

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

**確認方法**: PDF Preview Settings ページでテーブルが見つかることを確認

**参考**: `docs/ERROR_FIXES_SUMMARY.md` セクション6

---

## 🎨 フェーズ4: コード品質向上（1ヶ月以内）

### 目的
コードの保守性を向上させ、将来の開発を容易にする

### タスク8: Barrel Exports の拡張

**実行順序**: 8番目

**作業内容**:
1. 以下のディレクトリに `index.ts` ファイルを作成：
   - `src/core/utils/index.ts`
   - `src/core/hooks/index.ts`
   - `src/core/services/index.ts`
   - `src/shared/ui/atoms/index.ts`
   - `src/shared/ui/molecules/index.ts`
   - `src/shared/ui/organisms/index.ts`

2. 各 `index.ts` で、そのディレクトリ内のファイルを再エクスポート

**例**:
```typescript
// src/shared/ui/atoms/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';
```

**確認方法**: インポート文が短くなることを確認

**参考**: `docs/FILE_PATH_MANAGEMENT.md` セクション2

---

### タスク9: 相対パスをパスエイリアスに置き換え

**実行順序**: 9番目（段階的に実施）

**作業内容**:
1. 新しいファイルを作成する際は、パスエイリアスを使用
2. 既存ファイルを修正する際に、ついでに相対パスをパスエイリアスに置き換え
3. 一度にすべて変更しない（段階的に実施）

**確認方法**: インポート文が読みやすくなることを確認

**参考**: `docs/FILE_PATH_MANAGEMENT.md` セクション3

---

## 🌐 フェーズ5: ウェブサイト統合（管理フロントエンド完成後）

### 前提条件
- フェーズ1〜4が完了していること
- 管理用フロントエンドが正常に動作していること

### タスク10: データベース統合

**実行順序**: 10番目

**作業内容**:
1. `login_tokens` テーブルの作成
2. `shipping_addresses` テーブルの作成
3. 既存テーブルの互換性確認

**参考**: `docs/WEBSITE_INTEGRATION_PLAN.md` セクション「データベース統合」

---

### タスク11: APIエンドポイントの統合

**実行順序**: 11番目

**作業内容**:
1. `api/login-request.php` の追加
2. `api/login-verify.php` の追加
3. `api/my-page-data.php` の追加
4. `api/save_quote.php` の統合

**参考**: `docs/WEBSITE_INTEGRATION_PLAN.md` セクション「APIエンドポイントの統合」

---

### タスク12: フロントエンドコンポーネントの統合

**実行順序**: 12番目

**作業内容**:
1. ウェブサイトコンポーネントの配置
2. ルーティングの追加
3. 認証システムの統合

**参考**: `docs/WEBSITE_INTEGRATION_PLAN.md` セクション「フロントエンドコンポーネントの統合」

---

### タスク13: ウェブサイト構築ツールの実装

**実行順序**: 13番目（最後）

**作業内容**:
1. サイト一覧ページの作成
2. テンプレート選択機能
3. サイト編集機能
4. ビルド・出力機能

**参考**: `docs/WEBSITE_BUILDER_PLAN.md`

---

## 📊 進捗管理

### チェックリスト

- [ ] タスク1: `payment_methods` テーブルの作成
- [x] タスク2: `getProductsMasterFromStock` のインポート追加
- [x] タスク3: Production Scheduling のちらつき修正
- [x] タスク4: Estimator の読み込み問題修正
- [x] タスク5: パスエイリアスの拡張
- [x] タスク6: Product Data の React Error #310 修正
- [x] タスク7: PDF Preview Settings のテーブルエラー修正
- [ ] タスク8: Barrel Exports の拡張
- [ ] タスク9: 相対パスをパスエイリアスに置き換え
- [ ] タスク10: データベース統合（ウェブサイト）
- [ ] タスク11: APIエンドポイントの統合（ウェブサイト）
- [ ] タスク12: フロントエンドコンポーネントの統合（ウェブサイト）
- [ ] タスク13: ウェブサイト構築ツールの実装

---

## ⚙️ ビルド手順

各タスクの実装後、変更を反映するためにビルドが必要です。

### ビルド方法

**推奨: バッチファイルを使用**
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

**注意**: ビルド前にPHP開発サーバーを停止してください（`Ctrl + C`）。ビルド中は`dist`ディレクトリがロックされます。

---

## ⚠️ 注意事項

1. **順序を守る**: タスクは順番に実施してください（依存関係があります）
2. **動作確認**: 各タスク完了後、必ず動作確認を行ってください
3. **バックアップ**: 大きな変更を行う前に、バックアップを取ってください
4. **段階的実施**: 一度にすべてを変更せず、段階的に実施してください
5. **ドキュメント参照**: 各タスクの詳細は、関連ドキュメントを参照してください
6. **ビルド**: コード変更後は必ずビルドを実行して変更を反映してください

---

## 📚 関連ドキュメント

- `docs/ERROR_FIXES_SUMMARY.md` - エラー修正の詳細
- `docs/FILE_PATH_MANAGEMENT.md` - ファイルパス管理の改善計画
- `docs/PRIORITY_TASKS.md` - 優先タスク一覧
- `docs/WEBSITE_INTEGRATION_PLAN.md` - 既存ウェブサイト統合計画
- `docs/WEBSITE_BUILDER_PLAN.md` - ウェブサイト構築ツールの計画

---

## 🎯 完了条件

### フェーズ1完了条件
- すべての緊急エラーが解消されている
- 基本的な機能が動作している

### フェーズ2完了条件
- パフォーマンスが改善されている
- ユーザー体験が向上している

### フェーズ3完了条件
- すべての既知のエラーが解消されている

### フェーズ4完了条件
- コードの保守性が向上している
- 新機能の追加が容易になっている

### フェーズ5完了条件
- ウェブサイトが正常に統合されている
- ウェブサイト構築ツールが動作している

