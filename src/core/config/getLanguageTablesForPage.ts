/**
 * ページごとに必要な言語設定テーブルを取得
 */

import { COMMON_LANGUAGE_TABLE, getLanguageTableName } from '../../shared/utils/languageUtils';
import { Page } from './Routes';

/**
 * ページごとに必要な言語設定テーブルを取得
 * @param page ページ名
 * @returns 必要な言語設定テーブル名の配列
 */
export function getLanguageTablesForPage(page: Page): string[] {
    const tables: string[] = [
        COMMON_LANGUAGE_TABLE, // 共通の言語設定は常に必要
    ];
    
    // ツール固有の言語設定テーブルを追加
    const toolTableName = getLanguageTableName(page);
    tables.push(toolTableName);
    
    return tables;
}

/**
 * すべての言語設定テーブル名を取得（初期読み込み用）
 */
export function getAllLanguageTableNames(): string[] {
    return [
        COMMON_LANGUAGE_TABLE,
        'language_settings_customer_management',
        'language_settings_order_management',
        'language_settings_product_management',
        'language_settings_user_manager',
        'language_settings_language_manager',
        'language_settings_accounting',
        'language_settings_ai_task_management',
        'language_settings_app_management',
        'language_settings_architecture',
        'language_settings_backup_manager',
        'language_settings_data_io',
        'language_settings_dev_lock_manager',
        'language_settings_dev_tools',
        'language_settings_display_settings',
        'language_settings_document',
        'language_settings_estimator_settings',
        'language_settings_google_api_settings',
        'language_settings_hub',
        'language_settings_id_manager',
        'language_settings_image_batch_linker',
        'language_settings_image_file_name_converter',
        'language_settings_inventory_management',
        'language_settings_module_catalog',
        'language_settings_pdf_item_group_manager',
        'language_settings_pdf_preview_settings',
        'language_settings_pdf_template_manager',
        'language_settings_php_info_viewer',
        'language_settings_pricing_management',
        'language_settings_product_definition',
        'language_settings_production_settings',
        'language_settings_shipping_logic_tool',
        'language_settings_silkscreen',
        'language_settings_system_diagnostics',
        'language_settings_system_logs',
        'language_settings_tool_dependency_manager',
        'language_settings_tool_dependency_scanner',
        'language_settings_tool_guide',
        'language_settings_worksheet',
        'language_settings_database_schema_manager',
        'language_settings_module_list',
        // 後方互換性のため
        'language_settings',
    ];
}

