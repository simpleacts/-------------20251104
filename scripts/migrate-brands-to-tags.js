/**
 * ブランドをproduct_tagsに統合するデータ移行スクリプト
 * 
 * 使用方法:
 * node scripts/migrate-brands-to-tags.js
 * 
 * このスクリプトは:
 * 1. 既存のbrandsテーブルからブランド情報を取得
 * 2. products_masterのbrand_idから商品とブランドの関連を取得
 * 3. product_tagsにブランドタグ（brand_*形式）を追加
 */

const fs = require('fs');
const path = require('path');

// CSVファイルを読み込む関数
function readCSV(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`ファイルが存在しません: ${filePath}`);
        return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === 0 || values[0] === '') continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
}

// CSVファイルに書き込む関数
function writeCSV(filePath, headers, data) {
    const lines = [headers.join(',')];
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // カンマが含まれる場合はダブルクォートで囲む
            if (value.includes(',') || value.includes('"')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        lines.push(values.join(','));
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`書き込み完了: ${filePath} (${data.length}行)`);
}

// ブランド名をタグIDに変換
function brandNameToTagId(brandName) {
    if (!brandName) return '';
    // ブランド名を小文字に変換し、スペースをハイフンに置換
    const normalized = brandName.toLowerCase().replace(/\s+/g, '-');
    return `brand_${normalized}`;
}

// メーカーディレクトリを検索
function findManufacturerDirectories(baseDir) {
    const manufacturersDir = path.join(baseDir, 'templates', 'manufacturers');
    if (!fs.existsSync(manufacturersDir)) {
        console.warn(`ディレクトリが存在しません: ${manufacturersDir}`);
        return [];
    }
    
    const dirs = fs.readdirSync(manufacturersDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('manu_'))
        .map(dirent => dirent.name);
    
    return dirs;
}

// メイン処理
function migrateBrandsToTags() {
    const baseDir = process.cwd();
    const manufacturerDirs = findManufacturerDirectories(baseDir);
    
    console.log(`見つかったメーカーディレクトリ: ${manufacturerDirs.length}個`);
    
    manufacturerDirs.forEach(manufacturerDir => {
        const manufacturerId = manufacturerDir;
        console.log(`\n処理中: ${manufacturerId}`);
        
        // ファイルパス
        const brandsPath = path.join(baseDir, 'templates', 'manufacturers', manufacturerDir, `brands_${manufacturerId}.csv`);
        const productsMasterPath = path.join(baseDir, 'templates', 'manufacturers', manufacturerDir, `products_master_${manufacturerId}.csv`);
        const productTagsPath = path.join(baseDir, 'templates', 'manufacturers', manufacturerDir, `product_tags_${manufacturerId}.csv`);
        
        // ブランドデータを読み込み
        const brands = readCSV(brandsPath);
        if (brands.length === 0) {
            console.log(`  ブランドデータが見つかりません: ${brandsPath}`);
            return;
        }
        
        // 商品マスターデータを読み込み
        const productsMaster = readCSV(productsMasterPath);
        if (productsMaster.length === 0) {
            console.log(`  商品マスターデータが見つかりません: ${productsMasterPath}`);
            return;
        }
        
        // 既存のproduct_tagsを読み込み
        const existingTags = readCSV(productTagsPath);
        const existingTagSet = new Set();
        existingTags.forEach(tag => {
            const key = `${tag.product_id}_${tag.tag_id}`;
            existingTagSet.add(key);
        });
        
        // ブランドタグを追加
        const newTags = [];
        let addedCount = 0;
        
        productsMaster.forEach(product => {
            const productId = product.id;
            const brandId = product.brand_id;
            
            if (!productId || !brandId) return;
            
            // ブランド情報を取得
            const brand = brands.find(b => b.id === brandId);
            if (!brand) {
                console.warn(`  ブランドが見つかりません: productId=${productId}, brandId=${brandId}`);
                return;
            }
            
            const brandName = brand.name || brand.code || '';
            if (!brandName) return;
            
            // タグIDを生成
            const tagId = brandNameToTagId(brandName);
            
            // 既に存在するかチェック
            const tagKey = `${productId}_${tagId}`;
            if (existingTagSet.has(tagKey)) {
                return; // 既に存在する場合はスキップ
            }
            
            // 新しいタグを追加
            newTags.push({
                product_id: productId,
                tag_id: tagId,
                manufacturer_id: manufacturerId
            });
            addedCount++;
        });
        
        // 既存のタグと新しいタグをマージ
        const allTags = [...existingTags, ...newTags];
        
        // CSVに書き込み
        if (allTags.length > 0) {
            writeCSV(productTagsPath, ['product_id', 'tag_id', 'manufacturer_id'], allTags);
            console.log(`  ${addedCount}個のブランドタグを追加しました`);
        } else {
            console.log(`  追加するブランドタグがありません`);
        }
    });
    
    console.log('\n移行完了！');
}

// スクリプトを実行
if (require.main === module) {
    migrateBrandsToTags();
}

module.exports = { migrateBrandsToTags, brandNameToTagId };

