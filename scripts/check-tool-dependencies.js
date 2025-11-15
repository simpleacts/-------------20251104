const fs = require('fs');
const path = require('path');

/**
 * CSVファイルパスからテーブル名を抽出
 * api/save-csv.php と src/core/utils/csvPathResolver.ts のロジックに基づく
 */
function getTableNameFromCsvPath(relPath) {
    // templates/ プレフィックスを除去
    let path = relPath.replace(/^templates\//, '').replace(/\.csv$/, '');
    
    // メーカー依存テーブル（manu_XXXX_details.csv など）
    if (path.match(/^manufacturers\/manu_\d+\/manu_\d+_(details|stock|tags)\.csv$/)) {
        const match = path.match(/^manufacturers\/(manu_\d+)\/(manu_\d+)_(details|stock|tags)$/);
        if (match) {
            return match[1] + '_' + match[3]; // manu_0001_details
        }
    }
    
    // 言語設定テーブル（languages/xxx/language_settings_xxx.csv）
    if (path.startsWith('languages/')) {
        const parts = path.split('/');
        return parts[parts.length - 1]; // 最後の部分がテーブル名
    }
    
    // ツールフォルダ内のテーブル（email-management/emails.csv → emails）
    const toolFolders = [
        'email-management', 'ink-mixing', 'order-management', 'pricing', 'dtf', 
        'pdf', 'print-history', 'product-definition', 'task-settings',
        'system', 'dev', 'modules', 'common'
    ];
    
    for (const folder of toolFolders) {
        if (path.startsWith(folder + '/')) {
            const fileName = path.substring(folder.length + 1);
            // ファイル名がテーブル名（例: emails.csv → emails）
            return fileName;
        }
    }
    
    // 直下のファイル（templates/xxx.csv → xxx）
    return path;
}

/**
 * templates配下のCSVファイル一覧を取得
 */
function getAllCsvFiles(dir, baseDir = dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
                results = results.concat(getAllCsvFiles(filePath, baseDir));
            }
        } else if (file.endsWith('.csv')) {
            const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
            const tableName = getTableNameFromCsvPath(relPath);
            
            results.push({ file: relPath, tableName });
        }
    });
    
    return results;
}

/**
 * tool_dependencies.csvからテーブル名を抽出
 */
function getTableNamesFromDependencies(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').slice(1); // ヘッダーをスキップ
    const tableNames = new Set();
    
    lines.forEach(line => {
        if (line.trim()) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const tableName = parts[1].trim().replace(/^"|"$/g, '');
                if (tableName) {
                    tableNames.add(tableName);
                }
            }
        }
    });
    
    return tableNames;
}

// 実行
const templatesDir = path.join(__dirname, '..', 'templates');
const depsPath = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');

console.log('=== tool_dependencies.csv の棚卸し ===\n');

const csvFiles = getAllCsvFiles(templatesDir);
const csvTableNames = new Set(csvFiles.map(f => f.tableName));
const depsTableNames = getTableNamesFromDependencies(depsPath);

// メーカー依存テーブルや言語設定テーブルは除外して比較
const csvTableNamesFiltered = Array.from(csvTableNames).filter(t => 
    !t.includes('manu_') && 
    !t.startsWith('language_settings_') && 
    t !== 'tool_dependencies' && 
    t !== 'database_setup.sql.txt' &&
    !t.includes('server_config')
);

const depsTableNamesFiltered = Array.from(depsTableNames).filter(t => 
    !t.includes('manu_') && 
    !t.startsWith('language_settings_')
);

// 不足しているテーブル（CSVに存在するがtool_dependencies.csvにない）
const missing = csvTableNamesFiltered.filter(t => !depsTableNames.has(t));

// 不要なテーブル（tool_dependencies.csvにあるがCSVにない）
const extra = depsTableNamesFiltered.filter(t => !csvTableNames.has(t));

console.log('=== 不足しているテーブル（CSVに存在するがtool_dependencies.csvにない）===');
if (missing.length === 0) {
    console.log('なし');
} else {
    missing.forEach(t => {
        const file = csvFiles.find(f => f.tableName === t);
        console.log(`- ${t} (${file ? file.file : 'N/A'})`);
    });
}

console.log('\n=== 不要なテーブル（tool_dependencies.csvにあるがCSVにない）===');
if (extra.length === 0) {
    console.log('なし');
} else {
    extra.forEach(t => console.log(`- ${t}`));
}

console.log('\n=== 統計 ===');
console.log(`CSVファイル数: ${csvFiles.length}`);
console.log(`tool_dependencies.csvのエントリ数: ${Array.from(depsTableNames).length}`);
console.log(`不足: ${missing.length}`);
console.log(`不要: ${extra.length}`);

// 言語設定テーブルの確認
const languageTables = Array.from(csvTableNames).filter(t => t.startsWith('language_settings_'));
const depsLanguageTables = Array.from(depsTableNames).filter(t => t.startsWith('language_settings_'));

console.log('\n=== 言語設定テーブルの確認 ===');
console.log(`CSVに存在する言語設定テーブル: ${languageTables.length}`);
console.log(`tool_dependencies.csvに記載されている言語設定テーブル: ${depsLanguageTables.length}`);

const missingLanguage = languageTables.filter(t => !depsLanguageTables.includes(t));
const extraLanguage = depsLanguageTables.filter(t => !languageTables.includes(t));

if (missingLanguage.length > 0) {
    console.log('\n不足している言語設定テーブル:');
    missingLanguage.forEach(t => console.log(`- ${t}`));
}

if (extraLanguage.length > 0) {
    console.log('\n不要な言語設定テーブル:');
    extraLanguage.forEach(t => console.log(`- ${t}`));
}

