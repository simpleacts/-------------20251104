# 先頭0保持の修正

## 問題

CSVファイルで読み込む際に、数値として解釈される値（例：`00085`）が数値（`85`）に変換されてしまい、先頭の0が失われていました。

## 原因

`parseCSV`関数が値が数値として解釈できる場合、自動的に`Number()`で変換していました。

## 解決策

コード系のカラム（`code`, `sizeCode`, `colorCode`など）を常に文字列として扱うように修正しました。

### 修正箇所

1. **`src/shared/utils/csv.ts`**
   - `codeColumns`配列を定義
   - コード系カラムは数値変換をスキップ

2. **`src/core/data/db.live.ts`**
   - `inferSchema`関数でコード系カラムを常に`TEXT`型として扱う

3. **`src/features/data-io/services/workerService.ts`**
   - Worker内のCSVパーサーも同様に修正

### 対象カラム

以下のカラム名は常に文字列として扱われます：
- `code`
- `sizeCode`
- `colorCode`
- `size_code`
- `color_code`
- `product_code`
- `jan_code`

### CSVファイルの修正

既存のCSVファイルで先頭0が必要な値は、引用符で囲むことを推奨します：
```csv
id,code
product_001,"00085"
```

ただし、パーサーの修正により、引用符がなくてもコード系カラムは文字列として扱われます。

## 注意事項

- 新しいコード系カラムを追加する場合は、`codeColumns`配列に追加してください
- CSVファイルで数値として扱いたいカラムは、コード系カラム名を避けてください

