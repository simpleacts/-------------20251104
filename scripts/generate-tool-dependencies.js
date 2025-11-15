/**
 * tool_dependencies.csvを生成するスクリプト
 * すべてのツールとその必要なテーブルの組み合わせを生成
 */

const fs = require('fs');
const path = require('path');

// CSV行をパース（引用符対応版）
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // エスケープされたダブルクォート
                currentField += '"';
                i++; // 次の文字をスキップ
            } else {
                // ダブルクォートの開始/終了
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // フィールドの区切り
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // 最後のフィールドを追加
    fields.push(currentField.trim());
    return fields;
}

// ツール名のリスト（Routes.tsxのALL_TOOLSから）
const ALL_TOOLS = [
    'hub', 'order-management', 'ai-task-management', 'production-scheduler', 
    'customer-management', 'email-tool', 'estimator', 'estimator-v2', 
    'proofing', 'worksheet', 'accounts-receivable', 'accounts-payable', 
    'work-record', 'cash-flow-analysis', 'task-analysis',
    'product-management', 'product-definition-tool', 'inventory-management', 
    'pricing-manager', 'pricing-assistant', 'production-settings', 
    'task-settings', 'print-history', 'ink-mixing', 'ink-series-management', 
    'ink-product-management', 'color-library-manager', 'dtf-cost-calculator', 
    'data-io', 'image-converter', 'image-batch-linker', 'pdf-template-manager', 
    'pdf-item-group-manager', 'user-manager', 'permission-manager', 
    'id-manager', 'google-api-settings', 'display-settings', 'email-settings',
    'estimator-settings', 'pdf-preview-settings', 'backup-manager', 
    'system-logs', 'dev-management', 'dev-tools', 'dev-lock-manager',
    'app-manager', 'tool-exporter', 'tool-porting-manager', 'tool-guide',
    'tool-dependency-manager', 'calculation-logic-manager', 
    'tool-dependency-scanner', 'unregistered-module-tool', 
    'architecture-designer', 'php-info-viewer', 'system-diagnostics',
    'module-list', 'language-manager', 'database-schema-manager',
    'silkscreen-logic-tool', 'dtf-logic-tool', 'shipping-logic-tool'
];

// 見積作成ツールの必須テーブル
const ESTIMATOR_ESSENTIAL_TABLES = [
    'settings', 'color_settings', 'layout_settings', 'behavior_settings',
    'brands', 'customer_groups', 'colors', 'sizes', 'tags', 'categories', 
    'manufacturers', 'payment_methods', 'free_input_item_types',
    'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size',
    'additional_print_costs_by_location', 'additional_print_costs_by_tag',
    'print_pricing_tiers', 'shipping_costs',
    'print_cost_combination', 'plate_cost_combination',
    'category_print_locations', 'print_size_constraints', 'print_locations',
    'company_info', 'partner_codes', 'prefectures',
    'pricing_rules', 'pricing_assignments', 'volume_discount_schedules',
    'additional_options',
    'dtf_consumables', 'dtf_equipment', 'dtf_labor_costs',
    'dtf_electricity_rates', 'dtf_printers', 'dtf_print_speeds', 'dtf_press_time_costs',
    'pdf_templates', 'pdf_item_display_configs',
    'product_price_groups', 'product_price_group_items'
];

// 見積作成ツールの遅延読み込みテーブル
const ESTIMATOR_LAZY_TABLES = [
    'products_master', 'product_details', 'product_prices', 'product_colors',
    'customers'
];

// 各ツールが使用するテーブル（getRequiredTablesForPageManualから）
const TOOL_TABLES = {
    'hub': [],
    'order-management': ['quotes', 'customers', 'quote_items', 'quote_tasks', 'task_master', 'quote_designs', 'quote_history', 'quote_status_master', 'payment_status_master', 'payment_methods', 'production_status_master', 'shipping_status_master', 'data_confirmation_status_master', 'shipping_carriers', 'google_api_settings'],
    'ai-task-management': ['quote_tasks', 'quotes', 'customers', 'emails', 'task_master', 'email_accounts', 'email_attachments', 'work_sessions', 'work_session_quotes', 'users'],
    'production-scheduler': ['quotes', 'quote_tasks', 'task_master', 'customers', 'quote_items', 'settings'],
    'customer-management': ['customers', 'quotes', 'customer_groups', 'pagination_settings', 'prefectures'],
    'email-tool': ['emails', 'email_attachments', 'quotes', 'customers', 'email_accounts', 'task_master'],
    'estimator': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'estimator-v2': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'proofing': ['quotes', 'customers', 'products_master', 'product_details', 'brands', 'colors', 'quote_items', 'google_api_settings'],
    'worksheet': ['quotes', 'customers', 'quote_items', 'products_master', 'product_details', 'brands', 'colors', 'company_info'],
    'accounts-receivable': ['quotes', 'customers', 'bills', 'customer_groups'],
    'accounts-payable': ['quotes', 'customers', 'bills', 'customer_groups'],
    'cash-flow-analysis': ['quotes', 'customers', 'bills', 'customer_groups'],
    'task-analysis': ['quote_tasks', 'task_master'],
    'work-record': ['work_sessions', 'work_session_quotes', 'quotes', 'task_master', 'users'],
    'product-management': ['products_master', 'product_details', 'product_prices', 'product_colors', 'product_sizes', 'product_color_sizes', 'product_tags', 'skus', 'stock', 'incoming_stock', 'brands', 'manufacturers', 'categories', 'tags', 'colors', 'sizes', 'importer_mappings', 'product_price_groups', 'product_price_group_items'],
    'inventory-management': ['stock', 'skus', 'products_master', 'product_details', 'colors', 'sizes', 'brands', 'incoming_stock', 'stock_history'],
    'product-definition-tool': ['manufacturers', 'brands', 'categories', 'tags', 'colors', 'sizes', 'product_sizes', 'product_color_sizes', 'print_locations', 'print_size_constraints', 'category_print_locations', 'print_cost_combination', 'plate_cost_combination', 'payment_methods', 'time_units', 'calculation_logic_types', 'ink_product_types', 'weight_volume_units', 'free_input_item_types', 'color_libraries', 'color_library_types'],
    'pricing-manager': ['print_pricing_schedules', 'print_pricing_tiers', 'users', 'roles'],
    'pricing-assistant': ['pricing_rules', 'pricing_assignments', 'category_pricing_schedules', 'plate_costs', 'special_ink_costs', 'additional_print_costs_by_size', 'additional_print_costs_by_location', 'additional_print_costs_by_tag', 'shipping_costs', 'customer_groups', 'manufacturers', 'categories', 'print_pricing_schedules'],
    'production-settings': ['settings'],
    'task-settings': ['task_master', 'task_generation_rules', 'task_time_settings', 'time_units', 'calculation_logic_types'],
    'print-history': ['print_history', 'print_history_positions', 'print_history_images'],
    'ink-mixing': ['ink_recipes', 'ink_recipe_components', 'ink_products', 'ink_series', 'ink_manufacturers', 'pantone_colors', 'dic_colors', 'quotes', 'customers', 'ink_recipe_usage'],
    'ink-series-management': ['ink_series', 'ink_manufacturers'],
    'ink-product-management': ['ink_products', 'ink_series', 'ink_manufacturers', 'ink_product_types', 'weight_volume_units'],
    'color-library-manager': ['pantone_colors', 'dic_colors', 'color_libraries', 'color_library_types'],
    'dtf-cost-calculator': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'data-io': ['brands', 'filename_rule_presets', 'importer_mappings', 'sql_export_presets'],
    'image-converter': ['filename_rule_presets'],
    'image-batch-linker': ['products_master', 'product_details'],
    'pdf-template-manager': ['pdf_templates', 'pdf_item_display_configs'],
    'pdf-item-group-manager': ['pdf_item_display_configs'],
    'user-manager': ['users', 'roles'],
    'permission-manager': ['roles', 'role_permissions'],
    'id-manager': ['id_formats'],
    'google-api-settings': ['google_api_settings', 'email_accounts', 'ai_settings', 'gemini_models'],
    'display-settings': ['color_settings', 'layout_settings', 'behavior_settings', 'tool_visibility_settings', 'pagination_settings'],
    'email-settings': ['settings', 'email_settings', 'ai_settings', 'email_accounts', 'email_templates', 'languages', 'email_labels', 'email_label_ai_rules'],
    'estimator-settings': ['settings'],
    'pdf-preview-settings': ['pdf_preview_zoom_configs'],
    'backup-manager': ['settings'],
    'system-logs': ['app_logs'],
    'dev-management': ['dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'modules_core'],
    'dev-tools': ['settings'],
    'dev-lock-manager': ['dev_locks'],
    'app-manager': ['modules_core'],
    'tool-exporter': [],
    'tool-porting-manager': [],
    'tool-guide': [],
    'tool-dependency-manager': ['tool_dependencies'],
    'calculation-logic-manager': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'tool-dependency-scanner': ['app_logs', 'tool_dependencies'],
    'unregistered-module-tool': ['modules_core', 'modules_page_tool', 'modules_service', 'modules_other', 'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals'],
    'architecture-designer': [],
    'php-info-viewer': [],
    'system-diagnostics': ['settings'],
    'module-list': [],
    'language-manager': ['language_settings_common', 'language_settings_customer_management', 'language_settings_order_management', 'language_settings_product_management', 'language_settings_user_manager', 'language_settings_language_manager', 'language_settings', 'languages'],
    'database-schema-manager': [],
    'silkscreen-logic-tool': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'dtf-logic-tool': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs'],
    'shipping-logic-tool': [...ESTIMATOR_ESSENTIAL_TABLES, ...ESTIMATOR_LAZY_TABLES, 'quotes', 'quote_items', 'quote_designs']
};

// 書き込み許可が必要なテーブル（ツールが編集する可能性があるテーブル）
const WRITABLE_TABLES = {
    'order-management': ['quotes', 'customers', 'quote_items', 'quote_tasks', 'quote_designs'],
    'estimator': ['quotes', 'quote_items', 'quote_designs', 'customers'],
    'estimator-v2': ['quotes', 'quote_items', 'quote_designs', 'customers'],
    'customer-management': ['customers'],
    'email-tool': ['emails', 'email_attachments'],
    'ai-task-management': ['quote_tasks', 'emails', 'work_sessions', 'work_session_quotes'],
    'production-scheduler': ['quotes', 'quote_tasks'],
    'proofing': ['quote_designs'],
    'worksheet': ['quotes'],
    'accounts-receivable': ['quotes', 'bills'],
    'accounts-payable': ['bills'],
    'cash-flow-analysis': [],
    'task-analysis': [],
    'work-record': ['work_sessions', 'work_session_quotes'],
    'product-management': ['products_master', 'product_details', 'product_prices', 'product_colors', 'product_sizes', 'product_color_sizes', 'product_tags', 'skus', 'stock', 'brands', 'manufacturers', 'categories', 'tags', 'colors', 'sizes', 'importer_mappings', 'product_price_groups', 'product_price_group_items'],
    'inventory-management': ['stock', 'incoming_stock', 'stock_history'],
    'product-definition-tool': ['manufacturers', 'brands', 'categories', 'tags', 'colors', 'sizes', 'product_sizes', 'product_color_sizes', 'print_locations', 'print_size_constraints', 'category_print_locations', 'print_cost_combination', 'plate_cost_combination'],
    'pricing-manager': ['print_pricing_schedules', 'print_pricing_tiers'],
    'pricing-assistant': ['pricing_rules', 'pricing_assignments', 'category_pricing_schedules'],
    'production-settings': ['settings'],
    'task-settings': ['task_master', 'task_generation_rules', 'task_time_settings'],
    'print-history': ['print_history', 'print_history_positions', 'print_history_images'],
    'ink-mixing': ['ink_recipes', 'ink_recipe_components', 'ink_recipe_usage'],
    'ink-series-management': ['ink_series'],
    'ink-product-management': ['ink_products'],
    'color-library-manager': ['pantone_colors', 'dic_colors'],
    'dtf-cost-calculator': [],
    'data-io': ['importer_mappings'],
    'image-converter': [],
    'image-batch-linker': ['products_master', 'product_details'],
    'pdf-template-manager': ['pdf_templates', 'pdf_item_display_configs'],
    'pdf-item-group-manager': ['pdf_item_display_configs'],
    'user-manager': ['users', 'roles'],
    'permission-manager': ['roles', 'role_permissions'],
    'id-manager': ['id_formats'],
    'google-api-settings': ['google_api_settings', 'email_accounts', 'ai_settings'],
    'display-settings': ['color_settings', 'layout_settings', 'behavior_settings', 'tool_visibility_settings', 'pagination_settings'],
    'email-settings': ['settings', 'email_settings', 'ai_settings', 'email_accounts', 'email_templates', 'email_labels', 'email_label_ai_rules'],
    'estimator-settings': ['settings'],
    'pdf-preview-settings': ['pdf_preview_zoom_configs'],
    'backup-manager': ['settings'],
    'system-logs': [],
    'dev-management': ['dev_roadmap', 'dev_constitution', 'dev_guidelines_recommended', 'dev_guidelines_prohibited', 'modules_core'],
    'dev-tools': ['settings'],
    'dev-lock-manager': ['dev_locks'],
    'app-manager': ['modules_core'],
    'tool-exporter': [],
    'tool-porting-manager': [],
    'tool-guide': [],
    'tool-dependency-manager': ['tool_dependencies'],
    'calculation-logic-manager': [],
    'tool-dependency-scanner': [],
    'unregistered-module-tool': ['modules_core', 'modules_page_tool', 'modules_service', 'modules_other', 'modules_ui_atoms', 'modules_ui_molecules', 'modules_ui_organisms', 'modules_ui_modals'],
    'architecture-designer': [],
    'php-info-viewer': [],
    'system-diagnostics': [],
    'module-list': [],
    'language-manager': ['language_settings_common', 'language_settings_customer_management', 'language_settings_order_management', 'language_settings_product_management', 'language_settings_user_manager', 'language_settings_language_manager', 'language_settings', 'languages'],
    'database-schema-manager': [],
    'silkscreen-logic-tool': [],
    'dtf-logic-tool': [],
    'shipping-logic-tool': []
};

// 言語設定テーブルを除外する関数
function excludeLanguageTables(tables) {
    return tables.filter(table => !table.startsWith('language_settings'));
}

// CSV行を生成
function generateCsvRow(toolName, tableName, isWritable) {
    const readFields = `[{"strategy":"on_tool_mount","fields":"*"}]`;
    // 書き込み可能な場合は'*'、読み取り専用の場合も明示的に'*'を設定（空文字列は避ける）
    const writeFields = isWritable ? '*' : '*';
    const loadStrategy = 'on_tool_mount';
    const loadCondition = '';
    
    // read_fieldsはJSON形式でカンマを含むため、必ず引用符で囲む
    return `${toolName},${tableName},"${readFields}",${writeFields},${loadStrategy},${loadCondition}`;
}

// メイン処理
function generateToolDependencies() {
    const rows = ['tool_name,table_name,read_fields,write_fields,load_strategy,load_condition'];
    const seen = new Set(); // 重複チェック用
    
    for (const toolName of ALL_TOOLS) {
        const tables = TOOL_TABLES[toolName] || [];
        const writableTables = WRITABLE_TABLES[toolName] || [];
        
        // language-managerの場合は言語設定テーブルを除外しない
        // database-schema-managerとmodule-listの場合は言語設定テーブルを追加
        let nonLanguageTables;
        if (toolName === 'language-manager') {
            nonLanguageTables = tables; // 言語設定テーブルを含める
        } else if (toolName === 'database-schema-manager') {
            // database-schema-managerは言語設定テーブルを使用
            nonLanguageTables = ['language_settings_common', 'language_settings_database_schema_manager'];
        } else if (toolName === 'module-list') {
            // module-listは言語設定テーブルを使用
            nonLanguageTables = ['language_settings_common', 'language_settings_module_list'];
        } else {
            // その他のツールは言語設定テーブルを除外
            nonLanguageTables = excludeLanguageTables(tables);
        }
        
        // 重複を除去
        const uniqueTables = [...new Set(nonLanguageTables)];
        
        for (const tableName of uniqueTables) {
            const key = `${toolName},${tableName}`;
            if (seen.has(key)) {
                console.warn(`Duplicate entry skipped: ${key}`);
                continue;
            }
            seen.add(key);
            
            const isWritable = writableTables.includes(tableName);
            rows.push(generateCsvRow(toolName, tableName, isWritable));
        }
    }
    
    return rows.join('\n');
}

// SQLファイルからエントリを読み込む
function loadSQLEntries() {
    const sqlFile = path.join(__dirname, 'setup-tool-dependencies-write-access.sql');
    if (!fs.existsSync(sqlFile)) {
        console.warn('⚠️ SQLファイルが見つかりません:', sqlFile);
        return new Map();
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    const sqlEntries = new Map();
    
    const insertPattern = /INSERT INTO\s+`?tool_dependencies`?\s*\([^)]+\)\s*VALUES\s*([\s\S]*?)(?:\s*ON DUPLICATE KEY UPDATE|$)/gi;
    let insertMatch;
    
    while ((insertMatch = insertPattern.exec(sqlContent)) !== null) {
        const valuesBlock = insertMatch[1];
        const allValueMatches = Array.from(valuesBlock.matchAll(/\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g));
        
        for (const valueMatch of allValueMatches) {
            const toolName = valueMatch[1];
            const tableName = valueMatch[2];
            const key = `${toolName},${tableName}`;
            sqlEntries.set(key, {
                toolName,
                tableName,
                readFields: valueMatch[3],
                writeFields: valueMatch[4],
                allowedOperations: valueMatch[5],
                loadStrategy: valueMatch[6]
            });
        }
    }
    
    console.log(`📋 SQLファイルから ${sqlEntries.size} 件のエントリを読み込みました`);
    return sqlEntries;
}

// メイン処理
function main() {
    try {
        const outputPath = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');
        
        // 既存のCSVファイルを読み込む
        let existingEntries = new Map();
        let csvHeader = 'tool_name,table_name,read_fields,write_fields,load_strategy,load_condition';
        
        if (fs.existsSync(outputPath)) {
            const csvContent = fs.readFileSync(outputPath, 'utf-8');
            const lines = csvContent.trim().split('\n');
            if (lines.length > 0) {
                csvHeader = lines[0];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const parts = parseCSVLine(line);
                    if (parts.length >= 2) {
                        const key = `${parts[0]},${parts[1]}`;
                        // readFieldsから引用符を除去
                        let readFields = parts[2] || '*';
                        if (readFields.startsWith('"') && readFields.endsWith('"')) {
                            readFields = readFields.slice(1, -1).replace(/""/g, '"');
                        }
                        // 壊れたreadFieldsを修正（引用符が正しく閉じられていない場合）
                        if (readFields.includes('"",fields:*')) {
                            readFields = `[{"strategy":"on_tool_mount","fields":"*"}]`;
                        }
                        existingEntries.set(key, {
                            toolName: parts[0],
                            tableName: parts[1],
                            readFields: readFields,
                            writeFields: parts[3] || '',
                            loadStrategy: parts[4] || 'on_tool_mount',
                            loadCondition: parts[5] || ''
                        });
                    }
                }
            }
            console.log(`📋 既存のCSVファイルから ${existingEntries.size} 件のエントリを読み込みました`);
        }
        
        // 自動生成されたエントリ
        const generatedContent = generateToolDependencies();
        const generatedLines = generatedContent.split('\n').slice(1);
        const generatedEntries = new Map();
        
        generatedLines.forEach(line => {
            if (!line.trim()) return;
            const parts = parseCSVLine(line);
            if (parts.length >= 2) {
                const key = `${parts[0]},${parts[1]}`;
                // readFieldsから引用符を除去
                let readFields = parts[2] || '*';
                if (readFields.startsWith('"') && readFields.endsWith('"')) {
                    readFields = readFields.slice(1, -1).replace(/""/g, '"');
                }
                generatedEntries.set(key, {
                    toolName: parts[0],
                    tableName: parts[1],
                    readFields: readFields,
                    writeFields: parts[3] || '',
                    loadStrategy: parts[4] || 'on_tool_mount',
                    loadCondition: parts[5] || ''
                });
            }
        });
        console.log(`📋 自動生成されたエントリ: ${generatedEntries.size} 件`);
        
        // SQLファイルからエントリを読み込む
        const sqlEntries = loadSQLEntries();
        
        // エントリをマージ（SQLファイルの内容を優先）
        const mergedEntries = new Map();
        
        // 1. 既存のエントリを追加
        existingEntries.forEach((entry, key) => {
            mergedEntries.set(key, entry);
        });
        
        // 2. 自動生成されたエントリを追加（既存がない場合）
        generatedEntries.forEach((entry, key) => {
            if (!mergedEntries.has(key)) {
                mergedEntries.set(key, entry);
            }
        });
        
        // 3. SQLファイルのエントリを追加/更新（SQLファイルの内容を優先）
        let sqlUpdated = 0;
        let sqlAdded = 0;
        sqlEntries.forEach((entry, key) => {
            if (mergedEntries.has(key)) {
                sqlUpdated++;
            } else {
                sqlAdded++;
            }
            // SQLファイルの内容で上書き（write_fieldsとload_strategyを更新）
            mergedEntries.set(key, {
                toolName: entry.toolName,
                tableName: entry.tableName,
                readFields: entry.readFields === '*' ? `[{"strategy":"on_tool_mount","fields":"*"}]` : entry.readFields,
                writeFields: entry.writeFields || '*',
                loadStrategy: entry.loadStrategy || 'on_tool_mount',
                loadCondition: ''
            });
        });
        
        console.log(`📋 SQLファイルから更新: ${sqlUpdated}件、追加: ${sqlAdded}件\n`);
        
        // CSVファイルを生成
        const csvLines = [csvHeader];
        const sortedEntries = Array.from(mergedEntries.values()).sort((a, b) => {
            if (a.toolName !== b.toolName) {
                return a.toolName.localeCompare(b.toolName);
            }
            return a.tableName.localeCompare(b.tableName);
        });
        
        sortedEntries.forEach(entry => {
            let readFields = entry.readFields;
            if (!readFields || (!readFields.startsWith('[') && !readFields.startsWith('{'))) {
                readFields = `[{"strategy":"on_tool_mount","fields":"*"}]`;
            }
            
            // write_fieldsが空の場合は'*'を設定（すべてのツールで明示的に設定）
            const writeFields = entry.writeFields && entry.writeFields.trim() !== '' ? entry.writeFields : '*';
            
            // readFieldsはJSON形式でカンマを含むため、必ず引用符で囲む
            // CSVエスケープ: フィールド内のダブルクォートをエスケープ
            const escapedReadFields = readFields.replace(/"/g, '""');
            
            const line = [
                entry.toolName,
                entry.tableName,
                `"${escapedReadFields}"`,
                writeFields,
                entry.loadStrategy || 'on_tool_mount',
                entry.loadCondition || ''
            ].join(',');
            
            csvLines.push(line);
        });
        
        fs.writeFileSync(outputPath, csvLines.join('\n') + '\n', 'utf-8');

        const totalRows = csvLines.length - 1;
        console.log(`✅ Generated ${outputPath}`);
        console.log(`✅ Total rows: ${totalRows}`);
        console.log(`✅ SQLファイルから更新: ${sqlUpdated}件、追加: ${sqlAdded}件`);
        
        // 正常終了を明示
        process.exit(0);
    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// スクリプトを実行
if (require.main === module) {
    main();
}

