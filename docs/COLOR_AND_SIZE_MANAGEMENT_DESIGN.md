# カラー・サイズ管理の詳細化設計

## 目的

1. カラーをメーカーごとに分割管理
2. 商品コード別のサイズ管理
3. 商品×カラー別のサイズ展開管理

## 新しい構造

### 1. カラーのメーカーごとの分割

**現在:**
- `templates/common/colors.csv`（全メーカー統合）
- ID: `col_0001`, `col_0002`（グローバル）

**変更後:**
- `templates/manufacturers/{manufacturer_id}/colors.csv`（メーカーごと）
- ID管理方法の選択肢：
  - **オプションA**: メーカーごとに独立したID体系（`col_0001`, `col_0002`を各メーカーで使用）
  - **オプションB**: グローバルIDを維持し、`manufacturer_id`でフィルタリング
  - **推奨**: オプションB（既存のIDとの互換性を保つ）

### 2. 商品コード別のサイズ管理

**新規テーブル: `product_sizes`**

```
templates/manufacturers/{manufacturer_id}/product_sizes.csv
```

**スキーマ:**
```csv
id,product_id,size_id
```

- `product_id`: 商品ID（products_master.id）
- `size_id`: サイズID（sizes.id）
- この商品が使用できるサイズのリスト

### 3. 商品×カラー別のサイズ展開管理

**新規テーブル: `product_color_sizes`**

```
templates/manufacturers/{manufacturer_id}/product_color_sizes.csv
```

**スキーマ:**
```csv
id,manufacturer_id,product_id,color_id,size_id,sort_order
```

- `manufacturer_id`: メーカーID（メーカーごとのフォルダ管理用）
- `product_id`: 商品ID
- `color_id`: カラーID（colors.id）
- `size_id`: サイズID（sizes.id）
- `sort_order`: ソート順
- この商品×カラーで使用できるサイズのリスト

**優先順位:**
1. `product_color_sizes`に定義がある場合 → その定義を使用
2. `product_color_sizes`に定義がない場合 → `product_sizes`の定義を使用
3. どちらも定義がない場合 → メーカーの全サイズを使用（フォールバック）

## 実装ステップ

1. ✅ colors.csvをメーカーごとに分割（`manufacturers/{manufacturer_id}/colors.csv`）
2. ✅ CSV読み込みロジックを更新（colorsもメーカーごとに読み込む）
3. ✅ product_sizesテーブルの設計・実装
   - データベーススキーマに追加
   - `tableNames.ts`に追加
   - `csvPathResolver.ts`に追加（メーカー依存テーブルとして）
   - `id_formats.csv`に追加
4. ✅ product_color_sizesテーブルの設計・実装
   - データベーススキーマに追加
   - `tableNames.ts`に追加
   - `csvPathResolver.ts`に追加（メーカー依存テーブルとして）
   - `id_formats.csv`に追加
5. ✅ サイズ選択ロジックの更新（product_sizes → product_color_sizesの優先順位）
   - ✅ `productSizeResolver.ts`の実装（優先順位: product_color_sizes → product_sizes → 全サイズ）
   - ✅ 商品選択モーダルでのサイズ表示ロジック（`ProductQuantityMatrix.tsx`, `ProductQuantityInputMobile.tsx`）
   - ✅ 見積作成時のサイズ選択ロジック（`ProductSizeResolver.ts`を使用）

