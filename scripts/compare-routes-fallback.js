const fs = require('fs');
const path = require('path');

/**
 * Routes.tsxのフォールバック定義とtool_dependencies.csvを比較
 */

const depsPath = path.join(__dirname, '..', 'templates', 'system', 'tool_dependencies.csv');
const routesPath = path.join(__dirname, '..', 'src', 'core', 'config', 'Routes.tsx');

// tool_dependencies.csvから各ツールのテーブル一覧を取得
function getTablesFromDependencies() {
    const content = fs.readFileSync(depsPath, 'utf8');
    const lines = content.split('\n').slice(1); // ヘッダーをスキップ
    const toolTables = new Map();
    
    lines.forEach(line => {
        if (line.trim()) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const tool = parts[0].trim().replace(/^"|"$/g, '');
                const table = parts[1].trim().replace(/^"|"$/g, '');
                const loadStrategy = parts.length >= 5 ? parts[4].trim().replace(/^"|"$/g, '') : '';
                
                if (loadStrategy === 'on_tool_mount') {
                    if (!toolTables.has(tool)) {
                        toolTables.set(tool, new Set());
                    }
                    toolTables.get(tool).add(table);
                }
            }
        }
    });
    
    return toolTables;
}

// Routes.tsxからフォールバック定義を抽出（簡易版）
function getRoutesFallbackTables() {
    const content = fs.readFileSync(routesPath, 'utf8');
    const routesTables = new Map();
    
    // 各case文からテーブル名を抽出（簡易的なパース）
    const caseMatches = content.matchAll(/case\s+['"]([\w-]+)['"]:\s*return\s+\[([^\]]+)\]/g);
    
    for (const match of caseMatches) {
        const tool = match[1];
        const tablesStr = match[2];
        const tables = tablesStr
            .split(',')
            .map(t => t.trim().replace(/^['"]|['"]$/g, '').replace(/\.\.\.toolLanguageTables/, ''))
            .filter(t => t && !t.startsWith('//') && t !== 'toolLanguageTables');
        
        routesTables.set(tool, new Set(tables));
    }
    
    return routesTables;
}

// 比較
const depsTables = getTablesFromDependencies();
const routesTables = getRoutesFallbackTables();

console.log('=== Routes.tsxフォールバック定義の比較 ===\n');

// 各ツールを比較
const allTools = new Set([...depsTables.keys(), ...routesTables.keys()]);

allTools.forEach(tool => {
    const depsSet = depsTables.get(tool) || new Set();
    const routesSet = routesTables.get(tool) || new Set();
    
    // 不足しているテーブル（tool_dependencies.csvにあるがRoutes.tsxにない）
    const missing = Array.from(depsSet).filter(t => !routesSet.has(t) && !t.startsWith('language_settings_'));
    
    // 不要なテーブル（Routes.tsxにあるがtool_dependencies.csvにない）
    const extra = Array.from(routesSet).filter(t => !depsSet.has(t) && !t.startsWith('language_settings_'));
    
    if (missing.length > 0 || extra.length > 0) {
        console.log(`\n【${tool}】`);
        if (missing.length > 0) {
            console.log(`  不足: ${missing.join(', ')}`);
        }
        if (extra.length > 0) {
            console.log(`  不要: ${extra.join(', ')}`);
        }
    }
});

console.log('\n=== 統計 ===');
console.log(`tool_dependencies.csvのツール数: ${depsTables.size}`);
console.log(`Routes.tsxのツール数: ${routesTables.size}`);

