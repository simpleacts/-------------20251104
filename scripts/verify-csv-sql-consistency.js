/**
 * CSVデータとSQL出力の一致を確認するスクリプト
 * また、tool_dependenciesの完全性をチェックする
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const distDir = path.join(__dirname, '..', 'dist');
const sqlFile = path.join(distDir, 'database_data_import.sql');
const routesFile = path.join(__dirname, '..', 'src', 'core', 'config', 'Routes.tsx');

const MANUFACTURER_SCOPED_TABLES = new Set([
    'colors',
    'importer_mappings',
    'incoming_stock',
    'product_colors',
    'product_color_sizes',
    'product_details',
    'product_price_group_items',
    'product_price_groups',
    'product_prices',
    'product_sizes',
    'product_tags',
    'products_master',
    'sizes',
    'skus',
    'stock',
    'stock_history'
]);

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
        if (!values || values.every(v => v.trim() === '')) {
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

// SQLファイルからINSERT文を抽出（改善版：複数行対応、引用符対応、DELETE文も検出）
function extractInsertsFromSQL(sqlContent) {
    const inserts = new Map(); // tableName -> { headers: [], rows: [] }
    
    // INSERT文を抽出（複数行対応、引用符内の改行も考慮）
    // VALUESブロックは引用符で囲まれた文字列内の改行を含む可能性があるため、
    // セミコロンで終了するまでを貪欲マッチで取得（ただし、引用符内のセミコロンは考慮）
    const insertPattern = /INSERT INTO `([^`]+)`\s*\(([^)]+)\)\s*VALUES\s*/gi;
    let match;
    
    while ((match = insertPattern.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const headersStr = match[2];
        const startPos = match.index + match[0].length;
        
        // VALUESブロックの終了位置を探す（引用符内のセミコロンを考慮）
        let inQuotes = false;
        let quoteChar = null;
        let i = startPos;
        let valuesEndPos = -1;
        
        while (i < sqlContent.length) {
            const char = sqlContent[i];
            
            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
            } else if (inQuotes && char === quoteChar) {
                // エスケープされた引用符をチェック
                if (i + 1 < sqlContent.length && sqlContent[i + 1] === quoteChar) {
                    i++; // エスケープされた引用符をスキップ
                } else {
                    inQuotes = false;
                    quoteChar = null;
                }
            } else if (!inQuotes && char === ';') {
                // 引用符外のセミコロンが見つかった
                valuesEndPos = i;
                break;
            }
            i++;
        }
        
        if (valuesEndPos === -1) {
            // セミコロンが見つからない場合は、ファイルの終端まで
            valuesEndPos = sqlContent.length;
        }
        
        const valuesStr = sqlContent.substring(startPos, valuesEndPos).trim();
        
        // ヘッダーをパース
        const headers = headersStr.split(',').map(h => h.trim().replace(/^`|`$/g, ''));
        
        // VALUESの行をパース（複数行対応、引用符対応）
        const valueRows = parseSQLValues(valuesStr);
        
        if (!inserts.has(tableName)) {
            inserts.set(tableName, { headers, rows: [] });
        }
        inserts.get(tableName).rows.push(...valueRows);
    }
    
    // DELETE文も検出（空のCSVファイルの場合）
    const deleteRegex = /DELETE FROM `([^`]+)` WHERE 1=1;/g;
    while ((match = deleteRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        if (!inserts.has(tableName)) {
            // DELETE文のみのテーブル（空のCSVファイル）も検出
            // ヘッダーはCSVファイルから取得する必要があるため、ここでは空配列を設定
            inserts.set(tableName, { headers: [], rows: [] });
        }
    }
    
    return inserts;
}

// SQL VALUESをパース（引用符、NULL、複数行対応、改善版）
function parseSQLValues(valuesStr) {
    const rows = [];
    let i = 0;
    
    while (i < valuesStr.length) {
        // 空白をスキップ
        while (i < valuesStr.length && /\s/.test(valuesStr[i])) {
            i++;
        }
        
        if (i >= valuesStr.length) break;
        
        // 行の開始 '(' を探す
        if (valuesStr[i] === '(') {
            i++; // '(' をスキップ
            const row = [];
            
            while (i < valuesStr.length) {
                // 空白をスキップ
                while (i < valuesStr.length && /\s/.test(valuesStr[i])) {
                    i++;
                }
                
                if (i >= valuesStr.length) break;
                
                // 値をパース（引用符で囲まれた文字列内の改行も考慮）
                const result = parseSQLValueFromString(valuesStr, i);
                row.push(result.value);
                i = result.nextIndex;
                
                // 次の値への区切り ',' を探す
                while (i < valuesStr.length && /\s/.test(valuesStr[i])) {
                    i++;
                }
                
                // 行の終了 ')' をチェック（引用符外で）
                if (i < valuesStr.length && valuesStr[i] === ')') {
                    i++; // ')' をスキップ
                    rows.push(row);
                    // 次の行への区切り ',' を探す
                    while (i < valuesStr.length && /\s/.test(valuesStr[i])) {
                        i++;
                    }
                    if (i < valuesStr.length && valuesStr[i] === ',') {
                        i++; // ',' をスキップ
                    }
                    break;
                }
                
                // 値の区切り ',' を探す
                if (i < valuesStr.length && valuesStr[i] === ',') {
                    i++; // ',' をスキップ
                }
            }
        } else {
            i++;
        }
    }
    
    return rows;
}

// SQL値文字列から値を抽出（引用符、NULL対応）
function parseSQLValueFromString(str, startIndex) {
    let i = startIndex;
    
    // 空白をスキップ
    while (i < str.length && /\s/.test(str[i])) {
        i++;
    }
    
    if (i >= str.length) {
        return { value: null, nextIndex: i };
    }
    
    // NULL値のチェック
    if (str.substring(i, i + 4).toUpperCase() === 'NULL') {
        // NULLの後にカンマや閉じ括弧が来ることを確認
        const nextChar = str[i + 4];
        if (!nextChar || nextChar === ',' || nextChar === ')' || /\s/.test(nextChar)) {
            return { value: null, nextIndex: i + 4 };
        }
    }
    
    // 引用符で囲まれた文字列
    if (str[i] === "'") {
        let value = '';
        i++; // 開始引用符をスキップ
        
        while (i < str.length) {
            if (str[i] === "'") {
                if (i + 1 < str.length && str[i + 1] === "'") {
                    // エスケープされた引用符
                    value += "'";
                    i += 2;
                } else {
                    // 引用符の終了
                    i++; // 終了引用符をスキップ
                    break;
                }
            } else if (str[i] === '\\' && i + 1 < str.length) {
                // エスケープ文字
                value += str[i + 1];
                i += 2;
            } else {
                value += str[i];
                i++;
            }
        }
        
        return { value, nextIndex: i };
    }
    
    // 数値またはその他の値
    let value = '';
    while (i < str.length && str[i] !== ',' && str[i] !== ')' && !/\s/.test(str[i])) {
        value += str[i];
        i++;
    }
    
    // 数値の可能性をチェック
    if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
        const num = parseFloat(value.trim());
        return { value: isNaN(num) ? value.trim() : num, nextIndex: i };
    }
    
    return { value: value.trim(), nextIndex: i };
}

// SQL値をパース（NULL、数値、文字列を適切に処理）- 後方互換性のため残す
function parseSQLValue(valueStr) {
    if (!valueStr) return null;
    valueStr = valueStr.trim();
    
    // NULL値
    if (valueStr === 'NULL' || valueStr === 'null') {
        return null;
    }
    
    // 引用符で囲まれた文字列
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
        return valueStr.slice(1, -1).replace(/''/g, "'").replace(/\\\\/g, '\\');
    }
    
    // 数値の可能性がある場合
    if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
        const num = parseFloat(valueStr);
        return isNaN(num) ? valueStr : num;
    }
    
    // その他は文字列として返す
    return valueStr;
}

// すべてのCSVファイルをスキャン（同じテーブル名のファイルを結合）
function scanAllCsvFiles() {
    const csvMap = new Map(); // tableName -> { headers, rows }
    
    function scanDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) return;
        
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isDirectory()) {
                scanDirectory(fullPath);
            } else if (item.isFile() && item.name.endsWith('.csv')) {
                const tableName = item.name.replace('.csv', '');
                try {
                    const csvContent = fs.readFileSync(fullPath, 'utf-8');
                    const parsed = parseCSV(csvContent);
                    
                    if (csvMap.has(tableName)) {
                        // 同じテーブル名のファイルが既に存在する場合は結合
                        const existing = csvMap.get(tableName);
                        // ヘッダーが一致することを確認
                        if (existing.headers.length === parsed.headers.length &&
                            existing.headers.every((h, i) => h === parsed.headers[i])) {
                            // 行を結合（重複チェック）
                            const seenRows = new Set();
                            existing.rows.forEach(row => {
                                const rowKey = JSON.stringify(row);
                                seenRows.add(rowKey);
                            });
                            parsed.rows.forEach(row => {
                                const rowKey = JSON.stringify(row);
                                if (!seenRows.has(rowKey)) {
                                    existing.rows.push(row);
                                    seenRows.add(rowKey);
                                }
                            });
                        } else {
                            console.warn(`⚠️  ${tableName}: ヘッダーが一致しないため、結合をスキップしました`);
                        }
                    } else {
                        csvMap.set(tableName, parsed);
                    }
                } catch (error) {
                    console.error(`エラー: ${fullPath} の読み込みに失敗 - ${error.message}`);
                }
            }
        }
    }
    
    scanDirectory(templatesDir);
    return csvMap;
}

// データの一致を確認（改善版：データ内容も比較）
function verifyDataConsistency(csvDataMap) {
    console.log('=== CSVデータとSQL出力の一致を確認中 ===\n');
    
    if (!fs.existsSync(sqlFile)) {
        console.error(`エラー: SQLファイルが見つかりません: ${sqlFile}`);
        return { errors: 1, warnings: 0 };
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    const sqlInserts = extractInsertsFromSQL(sqlContent);
    const csvMap = csvDataMap || scanAllCsvFiles();
    
    let totalErrors = 0;
    let totalWarnings = 0;
    const dataMismatches = [];
    
    // CSVの各テーブルをチェック
    for (const [tableName, csvTableData] of csvMap.entries()) {
        // brandsテーブルは削除されました（共通テーブルtemplates/common/brands.csvで全メーカーのブランドを一括管理）
        // manu_xxxx_brands形式のテーブルもスキップ
        if (tableName === 'brands' || tableName.startsWith('brands_') || tableName.match(/^manu_\d+_brands$/)) {
            continue; // スキップ
        }
        
        const sqlData = sqlInserts.get(tableName);
        
        if (!sqlData) {
            console.warn(`⚠️  ${tableName}: SQLに存在しません (CSVには存在)`);
            totalWarnings++;
            continue;
        }
        
        const sqlRows = sqlData.rows || [];
        const sqlHeaders = sqlData.headers || [];
        
        // 空のCSVファイル（ヘッダーのみ）の場合は、SQLにDELETE文のみが存在することを確認
        if (csvTableData.rows.length === 0 && sqlRows.length === 0) {
            // 空のCSVファイルでSQLにもデータがない場合は正常（DELETE文のみ）
            continue;
        }
        
        // 行数のチェック
        if (csvTableData.rows.length !== sqlRows.length) {
            console.warn(`⚠️  ${tableName}: 行数が一致しません (CSV: ${csvTableData.rows.length}, SQL: ${sqlRows.length})`);
            totalWarnings++;
        }
        
        // ヘッダーのチェック（tool_dependenciesのallowed_operationsを考慮）
        const expectedSqlCols = tableName === 'tool_dependencies' 
            ? csvTableData.headers.length + 1  // allowed_operationsが追加される
            : csvTableData.headers.length;
        if (csvTableData.headers.length !== sqlHeaders.length && 
            sqlHeaders.length !== expectedSqlCols) {
            console.warn(`⚠️  ${tableName}: カラム数が一致しません (CSV: ${csvTableData.headers.length}, SQL: ${sqlHeaders.length})`);
            totalWarnings++;
        }
        
        // データ内容の比較（最初の数行のみ詳細チェック）
        // ただし、行数が大きく異なる場合はスキップ（順序が異なる可能性がある）
        if (Math.abs(csvTableData.rows.length - sqlRows.length) > 5) {
            // 行数が大きく異なる場合は詳細チェックをスキップ
            continue;
        }
        
        const maxCheckRows = Math.min(5, Math.min(csvTableData.rows.length, sqlRows.length));
        for (let i = 0; i < maxCheckRows; i++) {
            const csvRow = csvTableData.rows[i];
            const sqlRow = sqlRows[i];
            
            if (!csvRow || !sqlRow) continue;
            
            // 各カラムを比較（ヘッダー名でマッチング）
            const csvHeaderMap = new Map();
            csvTableData.headers.forEach((h, idx) => {
                if (csvRow[idx] !== undefined) {
                    csvHeaderMap.set(h, csvRow[idx]);
                }
            });
            
            for (let idx = 0; idx < sqlHeaders.length; idx++) {
                const h = sqlHeaders[idx];
                if (sqlRow[idx] === undefined) continue;
                
                // tool_dependenciesのallowed_operationsカラムはSQL生成時に追加されるため、検証から除外
                if (tableName === 'tool_dependencies' && h === 'allowed_operations') {
                    continue;
                }
                
                const csvValue = normalizeValue(csvHeaderMap.get(h));
                const sqlValue = normalizeValue(sqlRow[idx]);
                
                if (csvValue !== sqlValue) {
                    // NULL値の扱いを考慮
                    const csvIsNull = csvValue === null || csvValue === '' || csvValue === 'NULL';
                    const sqlIsNull = sqlValue === null || sqlValue === 'NULL';
                    
                    if (!(csvIsNull && sqlIsNull)) {
                        // 数値の比較（文字列と数値の違いを許容）
                        const csvNum = typeof csvValue === 'number' ? csvValue : parseFloat(csvValue);
                        const sqlNum = typeof sqlValue === 'number' ? sqlValue : parseFloat(sqlValue);
                        if (!isNaN(csvNum) && !isNaN(sqlNum) && csvNum === sqlNum) {
                            continue; // 数値として等しい場合はスキップ
                        }
                        
                        dataMismatches.push({
                            table: tableName,
                            row: i + 1,
                            column: h,
                            csv: String(csvValue).substring(0, 50),
                            sql: String(sqlValue).substring(0, 50)
                        });
                    }
                }
            }
        }
    }
    
    // SQLの各テーブルをチェック
    for (const [tableName, sqlData] of sqlInserts.entries()) {
        if (!csvMap.has(tableName)) {
            console.warn(`⚠️  ${tableName}: CSVファイルが見つかりません (SQLには存在)`);
            totalWarnings++;
        }
    }
    
    // データ不一致の報告
    if (dataMismatches.length > 0) {
        console.warn(`\n⚠️  データ内容の不一致が ${Math.min(dataMismatches.length, 20)} 件見つかりました（最初の20件を表示）:`);
        dataMismatches.slice(0, 20).forEach(mismatch => {
            console.warn(`  ${mismatch.table}[${mismatch.row}].${mismatch.column}: CSV="${mismatch.csv}" vs SQL="${mismatch.sql}"`);
        });
        if (dataMismatches.length > 20) {
            console.warn(`  ... 他 ${dataMismatches.length - 20} 件`);
        }
        totalWarnings += Math.min(dataMismatches.length, 20);
    }
    
    console.log(`\n確認完了: ${totalErrors}件のエラー, ${totalWarnings}件の警告`);
    return { errors: totalErrors, warnings: totalWarnings, dataMismatches };
}

// 値を正規化（比較用）
function normalizeValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed === 'NULL' || trimmed === 'null') {
            return null;
        }
        return trimmed;
    }
    return value;
}

function loadAllToolsFromRoutes() {
    try {
        if (!fs.existsSync(routesFile)) {
            return null;
        }
        const content = fs.readFileSync(routesFile, 'utf-8');
        const listMatch = content.match(/export const ALL_TOOLS[^=]*=\s*\[(.*?)\];/s);
        if (!listMatch) {
            return null;
        }
        const arrayLiteral = listMatch[1];
        const regex = /{[^}]*name:\s*'([^']+)'/g;
        const names = [];
        let match;
        while ((match = regex.exec(arrayLiteral)) !== null) {
            names.push(match[1]);
        }
        return names.length > 0 ? names : null;
    } catch (error) {
        console.warn('⚠️  Routes.tsx から ALL_TOOLS を読み込めませんでした:', error.message);
        return null;
    }
}

const FALLBACK_ALL_TOOLS = [
    'hub', 'order-management', 'ai-task-management', 'production-scheduler',
    'customer-management', 'email-tool', 'estimator', 'proofing',
    'worksheet', 'accounts-receivable', 'accounts-payable', 'work-record',
    'cash-flow-analysis', 'task-analysis', 'product-definition-tool',
    'product-definition-manufacturer-tool', 'product-management', 'inventory-management',
    'pricing-manager', 'pricing-assistant', 'production-settings', 'task-settings',
    'print-history', 'ink-mixing', 'ink-series-management', 'ink-product-management',
    'color-library-manager', 'dtf-cost-calculator', 'data-io', 'image-converter',
    'image-batch-linker', 'pdf-template-manager', 'pdf-item-group-manager',
    'user-manager', 'permission-manager', 'id-manager', 'google-api-settings',
    'display-settings', 'email-settings', 'estimator-settings', 'pdf-preview-settings',
    'backup-manager', 'system-logs', 'dev-management', 'dev-tools',
    'dev-lock-manager', 'tool-porting-manager', 'tool-guide', 'tool-dependency-manager',
    'calculation-logic-manager', 'tool-dependency-scanner', 'unregistered-module-tool',
    'architecture-designer', 'php-info-viewer', 'system-diagnostics', 'language-manager',
    'database-schema-manager', 'product-management'
];

const ALL_TOOLS = loadAllToolsFromRoutes() || FALLBACK_ALL_TOOLS;

function isManufacturerScopedTable(tableName) {
    if (!tableName) return false;
    if (tableName.startsWith('manu_')) return true;
    return MANUFACTURER_SCOPED_TABLES.has(tableName);
}

// tool_dependenciesの完全性をチェック
function verifyToolDependencies(csvDataMap) {
    console.log('\n=== tool_dependenciesの完全性をチェック中 ===\n');
    
    const toolDependenciesCsv = path.join(templatesDir, 'system', 'tool_dependencies.csv');
    if (!fs.existsSync(toolDependenciesCsv)) {
        console.error(`エラー: tool_dependencies.csvが見つかりません: ${toolDependenciesCsv}`);
        return;
    }
    
    const csvContent = fs.readFileSync(toolDependenciesCsv, 'utf-8');
    const parsed = parseCSV(csvContent);
    
    // generate-tool-dependencies.jsからTOOL_TABLESを読み込む必要があるが、
    // ここでは簡易的にCSVから確認
    const toolTableMap = new Map(); // toolName -> Set<tableName>
    
    const tableNames = new Set();
    
    for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        if (row.length < 2) continue;
        
        const toolName = row[0];
        const tableName = row[1];
        const writeFields = row[3] || '';
        tableNames.add(tableName);
        
        if (!toolTableMap.has(toolName)) {
            toolTableMap.set(toolName, new Set());
        }
        toolTableMap.get(toolName).add(tableName);
        
        // write_fieldsが空の場合は警告
        if (!writeFields || writeFields.trim() === '') {
            console.warn(`⚠️  ${toolName} -> ${tableName}: write_fieldsが空です`);
        }
    }
    
    // 各ツールが登録されているか確認
    const missingTools = [];
    for (const toolName of ALL_TOOLS) {
        if (!toolTableMap.has(toolName)) {
            missingTools.push(toolName);
        }
    }
    
    if (missingTools.length > 0) {
        console.error(`❌ 以下のツールがtool_dependenciesに登録されていません:`);
        missingTools.forEach(tool => console.error(`   - ${tool}`));
    } else {
        console.log('✓ すべてのツールが登録されています');
    }
    
    // 各ツールのテーブル数
    console.log('\n各ツールの登録テーブル数:');
    for (const toolName of [...ALL_TOOLS].sort()) {
        const tables = toolTableMap.get(toolName);
        const count = tables ? tables.size : 0;
        console.log(`  ${toolName}: ${count}テーブル`);
    }
    
    const missingTables = [];
    if (csvDataMap) {
        for (const tableName of tableNames) {
            if (csvDataMap.has(tableName)) continue;
            if (isManufacturerScopedTable(tableName)) continue;
            missingTables.push(tableName);
        }
    }
    
    if (missingTables.length > 0) {
        console.warn('\n⚠️  CSVが存在しない依存テーブルが見つかりました:');
        missingTables.forEach(name => console.warn(`   - ${name}`));
    } else {
        console.log('\n✓ 依存テーブルはすべてCSVで確認済みです');
    }
    
    return { missingTools, missingTables, toolTableMap };
}

// メイン処理
function main() {
    const csvDataMap = scanAllCsvFiles();
    const dataResult = verifyDataConsistency(csvDataMap);
    const toolResult = verifyToolDependencies(csvDataMap);
    
    // エラーがある場合のみ失敗とする（警告は情報として表示）
    if (dataResult.errors > 0) {
        console.error('\n❌ 検証に失敗しました（エラーあり）');
        process.exit(1);
    }
    
    if (toolResult) {
        if (toolResult.missingTools && toolResult.missingTools.length > 0) {
        console.error('\n❌ 検証に失敗しました（tool_dependenciesに未登録のツールがあります）');
        console.error('   解決方法: node scripts/generate-tool-dependencies.js を実行してtool_dependencies.csvを再生成してください');
        process.exit(1);
        }
        if (toolResult.missingTables && toolResult.missingTables.length > 0) {
            console.error('\n❌ 検証に失敗しました（依存テーブルに対応するCSVが見つかりません）');
            console.error('   対応: CSVを新規作成するか、tool_dependencies.csvのテーブル名を修正してください');
            process.exit(1);
        }
    }
    
        if (dataResult.warnings > 0) {
            console.log(`\n⚠️  警告が ${dataResult.warnings} 件ありますが、検証は完了しました`);
        } else {
            console.log('\n✓ すべての検証が成功しました');
        }
        process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { verifyDataConsistency, verifyToolDependencies };

