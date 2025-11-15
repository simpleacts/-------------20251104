# CSVファイル構造の整理提案

## 提案日: 2025-01-XX

## 背景

現在、`sizes`と`product_colors`は全メーカー統合の1つのCSVファイルで管理されていますが、メーカーごとに分けることで管理がしやすくなります。

また、異なる商品タイプ（Tシャツ、傘、DTF商品、フィルムなど）で必要な属性が異なるため、柔軟な管理システムが必要です。

## 現状の問題点

### 1. sizesテーブル
- **現在**: `templates/sizes.csv`（全メーカー統合）
- **問題**: メーカーごとにサイズ体系が異なるため、1つのファイルで管理しにくい
- **データ**: 既に`manufacturer_id`カラムがある

### 2. product_colorsテーブル
- **現在**: `templates/product_colors.csv`（全商品統合）
- **問題**: メーカーごとに商品を管理したいが、現在は統合ファイル
- **データ**: `product_id`と`color_id`の関連のみ

### 3. 異なる商品タイプの属性管理
- **Tシャツ**: カラー + サイズ（S, M, Lなど）
- **傘**: カラーのみ
- **DTFインク**: カラー + 容量（1L, 500ml）
- **DTFパウダー**: 容量（1Kg）
- **フィルム**: 幅（30cm, 40cm, 60cm）

## 提案する構造

### オプション1: メーカーごとのフォルダ構造（推奨）

```
templates/
├── languages/                    # 言語設定（既存計画）
│   ├── email-management/
│   └── task-settings/
├── manufacturers/                # メーカー別管理（新規）
│   ├── {manufacturer_id}/       # 例: manu_0001/
│   │   ├── sizes.csv            # そのメーカーのサイズ
│   │   ├── colors.csv           # そのメーカーのカラー（オプション）
│   │   └── product_colors.csv   # そのメーカーの商品-カラー関連
│   ├── manu_0001/
│   │   ├── sizes.csv
│   │   └── product_colors.csv
│   └── manu_0002/
│       ├── sizes.csv
│       └── product_colors.csv
├── product-definition/          # 商品定義関連（新規）
│   ├── time_units.csv
│   ├── calculation_logic_types.csv
│   └── ...
└── [既存のテーブル名].csv       # メーカー非依存のテーブル
```

### オプション2: 商品タイプごとの属性管理（将来拡張）

将来的に、商品タイプごとに必要な属性を柔軟に管理できるようにする：

```sql
-- 商品タイプ属性テーブル（新規提案）
CREATE TABLE `product_type_attributes` (
  `id` VARCHAR(255) NOT NULL,
  `product_type_id` VARCHAR(255),  -- 商品タイプ（Tシャツ、傘、DTFインクなど）
  `attribute_type` VARCHAR(255),   -- 'color', 'size', 'volume', 'width'など
  `attribute_name` VARCHAR(255),   -- 表示名
  `sort_order` INT,
  PRIMARY KEY (`id`)
);

-- 商品タイプごとの属性値（新規提案）
CREATE TABLE `product_type_attribute_values` (
  `id` VARCHAR(255) NOT NULL,
  `attribute_id` VARCHAR(255),   -- product_type_attributes.id
  `manufacturer_id` VARCHAR(255), -- メーカーID
  `value_code` VARCHAR(255),      -- 値のコード（'S', 'M', 'L'など）
  `value_name` VARCHAR(255),      -- 値の表示名
  `sort_order` INT,
  PRIMARY KEY (`id`)
);
```

## 実装方針

### フェーズ1: メーカーごとのCSVファイル分離（優先度: 高）

1. **フォルダ構造の作成**
   - `templates/manufacturers/`フォルダを作成
   - 各メーカーIDごとのフォルダを作成

2. **既存データの分割**
   - `templates/sizes.csv`をメーカーごとに分割
   - `templates/product_colors.csv`を商品のメーカーに基づいて分割

3. **CSV読み込みロジックの変更**
   - `db.csv.api.ts`の`loadCsvDatabase`関数を修正
   - メーカーごとのフォルダから読み込むように変更
   - 後方互換性を保つ（既存の統合ファイルも読み込めるように）

4. **データベース構造の確認**
   - `sizes`テーブル: 既に`manufacturer_id`がある ✅
   - `product_colors`テーブル: `product_id`から`manufacturer_id`を取得する必要がある
     - `products_master`テーブルに`manufacturer_id`があるか確認が必要

### フェーズ2: 商品タイプごとの属性管理（将来拡張）

1. 新しいテーブル作成
2. UI実装
3. 既存データの移行

## 実装詳細

### CSV読み込みロジックの変更案

```typescript
// メーカー依存テーブルのリスト
const MANUFACTURER_DEPENDENT_TABLES = ['sizes', 'product_colors'];

export const loadCsvDatabase = async (): Promise<Partial<Database>> => {
    const db: Database = {};
    
    // 1. まずメーカー一覧を取得
    const manufacturersResponse = await fetch('templates/manufacturers.csv');
    const manufacturers = parseCSV(await manufacturersResponse.text());
    
    // 2. メーカー非依存テーブルを読み込む
    const independentTables = ALL_TABLE_NAMES.filter(
        t => !MANUFACTURER_DEPENDENT_TABLES.includes(t)
    );
    
    // 3. メーカー依存テーブルを読み込む
    for (const tableName of MANUFACTURER_DEPENDENT_TABLES) {
        const allData = [];
        for (const manufacturer of manufacturers) {
            const path = `templates/manufacturers/${manufacturer.id}/${tableName}.csv`;
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const data = parseCSV(await response.text());
                    allData.push(...data);
                }
            } catch (e) {
                console.warn(`Failed to load ${path}, skipping.`, e);
            }
        }
        // 後方互換性: 統合ファイルも読み込む
        try {
            const response = await fetch(`templates/${tableName}.csv`);
            if (response.ok) {
                const data = parseCSV(await response.text());
                allData.push(...data);
            }
        } catch (e) {
            // 統合ファイルがない場合はスキップ
        }
        db[tableName] = { data: allData, schema: inferSchema(allData, tableName) };
    }
    
    return db;
};
```

## メリット

1. **管理のしやすさ**: メーカーごとにファイルが分かれているため、管理が容易
2. **検索の効率化**: メーカーごとに検索できる
3. **拡張性**: 将来の商品タイプ属性管理に対応しやすい
4. **後方互換性**: 既存の統合ファイルも読み込めるようにする

## 注意事項

1. **データベース構造**: `product_colors`テーブルから`manufacturer_id`を取得するには、`products_master`テーブルとのJOINが必要
2. **既存データの移行**: 既存の統合CSVファイルをメーカーごとに分割する必要がある
3. **PHP API**: サーバー側のCSV読み込みロジックも同様に変更が必要

