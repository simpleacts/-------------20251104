## tool_dependencies.csv 現状整理

2025-11-14 時点で `templates/system/tool_dependencies.csv` を走査した結果、以下の状況でした。

- 参照テーブル総数: 767 行（重複含む）
- ユニークなテーブル名: 180
- `templates/**.csv` 側のユニークテーブル名: 178
- 差分（CSVに存在しないが依存に記載されているもの）: 36

### 差分カテゴリと推奨対応

| 区分 | テーブル名 | 状態 / 推奨対応 |
| --- | --- | --- |
| ヘッダー | `table_name` | CSVヘッダーがそのままデータとして読み込まれているので、`tool_dependencies.csv` 先頭行をパースから除外するか、スクリプト側で無視する。 |
| 既存ファイルへのリネームで解決可能（2025-11-14 対応済） | `language_settings_app_manager` → `language_settings_app_management` | tool_dependencies / CSV 解消済み |
|  | `language_settings_architecture_designer` → `language_settings_architecture` | 同上 |
|  | `language_settings_estimator` → `language_settings_estimator_settings` | 同上 |
|  | `language_settings_image_converter` → `language_settings_image_file_name_converter` | 同上 |
| メーカー依存テーブル（CSVファイル名が `manu_****` になるためベース名だけでは存在しない） | `colors`, `importer_mappings`, `incoming_stock`, `product_colors`, `product_details`, `product_price_group_items`, `product_price_groups`, `product_prices`, `product_tags`, `products_master`, `sizes`, `skus`, `stock`, `stock_history`, `product_color_sizes`, `product_sizes` | `getCsvPath()` がメーカー別ファイルを解決する仕組みを持っているので、依存リスト上は残しておきつつ「派生テーブル扱いである」ことをドキュメント化。将来的には `tool_dependencies` では `stock` のようなベース名を登録し、ローダー側で `manu_****` を展開する。 |
| CSVファイル自体が存在しない言語設定（2025-11-14 追加済） | なし | 上記14テーブル分のCSVを `templates/languages/**` と `dist/templates/languages/**` に生成し、プレースホルダー文言を登録済み。 |
| その他 | なし | 現時点で未整備の言語テーブルはありません。 |

> ※ `language_settings_email_settings` など「language_settings_◯◯」だが CSV が存在しない項目は、各ツールの動作に応じて後日 CSV 新規作成するか、`language_settings_common` へ切り替える判断が必要です。

### 2025-11-15 更新
- `scripts/verify-csv-sql-consistency.js` が `Routes.tsx` から `ALL_TOOLS` を自動抽出するようになり、ツール追加時の二重管理を解消。
- 同スクリプトに `tool_dependencies` → CSV 存在チェックを追加し、`stock` などメーカー派生テーブルを除く全テーブルで CSV の有無を CI で検知できるようにした。

### 次ステップ
1. **リネームで解決できる 4 件** を `tool_dependencies.csv` と `Routes.tsx` のフォールバック定義で置換する。 _(2025-11-14 完了)_  
2. **メーカー依存テーブル** についてはドキュメント化のみ行い、ローダー側でベース名→実ファイルを展開する仕組みを維持。  
3. `tool_dependencies` / `Routes.tsx` と CSV 名称の突き合わせチェックを自動化し、ズレた場合に CI が検知する仕組みを追加。 _(2025-11-15: `verify-csv-sql-consistency.js` で実装)_  
4. `scripts/verify-csv-sql-consistency.js` にも「依存テーブルが実CSVに存在するか」の検証を組み込む。 _(同上)_  
5. 今後は、`database-schema-manager` 以外のツールについても AppMode（live / csv-writable）分岐を実装し、CSVソースのみで動かせるよう整備していきます。

