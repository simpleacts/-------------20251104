# CSVファイル構造の整理 - 実装完了

## 実装日: 2025-01-XX

## 実装内容

### 1. フォルダ構造の作成

メーカーごとのCSVファイルを管理するフォルダ構造を作成しました：

```
templates/
├── manufacturers/
│   ├── manu_0001/
│   │   ├── sizes.csv
│   │   └── product_colors.csv
│   ├── manu_0002/
│   │   ├── sizes.csv
│   │   └── product_colors.csv
│   ├── manu_0003/
│   └── manu_0004/
└── [既存のテーブル名].csv
```

### 2. 既存データの分割

- **`sizes.csv`**: メーカーごとに分割
  - `manu_0001`: size_0017, size_0018, size_0019
  - `manu_0002`: size_0001～size_0016

- **`product_colors.csv`**: 商品のメーカーに基づいて分割
  - `manu_0001`: print-star-* 商品（brnd_0002 → manu_0001）
  - `manu_0002`: united-athle-* 商品（brnd_0001 → manu_0002）

### 3. CSV読み込みロジックの変更

`src/core/data/db.csv.api.ts.txt`の`loadCsvDatabase`関数を修正：

- メーカー依存テーブル（`sizes`, `product_colors`）をメーカーごとのフォルダから読み込む
- 後方互換性を保持（統合ファイルも読み込める）
- 重複除去（同じIDのレコードは1つだけ残す）

### 4. 実装詳細

#### メーカー依存テーブルの読み込みフロー

1. `manufacturers.csv`を読み込んでメーカー一覧を取得
2. 各メーカーIDごとに`templates/manufacturers/{manufacturer_id}/{tableName}.csv`を読み込む
3. 後方互換性のため、`templates/{tableName}.csv`も読み込む（統合ファイル）
4. 重複を除去して統合

#### 重複除去ロジック

- `sizes`テーブル: `id`で重複判定
- `product_colors`テーブル: `product_id + color_id`の組み合わせで重複判定

## メリット

1. **管理のしやすさ**: メーカーごとにファイルが分かれているため、管理が容易
2. **検索の効率化**: メーカーごとに検索できる
3. **拡張性**: 将来の商品タイプ属性管理に対応しやすい
4. **後方互換性**: 既存の統合ファイルも読み込めるようにする

## 実装完了箇所

### クライアント側（TypeScript）

1. ✅ `src/core/data/db.csv.api.ts.txt`: `loadCsvDatabase`関数を修正
2. ✅ `src/core/data/db.live.ts`: 
   - `fetchTables`関数の404フォールバック処理を修正
   - `csv-debug`モードの直接処理も修正

### サーバー側（PHP）

- **PHP APIはデータベースから直接読み込む設計のため、CSV読み込み処理は不要**
- データベースに保存されたデータがそのまま使用される
- クライアント側の`csv-debug`モードでのみCSVファイルが使用される

## 注意事項

1. **統合ファイルは削除済み**: `templates/sizes.csv`と`templates/product_colors.csv`は削除しました。メーカーごとのファイルのみを使用します。
   - メーカーごとのフォルダ（`templates/manufacturers/{manufacturer_id}/sizes.csv`, `templates/manufacturers/{manufacturer_id}/product_colors.csv`）から読み込まれます。
2. **PHP API**: サーバー側はデータベースから直接読み込む設計のため、PHP側でのCSV読み込み処理は不要
3. **server_config.csv**: PHP側で`templates/server_config.csv`として直接参照されるため、ルートに配置します（`system`フォルダには移動しません）
4. **payment_methods.csv**: データベースには存在しますが、CSVファイルがまだ作成されていない場合は`templates/product-definition/payment_methods.csv`に配置されます

## 実装完了（追加）

### CSVエクスポート機能の対応

1. ✅ `src/features/data-io/organisms/CsvExporter.tsx`: メーカーごとのフォルダ構造に対応
   - `sizes`テーブル: `manufacturer_id`でグループ化してメーカーごとにエクスポート
   - `product_colors`テーブル: `product_id`から`manufacturer_id`を取得してグループ化
   - メーカー依存テーブルは自動的にメーカーごとにエクスポート（統合ファイルは作成しない）

### 統合ファイルの削除

1. ✅ 統合ファイルの読み込み処理を削除（`db.csv.api.ts.txt`, `db.live.ts`）
2. ✅ CsvExporterから統合ファイルエクスポートオプションを削除
3. ✅ SaveChangesToCsvModalのプロンプトを更新（メーカーごとのファイル構造を明記）

## 実装完了（追加）

### CSVファイルのツールごとの整理

1. ✅ ツールごとのフォルダ構造を作成（15フォルダ）
2. ✅ CSVファイルをツールごとのフォルダに移動（132件）
3. ✅ CSV読み込みロジックを更新（`csvPathResolver.ts`を追加、`db.csv.api.ts.txt`と`db.live.ts`を更新）
4. ✅ 後方互換性を保持（ツールフォルダが見つからない場合は直下から読み込む）
5. ✅ SaveChangesToCsvModalのプロンプトを更新（ツールごとのフォルダ構造を明記）

## 次のステップ

1. UIでメーカーごとのファイルを編集できる機能を追加（将来的）
2. CSVエクスポート機能をツールごとのフォルダ構造に対応させる（将来的）

