/**
 * CSVファイルをツールごとのフォルダに移動するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');

// テーブル名からツールフォルダへのマッピング
const tableToToolFolder = {
    // メーカー別管理（既存 - 移動しない）
    // 'sizes': 'manufacturers',
    // 'product_colors': 'manufacturers',
    
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
    
    // 商品データ管理
    'products_master': 'product-management',
    'product_details': 'product-management',
    'product_prices': 'product-management',
    'product_price_groups': 'product-management',
    'product_price_group_items': 'product-management',
    'product_tags': 'product-management',
    'skus': 'product-management',
    'stock': 'product-management',
    'incoming_stock': 'product-management',
    'importer_mappings': 'product-management',
    
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
    'colors': 'common',
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
    'language_settings': 'common',
    'languages': 'common',
};

console.log('CSVファイルをツールごとのフォルダに移動中...\n');

let movedCount = 0;
let skippedCount = 0;

Object.entries(tableToToolFolder).forEach(([tableName, toolFolder]) => {
    const sourcePath = path.join(templatesDir, `${tableName}.csv`);
    const targetDir = path.join(templatesDir, toolFolder);
    const targetPath = path.join(targetDir, `${tableName}.csv`);
    
    if (fs.existsSync(sourcePath)) {
        try {
            // ターゲットディレクトリが存在することを確認
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            // ファイルを移動
            fs.renameSync(sourcePath, targetPath);
            console.log(`✓ 移動: ${tableName}.csv -> ${toolFolder}/`);
            movedCount++;
        } catch (error) {
            console.error(`✗ エラー: ${tableName}.csv の移動に失敗: ${error.message}`);
        }
    } else {
        console.log(`  スキップ: ${tableName}.csv (ファイルが存在しません)`);
        skippedCount++;
    }
});

console.log(`\n完了しました！`);
console.log(`移動: ${movedCount}件`);
console.log(`スキップ: ${skippedCount}件`);
process.exit(0);
