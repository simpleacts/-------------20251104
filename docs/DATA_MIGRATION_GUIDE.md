# データ移行ガイド

## ブランドをproduct_tagsに統合する移行

### 概要

`brands`テーブルを削除し、ブランドを`product_tags`テーブルのタグとして管理するように変更します。

### 移行手順

#### 1. データ移行スクリプトの実行

```bash
node scripts/migrate-brands-to-tags.js
```

このスクリプトは:
- 既存の`brands_manu_XXXX.csv`からブランド情報を取得
- `products_master_manu_XXXX.csv`の`brand_id`から商品とブランドの関連を取得
- `product_tags_manu_XXXX.csv`にブランドタグ（`brand_*`形式）を追加

#### 2. 移行後のデータ構造

**移行前:**
```
brands_manu_0001.csv
├─ id: brnd_0002
├─ name: Print Star
└─ code: print-star

products_master_manu_0001.csv
└─ brand_id: brnd_0002

product_tags_manu_0001.csv
└─ (ブランド情報なし)
```

**移行後:**
```
product_tags_manu_0001.csv
├─ product_id: print-star-00085
├─ tag_id: brand_print-star  ← ブランドタグ
└─ manufacturer_id: manu_0001

products_master_manu_0001.csv
└─ brand_id: (不要、削除または無視)
```

#### 3. 削除可能なテーブル

以下のテーブルは削除可能です（`stock`テーブルから全て取得可能）:

- `product_prices_manu_XXXX` → `stock`の`list_price`, `cost_price`から取得
- `product_colors_manu_XXXX` → `stock`から`product_code` × `color_code`の組み合わせを取得
- `product_sizes_manu_XXXX` → `stock`から`product_code` × `color_code` × `size_code`の組み合わせを取得
- `skus_manu_XXXX` → `stock`に既に`product_code` × `color_code` × `size_code`の組み合わせが存在

以下のテーブルも削除可能です:

- `brands_manu_XXXX` → `product_tags`からブランドタグを取得

#### 4. コード変更

以下のファイルが変更されました:

- `src/core/utils/brandFromTags.ts` - ブランドをタグから取得するユーティリティ関数
- `src/core/utils/stockProductInfo.ts` - stockからカラー・サイズ・価格を取得する関数
- `src/features/estimator/modals/ProductSelectionPage.tsx` - ブランド取得ロジックをタグベースに変更
- `src/features/estimator/organisms/ProductSelectionGrid.tsx` - ブランドフィルタリングをタグベースに変更
- `src/features/estimator/document/hooks/useDocumentData.ts` - ブランド取得をタグベースに変更
- `src/features/work-sheet/hooks/useWorksheetData.ts` - ブランド取得をタグベースに変更

### 注意事項

1. **在庫テーブル（stock）がマスターデータ**
   - `stock_manu_XXXX.csv`には商品×カラー×サイズの全ての組み合わせが含まれます
   - 在庫数が0でも1行のデータが存在します
   - 廃盤商品は`stock`から削除されます

2. **ブランドタグの命名規則**
   - タグID: `brand_{ブランド名（小文字、ハイフン区切り）}`
   - 例: "Print Star" → `brand_print-star`

3. **後方互換性**
   - `products_master`の`brand_id`フィールドは無視されます（削除は任意）
   - 既存のコードは段階的に移行できます

### 検証

移行後、以下を確認してください:

1. 商品検索モーダルでブランドフィルタが正しく動作する
2. 商品のカラー・サイズ・価格が`stock`から正しく取得される
3. ブランド名が正しく表示される

