# ページネーション設定が必要なページ一覧

## 概要
このドキュメントは、ページネーション設定（`pagination_settings`）が必要なページのリストです。
これらのページでは、`pagination_settings`テーブルが読み込まれ、ページネーション機能が使用されます。

## ページネーションが必要なページ

### 明示的にページネーション設定を使用しているページ

#### 1. **顧客管理 (customer-management)**
- **テーブル名**: `customers`
- **コンポーネント**: `DataTable`, `CustomerGrid`
- **設定方法**: `getPaginationConfigFor('customers')`
- **読み込み**: `getRequiredTablesForPage`で`pagination_settings`を含む（明示的読み込み）

#### 2. **商品データ管理 (product-management)**
- **テーブル名**: `products_master`
- **コンポーネント**: `DataTable`, `ProductGrid`
- **設定方法**: `getPaginationConfigFor('products_master')`
- **読み込み**: `useAppSettings`で自動読み込み（`DataTable`使用時）

#### 3. **商品在庫管理 (inventory-management)**
- **テーブル名**: `inventory-management`
- **コンポーネント**: `InventoryTable`
- **設定方法**: `getPaginationConfigFor('inventory-management')`
- **読み込み**: `useAppSettings`で自動読み込み

#### 4. **表示設定 (display-settings)**
- **テーブル名**: `pagination_settings`（設定管理ページ自体）
- **コンポーネント**: `PaginationSettingsTable`
- **設定方法**: 設定ページ自体
- **読み込み**: `getRequiredTablesForPage`で`pagination_settings`を含む（明示的読み込み）

### DataTableコンポーネントを使用しているページ（自動的にページネーション設定を使用）

`DataTable`コンポーネントは、`paginationConfig`が明示的に渡されていない場合、自動的に`getPaginationConfigFor(tableName)`を呼び出します。

#### 5. **業務管理 (order-management)**
- **テーブル名**: `quotes`
- **コンポーネント**: `DataTable`
- **設定方法**: `getPaginationConfigFor('quotes')`（自動取得）

#### 6. **言語管理 (language-manager)**
- **テーブル名**: `language_settings_*`（各種言語設定テーブル）
- **コンポーネント**: `DataTable`
- **設定方法**: `getPaginationConfigFor('language_settings')`など（自動取得）

#### 7. **PDFプレビュー設定 (pdf-preview-settings)**
- **テーブル名**: `pdf_preview_zoom_configs`
- **コンポーネント**: `DataTable`
- **設定方法**: `getPaginationConfigFor('pdf_preview_zoom_configs')`（自動取得）

#### 8. **インク製品管理 (ink-product-management)**
- **テーブル名**: `ink_products`
- **コンポーネント**: `DataTable`
- **設定方法**: `getPaginationConfigFor('ink_products')`（自動取得）

#### 9. **カラーライブラリ管理 (color-library-manager)**
- **テーブル名**: `pantone_colors`, `dic_colors`
- **コンポーネント**: `DataTable`
- **設定方法**: `getPaginationConfigFor('pantone_colors')`など（自動取得）

### その他のページネーション使用ページ

#### 10. **見積作成 (estimator)**
- **テーブル名**: 商品選択グリッド
- **コンポーネント**: `ProductSelectionGrid`
- **設定方法**: `paginationConfig`プロパティで明示的に指定
- **読み込み**: 親コンポーネントから渡される

## 自動読み込みの仕組み

### `DataTable`コンポーネント
`DataTable`コンポーネントは、`paginationConfig`が明示的に渡されていない場合、自動的に`getPaginationConfigFor(tableName)`を呼び出してページネーション設定を取得します。

**影響範囲**: `DataTable`を使用しているすべてのページで、テーブル名に基づいて自動的にページネーション設定が適用されます。

### `useAppSettings`フック
`useAppSettings`フックは、`getPaginationConfigFor`が呼ばれる可能性がある場合、自動的に`pagination_settings`テーブルを読み込みます。

**読み込みタイミング**: 
- `getPaginationConfigFor`が初めて呼ばれた時
- `DataTable`が初めて使用された時
- ページネーション設定が必要なページにアクセスした時

## 読み込みタイミング

1. **明示的な読み込み**:
   - `customer-management`: `getRequiredTablesForPage`で読み込み
   - `display-settings`: `getRequiredTablesForPage`で読み込み

2. **自動読み込み**:
   - `useAppSettings`で`getPaginationConfigFor`が呼ばれる可能性がある場合に自動読み込み
   - `DataTable`コンポーネントが使用されているページで自動読み込み

3. **フォールバック**:
   - `PaginationSettingsPage`で、既に読み込まれていない場合のみ読み込み

## 設定可能なテーブル

`PaginationSettingsPage`では、以下のテーブルに対してページネーション設定が可能です：
- `ALL_TABLE_NAMES`に含まれるすべてのテーブル（114テーブル）
- 主なテーブル：
  - `customers` (顧客)
  - `products_master` (商品マスタ)
  - `quotes` (見積もり)
  - `stock` (在庫)
  - `language_settings_*` (各種言語設定)
  - その他100以上のテーブル

## 注意事項

- `pagination_settings`は初期読み込みから削除されているため、必要なページでのみ読み込まれます
- `DataTable`を使用しているページでは、自動的にページネーション設定が適用されます
- 明示的に`paginationConfig`を渡すことで、デフォルトの動作を上書きできます

