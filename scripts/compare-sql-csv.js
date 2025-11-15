/**
 * SQLファイルとCSVファイルを比較して、不足しているエントリを特定するスクリプト
 */

const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'setup-tool-dependencies-write-access.sql');
const csvFile = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');

console.log('=== SQLファイルとCSVファイルの比較 ===\n');

// SQLファイルからエントリを抽出
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
const sqlEntries = new Map();

const insertPattern = /INSERT INTO\s+`?tool_dependencies`?\s*\([^)]+\)\s*VALUES\s*([\s\S]*?)(?:\s*ON DUPLICATE KEY UPDATE|$)/gi;
let insertMatch;

while ((insertMatch = insertPattern.exec(sqlContent)) !== null) {
    const valuesBlock = insertMatch[1];
    const allValueMatches = Array.from(valuesBlock.matchAll(/\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g));
    
    for (const valueMatch of allValueMatches) {
        const toolName = valueMatch[1];
        const tableName = valueMatch[2];
        const key = `${toolName},${tableName}`;
        sqlEntries.set(key, {
            toolName,
            tableName,
            readFields: valueMatch[3],
            writeFields: valueMatch[4],
            allowedOperations: valueMatch[5],
            loadStrategy: valueMatch[6]
        });
    }
}

console.log(`SQLファイルから ${sqlEntries.size} 件のエントリを抽出しました。\n`);

// CSVファイルからエントリを抽出
const csvContent = fs.readFileSync(csvFile, 'utf-8');
const csvLines = csvContent.trim().split('\n');
const csvEntries = new Map();

for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i].trim();
    if (!line) continue;
    
    // CSV行をパース
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
    
    if (parts.length >= 2) {
        const toolName = parts[0];
        const tableName = parts[1];
        const key = `${toolName},${tableName}`;
        csvEntries.set(key, {
            toolName,
            tableName,
            readFields: parts[2] || '*',
            writeFields: parts[3] || '',
            loadStrategy: parts[4] || 'on_tool_mount',
            loadCondition: parts[5] || ''
        });
    }
}

console.log(`CSVファイルから ${csvEntries.size} 件のエントリを読み込みました。\n`);

// 不足しているエントリを特定
const missingEntries = [];
sqlEntries.forEach((sqlEntry, key) => {
    if (!csvEntries.has(key)) {
        missingEntries.push(sqlEntry);
    }
});

console.log(`=== 比較結果 ===`);
console.log(`SQLファイルのエントリ数: ${sqlEntries.size}`);
console.log(`CSVファイルのエントリ数: ${csvEntries.size}`);
console.log(`不足しているエントリ数: ${missingEntries.length}\n`);

if (missingEntries.length > 0) {
    console.log('不足しているエントリ:');
    const byTool = {};
    missingEntries.forEach(entry => {
        if (!byTool[entry.toolName]) {
            byTool[entry.toolName] = [];
        }
        byTool[entry.toolName].push(entry.tableName);
    });
    
    Object.keys(byTool).sort().forEach(toolName => {
        console.log(`\n${toolName}:`);
        byTool[toolName].forEach(tableName => {
            console.log(`  - ${tableName}`);
        });
    });
}

process.exit(0);

