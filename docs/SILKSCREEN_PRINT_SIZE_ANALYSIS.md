# シルクスクリーンのプリントサイズ確認結果

## 確認日: 2025-01-XX

## 現在の状況

### 1. 型定義
- **ファイル**: `src/shared/types/estimator.ts`
- **定義**: `export type PrintSize = '10x10' | '30x40' | '35x50';`
- **問題**: ハードコードされたリテラル型

### 2. UI実装
- **ファイル**: `src/features/estimator/modals/PrintDesignForm.tsx` (164行目)
- **実装**: 
  ```tsx
  <select>
    <option value="10x10">10x10</option>
    <option value="30x40">30x40</option>
    <option value="35x50">35x50</option>
  </select>
  ```
- **問題**: ハードコードされた選択肢

### 3. データベーステーブル
- **テーブル名**: `additional_print_costs_by_size`
- **構造**: 
  ```sql
  CREATE TABLE `additional_print_costs_by_size` (
    `size` VARCHAR(255) NOT NULL,
    `cost` INT,
    PRIMARY KEY (`size`)
  )
  ```
- **用途**: プリントサイズごとの追加コストを管理
- **現状**: CSVファイルには`35x50`のみが登録されている

### 4. 使用箇所
- **ファイル**: `src/features/silkscreen/services/silkscreenService.ts` (66行目)
- **使用**: `pricing.additionalPrintCostsBySize[design.size!]`
- **動作**: データベースから取得したコストデータを使用

## 結論

### ✅ 既存テーブルで対応可能

`additional_print_costs_by_size`テーブルが既にプリントサイズを管理しているため、**新しいテーブルを作成する必要はありません**。

### 実装方針

1. **型定義の変更**: `PrintSize`型を`string`に変更（またはUnion型から動的型に）
2. **UI実装の変更**: `PrintDesignForm.tsx`で`additional_print_costs_by_size`テーブルから動的に選択肢を取得
3. **初期データの追加**: `templates/additional_print_costs_by_size.csv`に`10x10`と`30x40`を追加（コストは0でも可）

### 注意事項

- `sizes`テーブルは**商品サイズ（S, M, Lなど）**を管理しており、プリントサイズとは別物
- `additional_print_costs_by_size`テーブルは**プリントサイズ**を管理する正しいテーブル
- コストが0のサイズでも登録が必要（選択肢として表示するため）

## 推奨実装

1. CSVファイルの更新: `10x10`, `30x40`, `35x50`をすべて登録
2. UI実装の変更: データベースから動的に取得
3. 型定義の変更: `PrintSize`を`string`に変更（または動的型に）

この実装により、プリントサイズの追加・変更が商品定義管理から可能になります。

