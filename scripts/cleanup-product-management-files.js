/**
 * product-managementフォルダ内の分割済みCSVファイルを削除するスクリプト
 */

const fs = require('fs');
const path = require('path');

const productManagementDir = path.join(__dirname, '..', 'templates', 'product-management');

// 削除対象のファイル（メーカーごとに分割済み）
const filesToDelete = [
    'products_master.csv',
    'product_details.csv',
    'product_prices.csv',
    'product_tags.csv',
    'skus.csv',
    'stock.csv',
    'incoming_stock.csv',
    'importer_mappings.csv'
];

console.log('=== product-managementフォルダ内の分割済みCSVファイルを削除中 ===\n');

let deletedCount = 0;
let skippedCount = 0;

filesToDelete.forEach(fileName => {
    const filePath = path.join(productManagementDir, fileName);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✓ 削除: ${fileName}`);
            deletedCount++;
        } catch (error) {
            console.error(`✗ エラー: ${fileName} の削除に失敗しました - ${error.message}`);
        }
    } else {
        console.log(`- スキップ: ${fileName} (ファイルが見つかりません)`);
        skippedCount++;
    }
});

console.log(`\n=== 削除完了 ===`);
console.log(`削除したファイル数: ${deletedCount}`);
console.log(`スキップしたファイル数: ${skippedCount}`);
process.exit(0);

