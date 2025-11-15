/**
 * CSVファイル内のコンマを含むフィールドを自動的にダブルクォートで囲むスクリプト
 * 
 * 使用方法:
 * node scripts/fix-csv-quotes.js [CSVファイルのパス]
 * 
 * または、templates/languages/ 配下のすべてのCSVファイルを修正:
 * node scripts/fix-csv-quotes.js
 */

const fs = require('fs');
const path = require('path');

/**
 * CSV行をパースして、コンマを含むフィールドをダブルクォートで囲む
 */
function fixCSVLine(line, expectedFieldCount) {
    // 既にダブルクォートで囲まれている行は、正しくパースできるか確認
    if (line.includes('"')) {
        // 既にダブルクォートで囲まれている場合は、そのまま返す
        // ただし、フィールド数を確認
        const testFields = parseCSVLine(line);
        if (testFields.length === expectedFieldCount) {
            return line; // 正しくパースできる場合はそのまま
        }
        // パースできない場合は修正が必要
    }

    // シンプルなパース（ダブルクォートを考慮しない）
    const simpleFields = line.split(',');
    
    // フィールド数が期待値と一致する場合は、コンマを含むフィールドがないと判断
    if (simpleFields.length === expectedFieldCount) {
        return line; // 修正不要
    }

    // フィールド数が一致しない場合は、コンマを含むフィールドがあると判断
    // より高度なパースが必要
    const fields = parseCSVLine(line);
    const fixedFields = fields.map(field => {
        // コンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
            // フィールド内のダブルクォートをエスケープ
            const escapedField = field.replace(/"/g, '""');
            return `"${escapedField}"`;
        }
        return field;
    });

    return fixedFields.join(',');
}

/**
 * CSV行をパース（ダブルクォート対応）
 */
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // エスケープされたダブルクォート
                currentField += '"';
                i++; // 次の文字をスキップ
            } else {
                // ダブルクォートの開始/終了
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // フィールドの区切り
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // 最後のフィールドを追加
    fields.push(currentField);
    return fields;
}

/**
 * CSVファイルを修正
 */
function fixCSVFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        
        // ヘッダー行はそのまま
        if (lines.length === 0) {
            return false;
        }

        const fixedLines = [];
        let hasChanges = false;

        // ヘッダー行から期待されるフィールド数を取得
        const headerLine = lines[0];
        const expectedFieldCount = parseCSVLine(headerLine).length;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 空行はそのまま
            if (line.trim() === '') {
                fixedLines.push(line);
                continue;
            }

            // ヘッダー行（最初の行）はそのまま
            if (i === 0) {
                fixedLines.push(line);
                continue;
            }

            // データ行を修正
            const fixedLine = fixCSVLine(line, expectedFieldCount);
            if (fixedLine !== line) {
                hasChanges = true;
            }
            fixedLines.push(fixedLine);
        }

        if (hasChanges) {
            fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf-8');
            console.log(`✓ Fixed: ${filePath}`);
            return true;
        } else {
            console.log(`- No changes: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

/**
 * ディレクトリ内のすべてのCSVファイルを再帰的に処理
 */
function fixCSVFilesInDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    let fixedCount = 0;

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            fixedCount += fixCSVFilesInDirectory(filePath);
        } else if (file.endsWith('.csv')) {
            if (fixCSVFile(filePath)) {
                fixedCount++;
            }
        }
    }

    return fixedCount;
}

// メイン処理
const args = process.argv.slice(2);

if (args.length > 0) {
    // 指定されたファイルまたはディレクトリを処理
    const targetPath = args[0];
    const stat = fs.statSync(targetPath);

    if (stat.isDirectory()) {
        const count = fixCSVFilesInDirectory(targetPath);
        console.log(`\n処理完了: ${count}個のファイルを修正しました。`);
    } else if (targetPath.endsWith('.csv')) {
        fixCSVFile(targetPath);
        console.log('\n処理完了');
    } else {
        console.error('エラー: CSVファイルまたはディレクトリを指定してください。');
        process.exit(1);
    }
} else {
    // デフォルト: templates/languages/ 配下のすべてのCSVファイルを処理
    const languagesDir = path.join(__dirname, '..', 'templates', 'languages');
    
    if (!fs.existsSync(languagesDir)) {
        console.error(`エラー: ${languagesDir} が見つかりません。`);
        process.exit(1);
    }

    console.log(`templates/languages/ 配下のCSVファイルを処理中...\n`);
    const count = fixCSVFilesInDirectory(languagesDir);
    console.log(`\n処理完了: ${count}個のファイルを修正しました。`);
    process.exit(0);
}

