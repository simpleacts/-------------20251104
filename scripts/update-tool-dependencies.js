const fs = require('fs');
const path = require('path');

/**
 * tool_dependencies.csvを更新するスクリプト
 * 不足しているテーブルを追加し、不要なテーブルを削除
 */

const depsPath = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');

// 不足しているテーブルとそれを使用するツールのマッピング
const missingTables = [
    // 共通テーブル
    { tool: 'data-io', table: 'invoice_parsing_templates' },
    { tool: 'estimator', table: 'size_order_master' },
    { tool: 'product-definition-tool', table: 'size_order_master' },
    
    // メール管理
    { tool: 'email-settings', table: 'email_general_settings' },
    
    // 業務管理
    { tool: 'accounts-payable', table: 'bill_items' },
    { tool: 'accounts-receivable', table: 'bill_items' },
    
    // 印刷履歴
    { tool: 'print-history', table: 'print_location_metrics' },
    
    // システム設定
    { tool: 'display-settings', table: 'google_fonts' },
    { tool: 'display-settings', table: 'icons' },
    { tool: 'app-manager', table: 'mobile_tool_mappings' },
];

// 不足している言語設定テーブル
const missingLanguageTables = [
    { tool: 'accounts-receivable', table: 'language_settings_accounting' },
    { tool: 'accounts-payable', table: 'language_settings_accounting' },
    { tool: 'cash-flow-analysis', table: 'language_settings_accounting' },
    { tool: 'ai-task-management', table: 'language_settings_ai_task_management' },
    { tool: 'estimator', table: 'language_settings_document' },
    { tool: 'id-manager', table: 'language_settings_id_manager' },
    { tool: 'module-list', table: 'language_settings_module_catalog' },
    { tool: 'pricing-manager', table: 'language_settings_pricing_management' },
    { tool: 'shipping-logic-tool', table: 'language_settings_shipping_logic_tool' },
    { tool: 'silkscreen-logic-tool', table: 'language_settings_silkscreen' },
];

// 削除すべきテーブル（stockテーブルに統合されたものなど）
const deprecatedTables = [
    'colors', 'sizes', 'product_colors', 'product_details', 'product_price_group_items',
    'product_price_groups', 'product_prices', 'product_tags', 'products_master',
    'importer_mappings', 'incoming_stock', 'skus', 'stock', 'stock_history',
    'product_color_sizes', 'product_sizes'
];

// CSVを読み込む
const content = fs.readFileSync(depsPath, 'utf8');
const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1).filter(line => line.trim());

// 既存のエントリを解析
const entries = new Map();
dataLines.forEach(line => {
    if (line.trim()) {
        const parts = line.split(',');
        if (parts.length >= 2) {
            const tool = parts[0].trim().replace(/^"|"$/g, '');
            const table = parts[1].trim().replace(/^"|"$/g, '');
            const key = `${tool}:${table}`;
            entries.set(key, line);
        }
    }
});

// 不足しているテーブルを追加
missingTables.forEach(({ tool, table }) => {
    const key = `${tool}:${table}`;
    if (!entries.has(key)) {
        const newLine = `${tool},${table},"[{""strategy"":""on_tool_mount"",""fields"":""*""}]",*,on_tool_mount,`;
        entries.set(key, newLine);
        console.log(`追加: ${tool} -> ${table}`);
    }
});

// 不足している言語設定テーブルを追加
missingLanguageTables.forEach(({ tool, table }) => {
    const key = `${tool}:${table}`;
    if (!entries.has(key)) {
        const newLine = `${tool},${table},"[{""strategy"":""on_tool_mount"",""fields"":""*""}]",*,on_tool_mount,`;
        entries.set(key, newLine);
        console.log(`追加（言語設定）: ${tool} -> ${table}`);
    }
});

// 削除すべきテーブルを削除
let removedCount = 0;
for (const [key, line] of entries.entries()) {
    const table = key.split(':')[1];
    if (deprecatedTables.includes(table)) {
        entries.delete(key);
        removedCount++;
        console.log(`削除: ${key}`);
    }
}

// 新しいCSVを生成
const newLines = [header];
const sortedEntries = Array.from(entries.values()).sort((a, b) => {
    const toolA = a.split(',')[0].replace(/^"|"$/g, '');
    const toolB = b.split(',')[0].replace(/^"|"$/g, '');
    if (toolA !== toolB) {
        return toolA.localeCompare(toolB);
    }
    const tableA = a.split(',')[1].replace(/^"|"$/g, '');
    const tableB = b.split(',')[1].replace(/^"|"$/g, '');
    return tableA.localeCompare(tableB);
});
newLines.push(...sortedEntries);

// バックアップを作成
const backupPath = depsPath + '.backup';
fs.writeFileSync(backupPath, content);
console.log(`\nバックアップを作成: ${backupPath}`);

// 新しいCSVを書き込む
fs.writeFileSync(depsPath, newLines.join('\n'));
console.log(`\n更新完了: ${depsPath}`);
console.log(`追加: ${missingTables.length + missingLanguageTables.length}件`);
console.log(`削除: ${removedCount}件`);
console.log(`総エントリ数: ${entries.size}`);

