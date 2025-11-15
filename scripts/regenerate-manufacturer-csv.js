/**
 * メーカーごとのCSVファイルを再生成するスクリプト
 * brand_idを削除し、manufacturer_idに置き換える
 * 
 * 使用方法:
 * node scripts/regenerate-manufacturer-csv.js
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

// CSV行をパース（カンマとダブルクォートを考慮）
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    fields.push(currentField);
    return fields;
}

// CSVフィールドをエスケープ
function escapeCSVField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
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
    console.log(`  Created: ${path.basename(filePath)} (${rows.length} rows)`);
}

// メーカーデータを読み込む
function loadManufacturers() {
    const manufacturersPath = path.join(__dirname, '../templates/common/manufacturers.csv');
    if (!fs.existsSync(manufacturersPath)) {
        console.error('manufacturers.csv not found:', manufacturersPath);
        process.exit(1);
    }
    
    const data = loadCSV(manufacturersPath);
    if (!data) {
        console.error('Failed to load manufacturers.csv');
        process.exit(1);
    }
    
    return data.rows;
}

// ブランドとメーカーのマッピングを読み込む
function loadBrandToManufacturerMap() {
    const brandsPath = path.join(__dirname, '../templates/common/brands.csv');
    if (!fs.existsSync(brandsPath)) {
        return new Map();
    }
    
    const data = loadCSV(brandsPath);
    if (!data) {
        return new Map();
    }
    
    const map = new Map();
    data.rows.forEach(brand => {
        if (brand.manufacturer_id) {
            map.set(brand.id, brand.manufacturer_id);
        }
    });
    
    return map;
}

// products_master.csvを処理（brand_idをmanufacturer_idに変換）
function processProductsMaster(manufacturer, brandToManufacturerMap) {
    const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
    // 新しいファイル名ルール: products_master_{manufacturerId}.csv
    const filePath = path.join(manufacturerDir, `products_master_${manufacturer.id}.csv`);
    
    const data = loadCSV(filePath);
    if (!data) {
        console.log(`  No products_master.csv found for ${manufacturer.id}`);
        return;
    }
    
    let { headers, rows } = data;
    
    // brand_idを削除し、manufacturer_idを追加
    const hasBrandId = headers.includes('brand_id');
    const hasManufacturerId = headers.includes('manufacturer_id');
    
    if (hasBrandId && !hasManufacturerId) {
        // brand_idをmanufacturer_idに変換
        headers = headers.filter(h => h !== 'brand_id');
        headers.push('manufacturer_id');
        
        rows = rows.map(row => {
            const newRow = { ...row };
            delete newRow.brand_id;
            
            // brand_idからmanufacturer_idを取得（なければ直接manufacturer.idを使用）
            const brandId = row.brand_id;
            if (brandId && brandToManufacturerMap.has(brandId)) {
                newRow.manufacturer_id = brandToManufacturerMap.get(brandId);
            } else {
                newRow.manufacturer_id = manufacturer.id;
            }
            
            return newRow;
        });
        
        writeCSV(filePath, headers, rows);
    } else if (!hasManufacturerId) {
        // manufacturer_idがない場合は追加
        headers.push('manufacturer_id');
        rows = rows.map(row => ({
            ...row,
            manufacturer_id: manufacturer.id
        }));
        writeCSV(filePath, headers, rows);
    } else {
        // 既にmanufacturer_idがある場合は確認のみ
        const allHaveManufacturerId = rows.every(row => row.manufacturer_id === manufacturer.id);
        if (!allHaveManufacturerId) {
            console.log(`  Warning: Some rows in ${manufacturer.id}/products_master.csv have incorrect manufacturer_id`);
        }
    }
}

// その他のテーブルを処理（manufacturer_idが正しいか確認）
function processOtherTable(tableName, manufacturer) {
    const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
    // 新しいファイル名ルール: {tableName}_{manufacturerId}.csv
    const filePath = path.join(manufacturerDir, `${tableName}_${manufacturer.id}.csv`);
    
    const data = loadCSV(filePath);
    if (!data) {
        return; // ファイルが存在しない場合はスキップ
    }
    
    let { headers, rows } = data;
    const hasManufacturerId = headers.includes('manufacturer_id');
    
    if (!hasManufacturerId) {
        // manufacturer_idがない場合は追加
        headers.push('manufacturer_id');
        rows = rows.map(row => ({
            ...row,
            manufacturer_id: manufacturer.id
        }));
        writeCSV(filePath, headers, rows);
    } else {
        // manufacturer_idが正しいか確認
        const incorrectRows = rows.filter(row => row.manufacturer_id !== manufacturer.id);
        if (incorrectRows.length > 0) {
            // 修正
            rows = rows.map(row => ({
                ...row,
                manufacturer_id: manufacturer.id
            }));
            writeCSV(filePath, headers, rows);
        }
    }
}

// メイン処理
function main() {
    console.log('=== メーカーごとのCSVファイル再生成 ===\n');
    
    // メーカーデータを読み込む
    const manufacturers = loadManufacturers();
    console.log(`Found ${manufacturers.length} manufacturers:`);
    manufacturers.forEach(m => {
        console.log(`  - ${m.id}: ${m.name}`);
    });
    
    // ブランドとメーカーのマッピングを読み込む
    const brandToManufacturerMap = loadBrandToManufacturerMap();
    console.log(`\nLoaded ${brandToManufacturerMap.size} brand-to-manufacturer mappings\n`);
    
    // 各メーカーを処理
    manufacturers.forEach(manufacturer => {
        console.log(`\nProcessing manufacturer: ${manufacturer.id} (${manufacturer.name})`);
        
        // products_master.csvを特別に処理（brand_idを削除）
        processProductsMaster(manufacturer, brandToManufacturerMap);
        
        // その他のテーブルを処理
        const otherTables = MANUFACTURER_DEPENDENT_TABLES.filter(t => t !== 'products_master');
        otherTables.forEach(tableName => {
            processOtherTable(tableName, manufacturer);
        });
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

module.exports = { processProductsMaster, processOtherTable, loadManufacturers, loadBrandToManufacturerMap };

