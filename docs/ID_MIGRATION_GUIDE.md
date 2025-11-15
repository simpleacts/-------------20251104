# ID形式統一のための移行ガイド

## 概要

`pantone_colors`と`dic_colors`テーブルのID形式を、他のマスタテーブルと同様に統一形式（`pant_001`, `dicc_001`など）に変更しました。

## 変更内容

### 1. IDフォーマットの追加

`id_formats`テーブルに以下のエントリを追加しました：

- `pantone_colors`: プレフィックス `pant_`, パディング 6桁
- `dic_colors`: プレフィックス `dicc_`, パディング 6桁
- `color_libraries`: プレフィックス `cl_`, パディング 3桁
- `color_library_types`: プレフィックス `clt_`, パディング 3桁

### 2. CSVテンプレートファイルの更新

- `templates/pantone_colors.csv`: IDを `1, 2, ...` → `pant_001, pant_002, ...` に変更
- `templates/dic_colors.csv`: IDを `1, 2, 3, ...` → `dicc_001, dicc_002, dicc_003, ...` に変更

## 既存データの移行が必要な場合

### 影響を受けるテーブル

- `ink_recipes`テーブルの`pantone_id`と`dic_id`フィールドが`pantone_colors`と`dic_colors`のIDを参照しています

### 移行手順（既存データがある場合）

1. **バックアップの作成**
   ```sql
   -- データベース全体のバックアップを取得
   ```

2. **IDマッピングテーブルの作成**
   ```sql
   -- 旧ID → 新IDのマッピングを作成
   CREATE TEMPORARY TABLE pantone_id_mapping (
       old_id VARCHAR(255),
       new_id VARCHAR(255)
   );
   
   CREATE TEMPORARY TABLE dic_id_mapping (
       old_id VARCHAR(255),
       new_id VARCHAR(255)
   );
   ```

3. **IDの更新**
   ```sql
   -- pantone_colorsのIDを更新
   UPDATE pantone_colors SET id = CONCAT('pant_', LPAD(id, 3, '0'));
   
   -- dic_colorsのIDを更新
   UPDATE dic_colors SET id = CONCAT('dicc_', LPAD(id, 3, '0'));
   
   -- ink_recipesの参照を更新
   UPDATE ink_recipes ir
   INNER JOIN pantone_id_mapping pm ON ir.pantone_id = pm.old_id
   SET ir.pantone_id = pm.new_id;
   
   UPDATE ink_recipes ir
   INNER JOIN dic_id_mapping dm ON ir.dic_id = dm.old_id
   SET ir.dic_id = dm.new_id;
   ```

### 注意事項

- **新規インストールの場合**: テンプレートCSVファイルが新しい形式で読み込まれるため、追加の移行作業は不要です
- **既存データがある場合**: 上記の移行手順を実行してください
- **外部キー制約がある場合**: 一時的に外部キー制約を無効化してから移行を行ってください

## 新しいID生成

新しいIDは`idService.ts`の`generateNewId`関数を使用して自動生成されます。ID管理ツールで設定したフォーマットに従って、以下のように生成されます：

- `pantone_colors`: `pant_001`, `pant_002`, ...
- `dic_colors`: `dicc_001`, `dicc_002`, ...
- `color_libraries`: `cl_001`, `cl_002`, ...
- `color_library_types`: `clt_001`, `clt_002`, ...

