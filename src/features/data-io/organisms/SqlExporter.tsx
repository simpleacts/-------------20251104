import React, { useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { Column, Row } from '@shared/types';
import { fetchTables } from '@core/data/db.live';
import { useCategorizedTables } from '@shared/hooks/useCategorizedTables';
import { Button, Input, Select, ArchiveBoxArrowDownIcon, ChevronDownIcon, SpinnerIcon } from '@components/atoms';

declare const JSZip: any;

const SqlExporter: React.FC = () => {
    const { database, setDatabase } = useDatabase();
    
    if (!database) {
        return null;
    }
    
    const [exportType, setExportType] = useState<'all' | 'individual' | 'initial_data'>('all');
    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [dataTablesToInclude, setDataTablesToInclude] = useState<Set<string>>(new Set(Object.keys(database).filter(t => !['customers', 'quotes', 'quote_items', 'quote_designs', 'quote_history', 'stock', 'skus', 'incoming_stock', 'print_history', 'print_history_positions', 'print_history_images', 'ink_recipe_usage', 'app_logs', 'quote_tasks', 'bills', 'bill_items', 'emails', 'email_attachments', 'work_sessions', 'work_session_quotes'].includes(t))));
    const [agreementChecked, setAgreementChecked] = useState(false);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['システム設定', '価格設定', '商品定義']));
    const [openExcludeCategories, setOpenExcludeCategories] = useState<Set<string>>(new Set(['システム設定']));
    const [openInitialDataCategories, setOpenInitialDataCategories] = useState<Set<string>>(new Set(['システム設定', '価格設定', '商品定義']));
    const [isExporting, setIsExporting] = useState(false);


    const [excludedTables, setExcludedTables] = useState<Set<string>>(new Set());
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [newPresetName, setNewPresetName] = useState('');

    const presets = useMemo(() => database.sql_export_presets?.data || [], [database.sql_export_presets]);
    
    const { allTableNames, categorizedTables, TABLE_DISPLAY_NAMES } = useCategorizedTables();

    const handleExcludeToggle = (tableName: string) => {
        setExcludedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableName)) newSet.delete(tableName);
            else newSet.add(tableName);
            return newSet;
        });
    };

    const handleSavePreset = () => {
        if (!newPresetName.trim()) {
            alert('プリセット名を入力してください。');
            return;
        }
        const newPreset: Row = {
            id: `sqlexp_${Date.now()}`,
            name: newPresetName,
            config_json: JSON.stringify({ excluded: Array.from(excludedTables) }),
        };
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.sql_export_presets) return db;
            newDb.sql_export_presets.data.push(newPreset);
            return newDb;
        });
        setNewPresetName('');
        alert('プリセットを保存しました。');
    };
    
    const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetId = e.target.value;
        setSelectedPresetId(presetId);
        const preset = presets.find(p => p.id === presetId);
        if (preset && preset.config_json) {
            try {
                const config = JSON.parse(preset.config_json as string);
                if (config.excluded) {
                    setExcludedTables(new Set(config.excluded));
                } else if (config.included) { // Handle old format
                    const allTables = new Set(allTableNames);
                    const included = new Set(config.included);
                    const excluded = new Set([...allTables].filter(x => !included.has(x)));
                    setExcludedTables(excluded);
                } else {
                    setExcludedTables(new Set());
                }
            } catch {}
        } else {
            setExcludedTables(new Set());
        }
    };

    const handleTableSelectionChange = (tableName: string) => {
        setSelectedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableName)) {
                newSet.delete(tableName);
            } else {
                newSet.add(tableName);
            }
            return newSet;
        });
    };

    const handleDataTableSelectionChange = (tableName: string) => {
        setDataTablesToInclude(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableName)) {
                newSet.delete(tableName);
            } else {
                newSet.add(tableName);
            }
            return newSet;
        });
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedTables(new Set(allTableNames));
        } else {
            setSelectedTables(new Set());
        }
    };
    
    const handleCategorySelectAll = (categoryTables: string[], isChecked: boolean) => {
        setSelectedTables(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                categoryTables.forEach(t => newSet.add(t));
            } else {
                categoryTables.forEach(t => newSet.delete(t));
            }
            return newSet;
        });
    };

    const handleExcludeAll = (isChecked: boolean) => {
        if (isChecked) {
            setExcludedTables(new Set(allTableNames));
        } else {
            setExcludedTables(new Set());
        }
    };

    const handleCategoryExcludeToggleAll = (categoryTables: string[], isChecked: boolean) => {
        setExcludedTables(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                categoryTables.forEach(t => newSet.add(t));
            } else {
                categoryTables.forEach(t => newSet.delete(t));
            }
            return newSet;
        });
    };
    
    const toggleCategory = (category: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) newSet.delete(category);
            else newSet.add(category);
            return newSet;
        });
    };
    
    const toggleExcludeCategory = (category: string) => {
        setOpenExcludeCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) newSet.delete(category);
            else newSet.add(category);
            return newSet;
        });
    };
    
    const toggleInitialDataCategory = (category: string) => {
        setOpenInitialDataCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) newSet.delete(category);
            else newSet.add(category);
            return newSet;
        });
    };

    const handleInitialDataCategorySelectAll = (categoryTables: string[], isChecked: boolean) => {
        setDataTablesToInclude(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                categoryTables.forEach(t => newSet.add(t));
            } else {
                categoryTables.forEach(t => newSet.delete(t));
            }
            return newSet;
        });
    };

    const handleInitialDataSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setDataTablesToInclude(new Set(allTableNames));
        } else {
            setDataTablesToInclude(new Set());
        }
    };


    const handleExportSQL = async (tablesForSchema: string[], tablesForData: string[]) => {
        setIsExporting(true);
        try {
            const requiredTables = new Set([...tablesForSchema, ...tablesForData]);
            const exportDb = await fetchTables(Array.from(requiredTables), { toolName: 'data-io' });

            const finalTablesForSchema = tablesForSchema.filter(tableName => tableName !== 'tmp' && exportDb[tableName]);
            if (finalTablesForSchema.length === 0) return;

            const escapeSqlValue = (value: any): string => {
                if (value === null || value === undefined) return 'NULL';
                if (typeof value === 'number') return String(value);
                if (typeof value === 'boolean') return value ? '1' : '0';
                return `'${String(value).replace(/'/g, "''")}'`;
            };
        
            const mapTypeToSql = (type: Column['type'], isPartOfPrimaryKey: boolean): string => {
                switch (type) {
                    case 'NUMBER': return 'INT(11)';
                    case 'BOOLEAN': return 'TINYINT(1)';
                    case 'TEXT':
                    default:
                        return isPartOfPrimaryKey ? 'VARCHAR(255)' : 'TEXT';
                }
            };
        
            const COMPOSITE_KEYS: Record<string, string[]> = {
                'category_pricing_schedules': ['category_id', 'schedule_id', 'customer_group_id'],
                'product_tags': ['product_id', 'tag_id'],
                // 注意: product_colorsは非推奨（stockテーブルから取得）
                'tool_visibility_settings': ['tool_name', 'device_type'],
            };

            let dropStatements = '';
            let createStatements = '';
            let insertStatements = '';
            let alterStatements = '';

            finalTablesForSchema.forEach(tableName => {
                const table = exportDb[tableName];
                if (!table || table.schema.length === 0) return;

                const displayName = TABLE_DISPLAY_NAMES[tableName] ? ` (${TABLE_DISPLAY_NAMES[tableName]})` : '';
                const primaryKeyColumns = COMPOSITE_KEYS[tableName] || (table.schema.length > 0 ? [table.schema[0].name] : []);
                
                if (!excludedTables.has(tableName)) {
                    dropStatements += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                }

                const createTableParts = table.schema.map(col => {
                    const isPartOfPrimaryKey = primaryKeyColumns.includes(col.name);
                    let definition = `  \`${col.name}\` ${mapTypeToSql(col.type, isPartOfPrimaryKey)}`;
                    if (isPartOfPrimaryKey) {
                        definition += ' NOT NULL';
                    }
                    if (primaryKeyColumns.length === 1 && col.name === primaryKeyColumns[0] && col.type === 'NUMBER') {
                        definition += ' AUTO_INCREMENT';
                    }
                    return definition;
                });

                if (primaryKeyColumns.length > 0) {
                    const pkDefinition = primaryKeyColumns.map(pk => `\`${pk}\``).join(', ');
                    createTableParts.push(`  PRIMARY KEY (${pkDefinition})`);
                }
                
                createStatements += `--\n-- Table structure for table \`${tableName}\`${displayName}\n--\n`;
                createStatements += `CREATE TABLE \`${tableName}\` (\n${createTableParts.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;\n\n`;

                // 在庫関連テーブルの場合はデータを出力しない（テーブル構造のみ）
                const isStockTable = /^stock_[a-zA-Z0-9_-]+$/.test(tableName) || 
                                     /^incoming_stock_[a-zA-Z0-9_-]+$/.test(tableName);

                if (table.data.length > 0 && tablesForData.includes(tableName) && !isStockTable) {
                    const uniqueData: Row[] = [];
                    if (primaryKeyColumns.length > 0) {
                        const seenKeys = new Set<string>();
                        for (const row of table.data) {
                            const key = primaryKeyColumns.map(pk => String(row[pk])).join('||');
                            if (!seenKeys.has(key)) {
                                uniqueData.push(row);
                                seenKeys.add(key);
                            }
                        }
                    } else {
                        uniqueData.push(...table.data);
                    }

                    if (uniqueData.length > 0) {
                        insertStatements += `--\n-- Dumping data for table \`${tableName}\`${displayName}\n--\n`;
                        const columnNames = table.schema.map(col => `\`${col.name}\``).join(', ');
                        const insertStatement = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES\n`;
                        const valueRows = uniqueData.map((item: Row) => `  (${table.schema.map(col => escapeSqlValue(item[col.name])).join(', ')})`);
                        insertStatements += insertStatement + valueRows.join(',\n') + ';\n\n';
                    }
                }
                
                // 在庫関連テーブルの場合はAUTO_INCREMENTの設定もスキップ
                if (primaryKeyColumns.length === 1 && primaryKeyColumns[0] && table.schema.find(c => c.name === primaryKeyColumns[0])?.type === 'NUMBER' && table.data.length > 0 && tablesForData.includes(tableName) && !isStockTable) {
                    const pkName = primaryKeyColumns[0];
                    const maxId = table.data.reduce((max: number, row: Row) => Math.max(max, Number(row[pkName]) || 0), 0);
                    alterStatements += `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${maxId + 1};\n\n`;
                }
            });
            
            let sqlString = `-- AI Database Assistant - Backup\n-- Generated on ${new Date().toISOString()}\n\n`;
            sqlString += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\nSTART TRANSACTION;\nSET time_zone = "+00:00";\nSET NAMES utf8mb4;\n\n`;
            sqlString += `SET FOREIGN_KEY_CHECKS=0;\n\n`;
        
            sqlString += dropStatements + '\n';
            sqlString += createStatements + '\n';
            sqlString += insertStatements + '\n';
            sqlString += alterStatements + '\n';
        
            sqlString += `SET FOREIGN_KEY_CHECKS=1;\n\nCOMMIT;\n`;

            const blob = new Blob([sqlString], { type: 'application/sql' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            let filename = `partial_backup_${dateStr}.sql`;
            if(exportType === 'all') filename = `database_backup_${dateStr}.sql`;
            if(exportType === 'initial_data') filename = `initial_data_setup_${dateStr}.sql`;

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("SQL Export failed:", err);
            alert(`エクスポートに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        } finally {
            setIsExporting(false);
        }
    };
    
    const isExportDisabled = 
        (exportType === 'individual' && (selectedTables.size === 0 || !agreementChecked)) ||
        (exportType === 'initial_data' && dataTablesToInclude.size === 0) ||
        isExporting;

    const renderDropTableSettings = () => (
        <div className="p-4 border rounded-md flex flex-col">
            <h3 className="text-lg font-bold mb-2">DROP TABLE 除外設定</h3>
            <p className="text-sm text-gray-500 mb-2">ここでチェックしたテーブルは、エクスポート時に `DROP TABLE` 文が生成されません。</p>
            <div className="flex gap-4 items-center mb-3">
                <Select value={selectedPresetId} onChange={handleLoadPreset} className="text-sm">
                    <option value="">プリセットを選択...</option>
                    {presets.map(p => <option key={p.id as string} value={p.id as string}>{String(p.name)}</option>)}
                </Select>
                <Input type="text" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="新規プリセット名" className="text-sm flex-grow"/>
                <Button onClick={handleSavePreset} disabled={!newPresetName.trim()} size="sm">保存</Button>
            </div>
            <div className="border rounded-md p-3 flex-grow overflow-y-auto space-y-2">
                <div className="flex justify-end">
                     <label htmlFor="exclude-all-checkbox" className="text-sm flex items-center gap-2">
                        <input id="exclude-all-checkbox" name="exclude_all" type="checkbox" onChange={(e) => handleExcludeAll(e.target.checked)} checked={excludedTables.size === allTableNames.length} className="form-checkbox" />
                        すべて除外
                    </label>
                </div>
                 {(categorizedTables || []).map(({ category, tables }) => {
                    if (tables.length === 0) return null;
                    const isAllExcluded = tables.every(t => excludedTables.has(t));
                    const isIndeterminate = !isAllExcluded && tables.some(t => excludedTables.has(t));

                    return (
                        <div key={`exclude-${category}`}>
                            <div className="flex items-center gap-2 p-2 bg-base-200 dark:bg-base-dark-300 rounded-t-md cursor-pointer" onClick={() => toggleExcludeCategory(category)}>
                                <input id={`exclude-category-${category}`} name={`exclude_category_${category}`} type="checkbox" checked={isAllExcluded} ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = isIndeterminate; }} onChange={(e) => handleCategoryExcludeToggleAll(tables, e.target.checked)} onClick={e => e.stopPropagation()} className="form-checkbox"/>
                                <span className="font-semibold flex-grow">{category}</span>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${openExcludeCategories.has(category) ? 'rotate-180' : ''}`} />
                            </div>
                            {openExcludeCategories.has(category) && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-3 border border-t-0 rounded-b-md">
                                    {tables.map(tableName => {
                                        const excludeTableId = `exclude-table-${tableName}`;
                                        return (
                                            <label key={`exclude-${tableName}`} htmlFor={excludeTableId} className="text-sm flex items-center gap-2 p-1 rounded">
                                                <input id={excludeTableId} name={`exclude_table_${tableName}`} type="checkbox" checked={excludedTables.has(tableName)} onChange={() => handleExcludeToggle(tableName)} className="form-checkbox" />
                                                {String(TABLE_DISPLAY_NAMES[tableName] || tableName) as React.ReactNode}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="bg-container-bg dark:bg-container-bg-dark p-6 rounded-lg shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-bold mb-2">エクスポート形式</h3>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="exportType" value="all" checked={exportType === 'all'} onChange={() => setExportType('all')} className="form-radio text-brand-primary focus:ring-brand-secondary" />
                        <span>データベース全体をバックアップ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="exportType" value="individual" checked={exportType === 'individual'} onChange={() => setExportType('individual')} className="form-radio text-brand-primary focus:ring-brand-secondary" />
                        <span>個別のテーブルを選択</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="exportType" value="initial_data" checked={exportType === 'initial_data'} onChange={() => setExportType('initial_data')} className="form-radio text-brand-primary focus:ring-brand-secondary" />
                        <span>設定＋初期登録データ</span>
                    </label>
                </div>
            </div>

            {exportType === 'all' && (
                <div className="space-y-4">
                    {renderDropTableSettings()}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        現在のデータベースのすべてのテーブル構造とデータを単一のSQLファイルとしてダウンロードします。データベースの復元や移行に利用できます。
                    </p>
                    <Button onClick={() => handleExportSQL(allTableNames, allTableNames)} variant="secondary" disabled={isExporting}>
                        {isExporting ? <SpinnerIcon className="w-4 h-4 mr-2"/> : <ArchiveBoxArrowDownIcon className="w-4 h-4 mr-2" />}
                        {isExporting ? 'エクスポート中...' : '全体をSQL形式でエクスポート'}
                    </Button>
                </div>
            )}
            
            {exportType === 'individual' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderDropTableSettings()}
                        <div className="p-4 border rounded-md h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold">テーブルを選択</h3>
                                <label htmlFor="select-all-checkbox" className="text-sm flex items-center gap-2">
                                    <input id="select-all-checkbox" name="select_all" type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedTables.size === allTableNames.length} className="form-checkbox" />
                                    すべて選択 ({selectedTables.size}/{allTableNames.length})
                                </label>
                            </div>
                             <div className="border rounded-md p-3 flex-grow overflow-y-auto space-y-2">
                                {(categorizedTables || []).map(({ category, tables }) => {
                                    if (tables.length === 0) return null;

                                    const isAllSelected = tables.every(t => selectedTables.has(t));
                                    const isIndeterminate = !isAllSelected && tables.some(t => selectedTables.has(t));

                                    return (
                                        <div key={category}>
                                            <div className="flex items-center gap-2 p-2 bg-base-200 dark:bg-base-dark-300 rounded-t-md cursor-pointer" onClick={() => toggleCategory(category)}>
                                                <input 
                                                    id={`select-category-${category}`}
                                                    name={`select_category_${category}`}
                                                    type="checkbox" 
                                                    checked={isAllSelected}
                                                    ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = isIndeterminate; }}
                                                    onChange={(e) => handleCategorySelectAll(tables, e.target.checked)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="form-checkbox"
                                                />
                                                <span className="font-semibold flex-grow">{category}</span>
                                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${openCategories.has(category) ? 'rotate-180' : ''}`} />
                                            </div>
                                            {openCategories.has(category) && (
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-3 border border-t-0 rounded-b-md">
                                                    {tables.map(tableName => {
                                                        const selectTableId = `select-table-${tableName}`;
                                                        return (
                                                            <label key={tableName} htmlFor={selectTableId} className="text-sm flex items-center gap-2 p-1 rounded">
                                                                <input id={selectTableId} name={`select_table_${tableName}`} type="checkbox" checked={selectedTables.has(tableName)} onChange={() => handleTableSelectionChange(tableName)} className="form-checkbox" />
                                                                {String(TABLE_DISPLAY_NAMES[tableName] || tableName) as React.ReactNode}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-400 rounded-md text-sm text-red-800 dark:text-red-200 space-y-2">
                        <h4 className="font-bold">【重要】操作に関する注意</h4>
                        <p>個別のテーブルをリストア（インポート）すると、テーブル間の関連性が壊れ、データ不整合やアプリケーションのエラーを引き起こす可能性があります。</p>
                        <p>この機能は、操作の意味を完全に理解している上級者向けです。通常のバックアップ・リストアには「データベース全体」のエクスポートを使用してください。</p>
                    </div>

                    <div>
                        <label htmlFor="agreement-checkbox" className="flex items-center gap-2 cursor-pointer text-sm">
                            <input id="agreement-checkbox" name="agreement" type="checkbox" checked={agreementChecked} onChange={e => setAgreementChecked(e.target.checked)} className="form-checkbox" />
                            <span>上記のリスクを理解し、自己の責任においてエクスポートを実行します。</span>
                        </label>
                    </div>

                    <Button onClick={() => handleExportSQL(Array.from(selectedTables), Array.from(selectedTables))} disabled={isExportDisabled} variant="secondary">
                        {isExporting ? <SpinnerIcon className="w-4 h-4 mr-2"/> : <ArchiveBoxArrowDownIcon className="w-4 h-4 mr-2" />}
                        {isExporting ? 'エクスポート中...' : `選択したテーブル (${selectedTables.size}) をエクスポート`}
                    </Button>
                </div>
            )}
            
            {exportType === 'initial_data' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold">データを含めるテーブルを選択</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        すべてのテーブルの構造（CREATE TABLE）は出力されます。ここで選択したテーブルのみ、データ（INSERT文）も出力されます。
                    </p>
                    <div className="border rounded-md p-3 flex-grow overflow-y-auto space-y-2">
                        <div className="flex justify-end items-center mb-2">
                            <label htmlFor="initial-data-select-all-checkbox" className="text-sm flex items-center gap-2">
                                <input id="initial-data-select-all-checkbox" name="initial_data_select_all" type="checkbox" onChange={(e) => handleInitialDataSelectAll(e.target.checked)} checked={dataTablesToInclude.size === allTableNames.length} className="form-checkbox" />
                                すべて選択
                            </label>
                        </div>
                        {(categorizedTables || []).map(({ category, tables }) => {
                            if (tables.length === 0) return null;
                            const isAllSelected = tables.every(t => dataTablesToInclude.has(t));
                            const isIndeterminate = !isAllSelected && tables.some(t => dataTablesToInclude.has(t));

                            return (
                                <div key={`initial-${category}`}>
                                    <div className="flex items-center gap-2 p-2 bg-base-200 dark:bg-base-dark-300 rounded-t-md cursor-pointer" onClick={() => toggleInitialDataCategory(category)}>
                                        <input 
                                            id={`initial-data-category-${category}`}
                                            name={`initial_data_category_${category}`}
                                            type="checkbox" 
                                            checked={isAllSelected}
                                            ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = isIndeterminate; }}
                                            onChange={(e) => handleInitialDataCategorySelectAll(tables, e.target.checked)}
                                            onClick={e => e.stopPropagation()}
                                            className="form-checkbox"
                                        />
                                        <span className="font-semibold flex-grow">{category}</span>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${openInitialDataCategories.has(category) ? 'rotate-180' : ''}`} />
                                    </div>
                                    {openInitialDataCategories.has(category) && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-3 border border-t-0 rounded-b-md">
                                            {tables.map(tableName => {
                                                const initialDataTableId = `initial-data-table-${tableName}`;
                                                return (
                                                    <label key={`initial-${tableName}`} htmlFor={initialDataTableId} className="text-sm flex items-center gap-2 p-1 rounded">
                                                        <input id={initialDataTableId} name={`initial_data_table_${tableName}`} type="checkbox" checked={dataTablesToInclude.has(tableName)} onChange={() => handleDataTableSelectionChange(tableName)} className="form-checkbox" />
                                                        {String(TABLE_DISPLAY_NAMES[tableName] || tableName) as React.ReactNode}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                     <Button onClick={() => handleExportSQL(allTableNames, Array.from(dataTablesToInclude))} disabled={isExportDisabled} variant="secondary">
                        {isExporting ? <SpinnerIcon className="w-4 h-4 mr-2"/> : <ArchiveBoxArrowDownIcon className="w-4 h-4 mr-2" />}
                        {isExporting ? 'エクスポート中...' : `選択したテーブル (${dataTablesToInclude.size}) のデータを含むSQLをエクスポート`}
                    </Button>
                </div>
            )}
        </div>
    );
};
export default SqlExporter;