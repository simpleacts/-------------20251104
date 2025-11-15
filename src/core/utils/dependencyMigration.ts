/**
 * 手動定義からtool_dependenciesへの移行ユーティリティ
 * Phase 2: 既存の手動定義をtool_dependenciesテーブルに自動移行する機能
 */

import { Page, getRequiredTablesForPageManual } from '../config/Routes';
import { ToolDependency, Database } from '../../shared/types';
import { ALL_TOOLS } from '../config/Routes';

/**
 * 指定されたページの手動定義からtool_dependencies形式のデータを生成
 * @param page ページ名
 * @param database データベース（テーブルスキーマ取得用、オプション）
 * @returns ToolDependencyの配列
 */
export const generateDependenciesFromManualDefinition = (
    page: Page,
    database?: Partial<Database> | null
): ToolDependency[] => {
    const tables = getRequiredTablesForPageManual(page);
    
    return tables.map(tableName => ({
        tool_name: page,
        table_name: tableName,
        read_fields: '*', // 手動定義では詳細なフィールド情報がないため、すべて読み取りとする
        write_fields: '', // 手動定義では読み取りのみを想定
        load_strategy: 'on_demand' as const, // 必要な時に必要なデータだけを読み込む方式に変更
        load_condition: undefined,
    }));
};

/**
 * すべてのページの手動定義をtool_dependencies形式に変換
 * @param database データベース（テーブルスキーマ取得用、オプション）
 * @param excludeExisting 既存のtool_dependenciesに定義されているものを除外するか
 * @returns ToolDependencyの配列
 */
export const migrateAllManualDefinitionsToDependencies = (
    database?: Partial<Database> | null,
    excludeExisting: boolean = true
): ToolDependency[] => {
    const existingDeps = database?.tool_dependencies?.data as ToolDependency[] | undefined;
    const existingKeys = excludeExisting && existingDeps
        ? new Set(existingDeps.map(d => `${d.tool_name}-${d.table_name}`))
        : new Set<string>();

    const allDependencies: ToolDependency[] = [];

    ALL_TOOLS.forEach(tool => {
        const deps = generateDependenciesFromManualDefinition(tool.name, database);
        deps.forEach(dep => {
            const key = `${dep.tool_name}-${dep.table_name}`;
            if (!existingKeys.has(key)) {
                allDependencies.push(dep);
            }
        });
    });

    return allDependencies;
};

/**
 * 手動定義とtool_dependenciesの差分を検出
 * @param database データベース
 * @returns 差分情報（手動定義にのみ存在、tool_dependenciesにのみ存在、両方に存在）
 */
export const detectDefinitionDifferences = (database?: Partial<Database> | null): {
    onlyInManual: ToolDependency[];
    onlyInToolDependencies: ToolDependency[];
    inBoth: Array<{ manual: string[]; toolDeps: ToolDependency[] }>;
} => {
    if (!database) {
        return { onlyInManual: [], onlyInToolDependencies: [], inBoth: [] };
    }

    const manualDepsMap = new Map<string, string[]>();
    ALL_TOOLS.forEach(tool => {
        const tables = getRequiredTablesForPageManual(tool.name);
        if (tables.length > 0) {
            manualDepsMap.set(tool.name, tables);
        }
    });

    const toolDeps = (database.tool_dependencies?.data as ToolDependency[]) || [];
    const toolDepsMap = new Map<string, ToolDependency[]>();
    toolDeps.forEach(dep => {
        if (!toolDepsMap.has(dep.tool_name)) {
            toolDepsMap.set(dep.tool_name, []);
        }
        toolDepsMap.get(dep.tool_name)!.push(dep);
    });

    const onlyInManual: ToolDependency[] = [];
    const onlyInToolDependencies: ToolDependency[] = [];
    const inBoth: Array<{ manual: string[]; toolDeps: ToolDependency[] }> = [];

    // 手動定義のみに存在するもの
    manualDepsMap.forEach((tables, toolName) => {
        const toolDepsForTool = toolDepsMap.get(toolName) || [];
        const toolDepTables = new Set(toolDepsForTool.map(d => d.table_name));

        tables.forEach(tableName => {
            if (!toolDepTables.has(tableName)) {
                onlyInManual.push({
                    tool_name: toolName as Page,
                    table_name: tableName,
                    read_fields: '*',
                    write_fields: '',
                    load_strategy: 'on_demand', // 必要な時に必要なデータだけを読み込む方式に変更
                });
            }
        });

        // 両方に存在するもの
        const commonTables = tables.filter(t => toolDepTables.has(t));
        if (commonTables.length > 0) {
            inBoth.push({
                manual: tables,
                toolDeps: toolDepsForTool.filter(d => commonTables.includes(d.table_name)),
            });
        }
    });

    // tool_dependenciesにのみ存在するもの
    toolDepsMap.forEach((deps, toolName) => {
        const manualTables = new Set(manualDepsMap.get(toolName) || []);
        deps.forEach(dep => {
            if (!manualTables.has(dep.table_name)) {
                onlyInToolDependencies.push(dep);
            }
        });
    });

    return { onlyInManual, onlyInToolDependencies, inBoth };
};

