/**
 * product-managementフォルダ内のCSVファイルをメーカーごとに分割するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const productManagementDir = path.join(templatesDir, 'product-management');
const manufacturersDir = path.join(templatesDir, 'manufacturers');
const commonDir = path.join(templatesDir, 'common');

// CSVファイルをパース
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    };
    
    const headers = parseLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            rows.push(row);
        }
    }
    
    return { headers, rows };
}

// CSVファイルを書き込み
function writeCSV(filePath, headers, rows) {
    const lines = [headers.join(',')];
    
    rows.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] || '';
            // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        lines.push(values.join(','));
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

// メイン処理
function splitByManufacturer() {
    console.log('=== product-managementフォルダ内のCSVファイルをメーカーごとに分割中 ===\n');
    
    // brands.csvを読み込んで、ブランドIDとメーカーIDのマッピングを取得
    const brandsPath = path.join(commonDir, 'brands.csv');
    if (!fs.existsSync(brandsPath)) {
        console.error('エラー: brands.csvが見つかりません');
        return;
    }
    
    const brandsContent = fs.readFileSync(brandsPath, 'utf-8');
    const brandsData = parseCSV(brandsContent);
    const brandToManufacturer = {};
    brandsData.rows.forEach(row => {
        brandToManufacturer[row.id] = row.manufacturer_id;
    });
    
    console.log('ブランドとメーカーのマッピング:');
    Object.entries(brandToManufacturer).forEach(([brandId, manufacturerId]) => {
        console.log(`  ${brandId} -> ${manufacturerId}`);
    });
    console.log('');
    
    // products_master.csvを読み込む
    const productsMasterPath = path.join(productManagementDir, 'products_master.csv');
    if (!fs.existsSync(productsMasterPath)) {
        console.error('エラー: products_master.csvが見つかりません');
        return;
    }
    
    const productsMasterContent = fs.readFileSync(productsMasterPath, 'utf-8');
    const productsMasterData = parseCSV(productsMasterContent);
    
    // product_idからmanufacturer_idへのマッピングを作成
    const productToManufacturer = {};
    productsMasterData.rows.forEach(row => {
        const manufacturerId = brandToManufacturer[row.brand_id];
        if (manufacturerId) {
            productToManufacturer[row.id] = manufacturerId;
        }
    });
    
    // skus.csvを読み込んで、sku_idからmanufacturer_idへのマッピングを作成
    const skusPath = path.join(productManagementDir, 'skus.csv');
    let skuToManufacturer = {};
    if (fs.existsSync(skusPath)) {
        const skusContent = fs.readFileSync(skusPath, 'utf-8');
        const skusData = parseCSV(skusContent);
        skusData.rows.forEach(row => {
            const manufacturerId = productToManufacturer[row.product_master_id];
            if (manufacturerId) {
                skuToManufacturer[row.id] = manufacturerId;
            }
        });
    }
    
    // 分割対象のテーブル
    const tablesToSplit = [
        'products_master',
        'product_details',
        'product_prices',
        'product_tags',
        'skus',
        'stock',
        'incoming_stock',
        'importer_mappings'
    ];
    
    // 各テーブルを分割
    tablesToSplit.forEach(tableName => {
        const csvPath = path.join(productManagementDir, `${tableName}.csv`);
        if (!fs.existsSync(csvPath)) {
            console.log(`スキップ: ${tableName}.csv (ファイルが見つかりません)`);
            return;
        }
        
        console.log(`処理中: ${tableName}.csv`);
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const data = parseCSV(csvContent);
        
        if (data.headers.length === 0) {
            console.log(`  スキップ: ヘッダーがありません`);
            return;
        }
        
        // メーカーごとにデータを分割
        const manufacturerData = {};
        
        data.rows.forEach(row => {
            let manufacturerId = null;
            
            // テーブルごとにmanufacturer_idを取得する方法が異なる
            if (tableName === 'products_master') {
                manufacturerId = brandToManufacturer[row.brand_id];
            } else if (tableName === 'product_details' || tableName === 'product_prices' || tableName === 'product_tags') {
                manufacturerId = productToManufacturer[row.product_id || row.productId];
            } else if (tableName === 'skus') {
                manufacturerId = productToManufacturer[row.product_master_id];
            } else if (tableName === 'stock' || tableName === 'incoming_stock') {
                manufacturerId = skuToManufacturer[row.sku_id];
            } else if (tableName === 'importer_mappings') {
                manufacturerId = brandToManufacturer[row.brand_id];
            }
            
            if (!manufacturerId) {
                console.warn(`  警告: ${tableName}の行でmanufacturer_idが見つかりません:`, row);
                return;
            }
            
            if (!manufacturerData[manufacturerId]) {
                manufacturerData[manufacturerId] = [];
            }
            manufacturerData[manufacturerId].push(row);
        });
        
        // 各メーカーフォルダにCSVファイルを書き込み
        Object.entries(manufacturerData).forEach(([manufacturerId, rows]) => {
            const manufacturerDir = path.join(manufacturersDir, manufacturerId);
            if (!fs.existsSync(manufacturerDir)) {
                fs.mkdirSync(manufacturerDir, { recursive: true });
            }
            
            const outputPath = path.join(manufacturerDir, `${tableName}.csv`);
            writeCSV(outputPath, data.headers, rows);
            console.log(`  ✓ ${manufacturerId}: ${rows.length}件`);
        });
    });
    
    console.log('\n=== 分割完了 ===');
    console.log('元のファイルは手動で削除してください:');
    tablesToSplit.forEach(tableName => {
        console.log(`  templates/product-management/${tableName}.csv`);
    });
}

// 実行
if (require.main === module) {
    try {
        splitByManufacturer();
        process.exit(0);
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { splitByManufacturer };

