/**
 * database_setup.sql.txtを最新の状態で生成するスクリプト
 * templates/database_setup.sql.txtをベースに、最新のテーブル一覧からDROP文を生成します
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const templateFile = path.join(templatesDir, 'database_setup.sql.txt');
const outputFile = path.join(__dirname, '..', 'dist', 'database_setup.sql.txt');
const templatesOutputFile = path.join(templatesDir, 'database_setup.sql.txt');

// すべてのテーブル名を取得（tableNames.tsから）
const ALL_TABLE_NAMES = [
    'settings', 'color_settings', 'layout_settings', 'behavior_settings', 'pagination_settings',
    'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size', 
    'additional_print_costs_by_location', 'print_pricing_tiers', 'shipping_costs', 
    'company_info', 'partner_codes', 'print_locations', 
    'print_size_constraints', 'sizes', 'tags', 'categories', 'customers', 'brands', 'manufacturers',
    'colors', 'products_master', 'product_details', 
    'product_prices', 'product_price_groups', 'product_price_group_items',
    'product_tags', 'product_colors', 'product_sizes', 'product_color_sizes', 'stock', 
    'additional_print_costs_by_tag', 'print_cost_combination', 'plate_cost_combination', 
    'category_print_locations', 'quotes', 'quote_items', 'quote_designs', 'quote_history',
    'quote_status_master', 'payment_status_master', 'payment_methods', 'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units', 'free_input_item_types', 'color_libraries', 'color_library_types', 'production_status_master', 
    'shipping_status_master', 'data_confirmation_status_master', 'prefectures',
    'print_pricing_schedules', 'category_pricing_schedules', 'customer_groups',
    'shipping_carriers',
    'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    'skus', 'incoming_stock', 'stock_history', 'importer_mappings', 'filename_rule_presets',
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
    'email_settings',
    'email_labels',
    'email_label_ai_rules',
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
    'language_settings_inventory_management',
    'language_settings_database_schema_manager',
    'language_settings_module_list',
    'languages',
    'icons',
    'gemini_models',
    'modules_core',
    'modules_other',
    'modules_page_tool',
    'modules_service',
    'modules_ui_atoms',
    'modules_ui_modals',
    'modules_ui_molecules',
    'modules_ui_organisms',
    'google_fonts',
    'server_config'
];

// メーカー依存テーブルのリスト
const MANUFACTURER_DEPENDENT_TABLES = [
    'sizes', 'colors', 'product_colors', 'product_sizes', 'product_color_sizes',
    'products_master', 'product_details', 'product_prices', 'product_tags',
    'skus', 'stock', 'incoming_stock', 'importer_mappings'
];

// メーカーIDのリストを取得（templates/manufacturers/ から）
function getManufacturerIds() {
    const manufacturersDir = path.join(templatesDir, 'manufacturers');
    if (!fs.existsSync(manufacturersDir)) {
        return [];
    }
    
    const items = fs.readdirSync(manufacturersDir, { withFileTypes: true });
    return items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort();
}

// すべてのテーブル名を取得（メーカー依存テーブルを含む）
function getAllTableNamesWithManufacturers() {
    const tableNames = [...ALL_TABLE_NAMES];
    const manufacturerIds = getManufacturerIds();
    
    // メーカー依存テーブルを除外（メーカーごとのテーブル名に置き換える）
    const baseTableNames = tableNames.filter(name => !MANUFACTURER_DEPENDENT_TABLES.includes(name));
    
    // メーカー依存テーブルをメーカーごとに追加
    manufacturerIds.forEach(manufacturerId => {
        MANUFACTURER_DEPENDENT_TABLES.forEach(baseTableName => {
            const manufacturerTableName = `${baseTableName}_${manufacturerId}`;
            baseTableNames.push(manufacturerTableName);
        });
    });
    
    return baseTableNames.sort();
}

// DROP文を生成
function generateDropStatements() {
    const allTableNames = getAllTableNamesWithManufacturers();
    const dropStatements = [];
    
    dropStatements.push('--');
    dropStatements.push('-- Drop Existing Tables');
    dropStatements.push('--');
    
    allTableNames.forEach(tableName => {
        dropStatements.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    });
    
    return dropStatements.join('\n');
}

// database_setup.sql.txtを生成
function generateDatabaseSetup() {
    console.log('=== database_setup.sql.txtを生成中 ===\n');
    
    // テンプレートファイルを読み込む
    if (!fs.existsSync(templateFile)) {
        console.error(`エラー: テンプレートファイルが見つかりません: ${templateFile}`);
        process.exit(1);
    }
    
    const templateContent = fs.readFileSync(templateFile, 'utf-8');
    
    // DROP文のセクションを置き換え
    const dropSectionRegex = /^--\s*\n--\s*Drop Existing Tables\s*\n--\s*\n([\s\S]*?)(?=^--\s*\n--\s*Create Table Structures)/m;
    const newDropStatements = generateDropStatements();
    
    let newContent;
    if (dropSectionRegex.test(templateContent)) {
        // 既存のDROP文セクションを置き換え
        newContent = templateContent.replace(dropSectionRegex, newDropStatements + '\n\n');
    } else {
        // DROP文セクションが見つからない場合は、CREATE文の前に挿入
        const createSectionRegex = /^--\s*\n--\s*Create Table Structures/m;
        if (createSectionRegex.test(templateContent)) {
            newContent = templateContent.replace(createSectionRegex, newDropStatements + '\n\n$&');
        } else {
            // CREATE文セクションも見つからない場合は、SET FOREIGN_KEY_CHECKS=0の後に挿入
            const foreignKeyRegex = /(SET FOREIGN_KEY_CHECKS=0;)/;
            if (foreignKeyRegex.test(templateContent)) {
                newContent = templateContent.replace(foreignKeyRegex, `$1\n\n${newDropStatements}\n`);
            } else {
                console.error('エラー: テンプレートファイルの構造を認識できませんでした。');
                process.exit(1);
            }
        }
    }
    
    // distディレクトリが存在することを確認
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    // 出力ファイルに書き込み
    fs.writeFileSync(outputFile, newContent, 'utf-8');
    console.log(`✓ ${outputFile} を生成しました`);
    
    // テンプレートファイルも更新（オプション）
    fs.writeFileSync(templatesOutputFile, newContent, 'utf-8');
    console.log(`✓ ${templatesOutputFile} を更新しました`);
    
    const allTableNames = getAllTableNamesWithManufacturers();
    console.log(`\n生成されたDROP文の数: ${allTableNames.length}`);
    console.log('=== 生成完了 ===\n');
}

// 実行
if (require.main === module) {
    try {
        generateDatabaseSetup();
        process.exit(0);
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { generateDatabaseSetup };

