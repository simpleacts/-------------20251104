/**
 * メーカー依存テーブルのリスト
 * これらのテーブルはメーカーごとに分離管理される（{tableName}_{manufacturer_id}形式）
 */
export const MANUFACTURER_DEPENDENT_TABLES = [
    'products_master', 'product_details', 'product_tags',
    // 注意: product_prices, product_colors, skusは非推奨（stockテーブルから取得）
    // 注意: colors, sizes, incoming_stockは削除（stockテーブルから直接取得）
    // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理、detailsテーブルにbrandフィールドを追加）
    'stock', 'importer_mappings', 'tags'
    // 'tags'は共通タグ（templates/common/tags.csv）とメーカー固有タグ（templates/manufacturers/manu_{id}/manu_{id}_tags.csv）の両方が存在する
    // フロントエンドのdb.live.tsで特別な処理（共通タグとメーカー固有タグをマージ）が実装されている
] as const;

/**
 * メーカー依存テーブルかどうかを判定
 */
export function isManufacturerDependentTable(tableName: string): boolean {
    return MANUFACTURER_DEPENDENT_TABLES.includes(tableName as any);
}

/**
 * テーブル名をファイル名に変換する
 * 一部のテーブル名はCSVファイル名で異なる名前を使用する
 * @param tableName ベーステーブル名
 * @returns CSVファイル名
 */
export function getManufacturerFileName(tableName: string): string {
    // ファイル名の変換マッピング
    const fileNameMap: Record<string, string> = {
        'product_details': 'details',
        'stock': 'stock',
        'tags': 'tags',
        // 注意: brandsは削除（共通テーブルに変更）
    };
    
    return fileNameMap[tableName] || tableName;
}

/**
 * メーカーIDを含むテーブル名を生成
 * 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_brands)
 */
export function getManufacturerTableName(tableName: string, manufacturerId: string): string {
    const fileName = getManufacturerFileName(tableName);
    return `${manufacturerId}_${fileName}`;
}

/**
 * テーブル名からベーステーブル名とメーカーIDを抽出
 * 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_brands)
 * @returns { baseTableName: string, manufacturerId: string | null }
 */
export function parseManufacturerTableName(tableName: string): { baseTableName: string; manufacturerId: string | null } {
    // まず、manu_で始まる形式をチェック（新しい命名規則）
    if (tableName.startsWith('manu_')) {
        // manu_0001_brands 形式から brands と manu_0001 を抽出
        for (const baseTableName of MANUFACTURER_DEPENDENT_TABLES) {
            // ファイル名の変換を考慮（統一された関数を使用）
            const fileName = getManufacturerFileName(baseTableName);
            
            const suffix = `_${fileName}`;
            if (tableName.endsWith(suffix)) {
                const manufacturerId = tableName.substring(0, tableName.length - suffix.length);
                return { baseTableName, manufacturerId };
            }
        }
    } else {
        // 後方互換性のため、古い命名規則（{tableName}_{manufacturerId}）もサポート
        for (const baseTableName of MANUFACTURER_DEPENDENT_TABLES) {
            const prefix = `${baseTableName}_`;
            if (tableName.startsWith(prefix)) {
                const manufacturerId = tableName.substring(prefix.length);
                return { baseTableName, manufacturerId };
            }
        }
    }
    return { baseTableName: tableName, manufacturerId: null };
}

/**
 * List of all table names in the database.
 * This is a central definition used across the application.
 */
export const ALL_TABLE_NAMES = [
    'settings', 'color_settings', 'layout_settings', 'behavior_settings', 'pagination_settings',
    'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size', 
    'additional_print_costs_by_location', 'print_pricing_tiers', 'shipping_costs', 
    'company_info', 'partner_codes', 'print_locations', 
    'print_size_constraints', 'sizes', 'tags', 'categories', 'customers', 'brands', 'manufacturers',
    'colors', 'products_master', 'product_details', 
    'product_tags', 'stock',
    // 注意: product_colors, product_prices, skusは非推奨（stockテーブルから取得） 
    'additional_print_costs_by_tag', 'print_cost_combination', 'plate_cost_combination', 
    'category_print_locations', 'quotes', 'quote_items', 'quote_designs', 'quote_history',
    'quote_status_master', 'payment_status_master', 'payment_methods', 'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units', 'free_input_item_types', 'color_libraries', 'color_library_types', 'production_status_master', 
    'shipping_status_master', 'data_confirmation_status_master', 'prefectures',
    'print_pricing_schedules', 'category_pricing_schedules', 'customer_groups',
    'shipping_carriers',
    'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    'stock_history', 'importer_mappings', 'filename_rule_presets',
    // 注意: skus, incoming_stockは非推奨（stockテーブルから取得）
    'print_history', 'print_history_positions', 'print_history_images',
    'print_location_metrics',
    'ink_recipes', 'ink_recipe_components', 'ink_products', 'ink_series',
    'ink_manufacturers', 'pantone_colors', 'dic_colors', 'ink_recipe_usage',
    'users', 'roles', 'role_permissions',
    'id_formats',
    'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs', 
    'dtf_press_time_costs', 'dtf_electricity_rates', 'dtf_printers', 'dtf_print_speeds',
    'gallery_images', 'gallery_tags',
    'pdf_templates',
    'pdf_item_display_configs',
    'pdf_preview_zoom_configs',
    'additional_options',
    'app_logs',
    'dev_locks',
    'tool_migrations',
    'tool_dependencies',
    'dev_roadmap',
    'dev_constitution',
    'dev_guidelines_recommended',
    'dev_guidelines_prohibited',
    'task_master',
    'quote_tasks',
    'task_generation_rules',
    'task_time_settings',
    'bills',
    'bill_items',
    'invoice_parsing_templates',
    'emails',
    'email_attachments',
    'email_accounts',
    'google_api_settings',
    'ai_settings',
    'email_templates',
    'email_general_settings',
    'work_sessions',
    'work_session_quotes',
    'sql_export_presets',
    'tool_visibility_settings',
    'mobile_tool_mappings',
    'language_settings', // 後方互換性のため（非推奨）
    'language_settings_common',
    'language_settings_customer_management',
    'language_settings_order_management',
    'language_settings_product_management',
    'language_settings_user_manager',
    'language_settings_language_manager',
    'languages',
    'icons',
    'gemini_models',
    'modules_core',
    'modules_page_tool',
    'google_fonts',
];

