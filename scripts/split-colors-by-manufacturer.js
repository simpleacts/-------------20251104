/**
 * colors.csvをメーカーごとに分割するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const colorsFile = path.join(templatesDir, 'common', 'colors.csv');

console.log('colors.csvをメーカーごとに分割中...\n');

if (!fs.existsSync(colorsFile)) {
    console.error('エラー: colors.csvが見つかりません');
    process.exit(1);
}

// CSVファイルを読み込む
const csvContent = fs.readFileSync(colorsFile, 'utf-8');
const lines = csvContent.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// メーカーごとにデータを分割
const manufacturerData = new Map();

dataLines.forEach(line => {
    if (!line.trim()) return;
    
    const values = line.split(',');
    if (values.length < 2) return;
    
    // manufacturer_idを取得（2番目のカラム）
    const manufacturerId = values[1];
    if (!manufacturerId) return;
    
    if (!manufacturerData.has(manufacturerId)) {
        manufacturerData.set(manufacturerId, []);
    }
    manufacturerData.get(manufacturerId).push(line);
});

// メーカーごとにファイルを作成
manufacturerData.forEach((lines, manufacturerId) => {
    const manufacturerDir = path.join(templatesDir, 'manufacturers', manufacturerId);
    if (!fs.existsSync(manufacturerDir)) {
        fs.mkdirSync(manufacturerDir, { recursive: true });
    }
    
    // 新しいファイル名ルール: colors_{manufacturerId}.csv
    const outputFile = path.join(manufacturerDir, `colors_${manufacturerId}.csv`);
    const content = [header, ...lines].join('\n') + '\n';
    fs.writeFileSync(outputFile, content, 'utf-8');
    console.log(`✓ 作成: manufacturers/${manufacturerId}/colors_${manufacturerId}.csv (${lines.length}件)`);
});

console.log(`\n完了しました！${manufacturerData.size}件のメーカーファイルを作成しました。`);
process.exit(0);

