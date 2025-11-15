/**
 * CSVファイルのパスを解決するユーティリティ
 * ツールごとのフォルダ構造に対応
 */

import { getManufacturerFileName, parseManufacturerTableName } from '../config/tableNames';

// テーブル名からツールフォルダへのマッピング
const TABLE_TO_TOOL_FOLDER: Record<string, string> = {
    // メーカー別管理（既存）
    'products_master': 'manufacturers',
    'product_details': 'manufacturers',
    'product_tags': 'manufacturers',
    // 注意: product_colors, product_prices, skus, colors, sizes, incoming_stockは非推奨（stockテーブルから取得）
    'stock': 'manufacturers',
    'importer_mappings': 'manufacturers',
    
    // 商品定義管理
    'time_units': 'product-definition',
    'calculation_logic_types': 'product-definition',
    'ink_product_types': 'product-definition',
    'weight_volume_units': 'product-definition',
    'free_input_item_types': 'product-definition',
    'color_libraries': 'product-definition',
    'color_library_types': 'product-definition',
    'payment_methods': 'product-definition',
    
    // メール管理
    'email_accounts': 'email-management',
    'email_templates': 'email-management',
    'email_labels': 'email-management',
    'email_attachments': 'email-management',
    'emails': 'email-management',
    'email_general_settings': 'email-management',
    'email_settings': 'email-management',
    'email_label_ai_rules': 'email-management',
    
    // タスク設定
    'task_master': 'task-settings',
    'task_generation_rules': 'task-settings',
    'task_time_settings': 'task-settings',
    'quote_tasks': 'task-settings',
    
    // インク配合管理
    'ink_recipes': 'ink-mixing',
    'ink_recipe_components': 'ink-mixing',
    'ink_recipe_usage': 'ink-mixing',
    'ink_products': 'ink-mixing',
    'ink_series': 'ink-mixing',
    'ink_manufacturers': 'ink-mixing',
    'pantone_colors': 'ink-mixing',
    'dic_colors': 'ink-mixing',
    
    // 業務管理
    'quotes': 'order-management',
    'quote_items': 'order-management',
    'quote_designs': 'order-management',
    'quote_history': 'order-management',
    'quote_status_master': 'order-management',
    'payment_status_master': 'order-management',
    'production_status_master': 'order-management',
    'shipping_status_master': 'order-management',
    'data_confirmation_status_master': 'order-management',
    'shipping_carriers': 'order-management',
    'bills': 'order-management',
    'bill_items': 'order-management',
    
    
    // 価格設定
    'plate_costs': 'pricing',
    'special_ink_costs': 'pricing',
    'additional_print_costs_by_size': 'pricing',
    'additional_print_costs_by_location': 'pricing',
    'additional_print_costs_by_tag': 'pricing',
    'print_pricing_tiers': 'pricing',
    'print_pricing_schedules': 'pricing',
    'category_pricing_schedules': 'pricing',
    'pricing_rules': 'pricing',
    'pricing_assignments': 'pricing',
    'volume_discount_schedules': 'pricing',
    'print_cost_combination': 'pricing',
    'plate_cost_combination': 'pricing',
    
    // DTF関連
    'dtf_consumables': 'dtf',
    'dtf_equipment': 'dtf',
    'dtf_labor_costs': 'dtf',
    'dtf_press_time_costs': 'dtf',
    'dtf_electricity_rates': 'dtf',
    'dtf_printers': 'dtf',
    'dtf_print_speeds': 'dtf',
    
    // PDF関連
    'pdf_templates': 'pdf',
    'pdf_item_display_configs': 'pdf',
    'pdf_preview_zoom_configs': 'pdf',
    
    // 印刷履歴
    'print_history': 'print-history',
    'print_history_positions': 'print-history',
    'print_history_images': 'print-history',
    'print_location_metrics': 'print-history',
    
    // システム設定
    'settings': 'system',
    'color_settings': 'system',
    'layout_settings': 'system',
    'behavior_settings': 'system',
    'pagination_settings': 'system',
    'company_info': 'system',
    'partner_codes': 'system',
    'google_api_settings': 'system',
    'ai_settings': 'system',
    'gemini_models': 'system',
    'google_fonts': 'system',
    'icons': 'system',
    'users': 'system',
    'roles': 'system',
    'role_permissions': 'system',
    'id_formats': 'system',
    'tool_dependencies': 'system',
    'tool_migrations': 'system',
    'tool_visibility_settings': 'system',
    'mobile_tool_mappings': 'system',
    'sql_export_presets': 'system',
    'work_sessions': 'system',
    'work_session_quotes': 'system',
    'app_logs': 'system',
    'dev_locks': 'system',
    
    // 開発ツール
    'dev_constitution': 'dev',
    'dev_guidelines_recommended': 'dev',
    'dev_guidelines_prohibited': 'dev',
    'dev_roadmap': 'dev',
    
    // モジュール管理
    'modules_core': 'modules',
    'modules_page_tool': 'modules',
    'modules_service': 'modules',
    'modules_other': 'modules',
    'modules_ui_atoms': 'modules',
    'modules_ui_molecules': 'modules',
    'modules_ui_organisms': 'modules',
    'modules_ui_modals': 'modules',
    
    // 共通データ
    'manufacturers': 'common',
    'brands': 'common',
    'categories': 'common',
    'tags': 'common',
    'size_order_master': 'common',
    // 'colors': 'common', // メーカーごとに分割（manufacturersフォルダに移動）
    'print_locations': 'common',
    'print_size_constraints': 'common',
    'category_print_locations': 'common',
    'prefectures': 'common',
    'shipping_costs': 'common',
    'customer_groups': 'common',
    'customers': 'common',
    'additional_options': 'common',
    'gallery_images': 'common',
    'gallery_tags': 'common',
    'filename_rule_presets': 'common',
    'invoice_parsing_templates': 'common',
    'language_settings': 'common', // 後方互換性のため（非推奨）
    'language_settings_common': 'languages/common',
    'language_settings_customer_management': 'languages/customermanagement',
    'language_settings_order_management': 'languages/order-management',
    'language_settings_user_manager': 'languages/user-manager',
    'language_settings_language_manager': 'languages/language-manager',
    'language_settings_estimator_settings': 'languages/estimator-settings',
    'language_settings_worksheet': 'languages/worksheet',
    'language_settings_proofing': 'languages/proofing',
    'language_settings_product_management': 'languages/product-management',
    'language_settings_color_library_manager': 'languages/color-library-manager',
    'language_settings_dev_management': 'languages/dev-management',
    'language_settings_hub': 'languages/hub',
    'language_settings_calculation_logic_manager': 'languages/calculation-logic-manager',
    'language_settings_shipping_logic_tool': 'languages/shipping-logic-tool',
    'language_settings_dev_lock_manager': 'languages/dev-lock-manager',
    'language_settings_app_management': 'languages/app-management',
    'language_settings_php_info_viewer': 'languages/php-info-viewer',
    'language_settings_image_batch_linker': 'languages/image-batch-linker',
    'language_settings_image_file_name_converter': 'languages/image-file-name-converter',
    'language_settings_display_settings': 'languages/display-settings',
    'language_settings_inventory_management': 'languages/inventory-management',
    'language_settings_email_settings': 'languages/email-settings',
    'language_settings_database_schema_manager': 'languages/database-schema-manager',
    'language_settings_database': 'languages/database-schema-manager', // 後方互換性のため（language_settings_database_schema_managerへのエイリアス）
    'language_settings_architecture': 'languages/architecture',
    'language_settings_dtf_cost_calculator': 'languages/dtf-cost-calculator',
    'language_settings_ink_mixing': 'languages/ink-mixing',
    'language_settings_ink_product_management': 'languages/ink-product-management',
    'language_settings_ink_series_management': 'languages/ink-series-management',
    'language_settings_print_history': 'languages/print-history',
    'language_settings_production_scheduler': 'languages/production-scheduler',
    'language_settings_task_settings': 'languages/task-settings',
    'language_settings_tool_exporter': 'languages/tool-exporter',
    'language_settings_tool_porting_manager': 'languages/tool-porting-manager',
    'language_settings_unregistered_module_tool': 'languages/unregistered-module-tool',
    'language_settings_silkscreen_logic_tool': 'languages/silkscreen',
    'languages': 'common',
};

/**
 * テーブル名からCSVファイルのパスを取得
 * @param tableName テーブル名
 * @param manufacturerId メーカーID（sizes, product_colorsの場合のみ使用）
 * @returns CSVファイルのパス（複数の可能性がある場合は配列）
 */
export function getCsvPath(tableName: string, manufacturerId?: string): string[] {
    // server_config.csvはPHP側で直接参照するため、ルートに配置（マッピングしない）
    if (tableName === 'server_config') {
        return [`templates/${tableName}.csv`];
    }
    
    // colors, sizesテーブルはstockテーブルから取得されるため、直接CSVから読み込まない
    if (tableName === 'colors' || tableName === 'sizes' || 
        tableName.startsWith('colors_') || tableName.startsWith('sizes_')) {
        return [];
    }
    
    // テーブル名がメーカー依存テーブル名の形式（stock_0001, stock_manu_0001など）の場合、パースする
    const parsed = parseManufacturerTableName(tableName);
    if (parsed.manufacturerId) {
        // メーカー依存テーブル名が直接渡された場合、ベーステーブル名とmanufacturerIdを抽出
        tableName = parsed.baseTableName;
        // manufacturerIdパラメータが指定されていない場合のみ、パースしたmanufacturerIdを使用
        if (!manufacturerId) {
            let extractedManufacturerId = parsed.manufacturerId;
            // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
            if (extractedManufacturerId.startsWith('manu_')) {
                extractedManufacturerId = extractedManufacturerId.substring(5); // 'manu_'の長さは5
            }
            manufacturerId = extractedManufacturerId;
        }
    }
    
    // tagsテーブルは全メーカー共通とメーカー固有の両方をサポート
    if (tableName === 'tags') {
        const paths: string[] = [];
        // 全メーカー共通のタグ（優先）
        paths.push(`templates/common/${tableName}.csv`);
        // メーカー固有のタグ（指定されている場合、新しいファイル名ルール: manu_{manufacturerId}_tags.csv）
        if (manufacturerId) {
            // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
            let cleanManufacturerId = manufacturerId;
            if (cleanManufacturerId.startsWith('manu_')) {
                cleanManufacturerId = cleanManufacturerId.substring(5);
            }
            paths.push(`templates/manufacturers/manu_${cleanManufacturerId}/manu_${cleanManufacturerId}_tags.csv`);
        }
        return paths;
    }
    
    // メーカー依存テーブルの場合は特別な処理
    // メーカーごとのフォルダから読み込む（統合ファイルは削除済み）
    const manufacturerDependentTables = [
        'products_master', 'product_details', 'product_tags',
        // 注意: product_colors, product_prices, skus, colors, sizes, incoming_stockは非推奨（stockテーブルから取得）
        // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
        'stock', 'importer_mappings'
    ];
    if (manufacturerDependentTables.includes(tableName)) {
        if (manufacturerId) {
            // 特定のメーカーのファイルのみ（新しいファイル名ルール: manu_{manufacturerId}_{tableName}.csv）
            // 注意: products_masterは削除済み（stockテーブルに統合）
            // 注意: product_tagsは削除済み（product_detailsのtagsフィールドで管理）
            if (tableName === 'products_master') {
                // products_masterは削除済みだが、後方互換性のため空配列を返す
                return [];
            } else if (tableName === 'product_tags') {
                // product_tagsは削除済みだが、後方互換性のため空配列を返す
                return [];
            }
            
            // 統一されたファイル名変換関数を使用
            const fileName = getManufacturerFileName(tableName);
            // manufacturerIdに`manu_`プレフィックスが含まれている場合は除去
            let cleanManufacturerId = manufacturerId;
            if (cleanManufacturerId.startsWith('manu_')) {
                cleanManufacturerId = cleanManufacturerId.substring(5);
            }
            return [`templates/manufacturers/manu_${cleanManufacturerId}/manu_${cleanManufacturerId}_${fileName}.csv`];
        }
        // manufacturerIdが指定されていない場合は、loadCsvDatabaseやfetchTablesで全メーカーから読み込む
        // この関数は個別のテーブル読み込み時に使用されるため、ここでは空配列を返す（呼び出し側で処理）
        return [];
    }
    
    // ツールフォルダにマッピングされている場合
    const toolFolder = TABLE_TO_TOOL_FOLDER[tableName];
    if (toolFolder) {
        return [
            `templates/${toolFolder}/${tableName}.csv`, // ツールフォルダから読み込む（優先）
            `templates/${tableName}.csv` // 後方互換性のため直下も試す
        ];
    }
    
    // マッピングがない場合は直下から読み込む
    return [`templates/${tableName}.csv`];
}

/**
 * テーブル名がツールフォルダにマッピングされているか確認
 */
export function isToolSpecificTable(tableName: string): boolean {
    return tableName in TABLE_TO_TOOL_FOLDER;
}

