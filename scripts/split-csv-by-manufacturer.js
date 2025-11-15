/**
 * メーカーごとにCSVファイルを分割・再生成するスクリプト
 * 
 * 使用方法:
 * node scripts/split-csv-by-manufacturer.js
 */

const fs = require('fs');
const path = require('path');

// メーカー依存のテーブルリスト
const MANUFACTURER_DEPENDENT_TABLES = [
    'products_master',
    'product_details',
    'product_prices',
    'product_colors',
    'product_tags',
    'colors',
    'sizes',
    'skus',
    'stock',
    'incoming_stock'
];

// メーカーデータを読み込む
function loadManufacturers() {
    const manufacturersPath = path.join(__dirname, '../templates/common/manufacturers.csv');
    if (!fs.existsSync(manufacturersPath)) {
        console.error('manufacturers.csv not found:', manufacturersPath);
        process.exit(1);
    }
    
    const content = fs.readFileSync(manufacturersPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    const manufacturers = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const manufacturer = {};
            headers.forEach((header, index) => {
                manufacturer[header.trim()] = values[index]?.trim() || '';
            });
            manufacturers.push(manufacturer);
        }
    }
    
    return manufacturers;
}

// CSV行をパース（カンマとダブルクォートを考慮）
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
                i++;
            } else {
                // ダブルクォートの開始/終了
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // フィールドの区切り
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // 最後のフィールドを追加
    fields.push(currentField);
    return fields;
}

// CSVフィールドをエスケープ
function escapeCSVField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
    // カンマ、ダブルクォート、改行を含む場合はダブルクォートで囲む
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// CSVファイルを読み込む
function loadCSV(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return null;
    }
    
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
            });
            rows.push(row);
        }
    }
    
    return { headers, rows };
}

// CSVファイルを書き込む
function writeCSV(filePath, headers, rows) {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const lines = [headers.map(escapeCSVField).join(',')];
    rows.forEach(row => {
        const values = headers.map(header => escapeCSVField(row[header] || ''));
        lines.push(values.join(','));
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Created: ${filePath} (${rows.length} rows)`);
}

// メーカーごとにCSVファイルを分割
function splitCSVByManufacturer(tableName, manufacturers) {
    console.log(`\nProcessing ${tableName}...`);
    
    // 統合ファイルのパス（存在する場合）
    const unifiedPath = path.join(__dirname, '../templates', `${tableName}.csv`);
    const unifiedData = loadCSV(unifiedPath);
    
    if (!unifiedData) {
        console.log(`  No unified file found: ${unifiedPath}`);
        // 既存のメーカーごとのファイルを確認（新しいファイル名ルール）
        manufacturers.forEach(manufacturer => {
            const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
            const manufacturerFile = path.join(manufacturerDir, `${tableName}_${manufacturer.id}.csv`);
            if (fs.existsSync(manufacturerFile)) {
                console.log(`  Found existing file: ${manufacturerFile}`);
            }
        });
        return;
    }
    
    const { headers, rows } = unifiedData;
    
    // manufacturer_idカラムを確認
    const hasManufacturerId = headers.includes('manufacturer_id');
    if (!hasManufacturerId) {
        console.log(`  Warning: ${tableName} does not have manufacturer_id column`);
        return;
    }
    
    // メーカーごとに分割
    manufacturers.forEach(manufacturer => {
        const manufacturerRows = rows.filter(row => row.manufacturer_id === manufacturer.id);
        
        if (manufacturerRows.length > 0) {
            const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
            // 新しいファイル名ルール: {tableName}_{manufacturerId}.csv
            const manufacturerFile = path.join(manufacturerDir, `${tableName}_${manufacturer.id}.csv`);
            writeCSV(manufacturerFile, headers, manufacturerRows);
        } else {
            console.log(`  No data for manufacturer: ${manufacturer.id} (${manufacturer.name})`);
        }
    });
}

// メイン処理
function main() {
    console.log('=== CSV分割スクリプト ===\n');
    
    // メーカーデータを読み込む
    const manufacturers = loadManufacturers();
    console.log(`Found ${manufacturers.length} manufacturers:`);
    manufacturers.forEach(m => {
        console.log(`  - ${m.id}: ${m.name}`);
    });
    
    // 各テーブルを処理
    MANUFACTURER_DEPENDENT_TABLES.forEach(tableName => {
        splitCSVByManufacturer(tableName, manufacturers);
    });
    
    console.log('\n=== 完了 ===');
}

// スクリプトを実行
if (require.main === module) {
    try {
        main();
        process.exit(0);
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { splitCSVByManufacturer, loadManufacturers, loadCSV, writeCSV };

