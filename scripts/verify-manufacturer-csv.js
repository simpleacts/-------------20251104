/**
 * メーカーごとのCSVファイルの整合性を確認するスクリプト
 * 
 * 使用方法:
 * node scripts/verify-manufacturer-csv.js
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

// CSV行をパース
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

// メイン処理
function main() {
    console.log('=== メーカーごとのCSVファイル整合性確認 ===\n');
    
    const manufacturers = loadManufacturers();
    console.log(`Found ${manufacturers.length} manufacturers:\n`);
    
    let totalIssues = 0;
    
    manufacturers.forEach(manufacturer => {
        console.log(`\n[${manufacturer.id}] ${manufacturer.name}`);
        console.log('─'.repeat(50));
        
        const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
        
        if (!fs.existsSync(manufacturerDir)) {
            console.log(`  ❌ ディレクトリが存在しません: ${manufacturerDir}`);
            totalIssues++;
            return;
        }
        
        let manufacturerIssues = 0;
        
        MANUFACTURER_DEPENDENT_TABLES.forEach(tableName => {
            // 新しいファイル名ルール: {tableName}_{manufacturerId}.csv
            const filePath = path.join(manufacturerDir, `${tableName}_${manufacturer.id}.csv`);
            const data = loadCSV(filePath);
            
            if (!data) {
                console.log(`  ⚠️  ${tableName}_${manufacturer.id}.csv: ファイルが存在しないか空です`);
                manufacturerIssues++;
                return;
            }
            
            const { headers, rows } = data;
            const issues = [];
            
            // brand_idが含まれていないか確認
            if (headers.includes('brand_id')) {
                issues.push('brand_idカラムが含まれています（削除が必要）');
            }
            
            // manufacturer_idが含まれているか確認
            if (!headers.includes('manufacturer_id')) {
                issues.push('manufacturer_idカラムが含まれていません');
            }
            
            // データ行のmanufacturer_idが正しいか確認
            if (rows.length > 0) {
                const incorrectManufacturerIds = rows.filter(row => row.manufacturer_id !== manufacturer.id);
                if (incorrectManufacturerIds.length > 0) {
                    issues.push(`${incorrectManufacturerIds.length}行のmanufacturer_idが正しくありません`);
                }
            }
            
            if (issues.length > 0) {
                console.log(`  ❌ ${tableName}.csv:`);
                issues.forEach(issue => console.log(`     - ${issue}`));
                manufacturerIssues += issues.length;
            } else {
                console.log(`  ✅ ${tableName}.csv: ${rows.length}行（問題なし）`);
            }
        });
        
        if (manufacturerIssues === 0) {
            console.log(`\n  ✅ すべてのファイルに問題はありません`);
        } else {
            console.log(`\n  ❌ ${manufacturerIssues}件の問題が見つかりました`);
            totalIssues += manufacturerIssues;
        }
    });
    
    console.log('\n' + '='.repeat(50));
    if (totalIssues === 0) {
        console.log('✅ すべてのメーカーのCSVファイルに問題はありません');
    } else {
        console.log(`❌ 合計 ${totalIssues}件の問題が見つかりました`);
        process.exit(1);
    }
}

// スクリプトを実行
if (require.main === module) {
    try {
        main();
        // main()内でprocess.exit(1)が呼ばれる場合があるため、ここでは正常終了のみ処理
        if (process.exitCode === undefined) {
            process.exit(0);
        }
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { loadManufacturers, loadCSV };

