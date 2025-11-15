# メーカー依存テーブルのIDフォーマット設計

## 問題点

メーカーごとにファイルが分割されているテーブル（`sizes`, `colors`, `product_sizes`, `product_color_sizes`, `product_colors`）は、データベースに統合される際に同じテーブルに格納されます。

現在のIDフォーマット：
- `sizes`: `size_0001`, `size_0002`...
- `colors`: `col_0001`, `col_0002`...
- `product_sizes`: `prdsz_000001`...
- `product_color_sizes`: `pcolsz_000001`...

この場合、異なるメーカーのファイル間でIDが衝突する可能性があります。

## 解決策

メーカー依存テーブルのIDプレフィックスにメーカーIDを含める：

### 推奨フォーマット

- `sizes`: `{prefix}_{manufacturer_id}_{番号}`
  - 例: `size_manu_0001_0001`, `size_manu_0002_0001`
- `colors`: `{prefix}_{manufacturer_id}_{番号}`
  - 例: `col_manu_0001_0001`, `col_manu_0002_0001`
- `product_sizes`: `{prefix}_{manufacturer_id}_{番号}`
  - 例: `prdsz_manu_0001_000001`, `prdsz_manu_0002_000001`
- `product_color_sizes`: `{prefix}_{manufacturer_id}_{番号}`
  - 例: `pcolsz_manu_0001_000001`, `pcolsz_manu_0002_000001`
- `product_colors`: 既存の複合キー（`product_id`, `color_id`）を使用しているため、ID生成は不要

### 代替案

ID生成時に全メーカーのデータを確認してグローバルに一意な番号を生成する方法もありますが、メーカーIDを含める方が明確で管理しやすいです。

## 実装方針

1. ✅ `id_formats.csv`にメーカー依存のコメントを追加
2. ✅ ID生成ロジック（`idService.ts`）でメーカー依存テーブルの場合は`manufacturer_id`を含める
3. ✅ 既存データの移行スクリプトを作成（`scripts/migrate-manufacturer-ids.js`）

## 実装完了

### ID生成ロジックの更新
- `generateNewId`関数に`manufacturerId`パラメータを追加
- メーカー依存テーブルの場合は`{prefix}_{manufacturer_id}_{番号}`形式で生成
- `AddRowModal.tsx`で`manufacturer_id`を取得してID生成に渡す
- `ProductDefinitionPage.tsx`で`generateNewId`を使用するように変更

### 既存データの移行
- ✅ `scripts/migrate-manufacturer-ids-with-references.js`を作成・実行
- ✅ 既存のIDを新しいフォーマットに変換（97件）
- ✅ 関連テーブルのID参照更新（197件）
  - `product_colors.color_id`を更新
  - `product_sizes.size_id`を更新（ファイルが存在する場合）
  - `product_color_sizes.size_id`, `color_id`を更新（ファイルが存在する場合）

### ID管理設定の更新
- ✅ `id_formats`テーブルに`is_manufacturer_dependent`カラムを追加
- ✅ ID生成ロジックで`id_formats`テーブルの設定を読み取るように変更
- ✅ ID管理ツールUIに「メーカー依存」チェックボックスを追加

