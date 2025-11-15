/**
 * setup-tool-dependencies-write-access.sqlの内容を
 * tool_dependencies.csvに同期するスクリプト
 */

const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'setup-tool-dependencies-write-access.sql');
const csvFile = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');

// メイン処理
function main() {
    try {
        console.log('=== SQLファイルからCSVファイルへの同期開始 ===\n');
        console.log(`SQLファイル: ${sqlFile}`);
        console.log(`CSVファイル: ${csvFile}\n`);

        // SQLファイルを読み込む
        console.log('SQLファイルを読み込み中...');
        const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
        console.log(`SQLファイルサイズ: ${sqlContent.length} 文字\n`);

        // INSERT文からデータを抽出
        // すべてのINSERT文からVALUESブロックを抽出
        const sqlEntries = new Map(); // key: "tool_name,table_name", value: {read_fields, write_fields, allowed_operations, load_strategy}

        // すべてのINSERT文を検索
        const insertPattern = /INSERT INTO\s+`?tool_dependencies`?\s*\([^)]+\)\s*VALUES\s*([\s\S]*?)(?:\s*ON DUPLICATE KEY UPDATE|$)/gi;
        let insertMatch;
        let totalMatches = 0;

        console.log('INSERT文からVALUESブロックを抽出中...');

        while ((insertMatch = insertPattern.exec(sqlContent)) !== null) {
            const valuesBlock = insertMatch[1];
            
            // VALUESブロックからすべての値タプルを抽出
            const allValueMatches = Array.from(valuesBlock.matchAll(/\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g));
            
            for (const valueMatch of allValueMatches) {
                const toolName = valueMatch[1];
                const tableName = valueMatch[2];
                const readFields = valueMatch[3];
                const writeFields = valueMatch[4];
                const allowedOperations = valueMatch[5];
                const loadStrategy = valueMatch[6];
                
                const key = `${toolName},${tableName}`;
                sqlEntries.set(key, {
                    toolName,
                    tableName,
                    readFields,
                    writeFields,
                    allowedOperations,
                    loadStrategy
                });
                totalMatches++;
            }
        }

        console.log(`マッチしたエントリ数: ${totalMatches}\n`);
        console.log(`SQLファイルから ${sqlEntries.size} 件のエントリを抽出しました。\n`);

        // 既存のCSVファイルを読み込む
        let existingEntries = new Map(); // key: "tool_name,table_name", value: {read_fields, write_fields, load_strategy, load_condition}
        let csvHeader = 'tool_name,table_name,read_fields,write_fields,load_strategy,load_condition';

        if (fs.existsSync(csvFile)) {
            console.log('既存のCSVファイルを読み込み中...');
            const csvContent = fs.readFileSync(csvFile, 'utf-8');
            const lines = csvContent.trim().split('\n');
            console.log(`CSVファイル行数: ${lines.length}\n`);
            
            if (lines.length > 0) {
                csvHeader = lines[0];
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    // CSV行をパース（カンマ区切り、ただしread_fieldsはJSON形式なので注意）
                    const parts = [];
                    let current = '';
                    let inQuotes = false;
                    let inJson = false;
                    let braceCount = 0;
                    
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        
                        if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
                            inQuotes = !inQuotes;
                            current += char;
                        } else if (char === '{' && inQuotes) {
                            inJson = true;
                            braceCount++;
                            current += char;
                        } else if (char === '}' && inQuotes) {
                            braceCount--;
                            if (braceCount === 0) {
                                inJson = false;
                            }
                            current += char;
                        } else if (char === ',' && !inQuotes && !inJson) {
                            parts.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    if (current) {
                        parts.push(current.trim());
                    }
                    
                    if (parts.length >= 4) {
                        const toolName = parts[0];
                        const tableName = parts[1];
                        const readFields = parts[2];
                        const writeFields = parts[3] || '';
                        const loadStrategy = parts[4] || 'on_tool_mount';
                        const loadCondition = parts[5] || '';
                        
                        const key = `${toolName},${tableName}`;
                        existingEntries.set(key, {
                            toolName,
                            tableName,
                            readFields,
                            writeFields,
                            loadStrategy,
                            loadCondition
                        });
                    }
                }
            }
            
            console.log(`既存のCSVファイルから ${existingEntries.size} 件のエントリを読み込みました。\n`);
        } else {
            console.log('既存のCSVファイルが見つかりません。新規作成します。\n');
        }

        // SQLエントリを既存エントリにマージ
        // SQLファイルの内容を優先（write_fieldsとallowed_operationsを更新）
        let updatedCount = 0;
        let addedCount = 0;

        sqlEntries.forEach((sqlEntry, key) => {
            const existing = existingEntries.get(key);
            
            if (existing) {
                // 既存エントリを更新（SQLファイルの内容で上書き）
                existing.readFields = sqlEntry.readFields;
                existing.writeFields = sqlEntry.writeFields;
                existing.loadStrategy = sqlEntry.loadStrategy;
                updatedCount++;
            } else {
                // 新規エントリを追加
                existingEntries.set(key, {
                    toolName: sqlEntry.toolName,
                    tableName: sqlEntry.tableName,
                    readFields: sqlEntry.readFields,
                    writeFields: sqlEntry.writeFields,
                    loadStrategy: sqlEntry.loadStrategy,
                    loadCondition: ''
                });
                addedCount++;
            }
        });

        console.log(`更新: ${updatedCount}件`);
        console.log(`追加: ${addedCount}件\n`);

        // CSVファイルを書き込む
        console.log('CSVファイルを生成中...');
        const csvLines = [csvHeader];

        // ツール名とテーブル名でソート
        console.log('エントリをソート中...');
        const sortedEntries = Array.from(existingEntries.values()).sort((a, b) => {
            if (a.toolName !== b.toolName) {
                return a.toolName.localeCompare(b.toolName);
            }
            return a.tableName.localeCompare(b.tableName);
        });

        sortedEntries.forEach(entry => {
            // read_fieldsがJSON形式でない場合は、既存の形式を維持
            let readFields = entry.readFields;
            if (!readFields.startsWith('[') && !readFields.startsWith('{')) {
                // 既存のCSV形式を維持（JSON形式に変換）
                readFields = `[{"strategy":"on_tool_mount","fields":"*"}]`;
            }
            
            const line = [
                entry.toolName,
                entry.tableName,
                readFields,
                entry.writeFields || '*',
                entry.loadStrategy || 'on_tool_mount',
                entry.loadCondition || ''
            ].join(',');
            
            csvLines.push(line);
        });

        console.log('CSVファイルを書き込み中...');
        fs.writeFileSync(csvFile, csvLines.join('\n') + '\n', 'utf-8');
        console.log('書き込み完了\n');

        console.log(`=== 同期完了 ===`);
        console.log(`出力ファイル: ${csvFile}`);
        console.log(`合計エントリ数: ${sortedEntries.length}`);
        console.log(`更新: ${updatedCount}件`);
        console.log(`追加: ${addedCount}件`);
        process.exit(0);
    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// スクリプトを実行
if (require.main === module) {
    main();
}

