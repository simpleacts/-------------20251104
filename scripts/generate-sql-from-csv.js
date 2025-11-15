/**
 * CSVファイルからデータベース全体のINSERT文を生成するスクリプト
 * ビルド時に実行され、すべてのCSVファイルの内容をSQL INSERT文に変換します
 * 
 * 注意: brandsテーブルは共通テーブルとして管理されています
 * - ファイルパス: templates/common/brands.csv
 * - 全メーカーのブランドを一括管理する共通テーブルです
 * - メーカーごとのbrandsテーブルは削除され、この共通テーブルに統合されました
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const outputFile = path.join(__dirname, '..', 'dist', 'database_data_import.sql');

// メーカー依存テーブルのリスト
// 注意: 削除されたテーブル: sizes, colors, product_colors, product_prices, skus, incoming_stock, products_master
// 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理、detailsテーブルにbrandフィールドを追加）
const MANUFACTURER_DEPENDENT_TABLES = [
    'product_sizes', 'product_color_sizes',
    'product_details', 'product_tags',
    'stock', 'importer_mappings', 'tags'
];

// テーブル名からツールフォルダへのマッピング（csvPathResolver.tsから）
// 注意: 削除されたテーブル（sizes, colors, product_colors, product_prices, skus, incoming_stock, products_master）は削除済み
const TABLE_TO_TOOL_FOLDER = {
    'product_sizes': 'manufacturers',
    'product_color_sizes': 'manufacturers',
    'product_details': 'manufacturers',
    'product_tags': 'manufacturers',
    'stock': 'manufacturers',
    'importer_mappings': 'manufacturers',
    // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
    'tags': 'manufacturers',
    'time_units': 'product-definition',
    'calculation_logic_types': 'product-definition',
    'ink_product_types': 'product-definition',
    'weight_volume_units': 'product-definition',
    'free_input_item_types': 'product-definition',
    'color_libraries': 'product-definition',
    'color_library_types': 'product-definition',
    'payment_methods': 'product-definition',
    'email_accounts': 'email-management',
    'email_templates': 'email-management',
    'email_labels': 'email-management',
    'email_attachments': 'email-management',
    'emails': 'email-management',
    'email_general_settings': 'email-management',
    'email_settings': 'email-management',
    'email_label_ai_rules': 'email-management',
    'task_master': 'task-settings',
    'task_generation_rules': 'task-settings',
    'task_time_settings': 'task-settings',
    'quote_tasks': 'task-settings',
    'ink_recipes': 'ink-mixing',
    'ink_recipe_components': 'ink-mixing',
    'ink_recipe_usage': 'ink-mixing',
    'ink_products': 'ink-mixing',
    'ink_series': 'ink-mixing',
    'ink_manufacturers': 'ink-mixing',
    'pantone_colors': 'ink-mixing',
    'dic_colors': 'ink-mixing',
    'quotes': 'order-management',
    'quote_items': 'order-management',
    'quote_designs': 'order-management',
    'quote_history': 'order-management',
    'quote_status_master': 'order-management',
    'bills': 'order-management',
    'bill_items': 'order-management',
    'shipping_carriers': 'order-management',
    'shipping_status_master': 'order-management',
    'payment_status_master': 'order-management',
    'production_status_master': 'order-management',
    'data_confirmation_status_master': 'order-management',
    'pdf_templates': 'pdf',
    'pdf_preview_zoom_configs': 'pdf',
    'pdf_item_display_configs': 'pdf',
    'print_pricing_tiers': 'pricing',
    'print_pricing_schedules': 'pricing',
    'plate_costs': 'pricing',
    'print_cost_combination': 'pricing',
    'plate_cost_combination': 'pricing',
    'pricing_rules': 'pricing',
    'pricing_assignments': 'pricing',
    'category_pricing_schedules': 'pricing',
    'additional_print_costs_by_location': 'pricing',
    'additional_print_costs_by_size': 'pricing',
    'additional_print_costs_by_tag': 'pricing',
    'special_ink_costs': 'pricing',
    'volume_discount_schedules': 'pricing',
    'print_history': 'print-history',
    'print_history_positions': 'print-history',
    'print_history_images': 'print-history',
    'print_location_metrics': 'print-history',
    // 注意: products_master, product_prices, skus, incoming_stockは削除済み
    'product_details': 'product-management',
    'product_tags': 'product-management',
    'product_price_groups': 'product-management',
    'product_price_group_items': 'product-management',
    'stock': 'product-management',
    'importer_mappings': 'product-management',
    'manufacturers': 'common',
    'brands': 'common', // 共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理
    'categories': 'common',
    'tags': 'common',
    'customers': 'common',
    'customer_groups': 'common',
    'prefectures': 'common',
    'shipping_costs': 'common',
    'print_locations': 'common',
    'print_size_constraints': 'common',
    'category_print_locations': 'common',
    'gallery_images': 'common',
    'gallery_tags': 'common',
    'filename_rule_presets': 'common',
    'invoice_parsing_templates': 'common',
    'additional_options': 'common',
    'language_settings': 'common',
    'languages': 'common',
    // language_settings_*テーブルはlanguagesフォルダ内の各サブフォルダに配置
    'language_settings_common': 'languages/common',
    'language_settings_customer_management': 'languages/customermanagement',
    'language_settings_order_management': 'languages/order-management',
    'language_settings_product_management': 'languages/product-management',
    'language_settings_user_manager': 'languages/user-manager',
    'language_settings_language_manager': 'languages/language-manager',
};

// SQLエスケープ関数
function escapeSql(value, tableName, columnName) {
    if (value === null || value === undefined || value === '') {
        return 'NULL';
    }
    
    // sizeCodeなど、先頭に0が含まれる可能性があるカラムは常に文字列として扱う
    const stringColumns = ['sizeCode', 'code'];
    if (stringColumns.includes(columnName)) {
        const str = String(value);
        return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    }
    
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }
    // 文字列の場合、エスケープしてクォート
    const str = String(value);
    return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// CSVファイルをパース（引用符対応版、複数行フィールド対応）
function parseCSV(csvContent) {
    // Remove BOM (Byte Order Mark) if present
    let text = csvContent;
    if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const rows = [];
    let currentRow = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < text.length) {
        const char = text[i];
        
        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote ("")
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++; // Skip the second quote
                } else {
                    inQuotes = false; // This is the closing quote
                }
            } else {
                field += char;
            }
        } else { // Not in quotes
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(field);
                field = '';
            } else if (char === '\n') {
                currentRow.push(field);
                rows.push(currentRow);
                currentRow = [];
                field = '';
            } else {
                field += char;
            }
        }
        i++;
    }
    
    // Add the last field and row
    currentRow.push(field);
    if (currentRow.length > 0 && !currentRow.every(v => v.trim() === '')) {
        rows.push(currentRow);
    }
    
    // Remove empty rows at the end
    while (rows.length > 0 && rows[rows.length - 1].every(v => v.trim() === '')) {
        rows.pop();
    }
    
    if (rows.length === 0) return { headers: [], rows: [] };
    
    // Find the first non-empty row as header
    let headerRowIndex = 0;
    while (headerRowIndex < rows.length && rows[headerRowIndex].every(v => v.trim() === '')) {
        headerRowIndex++;
    }
    
    if (headerRowIndex >= rows.length) {
        return { headers: [], rows: [] };
    }
    
    const headers = rows[headerRowIndex].map(h => h.trim()).filter(h => h !== '');
    
    if (headers.length === 0) {
        return { headers: [], rows: [] };
    }
    
    const dataRows = [];
    
    for (let j = headerRowIndex + 1; j < rows.length; j++) {
        const values = rows[j];
        
        // Skip completely empty rows
        if (values.every(v => v.trim() === '')) {
            continue;
        }
        
        // カラム数が一致しない場合は、不足分を空文字で埋める
        const paddedValues = [...values];
        while (paddedValues.length < headers.length) {
            paddedValues.push('');
        }
        // カラム数が多すぎる場合は切り詰める
        if (paddedValues.length > headers.length) {
            paddedValues.splice(headers.length);
        }
        
        dataRows.push(paddedValues);
    }
    
    return { headers, rows: dataRows };
}

// テーブル名からCSVファイルパスのマップ（キャッシュ）
let csvPathCache = null;

// templatesフォルダ内のすべてのCSVファイルを再帰的にスキャン
function scanAllCsvFiles() {
    if (csvPathCache) {
        return csvPathCache;
    }
    
    csvPathCache = new Map(); // tableName -> [paths]
    
    // スキップするフォルダ（manufacturersは特別処理のため除外）
    const skipFolders = ['manufacturers'];
    
    function scanDirectory(dirPath, relativePath = '') {
        if (!fs.existsSync(dirPath)) {
            return;
        }
        
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            const relativeItemPath = relativePath ? path.join(relativePath, item.name) : item.name;
            
            // スキップするフォルダをチェック
            if (item.isDirectory()) {
                const folderName = item.name;
                if (!skipFolders.includes(folderName)) {
                    scanDirectory(fullPath, relativeItemPath);
                }
            } else if (item.isFile() && item.name.endsWith('.csv')) {
                const tableName = item.name.replace('.csv', '');
                const relativeFilePath = relativeItemPath;
                
                if (!csvPathCache.has(tableName)) {
                    csvPathCache.set(tableName, []);
                }
                csvPathCache.get(tableName).push(fullPath);
            }
        }
    }
    
    // templatesフォルダを再帰的にスキャン
    scanDirectory(templatesDir);
    
    // メーカー依存テーブルを特別処理
    const manufacturersDir = path.join(templatesDir, 'manufacturers');
    if (fs.existsSync(manufacturersDir)) {
        const manufacturerDirs = fs.readdirSync(manufacturersDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        MANUFACTURER_DEPENDENT_TABLES.forEach(tableName => {
            manufacturerDirs.forEach(manufacturerId => {
                // ファイル名を決定（tableNameに応じて適切なファイル名に変換）
                let fileName = tableName;
                if (tableName === 'product_details') {
                    fileName = 'details';
                } else if (tableName === 'stock') {
                    fileName = 'stock';
                } else if (tableName === 'brands') {
                    fileName = 'brands';
                } else if (tableName === 'tags') {
                    fileName = 'tags';
                }
                // 新しいファイル名ルール: {manufacturerId}_{fileName}.csv
                // manufacturerIdは既にmanu_0001形式なので、manu_プレフィックスは不要
                // 例: manu_0001_brands.csv, manu_0001_stock.csv
                const csvPath = path.join(manufacturersDir, manufacturerId, `${manufacturerId}_${fileName}.csv`);
                if (fs.existsSync(csvPath)) {
                    // メーカーごとに分離されたテーブル名: {manufacturerId}_{fileName} (CSVファイル名と一致)
                    const manufacturerTableName = `${manufacturerId}_${fileName}`;
                    if (!csvPathCache.has(manufacturerTableName)) {
                        csvPathCache.set(manufacturerTableName, []);
                    }
                    csvPathCache.get(manufacturerTableName).push(csvPath);
                }
            });
        });
    }
    
    // ルートレベルのCSVファイル（server_config.csvなど）
    const rootItems = fs.readdirSync(templatesDir, { withFileTypes: true });
    for (const item of rootItems) {
        if (item.isFile() && item.name.endsWith('.csv')) {
            const tableName = item.name.replace('.csv', '');
            const fullPath = path.join(templatesDir, item.name);
            if (!csvPathCache.has(tableName)) {
                csvPathCache.set(tableName, []);
            }
            if (!csvPathCache.get(tableName).includes(fullPath)) {
                csvPathCache.get(tableName).push(fullPath);
            }
        }
    }
    
    return csvPathCache;
}

// テーブル名からCSVファイルパスを取得
function getCsvPaths(tableName) {
    const csvMap = scanAllCsvFiles();
    return csvMap.get(tableName) || [];
}

// すべてのCSVファイルをスキャンしてテーブル名を取得
function getAllTableNames() {
    const csvMap = scanAllCsvFiles();
    return Array.from(csvMap.keys()).sort();
}

// メーカーごとのテーブルのCREATE TABLE文を生成
function generateCreateTableSQL(tableName) {
    // メーカー依存テーブルのベース名を取得
    // 新しい命名規則: {manufacturerId}_{tableName} (例: manu_0001_brands)
    let baseTableName = null;
    let manufacturerId = null;
    
    // まず、manu_で始まる形式をチェック（新しい命名規則）
    if (tableName.startsWith('manu_')) {
        // manu_0001_brands 形式から brands と manu_0001 を抽出
        for (const baseName of MANUFACTURER_DEPENDENT_TABLES) {
            // ファイル名の変換を考慮
            let fileName = baseName;
            if (baseName === 'product_details') {
                fileName = 'details';
            } else if (baseName === 'stock') {
                fileName = 'stock';
            } else if (baseName === 'tags') {
                fileName = 'tags';
            }
            // 注意: brandsは削除（共通テーブルに変更）
            
            const suffix = `_${fileName}`;
            if (tableName.endsWith(suffix)) {
                baseTableName = baseName;
                manufacturerId = tableName.substring(0, tableName.length - suffix.length);
                break;
            }
        }
    } else {
        // 後方互換性のため、古い命名規則（{tableName}_{manufacturerId}）もサポート
        for (const baseName of MANUFACTURER_DEPENDENT_TABLES) {
            const prefix = `${baseName}_`;
            if (tableName.startsWith(prefix)) {
                baseTableName = baseName;
                manufacturerId = tableName.substring(prefix.length);
                break;
            }
        }
    }
    
    if (!baseTableName || !manufacturerId) {
        return null; // メーカーごとのテーブルではない
    }
    
    // 各テーブルのCREATE TABLE文を定義
    // 注意: 削除されたテーブル（colors, sizes, products_master, incoming_stock, product_colors, skus, product_prices）はコメントアウト
    const tableDefinitions = {
        // 'colors': `...`, // 削除済み（stockテーブルから直接取得）
        // 'sizes': `...`, // 削除済み（stockテーブルから直接取得）
        // 'products_master': `...`, // 削除済み（stockテーブルに統合）
        'product_details': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255) NOT NULL,
    \`product_code\` VARCHAR(255) NOT NULL,
    \`productName\` TEXT,
    \`product_name\` TEXT,
    \`description\` TEXT,
    \`images\` TEXT,
    \`tags\` TEXT,
    \`brand\` VARCHAR(255),
    \`meta_title\` TEXT,
    \`meta_description\` TEXT,
    \`og_image_url\` TEXT,
    \`og_title\` TEXT,
    \`og_description\` TEXT,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_product\` (\`manufacturer_id\`, \`product_code\`),
    INDEX \`idx_product_code\` (\`product_code\`),
    INDEX \`idx_manufacturer\` (\`manufacturer_id\`),
    INDEX \`idx_brand\` (\`brand\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        'stock': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255) NOT NULL,
    \`product_code\` VARCHAR(255) NOT NULL,
    \`stock_product_name\` TEXT,
    \`color_code\` VARCHAR(255) NOT NULL,
    \`color_name\` VARCHAR(255),
    \`size_code\` VARCHAR(255) NOT NULL,
    \`size_name\` VARCHAR(255),
    \`quantity\` INT DEFAULT 0,
    \`incoming_quantity_1\` INT DEFAULT 0,
    \`incoming_date_1\` DATE,
    \`incoming_quantity_2\` INT DEFAULT 0,
    \`incoming_date_2\` DATE,
    \`incoming_quantity_3\` INT DEFAULT 0,
    \`incoming_date_3\` DATE,
    \`list_price\` INT,
    \`cost_price\` INT,
    \`jan_code\` VARCHAR(255),
    \`category_id\` VARCHAR(255),
    \`is_published\` TINYINT(1) DEFAULT 0,
    \`brand_id\` VARCHAR(255),
    \`created_at\` DATETIME,
    \`updated_at\` DATETIME,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_sku\` (\`manufacturer_id\`, \`product_code\`(100), \`color_code\`(100), \`size_code\`(100)),
    INDEX \`idx_product\` (\`manufacturer_id\`, \`product_code\`(100)),
    INDEX \`idx_color\` (\`manufacturer_id\`, \`product_code\`(100), \`color_code\`(100)),
    INDEX \`idx_category\` (\`category_id\`),
    INDEX \`idx_brand\` (\`brand_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        // 'incoming_stock': `...`, // 削除済み（stockテーブルのincoming_quantity_1-3, incoming_date_1-3で管理）
        // 'product_colors': `...`, // 削除済み（stockテーブルから取得）
        'product_sizes': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255) NOT NULL,
    \`product_id\` VARCHAR(255),
    \`size_id\` VARCHAR(255),
    \`sort_order\` INT,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_product_sizes_product\` (\`product_id\`),
    INDEX \`idx_product_sizes_size\` (\`size_id\`),
    INDEX \`idx_product_sizes_manufacturer\` (\`manufacturer_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        'product_color_sizes': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255),
    \`product_id\` VARCHAR(255),
    \`color_id\` VARCHAR(255),
    \`size_id\` VARCHAR(255),
    \`sort_order\` INT,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_product_color_sizes_product\` (\`product_id\`),
    INDEX \`idx_product_color_sizes_color\` (\`color_id\`),
    INDEX \`idx_product_color_sizes_size\` (\`size_id\`),
    INDEX \`idx_product_color_sizes_manufacturer\` (\`manufacturer_id\`),
    INDEX \`idx_product_color_sizes_product_color\` (\`product_id\`, \`color_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        // 'skus': `...`, // 削除済み（stockテーブルから取得）
        // 'product_prices': `...`, // 削除済み（stockテーブルから取得）
        'product_tags': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`product_id\` VARCHAR(255) NOT NULL,
    \`tag_id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255),
    PRIMARY KEY (\`product_id\`, \`tag_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        'importer_mappings': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255) NOT NULL,
    \`name\` TEXT,
    \`mapping_json\` TEXT,
    \`csv_structure_json\` TEXT,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`unique_mapping\` (\`manufacturer_id\`, \`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,
        // 注意: brandsは削除（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
        'tags': `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`manufacturer_id\` VARCHAR(255) NOT NULL,
    \`name\` VARCHAR(255) NOT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_manufacturer\` (\`manufacturer_id\`),
    UNIQUE KEY \`unique_name\` (\`manufacturer_id\`, \`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`
    };
    
    if (tableDefinitions[baseTableName]) {
        return `-- Create table ${tableName}${tableDefinitions[baseTableName]}`;
    }
    
    return null; // 定義されていないテーブル
}

// SQL INSERT文を生成
function generateInsertSQL(tableName, headers, rows, options = {}) {
    const sql = [];
    const { skipData = false } = options;
    
    // メーカーごとのテーブルの場合はCREATE TABLE文を生成
    const createTableSQL = generateCreateTableSQL(tableName);
    if (createTableSQL) {
        // DROP文は既にファイルの先頭で生成されているため、ここではCREATE TABLEのみ
        sql.push(createTableSQL);
        sql.push('');
    }
    
    // 在庫関連テーブルの場合はデータを出力しない（DELETE文のみ）
    // ただし、特別処理で呼び出される場合はskipDataオプションで制御
    // 注意: incoming_stockは削除済み（stockテーブルのincoming_quantity_1-3, incoming_date_1-3で管理）
    const isStockTable = (!skipData && /^stock_[a-zA-Z0-9_-]+$/.test(tableName));
    
    sql.push(`-- Insert data into ${tableName}`);
    if (!createTableSQL) {
        // メーカーごとのテーブルでない場合は警告メッセージを削除（既にCREATE TABLE文が生成されているため）
        sql.push(`-- Note: If the table does not exist, this will generate an error.`);
        sql.push(`-- Please ensure the table is created before importing data.`);
    }
    sql.push(`DELETE FROM \`${tableName}\` WHERE 1=1;`);
    
    // 在庫関連テーブルの場合はデータ行を出力しない（特別処理で呼び出される場合は除く）
    if (rows.length > 0 && !isStockTable) {
        // カラム名のマッピング（CSVの古いカラム名を新しいカラム名に変換）
        const columnMapping = {};
        let finalHeaders = [...headers];
        
        // colorsテーブルの場合、code→colorCode, name→colorNameにマッピング
        if (tableName.startsWith('colors_')) {
            const codeIndex = headers.indexOf('code');
            const nameIndex = headers.indexOf('name');
            if (codeIndex >= 0 && !headers.includes('colorCode')) {
                finalHeaders[codeIndex] = 'colorCode';
                columnMapping['code'] = 'colorCode';
            }
            if (nameIndex >= 0 && !headers.includes('colorName')) {
                finalHeaders[nameIndex] = 'colorName';
                columnMapping['name'] = 'colorName';
            }
        }
        
        // sizesテーブルの場合、code→sizeCode, name→sizeNameにマッピング（既にsizeCode/sizeNameの場合はスキップ）
        if (tableName.startsWith('sizes_')) {
            const codeIndex = headers.indexOf('code');
            const nameIndex = headers.indexOf('name');
            if (codeIndex >= 0 && !headers.includes('sizeCode')) {
                finalHeaders[codeIndex] = 'sizeCode';
                columnMapping['code'] = 'sizeCode';
            }
            if (nameIndex >= 0 && !headers.includes('sizeName')) {
                finalHeaders[nameIndex] = 'sizeName';
                columnMapping['name'] = 'sizeName';
            }
        }
        
        // products_masterテーブルは削除済み（stockテーブルに統合）
        // if (tableName.startsWith('products_master_')) { ... }
        
        // product_detailsテーブルの場合、name→productNameにマッピング
        if (tableName.startsWith('product_details_')) {
            const nameIndex = headers.indexOf('name');
            if (nameIndex >= 0 && !headers.includes('productName')) {
                finalHeaders[nameIndex] = 'productName';
                columnMapping['name'] = 'productName';
            }
        }
        
        // tool_dependenciesテーブルの場合、allowed_operationsカラムが存在しない場合は追加
        let hasAllowedOperations = headers.includes('allowed_operations');
        if (tableName === 'tool_dependencies' && !hasAllowedOperations) {
            finalHeaders.push('allowed_operations');
        }
        
        sql.push(`INSERT INTO \`${tableName}\` (\`${finalHeaders.join('`, `')}\`) VALUES`);
        
        const valueLines = rows.map((row, index) => {
            const values = finalHeaders.map((header, colIndex) => {
                let value;
                
                if (tableName === 'tool_dependencies' && header === 'allowed_operations' && !hasAllowedOperations) {
                    // CSVにallowed_operationsカラムがない場合はデフォルト値'*'を設定
                    value = '*';
                } else {
                    // 通常のカラムの処理
                    // マッピングがある場合は、元のカラム名から値を取得
                    const originalHeader = Object.keys(columnMapping).find(k => columnMapping[k] === header) || header;
                    const originalColIndex = headers.indexOf(originalHeader);
                    if (originalColIndex >= 0) {
                        value = Array.isArray(row) ? row[originalColIndex] : row[originalHeader];
                    } else {
                        value = undefined;
                    }
                }
                
                // tool_dependenciesテーブルの場合、write_fieldsとallowed_operationsのデフォルト値を設定
                if (tableName === 'tool_dependencies') {
                    if (header === 'write_fields' && (value === null || value === undefined || value === '')) {
                        value = '*';
                    }
                    if (header === 'allowed_operations' && (value === null || value === undefined || value === '')) {
                        value = '*';
                    }
                }
                
                // sizesテーブルのsizeCodeは文字列として扱う（先頭0を保持）
                if (tableName.startsWith('sizes_') && header === 'sizeCode') {
                    // 数値として解釈されないように、文字列として扱う
                    if (value !== null && value !== undefined && value !== '') {
                        value = String(value);
                    }
                }
                
                // colorsテーブルのcolorCodeは文字列として扱う（先頭0を保持）
                if (tableName.startsWith('colors_') && header === 'colorCode') {
                    // 数値として解釈されないように、文字列として扱う
                    if (value !== null && value !== undefined && value !== '') {
                        value = String(value);
                    }
                }
                
                // products_masterテーブルは削除済み（stockテーブルに統合）
                // if (tableName.startsWith('products_master_') && header === 'productCode') { ... }
                
                return escapeSql(value, tableName, header);
            });
            const line = `(${values.join(', ')})`;
            return index < rows.length - 1 ? `${line},` : line;
        });
        
        sql.push(...valueLines);
        sql.push(';');
    }
    
    sql.push('');
    return sql.join('\n');
}

// メイン処理
function generateSQLFromCSV() {
    const startTime = Date.now();
    console.log('=== CSVファイルからSQL INSERT文を生成中 ===\n');
    
    // distディレクトリが存在することを確認
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    console.log('CSVファイルをスキャン中...');
    const scanStartTime = Date.now();
    const allTableNames = getAllTableNames();
    const scanTime = Date.now() - scanStartTime;
    console.log(`検出されたテーブル数: ${allTableNames.length} (${scanTime}ms)`);
    
    const sqlStatements = [];
    sqlStatements.push('-- ============================================');
    sqlStatements.push('-- データベース全体のデータインポートSQL');
    sqlStatements.push('-- このファイルはビルド時に自動生成されます');
    sqlStatements.push(`-- 生成日時: ${new Date().toISOString()}`);
    sqlStatements.push('-- ============================================');
    sqlStatements.push('');
    sqlStatements.push('SET FOREIGN_KEY_CHECKS=0;');
    sqlStatements.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
    sqlStatements.push('START TRANSACTION;');
    sqlStatements.push('');
    
    // すべてのテーブルに対してDROP文を生成
    sqlStatements.push('--');
    sqlStatements.push('-- Drop Existing Tables');
    sqlStatements.push('--');
    const allTableNamesForDrop = getAllTableNames();
    allTableNamesForDrop.forEach(tableName => {
        sqlStatements.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    });
    sqlStatements.push('');
    
    // templates/database_setup.sql.txtからCREATE TABLE文を読み込んで、CREATE TABLE IF NOT EXISTSに変換
    sqlStatements.push('--');
    sqlStatements.push('-- Create Table Structures');
    sqlStatements.push('--');
    sqlStatements.push('');
    
    const databaseSetupFile = path.join(templatesDir, 'database_setup.sql.txt');
    if (fs.existsSync(databaseSetupFile)) {
        const setupContent = fs.readFileSync(databaseSetupFile, 'utf-8');
        const lines = setupContent.split('\n');
        let inCreateTableSection = false;
        let currentCreateTableLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // CREATE TABLEセクションの開始を検出
            if (trimmedLine.includes('-- Create Table Structures') || trimmedLine.includes('-- Create table')) {
                inCreateTableSection = true;
                continue;
            }
            
            // SET FOREIGN_KEY_CHECKS=1; でセクション終了
            if (trimmedLine.includes('SET FOREIGN_KEY_CHECKS=1') || trimmedLine.includes('COMMIT')) {
                // 最後のCREATE TABLE文を処理
                if (currentCreateTableLines.length > 0) {
                    const combinedStatement = currentCreateTableLines.join(' ').trim();
                    if (combinedStatement) {
                        const convertedStatement = combinedStatement.replace(/^CREATE TABLE\s+/, 'CREATE TABLE IF NOT EXISTS ');
                        sqlStatements.push(convertedStatement);
                    }
                    currentCreateTableLines = [];
                }
                inCreateTableSection = false;
                break;
            }
            
            if (inCreateTableSection) {
                // CREATE TABLE文の開始を検出
                if (trimmedLine.startsWith('CREATE TABLE')) {
                    // 前のCREATE TABLE文があれば処理
                    if (currentCreateTableLines.length > 0) {
                        const combinedStatement = currentCreateTableLines.join(' ').trim();
                        if (combinedStatement) {
                            const convertedStatement = combinedStatement.replace(/^CREATE TABLE\s+/, 'CREATE TABLE IF NOT EXISTS ');
                            sqlStatements.push(convertedStatement);
                        }
                        currentCreateTableLines = [];
                    }
                    // 新しいCREATE TABLE文の開始
                    currentCreateTableLines.push(trimmedLine);
                } else if (currentCreateTableLines.length > 0) {
                    // CREATE TABLE文の続き（複数行の場合）
                    // コメント行はスキップ
                    if (!trimmedLine.startsWith('--') && trimmedLine.length > 0) {
                        currentCreateTableLines.push(trimmedLine);
                        // セミコロンで終了
                        if (trimmedLine.endsWith(';')) {
                            const combinedStatement = currentCreateTableLines.join(' ').trim();
                            if (combinedStatement) {
                                const convertedStatement = combinedStatement.replace(/^CREATE TABLE\s+/, 'CREATE TABLE IF NOT EXISTS ');
                                sqlStatements.push(convertedStatement);
                            }
                            currentCreateTableLines = [];
                        }
                    }
                }
            }
        }
    } else {
        console.warn(`警告: ${databaseSetupFile} が見つかりません。CREATE TABLE文を追加できません。`);
    }
    
    sqlStatements.push('');
    
    let totalRows = 0;
    let processedTables = 0;
    
    allTableNames.forEach((tableName, index) => {
        const tableStartTime = Date.now();
        const csvPaths = getCsvPaths(tableName);
        
        if (csvPaths.length === 0) {
            console.log(`  [${index + 1}/${allTableNames.length}] スキップ: ${tableName} (CSVファイルが見つかりません)`);
            return;
        }
        
        console.log(`  [${index + 1}/${allTableNames.length}] 処理中: ${tableName} (${csvPaths.length}ファイル)`);
        
        // stock_{manufacturer_id}テーブルの場合は、メーカーごとに個別に処理
        if (tableName.startsWith('stock_') && tableName !== 'stock') {
            csvPaths.forEach(csvPath => {
                try {
                    const csvContent = fs.readFileSync(csvPath, 'utf-8');
                    const parsed = parseCSV(csvContent);
                    
                    if (parsed.headers.length === 0) {
                        return;
                    }
                    
                    // 空のCSVファイルでもDELETE文を出力するため、rows.length === 0の場合は処理を続行
                    if (parsed.rows.length === 0) {
                        // 空のCSVファイルでもDELETE文を出力
                        const stockHeaders = [
                            'id', 'manufacturer_id', 'product_code', 'stock_product_name',
                            'color_code', 'color_name', 'size_code', 'size_name',
                            'quantity', 'incoming_quantity', 'incoming_date',
                            'list_price', 'cost_price', 'jan_code', 'created_at', 'updated_at'
                        ];
                        const insertSQL = generateInsertSQL(tableName, stockHeaders, [], { skipData: true });
                        if (insertSQL) {
                            sqlStatements.push(insertSQL);
                            processedTables++;
                        }
                        return;
                    }
                    
                    // 新しい形式（product_code, color_code, size_codeなど）か古い形式（sku_id）かを判定
                    const isNewFormat = parsed.headers.includes('product_code') && 
                                       parsed.headers.includes('color_code') && 
                                       parsed.headers.includes('size_code');
                    
                    if (!isNewFormat && parsed.headers.includes('sku_id')) {
                        // 古い形式（sku_idベース）の場合はスキップ
                        console.log(`    ⚠️  ${tableName}: 古い形式（sku_idベース）のためスキップ。新しい形式に変換してください。`);
                        return;
                    }
                    
                    // 新しい形式の場合はそのまま処理
                    const stockHeaders = [
                            'id', 'manufacturer_id', 'product_code', 'stock_product_name',
                            'color_code', 'color_name', 'size_code', 'size_name',
                            'quantity', 'incoming_quantity', 'incoming_date',
                        'list_price', 'cost_price', 'jan_code', 'created_at', 'updated_at'
                        ];
                        
                    // CSVのヘッダーと新しい構造のヘッダーをマッピング
                    // product_nameをstock_product_nameにマッピング
                    const headerMapping = {
                        'product_name': 'stock_product_name'
                    };
                    
                        const convertedRows = parsed.rows.map((row, index) => {
                            const convertedRow = {};
                        stockHeaders.forEach(header => {
                                // マッピングされたヘッダー名を確認
                                const sourceHeader = Object.keys(headerMapping).find(key => headerMapping[key] === header) || header;
                                if (parsed.headers.includes(sourceHeader) || parsed.headers.includes(header)) {
                                    const actualHeader = parsed.headers.includes(header) ? header : sourceHeader;
                                    convertedRow[header] = Array.isArray(row) 
                                        ? row[parsed.headers.indexOf(actualHeader)]
                                        : row[actualHeader];
                                } else {
                                    // デフォルト値
                                    if (header === 'id') {
                                    const manufacturerId = tableName.replace('stock_', '');
                                    convertedRow[header] = `stock_${manufacturerId}_${index + 1}`;
                                    } else if (header === 'manufacturer_id') {
                                    const manufacturerId = tableName.replace('stock_', '');
                                        convertedRow[header] = manufacturerId;
                                    } else {
                                        convertedRow[header] = null;
                                    }
                                }
                            });
                            return convertedRow;
                        });
                        
                    const insertSQL = generateInsertSQL(tableName, stockHeaders, convertedRows, { skipData: true });
                        if (insertSQL) {
                            sqlStatements.push(insertSQL);
                            totalRows += convertedRows.length;
                            processedTables++;
                    }
                } catch (error) {
                    console.error(`    エラー: ${csvPath} の読み込みに失敗しました - ${error.message}`);
                }
            });
            return;
        }
        
        // incoming_stockテーブルは削除済み（stockテーブルのincoming_quantity_1-3, incoming_date_1-3で管理）
        // if (tableName.startsWith('incoming_stock_') && tableName !== 'incoming_stock') {
        if (false && tableName.startsWith('incoming_stock_') && tableName !== 'incoming_stock') {
            csvPaths.forEach(csvPath => {
                try {
                    const csvContent = fs.readFileSync(csvPath, 'utf-8');
                    const parsed = parseCSV(csvContent);
                    
                    if (parsed.headers.length === 0) {
                        return;
                    }
                    
                    // incoming_stockテーブルのヘッダー: id, sku_id, manufacturer_id, quantity, arrival_date
                    const incomingStockHeaders = ['id', 'sku_id', 'manufacturer_id', 'quantity', 'arrival_date'];
                    
                    // 空のCSVファイルでもDELETE文を出力するため、rows.length === 0の場合は処理を続行
                    if (parsed.rows.length === 0) {
                        const insertSQL = generateInsertSQL(tableName, incomingStockHeaders, [], { skipData: true });
                        if (insertSQL) {
                            sqlStatements.push(insertSQL);
                            processedTables++;
                        }
                        return;
                    }
                    
                    // CSVのヘッダーとincoming_stockテーブルのヘッダーをマッピング
                    const convertedRows = parsed.rows.map((row, index) => {
                        const convertedRow = {};
                        incomingStockHeaders.forEach(header => {
                            if (parsed.headers.includes(header)) {
                                convertedRow[header] = Array.isArray(row) 
                                    ? row[parsed.headers.indexOf(header)]
                                    : row[header];
                            } else {
                                // デフォルト値
                                if (header === 'id') {
                                    const manufacturerId = tableName.replace('incoming_stock_', '');
                                    convertedRow[header] = `incoming_stock_${manufacturerId}_${index + 1}`;
                                } else if (header === 'manufacturer_id') {
                                    const manufacturerId = tableName.replace('incoming_stock_', '');
                                    convertedRow[header] = manufacturerId;
                                } else {
                                    convertedRow[header] = null;
                                }
                            }
                        });
                        return convertedRow;
                    });
                    
                    const insertSQL = generateInsertSQL(tableName, incomingStockHeaders, convertedRows, { skipData: true });
                    if (insertSQL) {
                        sqlStatements.push(insertSQL);
                        totalRows += convertedRows.length;
                        processedTables++;
                    }
                } catch (error) {
                    console.error(`    エラー: ${csvPath} の読み込みに失敗しました - ${error.message}`);
                }
            });
            return;
        }
        
        // メーカー依存テーブルの場合は、すべてのメーカーファイルを結合
        const allRows = [];
        const seenRows = new Set(); // 重複チェック用
        let headers = [];
        
        csvPaths.forEach(csvPath => {
            try {
                const csvContent = fs.readFileSync(csvPath, 'utf-8');
                const parsed = parseCSV(csvContent);
                
                if (parsed.headers.length > 0) {
                    if (headers.length === 0) {
                        headers = parsed.headers;
                    }
                    
                    // 重複をチェックして追加
                    parsed.rows.forEach(row => {
                        // 複合主キーを持つテーブルの場合は複合キーを使用
                        let rowKeyStr;
                        
                        // product_colorsテーブルは削除済み（stockテーブルから取得）
                        // if (tableName.startsWith('product_colors_') && headers.length >= 2) {
                        if (false && tableName.startsWith('product_colors_') && headers.length >= 2) {
                            const productIdIdx = headers.indexOf('product_id');
                            const colorIdIdx = headers.indexOf('color_id');
                            if (productIdIdx >= 0 && colorIdIdx >= 0) {
                                const productId = Array.isArray(row) ? row[productIdIdx] : row[productIdIdx];
                                const colorId = Array.isArray(row) ? row[colorIdIdx] : row[colorIdIdx];
                                rowKeyStr = `${productId}||${colorId}`;
                            } else {
                                // フォールバック: 最初の2カラムを使用
                                rowKeyStr = Array.isArray(row) ? `${row[0]}||${row[1]}` : `${row[headers[0]]}||${row[headers[1]]}`;
                            }
                        }
                        // product_tagsテーブルの場合は複合主キー（product_id, tag_id）を使用
                        else if (tableName.startsWith('product_tags_') && headers.length >= 2) {
                            const productIdIdx = headers.indexOf('product_id');
                            const tagIdIdx = headers.indexOf('tag_id');
                            if (productIdIdx >= 0 && tagIdIdx >= 0) {
                                const productId = Array.isArray(row) ? row[productIdIdx] : row[productIdIdx];
                                const tagId = Array.isArray(row) ? row[tagIdIdx] : row[tagIdIdx];
                                rowKeyStr = `${productId}||${tagId}`;
                            } else {
                                // フォールバック: 最初の2カラムを使用
                                rowKeyStr = Array.isArray(row) ? `${row[0]}||${row[1]}` : `${row[headers[0]]}||${row[headers[1]]}`;
                            }
                        }
                        // tool_dependenciesテーブルの場合は複合主キー（tool_name, table_name）を使用
                        else if (tableName === 'tool_dependencies' && headers.length >= 2) {
                            const toolNameIdx = headers.indexOf('tool_name');
                            const tableNameIdx = headers.indexOf('table_name');
                            if (toolNameIdx >= 0 && tableNameIdx >= 0) {
                                const toolName = Array.isArray(row) ? row[toolNameIdx] : row[toolNameIdx];
                                const tblName = Array.isArray(row) ? row[tableNameIdx] : row[tableNameIdx];
                                rowKeyStr = `${toolName}||${tblName}`;
                            } else {
                                // フォールバック: 最初の2カラムを使用
                                rowKeyStr = Array.isArray(row) ? `${row[0]}||${row[1]}` : `${row[headers[0]]}||${row[headers[1]]}`;
                            }
                        }
                        // category_pricing_schedulesテーブルの場合は複合主キー（category_id, schedule_id, customer_group_id）を使用
                        else if (tableName === 'category_pricing_schedules' && headers.length >= 3) {
                            const categoryIdIdx = headers.indexOf('category_id');
                            const scheduleIdIdx = headers.indexOf('schedule_id');
                            const customerGroupIdIdx = headers.indexOf('customer_group_id');
                            if (categoryIdIdx >= 0 && scheduleIdIdx >= 0 && customerGroupIdIdx >= 0) {
                                const categoryId = Array.isArray(row) ? row[categoryIdIdx] : row[categoryIdIdx];
                                const scheduleId = Array.isArray(row) ? row[scheduleIdIdx] : row[scheduleIdIdx];
                                const customerGroupId = Array.isArray(row) ? row[customerGroupIdIdx] : row[customerGroupIdIdx];
                                rowKeyStr = `${categoryId}||${scheduleId}||${customerGroupId}`;
                            } else {
                                // フォールバック: すべてのカラムを使用
                                rowKeyStr = Array.isArray(row) ? row.join('||') : JSON.stringify(row);
                            }
                        }
                        // tool_visibility_settingsテーブルの場合は複合主キー（tool_name, device_type）を使用
                        else if (tableName === 'tool_visibility_settings' && headers.length >= 2) {
                            const toolNameIdx = headers.indexOf('tool_name');
                            const deviceTypeIdx = headers.indexOf('device_type');
                            if (toolNameIdx >= 0 && deviceTypeIdx >= 0) {
                                const toolName = Array.isArray(row) ? row[toolNameIdx] : row[toolNameIdx];
                                const deviceType = Array.isArray(row) ? row[deviceTypeIdx] : row[deviceTypeIdx];
                                rowKeyStr = `${toolName}||${deviceType}`;
                            } else {
                                // フォールバック: 最初の2カラムを使用
                                rowKeyStr = Array.isArray(row) ? `${row[0]}||${row[1]}` : `${row[headers[0]]}||${row[headers[1]]}`;
                            }
                        } else {
                            // 通常のテーブル: 最初のカラムを主キーとして使用
                            const rowKey = Array.isArray(row) ? row[0] : (row[headers[0]] || JSON.stringify(row));
                            rowKeyStr = String(rowKey);
                        }
                        
                        if (!seenRows.has(rowKeyStr)) {
                            seenRows.add(rowKeyStr);
                            allRows.push(row);
                        }
                    });
                }
            } catch (error) {
                console.error(`    エラー: ${csvPath} の読み込みに失敗しました - ${error.message}`);
            }
        });
        
        if (headers.length > 0) {
            // 空のCSVファイルでもSQLを出力（DELETE文のみ）
            const insertSQL = generateInsertSQL(tableName, headers, allRows);
            if (insertSQL) {
                sqlStatements.push(insertSQL);
                totalRows += allRows.length;
                processedTables++;
            }
        }
        
        const tableTime = Date.now() - tableStartTime;
        if (tableTime > 1000) {
            console.log(`    ⚠ ${tableName} の処理に ${tableTime}ms かかりました`);
        }
    });
    
    sqlStatements.push('SET FOREIGN_KEY_CHECKS=1;');
    sqlStatements.push('COMMIT;');
    
    // SQLファイルを書き込み
    const sqlContent = sqlStatements.join('\n');
    fs.writeFileSync(outputFile, sqlContent, 'utf-8');
    
    const totalTime = Date.now() - startTime;
    console.log(`\n=== 生成完了 ===`);
    console.log(`出力ファイル: ${outputFile}`);
    console.log(`処理したテーブル数: ${processedTables}`);
    console.log(`合計行数: ${totalRows}`);
    console.log(`総処理時間: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}秒)`);
    console.log('');
}

// 実行
if (require.main === module) {
    try {
        generateSQLFromCSV();
        process.exit(0);
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { generateSQLFromCSV };

