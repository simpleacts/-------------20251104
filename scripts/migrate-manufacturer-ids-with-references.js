/**
 * 既存のメーカー依存テーブルのIDを新しいフォーマットに移行するスクリプト（関連テーブルの参照も更新）
 * フォーマット: {prefix}_{manufacturer_id}_{番号}
 * 
 * 例:
 * - col_0001 → col_manu_0002_0001 (manufacturer_id=manu_0002の場合)
 * - size_0001 → size_manu_0002_0001
 * 
 * 関連テーブルの更新:
 * - product_colors.color_id
 * - product_sizes.size_id
 * - product_color_sizes.size_id, color_id
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');

// メーカー依存テーブルのリスト
const MANUFACTURER_DEPENDENT_TABLES = ['sizes', 'colors', 'product_sizes', 'product_color_sizes'];

// プレフィックスマッピング
const PREFIXES = {
    'sizes': 'size_',
    'colors': 'col_',
    'product_sizes': 'prdsz_',
    'product_color_sizes': 'pcolsz_',
};

console.log('メーカー依存テーブルのIDを移行中（関連テーブルの参照も更新）...\n');

// メーカーディレクトリを取得
const manufacturersDir = path.join(templatesDir, 'manufacturers');
if (!fs.existsSync(manufacturersDir)) {
    console.error('エラー: manufacturersディレクトリが見つかりません');
    process.exit(1);
}

const manufacturerDirs = fs.readdirSync(manufacturersDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// ステップ1: メーカー依存テーブルのIDを移行
console.log('=== ステップ1: メーカー依存テーブルのID移行 ===\n');

let migratedCount = 0;
let skippedCount = 0;

// IDマッピングを保存（旧ID → 新ID）
const idMappings = {
    colors: new Map(), // 旧color_id → 新color_id
    sizes: new Map(),   // 旧size_id → 新size_id
};

manufacturerDirs.forEach(manufacturerId => {
    const manufacturerPath = path.join(manufacturersDir, manufacturerId);
    
    MANUFACTURER_DEPENDENT_TABLES.forEach(tableName => {
        const csvPath = path.join(manufacturerPath, `${tableName}.csv`);
        const prefix = PREFIXES[tableName];
        
        if (!fs.existsSync(csvPath)) {
            console.log(`  スキップ: ${manufacturerId}/${tableName}.csv (ファイルが存在しません)`);
            skippedCount++;
            return;
        }
        
        // CSVファイルを読み込む
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        // IDカラムのインデックスを取得
        const headers = header.split(',');
        const idIndex = headers.indexOf('id');
        
        if (idIndex === -1) {
            console.log(`  スキップ: ${manufacturerId}/${tableName}.csv (idカラムが見つかりません)`);
            skippedCount++;
            return;
        }
        
        // 新しいIDフォーマットに変換
        const migratedLines = dataLines.map(line => {
            if (!line.trim()) return line;
            
            const values = line.split(',');
            if (values.length <= idIndex) return line;
            
            const oldId = values[idIndex].trim();
            
            // 既に新しいフォーマット（manufacturer_idを含む）の場合はスキップ
            if (oldId.includes(`${manufacturerId}_`)) {
                return line;
            }
            
            // プレフィックスを削除して番号を取得
            let numPart = oldId;
            if (prefix && oldId.startsWith(prefix)) {
                numPart = oldId.substring(prefix.length);
            }
            
            // 新しいIDを生成: {prefix}{manufacturer_id}_{番号}
            const newId = `${prefix}${manufacturerId}_${numPart}`;
            values[idIndex] = newId;
            
            // IDマッピングを保存
            if (tableName === 'colors') {
                idMappings.colors.set(oldId, newId);
            } else if (tableName === 'sizes') {
                idMappings.sizes.set(oldId, newId);
            }
            
            migratedCount++;
            return values.join(',');
        });
        
        // ファイルを書き戻す
        const newContent = [header, ...migratedLines].join('\n') + '\n';
        fs.writeFileSync(csvPath, newContent, 'utf-8');
        console.log(`✓ 移行: ${manufacturerId}/${tableName}.csv`);
    });
});

console.log(`\nステップ1完了: 移行 ${migratedCount}件, スキップ ${skippedCount}件\n`);

// ステップ2: 関連テーブルのID参照を更新
console.log('=== ステップ2: 関連テーブルのID参照更新 ===\n');

let referenceUpdateCount = 0;

manufacturerDirs.forEach(manufacturerId => {
    const manufacturerPath = path.join(manufacturersDir, manufacturerId);
    
    // product_colors.csvのcolor_idを更新
    const productColorsPath = path.join(manufacturerPath, 'product_colors.csv');
    if (fs.existsSync(productColorsPath)) {
        const csvContent = fs.readFileSync(productColorsPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        const headers = header.split(',');
        const colorIdIndex = headers.indexOf('color_id');
        
        if (colorIdIndex !== -1) {
            const updatedLines = dataLines.map(line => {
                if (!line.trim()) return line;
                
                const values = line.split(',');
                if (values.length <= colorIdIndex) return line;
                
                const oldColorId = values[colorIdIndex].trim();
                const newColorId = idMappings.colors.get(oldColorId);
                
                if (newColorId) {
                    values[colorIdIndex] = newColorId;
                    referenceUpdateCount++;
                    return values.join(',');
                }
                
                return line;
            });
            
            const newContent = [header, ...updatedLines].join('\n') + '\n';
            fs.writeFileSync(productColorsPath, newContent, 'utf-8');
            console.log(`✓ 更新: ${manufacturerId}/product_colors.csv (color_id参照)`);
        }
    }
    
    // product_sizes.csvのsize_idを更新
    const productSizesPath = path.join(manufacturerPath, 'product_sizes.csv');
    if (fs.existsSync(productSizesPath)) {
        const csvContent = fs.readFileSync(productSizesPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        const headers = header.split(',');
        const sizeIdIndex = headers.indexOf('size_id');
        
        if (sizeIdIndex !== -1) {
            const updatedLines = dataLines.map(line => {
                if (!line.trim()) return line;
                
                const values = line.split(',');
                if (values.length <= sizeIdIndex) return line;
                
                const oldSizeId = values[sizeIdIndex].trim();
                const newSizeId = idMappings.sizes.get(oldSizeId);
                
                if (newSizeId) {
                    values[sizeIdIndex] = newSizeId;
                    referenceUpdateCount++;
                    return values.join(',');
                }
                
                return line;
            });
            
            const newContent = [header, ...updatedLines].join('\n') + '\n';
            fs.writeFileSync(productSizesPath, newContent, 'utf-8');
            console.log(`✓ 更新: ${manufacturerId}/product_sizes.csv (size_id参照)`);
        }
    }
    
    // product_color_sizes.csvのsize_idとcolor_idを更新
    const productColorSizesPath = path.join(manufacturerPath, 'product_color_sizes.csv');
    if (fs.existsSync(productColorSizesPath)) {
        const csvContent = fs.readFileSync(productColorSizesPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        const headers = header.split(',');
        const sizeIdIndex = headers.indexOf('size_id');
        const colorIdIndex = headers.indexOf('color_id');
        
        if (sizeIdIndex !== -1 || colorIdIndex !== -1) {
            const updatedLines = dataLines.map(line => {
                if (!line.trim()) return line;
                
                const values = line.split(',');
                let updated = false;
                
                if (sizeIdIndex !== -1 && values.length > sizeIdIndex) {
                    const oldSizeId = values[sizeIdIndex].trim();
                    const newSizeId = idMappings.sizes.get(oldSizeId);
                    if (newSizeId) {
                        values[sizeIdIndex] = newSizeId;
                        updated = true;
                    }
                }
                
                if (colorIdIndex !== -1 && values.length > colorIdIndex) {
                    const oldColorId = values[colorIdIndex].trim();
                    const newColorId = idMappings.colors.get(oldColorId);
                    if (newColorId) {
                        values[colorIdIndex] = newColorId;
                        updated = true;
                    }
                }
                
                if (updated) {
                    referenceUpdateCount++;
                }
                
                return values.join(',');
            });
            
            const newContent = [header, ...updatedLines].join('\n') + '\n';
            fs.writeFileSync(productColorSizesPath, newContent, 'utf-8');
            console.log(`✓ 更新: ${manufacturerId}/product_color_sizes.csv (size_id, color_id参照)`);
        }
    }
});

console.log(`\nステップ2完了: 参照更新 ${referenceUpdateCount}件`);

console.log(`\n=== 全体完了 ===`);
console.log(`ID移行: ${migratedCount}件`);
console.log(`参照更新: ${referenceUpdateCount}件`);
console.log(`スキップ: ${skippedCount}件`);
console.log(`\n注意: データベースに既にデータが存在する場合は、SQLでIDを更新する必要があります。`);
process.exit(0);
