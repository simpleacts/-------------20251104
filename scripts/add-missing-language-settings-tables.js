/**
 * 不足しているlanguage_settings_*テーブルをデータベーススキーマに追加するスクリプト
 */

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates');
const databaseSetupFile = path.join(templatesDir, 'database_setup.sql.txt');

// CSVファイルからlanguage_settings_*テーブル名を抽出
function findLanguageSettingsTables() {
    const tableNames = new Set();
    
    // templates/languagesディレクトリを再帰的に検索
    function searchDirectory(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                searchDirectory(fullPath);
            } else if (entry.isFile() && entry.name.startsWith('language_settings_') && entry.name.endsWith('.csv')) {
                const fileName = path.basename(entry.name, '.csv');
                tableNames.add(fileName);
            }
        }
    }
    
    const languagesDir = path.join(templatesDir, 'languages');
    if (fs.existsSync(languagesDir)) {
        searchDirectory(languagesDir);
    }
    
    return Array.from(tableNames).sort();
}

// データベーススキーマファイルから既存のlanguage_settings_*テーブルを抽出
function findExistingLanguageSettingsTables(content) {
    const existingTables = new Set();
    
    // DROP TABLE文から抽出
    const dropMatches = content.matchAll(/DROP TABLE IF EXISTS `(language_settings_\w+)`/g);
    for (const match of dropMatches) {
        existingTables.add(match[1]);
    }
    
    // CREATE TABLE文から抽出
    const createMatches = content.matchAll(/CREATE TABLE `(language_settings_\w+)`/g);
    for (const match of createMatches) {
        existingTables.add(match[1]);
    }
    
    return existingTables;
}

// テーブル定義SQLを生成
function generateTableSQL(tableName) {
    return `CREATE TABLE \`${tableName}\` ( \`key\` VARCHAR(255) NOT NULL, \`ja\` TEXT, \`en\` TEXT, PRIMARY KEY (\`key\`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`;
}

// DROP TABLE文を生成
function generateDropSQL(tableName) {
    return `DROP TABLE IF EXISTS \`${tableName}\`;`;
}

function addMissingTables() {
    console.log('=== 不足しているlanguage_settings_*テーブルをデータベーススキーマに追加中 ===\n');
    
    // CSVファイルからテーブル名を抽出
    const allTables = findLanguageSettingsTables();
    console.log(`検出されたlanguage_settings_*テーブル数: ${allTables.length}`);
    console.log('テーブル一覧:', allTables.join(', '));
    console.log('');
    
    // データベーススキーマファイルを読み込む
    const content = fs.readFileSync(databaseSetupFile, 'utf-8');
    const existingTables = findExistingLanguageSettingsTables(content);
    console.log(`既存のlanguage_settings_*テーブル数: ${existingTables.size}`);
    console.log('既存テーブル:', Array.from(existingTables).sort().join(', '));
    console.log('');
    
    // 不足しているテーブルを特定
    const missingTables = allTables.filter(t => !existingTables.has(t));
    console.log(`不足しているテーブル数: ${missingTables.length}`);
    if (missingTables.length === 0) {
        console.log('すべてのテーブルが既に定義されています。');
        return;
    }
    console.log('不足しているテーブル:', missingTables.join(', '));
    console.log('');
    
    // DROP TABLE文を追加（DROP TABLE IF EXISTSセクションの最後に）
    const dropTableSection = content.match(/-- Drop Existing Tables\n--\n([\s\S]*?)(?=\n--\n-- Create Tables|$)/);
    if (dropTableSection) {
        const dropStatements = missingTables.map(generateDropSQL).join('\n');
        const newDropSection = dropTableSection[1] + dropStatements + '\n';
        const updatedContent = content.replace(dropTableSection[0], '-- Drop Existing Tables\n--\n' + newDropSection);
        
        // CREATE TABLE文を追加（language_settings_language_managerの後）
        const createTableMatch = updatedContent.match(/(CREATE TABLE `language_settings_language_manager`[^;]+;)\n\n/);
        if (createTableMatch) {
            const createStatements = missingTables.map(generateTableSQL).join('\n');
            const newContent = updatedContent.replace(
                createTableMatch[0],
                createTableMatch[1] + '\n' + createStatements + '\n\n'
            );
            
            // ファイルを書き込む
            fs.writeFileSync(databaseSetupFile, newContent, 'utf-8');
            console.log('✓ データベーススキーマファイルを更新しました。');
            console.log(`  追加されたDROP TABLE文: ${missingTables.length}件`);
            console.log(`  追加されたCREATE TABLE文: ${missingTables.length}件`);
        } else {
            console.error('エラー: CREATE TABLE文の挿入位置が見つかりませんでした。');
        }
    } else {
        console.error('エラー: DROP TABLEセクションが見つかりませんでした。');
    }
}

// 実行
if (require.main === module) {
    try {
        addMissingTables();
        process.exit(0);
    } catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
}

module.exports = { addMissingTables };

