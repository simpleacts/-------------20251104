import { useMemo } from 'react';
import { useDatabase } from '../../core/contexts/DatabaseContext';
import { tableCategories as tableCategoryDefinitions } from '../lib/tableCategories';
import { ALL_TABLE_NAMES } from '../../core/config/tableNames';

/**
 * A custom hook that dynamically categorizes tables from the database context.
 * @returns An object containing categorized tables and uncategorized tables.
 */
export const useCategorizedTables = () => {
    const { database } = useDatabase();

    // Use the definitive list of all tables instead of relying on the potentially incomplete database context.
    const allTableNames = useMemo(() => [...ALL_TABLE_NAMES].sort(), []);
    
    const TABLE_DISPLAY_NAMES = useMemo(() => {
        // 複数の言語設定テーブルから読み込む（language_settings_*パターン）
        const displayNames: Record<string, string> = {};
        
        // 既存のlanguage_settingsテーブル（後方互換性）
        if (database?.language_settings?.data) {
            database.language_settings.data.forEach((row) => {
                if (row.key && (row.key as string).startsWith('tables.')) {
                    const tableName = (row.key as string).replace('tables.', '');
                    displayNames[tableName] = row.ja as string;
                }
            });
        }
        
        // すべてのlanguage_settings_*テーブルを確認
        Object.keys(database || {}).forEach((tableKey) => {
            if (tableKey.startsWith('language_settings_') && database[tableKey]?.data) {
                database[tableKey].data.forEach((row: any) => {
                    if (row.key && (row.key as string).startsWith('tables.')) {
                        const tableName = (row.key as string).replace('tables.', '');
                        // 既に設定されている場合は上書きしない（優先順位: language_settings_common > その他）
                        if (!displayNames[tableName] || tableKey === 'language_settings_common') {
                            displayNames[tableName] = row.ja as string;
                        }
                    }
                });
            }
        });
        
        return displayNames;
    }, [database]);
    
    const categorizedTables = useMemo(() => {
        if (!database) return [];
        
        const allCategorizedTablesInDefinition = new Set(Object.values(tableCategoryDefinitions).flat());

        const structure: { category: string, tables: string[] }[] = Object.entries(tableCategoryDefinitions)
            .map(([category, tables]) => ({
                category,
                tables: tables.filter(t => allTableNames.includes(t)).sort((a,b) => (TABLE_DISPLAY_NAMES[a] || a).localeCompare(TABLE_DISPLAY_NAMES[b] || b))
            }))
            .filter(group => group.tables.length > 0);
        
        const uncategorized = allTableNames.filter(t => !allCategorizedTablesInDefinition.has(t) && TABLE_DISPLAY_NAMES[t]);
        
        if (uncategorized.length > 0) {
            structure.push({ category: 'その他', tables: uncategorized.sort((a,b) => (TABLE_DISPLAY_NAMES[a] || a).localeCompare(TABLE_DISPLAY_NAMES[b] || b)) });
        }
        
        return structure;
    }, [allTableNames, database, TABLE_DISPLAY_NAMES]);

    return { allTableNames, categorizedTables, TABLE_DISPLAY_NAMES };
};