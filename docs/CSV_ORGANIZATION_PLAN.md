# CSVファイルのツールごとの整理計画

## 目的

CSVファイルをツールごとに整理し、管理を容易にする。

## 現在の状況

- すべてのCSVファイルが`templates/`直下に配置されている
- どのツールがどのファイルを使用しているかが不明確
- ファイル数が多く、管理が困難

## 提案する構造

```
templates/
├── manufacturers/              # メーカー別管理（既存）
│   ├── manu_0001/
│   │   ├── sizes.csv
│   │   └── product_colors.csv
│   └── ...
├── languages/                  # 言語設定（新規）
│   ├── email-management/
│   ├── task-settings/
│   └── common/
├── product-definition/         # 商品定義管理（新規）
│   ├── time_units.csv
│   ├── calculation_logic_types.csv
│   ├── ink_product_types.csv
│   ├── weight_volume_units.csv
│   ├── free_input_item_types.csv
│   ├── color_libraries.csv
│   ├── color_library_types.csv
│   └── payment_methods.csv
├── email-management/          # メール管理ツール（新規）
│   ├── email_accounts.csv
│   ├── email_templates.csv
│   ├── email_labels.csv
│   ├── email_attachments.csv
│   ├── emails.csv
│   ├── email_general_settings.csv
│   └── email_settings.csv
├── task-settings/             # タスク設定（新規）
│   ├── task_master.csv
│   ├── task_generation_rules.csv
│   ├── task_time_settings.csv
│   └── quote_tasks.csv
├── ink-mixing/                # インク配合管理（新規）
│   ├── ink_recipes.csv
│   ├── ink_recipe_components.csv
│   ├── ink_recipe_usage.csv
│   ├── ink_products.csv
│   ├── ink_series.csv
│   ├── ink_manufacturers.csv
│   ├── pantone_colors.csv
│   └── dic_colors.csv
├── order-management/          # 業務管理（新規）
│   ├── quotes.csv
│   ├── quote_items.csv
│   ├── quote_designs.csv
│   ├── quote_history.csv
│   ├── quote_status_master.csv
│   ├── payment_status_master.csv
│   ├── production_status_master.csv
│   ├── shipping_status_master.csv
│   ├── data_confirmation_status_master.csv
│   ├── shipping_carriers.csv
│   └── bills.csv
├── product-management/       # 商品データ管理（新規）
│   ├── products_master.csv
│   ├── product_details.csv
│   ├── product_prices.csv
│   ├── product_price_groups.csv
│   ├── product_price_group_items.csv
│   ├── product_tags.csv
│   ├── skus.csv
│   ├── stock.csv
│   ├── incoming_stock.csv
│   └── importer_mappings.csv
├── pricing/                   # 価格設定（新規）
│   ├── plate_costs.csv
│   ├── special_ink_costs.csv
│   ├── additional_print_costs_by_size.csv
│   ├── additional_print_costs_by_location.csv
│   ├── additional_print_costs_by_tag.csv
│   ├── print_pricing_tiers.csv
│   ├── print_pricing_schedules.csv
│   ├── category_pricing_schedules.csv
│   ├── pricing_rules.csv
│   ├── pricing_assignments.csv
│   ├── volume_discount_schedules.csv
│   ├── print_cost_combination.csv
│   └── plate_cost_combination.csv
├── dtf/                       # DTF関連（新規）
│   ├── dtf_consumables.csv
│   ├── dtf_equipment.csv
│   ├── dtf_labor_costs.csv
│   ├── dtf_press_time_costs.csv
│   ├── dtf_electricity_rates.csv
│   ├── dtf_printers.csv
│   └── dtf_print_speeds.csv
├── pdf/                       # PDF関連（新規）
│   ├── pdf_templates.csv
│   ├── pdf_item_display_configs.csv
│   └── pdf_preview_zoom_configs.csv
├── print-history/             # 印刷履歴（新規）
│   ├── print_history.csv
│   ├── print_history_positions.csv
│   ├── print_history_images.csv
│   └── print_location_metrics.csv
├── system/                    # システム設定（新規）
│   ├── settings.csv
│   ├── color_settings.csv
│   ├── layout_settings.csv
│   ├── behavior_settings.csv
│   ├── pagination_settings.csv
│   ├── company_info.csv
│   ├── partner_codes.csv
│   ├── google_api_settings.csv
│   ├── ai_settings.csv
│   ├── gemini_models.csv
│   ├── google_fonts.csv
│   ├── icons.csv
│   ├── users.csv
│   ├── roles.csv
│   ├── role_permissions.csv
│   ├── id_formats.csv
│   ├── tool_dependencies.csv
│   ├── tool_migrations.csv
│   ├── tool_visibility_settings.csv
│   ├── mobile_tool_mappings.csv
│   ├── sql_export_presets.csv
│   ├── work_sessions.csv
│   ├── work_session_quotes.csv
│   ├── app_logs.csv
│   └── dev_locks.csv
├── dev/                       # 開発ツール（新規）
│   ├── dev_constitution.csv
│   ├── dev_guidelines_recommended.csv
│   ├── dev_guidelines_prohibited.csv
│   └── dev_roadmap.csv
├── modules/                   # モジュール管理（新規）
│   ├── modules_core.csv
│   ├── modules_page_tool.csv
│   ├── modules_service.csv
│   ├── modules_other.csv
│   ├── modules_ui_atoms.csv
│   ├── modules_ui_molecules.csv
│   ├── modules_ui_organisms.csv
│   └── modules_ui_modals.csv
└── common/                    # 共通データ（新規）
    ├── manufacturers.csv
    ├── brands.csv
    ├── categories.csv
    ├── tags.csv
    ├── colors.csv
    ├── print_locations.csv
    ├── print_size_constraints.csv
    ├── category_print_locations.csv
    ├── prefectures.csv
    ├── shipping_costs.csv
    ├── customer_groups.csv
    ├── customers.csv
    ├── additional_options.csv
    ├── gallery_images.csv
    ├── gallery_tags.csv
    ├── filename_rule_presets.csv
    ├── invoice_parsing_templates.csv
    └── bill_items.csv
```

## 実装方針

1. **ツールごとのフォルダを作成**
2. **CSVファイルをツールごとに移動**
3. **CSV読み込みロジックを更新して、ツールごとのフォルダから読み込むように変更**
4. **後方互換性を保つ（既存の直下ファイルも読み込めるように）**

## 実装ステップ

### ステップ1: フォルダ構造の作成 ✅
- ツールごとのフォルダを作成（`scripts/create-tool-folders.js`）

### ステップ2: CSVファイルの移動 ✅
- CSVファイルをツールごとのフォルダに移動（`scripts/move-csv-to-tool-folders.js`）
- 132件のファイルを移動完了

### ステップ3: 読み込みロジックの更新 ✅
- `src/core/utils/csvPathResolver.ts`を作成（テーブル名からツールフォルダへのマッピング）
- `src/core/data/db.csv.api.ts.txt`を更新（ツールフォルダから読み込むように変更）
- `src/core/data/db.live.ts`を更新（ツールフォルダから読み込むように変更）
- 後方互換性を保持（ツールフォルダが見つからない場合は直下から読み込む）

## 実装完了 ✅

1. ✅ ツールごとのフォルダ構造を作成
2. ✅ CSVファイルをツールごとのフォルダに移動（132件）
3. ✅ CSV読み込みロジックを更新（ツールフォルダ対応、後方互換性保持）
4. ✅ SaveChangesToCsvModalのプロンプトを更新（ツールごとのフォルダ構造を明記）

## 次のステップ

1. CSVエクスポート機能をツールごとのフォルダ構造に対応させる（将来的）

