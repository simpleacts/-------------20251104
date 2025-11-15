/**
 * stock_{manufacturer_id}.csvを新しいフラット構造に変換するスクリプト
 * skus.csv、products_master.csv、colors.csv、sizes.csvから情報を取得して変換
 * 
 * 使用方法:
 * node scripts/convert-stock-to-stock-items.js
 */

const fs = require('fs');
const path = require('path');

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

// CSVフィールドをエスケープ
function escapeCSVField(field) {
    if (field === null || field === undefined || field === '') {
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
    const data = loadCSV(manufacturersPath);
    if (!data) {
        console.error('Failed to load manufacturers.csv');
        process.exit(1);
    }
    return data.rows;
}

// カラーIDからカラーコードを取得
function getColorCode(colorsData, colorId) {
    if (!colorsData) return '';
    
    // 古いID形式（col_0070）と新しいID形式（col_manu_0001_0070）の両方に対応
    const color = colorsData.rows.find(c => 
        c.id === colorId || 
        c.id === colorId.replace(/^col_/, 'col_manu_') ||
        c.id.endsWith(`_${colorId.replace(/^col_/, '')}`)
    );
    
    return color?.code || '';
}

// カラーIDからカラー名を取得
function getColorName(colorsData, colorId) {
    if (!colorsData) return '';
    
    const color = colorsData.rows.find(c => 
        c.id === colorId || 
        c.id === colorId.replace(/^col_/, 'col_manu_') ||
        c.id.endsWith(`_${colorId.replace(/^col_/, '')}`)
    );
    
    return color?.name || '';
}

// サイズIDからサイズコードを取得
function getSizeCode(sizesData, sizeId) {
    if (!sizesData) return '';
    
    // 古いID形式（size_0017）と新しいID形式（size_manu_0001_0017）の両方に対応
    const size = sizesData.rows.find(s => 
        s.id === sizeId || 
        s.id === sizeId.replace(/^size_/, 'size_manu_') ||
        s.id.endsWith(`_${sizeId.replace(/^size_/, '')}`)
    );
    
    return size?.sizeCode || '';
}

// サイズIDからサイズ名を取得
function getSizeName(sizesData, sizeId) {
    if (!sizesData) return '';
    
    const size = sizesData.rows.find(s => 
        s.id === sizeId || 
        s.id === sizeId.replace(/^size_/, 'size_manu_') ||
        s.id.endsWith(`_${sizeId.replace(/^size_/, '')}`)
    );
    
    return size?.sizeName || '';
}

// 商品IDから商品コードを取得
function getProductCode(productsMasterData, productId) {
    if (!productsMasterData) return '';
    
    const product = productsMasterData.rows.find(p => p.id === productId);
    return product?.code || '';
}

// 商品IDから商品名を取得
function getProductName(productDetailsData, productId) {
    if (!productDetailsData) return '';
    
    const product = productDetailsData.rows.find(p => p.product_id === productId);
    return product?.name || '';
}

// stock.csvをstock_itemsテーブル構造に変換
function convertStockToStockItems(manufacturer) {
    const manufacturerDir = path.join(__dirname, '../templates/manufacturers', manufacturer.id);
    
    // 必要なCSVファイルを読み込む（新しいファイル名ルール）
    const stockData = loadCSV(path.join(manufacturerDir, `stock_${manufacturer.id}.csv`));
    const skusData = loadCSV(path.join(manufacturerDir, `skus_${manufacturer.id}.csv`));
    const productsMasterData = loadCSV(path.join(manufacturerDir, `products_master_${manufacturer.id}.csv`));
    const productDetailsData = loadCSV(path.join(manufacturerDir, `product_details_${manufacturer.id}.csv`));
    const colorsData = loadCSV(path.join(manufacturerDir, `colors_${manufacturer.id}.csv`));
    const sizesData = loadCSV(path.join(manufacturerDir, `sizes_${manufacturer.id}.csv`));
    
    if (!stockData || stockData.rows.length === 0) {
        console.log(`  ⚠️  ${manufacturer.id}/stock_${manufacturer.id}.csv: データがありません`);
        return;
    }
    
    if (!skusData || skusData.rows.length === 0) {
        console.log(`  ⚠️  ${manufacturer.id}/skus_${manufacturer.id}.csv: データがありません（変換に必要）`);
        return;
    }
    
    // skus.csvからsku_idマップを作成
    const skuMap = new Map();
    skusData.rows.forEach(sku => {
        skuMap.set(sku.id, {
            product_master_id: sku.product_master_id,
            color_id: sku.color_id,
            size_id: sku.size_id,
            jan_code: sku.jan_code || ''
        });
    });
    
    // stock.csvを新しい構造に変換
    const stockItemsRows = [];
    stockData.rows.forEach((stockRow, index) => {
        const skuId = stockRow.sku_id;
        const skuInfo = skuMap.get(skuId);
        
        if (!skuInfo) {
            console.log(`  ⚠️  SKU ${skuId} が見つかりません`);
            return;
        }
        
        const productCode = getProductCode(productsMasterData, skuInfo.product_master_id);
        const productName = getProductName(productDetailsData, skuInfo.product_master_id);
        const colorCode = getColorCode(colorsData, skuInfo.color_id);
        const colorName = getColorName(colorsData, skuInfo.color_id);
        const sizeCode = getSizeCode(sizesData, skuInfo.size_id);
        const sizeName = getSizeName(sizesData, skuInfo.size_id);
        
        const stockItemRow = {
            id: `stock_item_${manufacturer.id}_${index + 1}`,
            manufacturer_id: manufacturer.id,
            product_code: productCode,
            product_name: productName,
            color_code: colorCode,
            color_name: colorName,
            size_code: sizeCode,
            size_name: sizeName,
            quantity: stockRow.quantity || 0,
            incoming_quantity: '',
            incoming_date: '',
            list_price: '',
            jan_code: skuInfo.jan_code,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        
        stockItemsRows.push(stockItemRow);
    });
    
    // 新しい構造のCSVファイルを書き込む（新しいファイル名ルール: stock_{manufacturerId}.csv）
    const stockItemsHeaders = [
        'id', 'manufacturer_id', 'product_code', 'product_name',
        'color_code', 'color_name', 'size_code', 'size_name',
        'quantity', 'incoming_quantity', 'incoming_date',
        'list_price', 'jan_code', 'created_at', 'updated_at'
    ];
    
    const stockCsvPath = path.join(manufacturerDir, `stock_${manufacturer.id}.csv`);
    writeCSV(stockCsvPath, stockItemsHeaders, stockItemsRows);
    
    console.log(`  ✅ ${manufacturer.id}/stock_${manufacturer.id}.csv: ${stockItemsRows.length}行に変換しました`);
}

// メイン処理
function main() {
    console.log('=== stock.csvをstock_items構造に変換 ===\n');
    
    const manufacturers = loadManufacturers();
    console.log(`Found ${manufacturers.length} manufacturers:\n`);
    
    manufacturers.forEach(manufacturer => {
        console.log(`Processing: ${manufacturer.id} (${manufacturer.name})`);
        convertStockToStockItems(manufacturer);
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

module.exports = { convertStockToStockItems, loadManufacturers };

