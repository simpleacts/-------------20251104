/**
 * language_settings.csvをツールごとに分割するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const sourceFile = path.join(templatesDir, 'common', 'language_settings.csv');
const languagesDir = path.join(templatesDir, 'languages');

// ツール名のリスト（Routes.tsxのALL_TOOLSから）
const ALL_TOOLS = [
    'hub', 'order-management', 'ai-task-management', 'production-scheduler', 
    'customer-management', 'email-tool', 'estimator', 'estimator-v2', 
    'proofing', 'worksheet', 'accounts-receivable', 'accounts-payable', 
    'document-management', 'work-record', 'cash-flow-analysis', 'task-analysis',
    'product-management', 'product-definition-tool', 'pricing-manager', 
    'pricing-assistant', 'production-settings', 'task-settings', 'print-history',
    'ink-mixing', 'ink-series-management', 'ink-product-management', 
    'color-library-manager', 'dtf-cost-calculator', 'data-io', 
    'image-converter', 'image-batch-linker', 'pdf-template-manager', 
    'pdf-item-group-manager', 'user-manager', 'permission-manager', 
    'id-manager', 'google-api-settings', 'display-settings', 'email-settings',
    'estimator-settings', 'pdf-preview-settings', 'backup-manager', 
    'system-logs', 'dev-management', 'dev-tools', 'dev-lock-manager',
    'app-manager', 'tool-exporter', 'tool-porting-manager', 'tool-guide',
    'tool-dependency-manager', 'calculation-logic-manager', 
    'tool-dependency-scanner', 'unregistered-module-tool', 
    'architecture-designer', 'php-info-viewer', 'system-diagnostics',
    'module-list', 'language-manager'
];

// ツール名からテーブル名への変換
function getLanguageTableName(toolName) {
    return `language_settings_${toolName.replace(/-/g, '_')}`;
}

// キーのプレフィックスからツール名を推測
function guessToolFromKey(key) {
    // テーブル名のキー（tables.*）は共通
    if (key.startsWith('tables.')) {
        return 'common';
    }
    
    // ツール名をキーに含む場合
    for (const tool of ALL_TOOLS) {
        const toolPrefix = tool.replace(/-/g, '_');
        if (key.includes(toolPrefix) || key.startsWith(tool + '.')) {
            return tool;
        }
    }
    
    // 特定のパターンでツールを判定
    if (key.startsWith('customers.') || key.startsWith('customer_groups.')) {
        return 'customer-management';
    }
    if (key.startsWith('quotes.') || key.startsWith('quote_')) {
        return 'order-management';
    }
    if (key.startsWith('products_') || key.startsWith('product_')) {
        return 'product-management';
    }
    if (key.startsWith('email')) {
        return 'email-tool';
    }
    if (key.startsWith('task_') || key.startsWith('quote_tasks')) {
        return 'task-settings';
    }
    if (key.startsWith('ink_') || key.startsWith('pantone_') || key.startsWith('dic_')) {
        return 'ink-mixing';
    }
    if (key.startsWith('print_history')) {
        return 'print-history';
    }
    if (key.startsWith('users.') || key.startsWith('roles.') || key.startsWith('role_permissions')) {
        return 'user-manager';
    }
    if (key.startsWith('id_formats')) {
        return 'id-manager';
    }
    if (key.startsWith('language_settings')) {
        return 'language-manager';
    }
    
    // デフォルトは共通
    return 'common';
}

console.log('=== language_settings.csvをツールごとに分割中 ===\n');

// ソースファイルを読み込む
if (!fs.existsSync(sourceFile)) {
    console.error(`エラー: ${sourceFile} が見つかりません`);
    process.exit(1);
}

const csvContent = fs.readFileSync(sourceFile, 'utf-8');
const lines = csvContent.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// ツールごとにデータを分類
const toolData = new Map();
toolData.set('common', []);

dataLines.forEach(line => {
    if (!line.trim()) return;
    
    const values = line.split(',');
    if (values.length < 2) return;
    
    const key = values[0].trim();
    const tool = guessToolFromKey(key);
    
    if (!toolData.has(tool)) {
        toolData.set(tool, []);
    }
    
    toolData.get(tool).push(line);
});

// languagesディレクトリを作成
if (!fs.existsSync(languagesDir)) {
    fs.mkdirSync(languagesDir, { recursive: true });
}

// 各ツールのフォルダとCSVファイルを作成
let totalKeys = 0;
toolData.forEach((lines, toolName) => {
    const toolDir = path.join(languagesDir, toolName);
    if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir, { recursive: true });
    }
    
    const tableName = toolName === 'common' 
        ? 'language_settings_common' 
        : getLanguageTableName(toolName);
    const csvFile = path.join(toolDir, `${tableName}.csv`);
    
    const content = [header, ...lines].join('\n') + '\n';
    fs.writeFileSync(csvFile, content, 'utf-8');
    
    console.log(`✓ ${toolName}: ${lines.length}件 → ${csvFile}`);
    totalKeys += lines.length;
});

console.log(`\n=== 分割完了 ===`);
console.log(`合計キー数: ${totalKeys}`);
console.log(`ツール数: ${toolData.size}`);
process.exit(0);
