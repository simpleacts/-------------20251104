/**
 * メーカーごとのCSVファイル名を新しいルールに沿ってリネームするスクリプト
 * 
 * 変更前: templates/manufacturers/manu_0001/products_master.csv
 * 変更後: templates/manufacturers/manu_0001/products_master_manu_0001.csv
 * 
 * 使用方法:
 * node scripts/rename-manufacturer-csv-files.js
 */

const fs = require('fs');
const path = require('path');

// メーカー依存テーブルのリスト
const MANUFACTURER_DEPENDENT_TABLES = [
    'sizes', 'product_colors', 'colors', 'product_sizes', 'product_color_sizes',
    'products_master', 'product_details', 'product_prices', 'product_tags',
    'skus', 'stock', 'incoming_stock', 'importer_mappings'
];

const manufacturersDir = path.join(__dirname, '..', 'templates', 'manufacturers');

if (!fs.existsSync(manufacturersDir)) {
    console.error('Manufacturers directory not found:', manufacturersDir);
    process.exit(1);
}

// メーカーディレクトリを取得
const manufacturerDirs = fs.readdirSync(manufacturersDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

console.log(`Found ${manufacturerDirs.length} manufacturer directories`);

let totalRenamed = 0;
let totalSkipped = 0;
let totalErrors = 0;

manufacturerDirs.forEach(manufacturerId => {
    const manufacturerPath = path.join(manufacturersDir, manufacturerId);
    console.log(`\nProcessing manufacturer: ${manufacturerId}`);
    
    MANUFACTURER_DEPENDENT_TABLES.forEach(tableName => {
        const oldFileName = `${tableName}.csv`;
        const newFileName = `${tableName}_${manufacturerId}.csv`;
        const oldPath = path.join(manufacturerPath, oldFileName);
        const newPath = path.join(manufacturerPath, newFileName);
        
        // 既に新しいファイル名が存在する場合はスキップ
        if (fs.existsSync(newPath)) {
            console.log(`  ✓ ${newFileName} already exists, skipping`);
            totalSkipped++;
            return;
        }
        
        // 古いファイル名が存在する場合のみリネーム
        if (fs.existsSync(oldPath)) {
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`  ✓ Renamed: ${oldFileName} → ${newFileName}`);
                totalRenamed++;
            } catch (error) {
                console.error(`  ✗ Error renaming ${oldFileName}:`, error.message);
                totalErrors++;
            }
        } else {
            console.log(`  - ${oldFileName} not found, skipping`);
            totalSkipped++;
        }
    });
});

console.log(`\n=== Summary ===`);
console.log(`Total renamed: ${totalRenamed}`);
console.log(`Total skipped: ${totalSkipped}`);
console.log(`Total errors: ${totalErrors}`);
process.exit(totalErrors > 0 ? 1 : 0);

