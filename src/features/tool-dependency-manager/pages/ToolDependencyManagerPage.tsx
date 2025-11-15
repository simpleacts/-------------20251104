import { ALL_TOOLS, getRequiredTablesForPageManual, Page } from '@core/config/Routes';
import { isManufacturerDependentTable, parseManufacturerTableName } from '@core/config/tableNames';
import { useNavigation } from '@core/contexts/NavigationContext';
import { detectDefinitionDifferences, generateDependenciesFromManualDefinition, migrateAllManualDefinitionsToDependencies, updateDatabase } from '@core/utils';
import { getStoredAppMode, isLiveMode } from '@core/utils/appMode';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Column, Database, Row, ToolDependency } from '@shared/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DependencyEditModal from '../modals/DependencyEditModal';

interface ToolDependencyManagerProps {
    database: Database;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    allTools: { name: Page; displayName: string }[];
}

const ToolDependencyManager: React.FC<ToolDependencyManagerProps> = ({ database, setDatabase, allTools }) => {
    const { t } = useTranslation('tool-dependency-manager');
    const { currentPage } = useNavigation();
    const [dependencies, setDependencies] = useState<ToolDependency[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDependency, setEditingDependency] = useState<{ toolName: string; tableName: string } | null>(null);
    const [showMigrationPanel, setShowMigrationPanel] = useState(false);
    const [allTables, setAllTables] = useState<string[]>([]);
    const [isLoadingTables, setIsLoadingTables] = useState(true);
    const hasLoadedTablesRef = useRef(false);

    useEffect(() => {
        setDependencies((database.tool_dependencies?.data as ToolDependency[]) || []);
    }, [database.tool_dependencies]);

    // 全テーブル一覧を動的に取得（初回マウント時のみ実行）
    useEffect(() => {
        // 既に読み込み済みの場合はスキップ
        if (hasLoadedTablesRef.current) {
            return;
        }

        const fetchAllTables = async () => {
            setIsLoadingTables(true);
            try {
                const appMode = getStoredAppMode();
                
                if (isLiveMode(appMode)) {
                    // ライブモード: データベースから全テーブル一覧を取得
                    const response = await fetch('/api/tool-dependency-manager-data.php?action=tables');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.tables && Array.isArray(data.tables)) {
                            // tool_dependenciesを除外してソート
                            const tables = data.tables
                                .filter((t: string) => t !== 'tool_dependencies')
                                .sort();
                            setAllTables(tables);
                            
                            // スキーマ情報も取得（データは不要）
                            if (tables.length > 0) {
                                const schemaResponse = await fetch(`/api/tool-dependency-manager-data.php?action=schema&tables=${tables.join(',')}`);
                                if (schemaResponse.ok) {
                                    const schemaData = await schemaResponse.json();
                                    // データベースオブジェクトにスキーマ情報を追加（既に存在する場合はスキップ）
                                    setDatabase(prevDb => {
                                        if (!prevDb) return prevDb;
                                        const newDb = { ...prevDb };
                                        let hasChanges = false;
                                        Object.keys(schemaData).forEach(tableName => {
                                            if (schemaData[tableName]?.schema) {
                                                // スキーマが既に存在し、内容が同じ場合はスキップ
                                                const existingSchema = prevDb[tableName]?.schema;
                                                const newSchema = schemaData[tableName].schema;
                                                if (!existingSchema || JSON.stringify(existingSchema) !== JSON.stringify(newSchema)) {
                                                    newDb[tableName] = {
                                                        schema: newSchema,
                                                        data: prevDb[tableName]?.data || []
                                                    };
                                                    hasChanges = true;
                                                }
                                            }
                                        });
                                        // 変更がない場合は元のオブジェクトを返す（無限ループを防ぐ）
                                        return hasChanges ? newDb : prevDb;
                                    });
                                }
                            }
                        }
                    }
                } else {
                    // CSVデバッグモード: databaseオブジェクトのキーから取得
                    // databaseが存在する場合のみ実行
                    if (database && Object.keys(database).length > 0) {
                        const tables = Object.keys(database)
                            .filter(t => t !== 'tool_dependencies')
                            .sort();
                        setAllTables(tables);
                    } else {
                        // databaseがまだ読み込まれていない場合は、読み込み完了を待つ
                        // この場合は空の配列のままにする（別のuseEffectで処理）
                        setAllTables([]);
                    }
                }
            } catch (error) {
                console.error('[ToolDependencyManager] Failed to fetch tables:', error);
                // フォールバック: databaseオブジェクトのキーから取得
                if (database && Object.keys(database).length > 0) {
                    const tables = Object.keys(database)
                        .filter(t => t !== 'tool_dependencies')
                        .sort();
                    setAllTables(tables);
                }
            } finally {
                setIsLoadingTables(false);
                hasLoadedTablesRef.current = true;
            }
        };

        fetchAllTables();
    }, []); // 依存配列を空にして初回マウント時のみ実行

    // CSVデバッグモードでdatabaseが読み込まれた後にテーブル一覧を更新
    useEffect(() => {
        const appMode = getStoredAppMode();
        // ライブモードの場合は既に処理済みなのでスキップ
        if (isLiveMode(appMode) || hasLoadedTablesRef.current) {
            return;
        }
        
        // CSVデバッグモードでdatabaseが読み込まれた場合
        if (database && Object.keys(database).length > 0 && allTables.length === 0) {
            const tables = Object.keys(database)
                .filter(t => t !== 'tool_dependencies')
                .sort();
            setAllTables(tables);
            setIsLoadingTables(false);
        }
    }, [database, allTables.length]);

    const handleOpenModal = (toolName: string, tableName: string) => {
        setEditingDependency({ toolName, tableName });
        setIsModalOpen(true);
    };

    const handleSaveDependency = (updatedDep: ToolDependency) => {
        const newDeps: ToolDependency[] = [...dependencies];
        const index = newDeps.findIndex(d => d.tool_name === updatedDep.tool_name && d.table_name === updatedDep.table_name);
        if (index > -1) {
            newDeps[index] = updatedDep;
        } else {
            newDeps.push(updatedDep);
        }
        setDependencies(newDeps);
        handleSave(newDeps);
    };
    
    const handleSave = async (depsToSave: ToolDependency[]) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            if (!newDb.tool_dependencies) {
                // This case should be handled by schema, but as a fallback
                console.error("tool_dependencies table does not exist on the database object.");
                return db;
            }
            newDb.tool_dependencies.data = depsToSave;
            return newDb;
        });

        // サーバーに保存（全データを置き換え）
        try {
            // tool_dependenciesテーブルの主キーは(tool_name, table_name)の複合キー
            const existingDeps = (database.tool_dependencies?.data || []) as ToolDependency[];
            const existingKeysMap = new Map(
                existingDeps.map((r: ToolDependency) => [
                    `${r.tool_name}|${r.table_name}`, // |を使用してキーを生成（-はtool_nameやtable_nameに含まれる可能性がある）
                    r
                ])
            );
            const newKeysSet = new Set(
                depsToSave.map(dep => `${dep.tool_name}|${dep.table_name}`)
            );
            
            // 既存のレコードを削除（複合キーで指定）
            const deleteOperations = Array.from(existingKeysMap.entries())
                .filter(([key]) => !newKeysSet.has(key))
                .map(([, dep]) => ({
                    type: 'DELETE' as const,
                    where: { tool_name: dep.tool_name, table_name: dep.table_name }
                }));
            
            // 新しいレコードをINSERTまたはUPDATE
            const insertOperations = depsToSave.map(dep => {
                const key = `${dep.tool_name}|${dep.table_name}`;
                if (existingKeysMap.has(key)) {
                    // 既存のレコードはUPDATE
                    return { 
                        type: 'UPDATE' as const, 
                        data: dep, 
                        where: { tool_name: dep.tool_name, table_name: dep.table_name } 
                    };
                } else {
                    // 新しいレコードはINSERT
                    return { type: 'INSERT' as const, data: dep };
                }
            });
            
            const operations = [...deleteOperations, ...insertOperations];

            if (operations.length > 0) {
                const result = await updateDatabase(currentPage, 'tool_dependencies', operations, database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save tool dependencies to server');
                }
                // 保存後にデータを再読み込み
                const { fetchTables } = await import('../../../core/data/db.live');
                const freshData = await fetchTables(['tool_dependencies'], { toolName: 'tool-dependency-manager' });
                setDatabase(prev => ({ ...(prev || {}), ...freshData }));
            }
            alert(t('dependency_manager.save_success', '依存関係を保存しました。'));
        } catch (error) {
            console.error('[ToolDependencyManager] Failed to save to server:', error);
            alert(t('dependency_manager.save_failed', 'サーバーへの保存に失敗しました:') + ' ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const getDependency = (toolName: string, tableName: string) => {
        return dependencies.find(d => d.tool_name === toolName && d.table_name === tableName);
    };
    
    // テーブル名からデフォルトスキーマを取得する関数
    const getDefaultSchema = (baseTableName: string): Column[] => {
        const defaultSchemas: Record<string, Column[]> = {
            'stock': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'product_code', name: 'product_code', type: 'TEXT' },
                { id: 'stock_product_name', name: 'stock_product_name', type: 'TEXT' },
                { id: 'color_code', name: 'color_code', type: 'TEXT' },
                { id: 'color_name', name: 'color_name', type: 'TEXT' },
                { id: 'size_code', name: 'size_code', type: 'TEXT' },
                { id: 'size_name', name: 'size_name', type: 'TEXT' },
                { id: 'quantity', name: 'quantity', type: 'NUMBER' },
                { id: 'incoming_quantity', name: 'incoming_quantity', type: 'NUMBER' },
                { id: 'incoming_date', name: 'incoming_date', type: 'TEXT' },
                { id: 'list_price', name: 'list_price', type: 'NUMBER' },
                { id: 'cost_price', name: 'cost_price', type: 'NUMBER' },
                { id: 'jan_code', name: 'jan_code', type: 'TEXT' },
                { id: 'created_at', name: 'created_at', type: 'TEXT' },
                { id: 'updated_at', name: 'updated_at', type: 'TEXT' }
            ],
            'products_master': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'productCode', name: 'productCode', type: 'TEXT' },
                { id: 'unique_code', name: 'unique_code', type: 'TEXT' },
                { id: 'category_id', name: 'category_id', type: 'TEXT' },
                { id: 'is_published', name: 'is_published', type: 'NUMBER' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'brand_id', name: 'brand_id', type: 'TEXT' }
            ],
            'product_details': [
                { id: 'product_id', name: 'product_id', type: 'TEXT' },
                { id: 'productName', name: 'productName', type: 'TEXT' },
                { id: 'description', name: 'description', type: 'TEXT' },
                { id: 'images', name: 'images', type: 'TEXT' },
                { id: 'meta_title', name: 'meta_title', type: 'TEXT' },
                { id: 'meta_description', name: 'meta_description', type: 'TEXT' },
                { id: 'og_image_url', name: 'og_image_url', type: 'TEXT' },
                { id: 'og_title', name: 'og_title', type: 'TEXT' },
                { id: 'og_description', name: 'og_description', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' }
            ],
            'colors': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'colorCode', name: 'colorCode', type: 'TEXT' },
                { id: 'colorName', name: 'colorName', type: 'TEXT' },
                { id: 'colorType', name: 'colorType', type: 'TEXT' },
                { id: 'hex', name: 'hex', type: 'TEXT' }
            ],
            'sizes': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'sizeCode', name: 'sizeCode', type: 'TEXT' },
                { id: 'sizeName', name: 'sizeName', type: 'TEXT' }
            ],
            'brands': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'name', name: 'name', type: 'TEXT' },
                { id: 'code', name: 'code', type: 'TEXT' }
            ],
            'incoming_stock': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'sku_id', name: 'sku_id', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' },
                { id: 'quantity', name: 'quantity', type: 'NUMBER' },
                { id: 'arrival_date', name: 'arrival_date', type: 'TEXT' }
            ],
            'skus': [
                { id: 'id', name: 'id', type: 'TEXT' },
                { id: 'product_master_id', name: 'product_master_id', type: 'TEXT' },
                { id: 'color_id', name: 'color_id', type: 'TEXT' },
                { id: 'size_id', name: 'size_id', type: 'TEXT' },
                { id: 'jan_code', name: 'jan_code', type: 'TEXT' },
                { id: 'manufacturer_id', name: 'manufacturer_id', type: 'TEXT' }
            ]
        };
        
        return defaultSchemas[baseTableName] || [];
    };
    
    // テーブル名からスキーマを取得する関数（メーカー依存テーブルにも対応）
    const getTableSchema = (tableName: string): Column[] => {
        // まず直接テーブルから取得を試す
        const directTable = database[tableName];
        if (directTable?.schema && directTable.schema.length > 0) {
            return directTable.schema;
        }
        
        // スキーマが空の場合、メーカー依存テーブルかどうかを確認
        const { baseTableName, manufacturerId } = parseManufacturerTableName(tableName);
        
        if (baseTableName && isManufacturerDependentTable(baseTableName)) {
            // メーカー依存テーブルの場合
            if (manufacturerId) {
                // 既にメーカーIDが含まれている場合、そのテーブルから取得
                const manufacturerTable = database[tableName];
                if (manufacturerTable?.schema && manufacturerTable.schema.length > 0) {
                    return manufacturerTable.schema;
                }
            }
            
            // 最初に見つかったメーカー別テーブルからスキーマを取得
            const manufacturers = (database.manufacturers?.data || []) as any[];
            for (const manufacturer of manufacturers) {
                const mId = manufacturer?.id as string;
                if (!mId) continue;
                const manufacturerTableName = `${baseTableName}_${mId}`;
                const manufacturerTable = database[manufacturerTableName];
                if (manufacturerTable?.schema && manufacturerTable.schema.length > 0) {
                    return manufacturerTable.schema;
                }
            }
            
            // メーカー別テーブルからも取得できなかった場合、デフォルトスキーマを使用
            const defaultSchema = getDefaultSchema(baseTableName);
            if (defaultSchema.length > 0) {
                return defaultSchema;
            }
        } else {
            // ベーステーブル名から直接取得を試す
            if (baseTableName && baseTableName !== tableName) {
                const baseTable = database[baseTableName];
                if (baseTable?.schema && baseTable.schema.length > 0) {
                    return baseTable.schema;
                }
            }
            
            // ベーステーブル名でデフォルトスキーマを試す
            const defaultSchema = getDefaultSchema(baseTableName);
            if (defaultSchema.length > 0) {
                return defaultSchema;
            }
        }
        
        // デバッグ情報を出力
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[ToolDependencyManager] No schema found for table: ${tableName}`, {
                tableName,
                baseTableName,
                manufacturerId,
                hasDirectTable: !!directTable,
                directTableSchemaLength: directTable?.schema?.length || 0,
                manufacturersCount: (database.manufacturers?.data || []).length
            });
        }
        
        return [];
    };

    // 移行状態の計算
    const migrationStatus = useMemo(() => {
        const differences = detectDefinitionDifferences(database);
        const toolStatus = new Map<Page, {
            migrated: boolean;
            manualTables: string[];
            toolDepTables: string[];
            missingInToolDeps: string[];
        }>();

        ALL_TOOLS.forEach(tool => {
            const manualTables = getRequiredTablesForPageManual(tool.name);
            const toolDepTables = dependencies
                .filter(d => d.tool_name === tool.name)
                .map(d => d.table_name);
            const missingInToolDeps = manualTables.filter(t => !toolDepTables.includes(t));

            toolStatus.set(tool.name, {
                migrated: missingInToolDeps.length === 0 && manualTables.length > 0,
                manualTables,
                toolDepTables,
                missingInToolDeps,
            });
        });

        return {
            toolStatus,
            totalTools: ALL_TOOLS.length,
            migratedTools: Array.from(toolStatus.values()).filter(s => s.migrated).length,
            partiallyMigratedTools: Array.from(toolStatus.values()).filter(s => s.missingInToolDeps.length > 0 && s.missingInToolDeps.length < s.manualTables.length).length,
            notMigratedTools: Array.from(toolStatus.values()).filter(s => s.manualTables.length > 0 && s.missingInToolDeps.length === s.manualTables.length).length,
        };
    }, [database, dependencies]);

    const handleMigrateTool = (toolName: Page) => {
        const deps = generateDependenciesFromManualDefinition(toolName, database);
        const existingDeps = [...dependencies];
        const newDeps: ToolDependency[] = [];

        deps.forEach(dep => {
            const existingIndex = existingDeps.findIndex(
                d => d.tool_name === dep.tool_name && d.table_name === dep.table_name
            );
            if (existingIndex >= 0) {
                existingDeps[existingIndex] = dep; // 更新
            } else {
                newDeps.push(dep); // 新規追加
            }
        });

        const updatedDeps = [...existingDeps, ...newDeps];
        handleSave(updatedDeps);
        const toolDisplayName = ALL_TOOLS.find(t => t.name === toolName)?.displayName || toolName;
        alert(t('dependency_manager.migrate_tool_success', '{tool}の依存関係を移行しました。').replace('{tool}', toolDisplayName));
    };

    const handleMigrateAll = () => {
        if (!confirm(t('dependency_manager.migrate_all_confirm', 'すべての手動定義をtool_dependenciesに移行しますか？既存の定義は更新されます。'))) {
            return;
        }

        const newDeps = migrateAllManualDefinitionsToDependencies(database, false);
        const existingDeps = [...dependencies];
        const updatedDeps: ToolDependency[] = [];

        // 既存の依存関係を保持しつつ、新しいものを追加/更新
        const newDepsMap = new Map(newDeps.map(d => [`${d.tool_name}-${d.table_name}`, d]));
        const existingDepsMap = new Map(existingDeps.map(d => [`${d.tool_name}-${d.table_name}`, d]));

        // 既存の依存関係を統合
        existingDeps.forEach(existing => {
            const key = `${existing.tool_name}-${existing.table_name}`;
            if (newDepsMap.has(key)) {
                updatedDeps.push(newDepsMap.get(key)!); // 新しい定義で更新
                newDepsMap.delete(key);
            } else {
                updatedDeps.push(existing); // 既存のまま
            }
        });

        // 新しい依存関係を追加
        newDepsMap.forEach(dep => updatedDeps.push(dep));

        handleSave(updatedDeps);
        alert(t('dependency_manager.migrate_all_success', 'すべての手動定義をtool_dependenciesに移行しました（{count}件）。').replace('{count}', String(newDeps.length)));
    };

    // データ使用ログから実際に使用されたテーブルを取得（DATA_USAGEのみ）
    const accessedTablesByTool = useMemo(() => {
        const accessedMap = new Map<string, Set<string>>();
        
        if (!database?.app_logs?.data) {
            return accessedMap;
        }

        const logs = database.app_logs.data as Row[];
        logs.forEach(log => {
            // DATA_USAGEレベルのログのみを対象（実際に使用したデータ）
            if (log.level === 'DATA_USAGE' && log.context) {
                try {
                    const context = JSON.parse(log.context as string);
                    const tool = context.tool as string;
                    const tableName = context.table_name as string;
                    
                    if (tool && tableName) {
                        if (!accessedMap.has(tool)) {
                            accessedMap.set(tool, new Set());
                        }
                        accessedMap.get(tool)!.add(tableName);
                    }
                } catch (e) {
                    // JSON解析エラーは無視
                }
            }
        });

        return accessedMap;
    }, [database?.app_logs]);

    // アクセス実績のあるテーブルに対して自動で全アクセスを許可
    const handleAutoGrantAccessForAccessedTables = async () => {
        if (accessedTablesByTool.size === 0) {
            alert('アクセス実績のあるテーブルが見つかりませんでした。');
            return;
        }

        const totalCount = Array.from(accessedTablesByTool.values())
            .reduce((sum, tables) => sum + tables.size, 0);

        if (!confirm(
            `アクセス実績のある ${totalCount} 件のテーブルに対して、読み込み・書き込み権限を全てオンにしますか？\n` +
            `対象ツール数: ${accessedTablesByTool.size}`
        )) {
            return;
        }

        const updatedDeps: ToolDependency[] = [];
        const existingDepsMap = new Map(
            dependencies.map(d => [`${d.tool_name}|${d.table_name}`, d])
        );

        // アクセス実績のあるテーブルに対して全アクセスを許可
        accessedTablesByTool.forEach((tables, toolName) => {
            tables.forEach(tableName => {
                const key = `${toolName}|${tableName}`;
                const existing = existingDepsMap.get(key);
                
                const updatedDep: ToolDependency = {
                    ...(existing || {
                        tool_name: toolName,
                        table_name: tableName,
                        read_fields: '',
                        write_fields: '',
                        allowed_operations: '*',
                        load_strategy: 'on_demand'
                    }),
                    read_fields: '*',
                    write_fields: '*',
                    allowed_operations: '*',
                };
                
                updatedDeps.push(updatedDep);
            });
        });

        await handleSave(updatedDeps);
        alert(`アクセス実績のある ${totalCount} 件のテーブルに対してアクセス権限を設定しました。`);
    };

    // 全ツール・全テーブルに対して読み込み・書き込みを一括でオン/オフ
    const handleToggleAllAccess = async (enableRead: boolean, enableWrite: boolean) => {
        if (!confirm(
            enableRead && enableWrite 
                ? '全てのツールと全てのテーブルの組み合わせに対して、読み込み・書き込み権限を全てオンにしますか？'
                : enableRead
                ? '全てのツールと全てのテーブルの組み合わせに対して、読み込み権限を全てオンにしますか？'
                : '全てのツールと全てのテーブルの組み合わせに対して、書き込み権限を全てオンにしますか？'
        )) {
            return;
        }

        const updatedDeps: ToolDependency[] = [];
        const existingDepsMap = new Map(
            dependencies.map(d => [`${d.tool_name}|${d.table_name}`, d])
        );

        // 全てのツールと全てのテーブルの組み合わせを生成
        allTools.forEach(tool => {
            allTables.forEach(tableName => {
                const key = `${tool.name}|${tableName}`;
                const existing = existingDepsMap.get(key);
                
                const updatedDep: ToolDependency = {
                    ...(existing || {
                        tool_name: tool.name,
                        table_name: tableName,
                        read_fields: '',
                        write_fields: '',
                        allowed_operations: '*',
                        load_strategy: 'on_demand'
                    }),
                    read_fields: enableRead ? '*' : (existing?.read_fields || ''),
                    write_fields: enableWrite ? '*' : (existing?.write_fields || ''),
                    allowed_operations: enableWrite ? '*' : (existing?.allowed_operations || '*'),
                };
                
                updatedDeps.push(updatedDep);
            });
        });

        await handleSave(updatedDeps);
        alert('全てのアクセス権限を設定しました。');
    };

    return (
      <>
        <div className="flex flex-col h-full">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('dependency_manager.title', 'ツール依存性管理')}</h1>
                    <p className="text-gray-500 mt-1">{t('dependency_manager.description', '各ツールのデータ依存関係と読み込み戦略を定義します。')}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">一括設定:</span>
                        <button
                            onClick={handleAutoGrantAccessForAccessedTables}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                            title="アクセス実績のあるテーブルに対して自動で全アクセスを許可"
                        >
                            アクセス実績ON
                        </button>
                        <button
                            onClick={() => handleToggleAllAccess(true, true)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            title="全てのツールと全てのテーブルに対して読み込み・書き込みを全てオン"
                        >
                            全アクセスON
                        </button>
                        <button
                            onClick={() => handleToggleAllAccess(true, false)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            title="全てのツールと全てのテーブルに対して読み込みを全てオン"
                        >
                            読み込みON
                        </button>
                        <button
                            onClick={() => handleToggleAllAccess(false, true)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            title="全てのツールと全てのテーブルに対して書き込みを全てオン"
                        >
                            書き込みON
                        </button>
                    </div>
                    <button
                        onClick={() => setShowMigrationPanel(!showMigrationPanel)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        {showMigrationPanel ? t('dependency_manager.close_migration_panel', '移行パネルを閉じる') : t('dependency_manager.open_migration_panel', '移行パネルを開く')}
                    </button>
                </div>
            </header>

            {showMigrationPanel && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold mb-2">{t('dependency_manager.migration_title', '手動定義からtool_dependenciesへの移行')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {t('dependency_manager.migration_status', '現在の移行状況:')} 
                                <span className="font-semibold text-green-600 dark:text-green-400 ml-2">
                                    {t('dependency_manager.tools_migrated', '{migrated}/{total}ツールが移行済み').replace('{migrated}', String(migrationStatus.migratedTools)).replace('{total}', String(migrationStatus.totalTools))}
                                </span>
                                {migrationStatus.partiallyMigratedTools > 0 && (
                                    <span className="ml-4 font-semibold text-yellow-600 dark:text-yellow-400">
                                        {t('dependency_manager.tools_partial', '{count}ツールが部分的に移行済み').replace('{count}', String(migrationStatus.partiallyMigratedTools))}
                                    </span>
                                )}
                                {migrationStatus.notMigratedTools > 0 && (
                                    <span className="ml-4 font-semibold text-red-600 dark:text-red-400">
                                        {t('dependency_manager.tools_not_migrated', '{count}ツールが未移行').replace('{count}', String(migrationStatus.notMigratedTools))}
                                    </span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleMigrateAll}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                        >
                            {t('dependency_manager.migrate_all', 'すべて移行')}
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-blue-100 dark:bg-blue-900/40">
                                <tr>
                                    <th className="p-2 text-left">{t('dependency_manager.tool_name', 'ツール名')}</th>
                                    <th className="p-2 text-left">{t('dependency_manager.status', '状態')}</th>
                                    <th className="p-2 text-left">{t('dependency_manager.manual_tables_count', '手動定義テーブル数')}</th>
                                    <th className="p-2 text-left">{t('dependency_manager.tool_deps_count', 'tool_dependencies数')}</th>
                                    <th className="p-2 text-left">{t('dependency_manager.not_migrated_count', '未移行テーブル数')}</th>
                                    <th className="p-2 text-center">{t('dependency_manager.actions', '操作')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ALL_TOOLS.map(tool => {
                                    const status = migrationStatus.toolStatus.get(tool.name);
                                    if (!status) return null;

                                    let statusBadge: React.ReactElement;
                                    if (status.manualTables.length === 0) {
                                        statusBadge = <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">{t('dependency_manager.status_none', '定義なし')}</span>;
                                    } else if (status.migrated) {
                                        statusBadge = <span className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded text-xs">{t('dependency_manager.status_migrated', '移行済み')}</span>;
                                    } else if (status.missingInToolDeps.length < status.manualTables.length) {
                                        statusBadge = <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 rounded text-xs">{t('dependency_manager.status_partial', '部分的')}</span>;
                                    } else {
                                        statusBadge = <span className="px-2 py-1 bg-red-200 dark:bg-red-800 rounded text-xs">{t('dependency_manager.status_not_migrated', '未移行')}</span>;
                                    }

                                    return (
                                        <tr key={tool.name} className="border-t border-gray-200 dark:border-gray-700">
                                            <td className="p-2 font-semibold">{tool.displayName}</td>
                                            <td className="p-2">{statusBadge}</td>
                                            <td className="p-2">{status.manualTables.length}</td>
                                            <td className="p-2">{status.toolDepTables.length}</td>
                                            <td className="p-2">
                                                {status.missingInToolDeps.length > 0 ? (
                                                    <span className="text-red-600 dark:text-red-400 font-semibold">
                                                        {status.missingInToolDeps.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                {status.missingInToolDeps.length > 0 && (
                                                    <button
                                                        onClick={() => handleMigrateTool(tool.name)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                                    >
                                                        {t('dependency_manager.migrate', '移行')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="flex-grow bg-base-100 dark:bg-base-dark-200 p-4 rounded-lg shadow-md overflow-auto">
                {isLoadingTables ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">{t('dependency_manager.loading_tables', 'テーブル一覧を読み込み中...')}</div>
                    </div>
                ) : (
                    <table className="min-w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-base-100 dark:bg-base-dark-200 z-10">
                            <tr>
                                <th className="p-1 border border-base-300 dark:border-base-dark-300 sticky left-0 bg-base-100 dark:bg-base-dark-200 z-20">{t('dependency_manager.table_name', 'テーブル名')}</th>
                                {allTools.map(tool => (
                                    <th key={tool.name} className="p-1 border border-base-300 dark:border-base-dark-300 font-semibold align-top whitespace-nowrap h-40 w-10 text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }} title={tool.displayName}>
                                        {tool.displayName}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allTables.map(tableName => (
                            <tr key={tableName} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                <td className="p-2 border border-base-300 dark:border-base-dark-300 sticky left-0 bg-base-100 dark:bg-base-dark-200 z-10 font-semibold">{tableName}</td>
                                {allTools.map(tool => {
                                    const dep = getDependency(tool.name, tableName);
                                    let readFields: string[] = [];
                                    try {
                                        const parsed = JSON.parse(dep?.read_fields || '[]');
                                        readFields = parsed.flatMap((g: any) => g.fields);
                                    } catch {
                                        readFields = (dep?.read_fields || '').split(',').filter(Boolean);
                                    }
                                    const writeFields = (dep?.write_fields || '').split(',').filter(Boolean);
                                    const readCount = readFields.length;
                                    const writeCount = writeFields.length;
                                    const isRead = readCount > 0;
                                    const isWrite = writeCount > 0;
                                    
                                    // アクセス実績があるかチェック
                                    const hasAccessHistory = accessedTablesByTool.get(tool.name)?.has(tableName) || false;
                                    
                                    // アクセス実績がある場合は色を変える（より濃い色）
                                    const readColor = hasAccessHistory ? 'bg-blue-700' : 'bg-blue-500';
                                    const writeColor = hasAccessHistory ? 'bg-red-700' : 'bg-red-500';
                                    const cellBgColor = hasAccessHistory 
                                        ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20' 
                                        : 'hover:bg-blue-50 dark:hover:bg-blue-900/20';

                                    return (
                                        <td 
                                            key={tool.name} 
                                            className={`p-1 border border-base-300 dark:border-base-dark-300 text-center cursor-pointer ${cellBgColor}`}
                                            onClick={() => handleOpenModal(tool.name, tableName)}
                                            title={hasAccessHistory ? `アクセス実績あり - Read: ${readFields.join(', ') || 'なし'}, Write: ${writeFields.join(', ') || 'なし'}` : `Read: ${readFields.join(', ') || 'なし'}, Write: ${writeFields.join(', ') || 'なし'}`}
                                        >
                                            {isRead && <div className={`w-4 h-4 rounded-full ${readColor} mx-auto mb-1`} title={`Read: ${readFields.join(', ')}`}></div>}
                                            {isWrite && <div className={`w-4 h-4 rounded-full ${writeColor} mx-auto`} title={`Write: ${writeFields.join(', ')}`}></div>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
        {editingDependency && isModalOpen && (
            <DependencyEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveDependency}
                toolName={editingDependency.toolName}
                tableName={editingDependency.tableName}
                schema={getTableSchema(editingDependency.tableName)}
                initialDependency={getDependency(editingDependency.toolName, editingDependency.tableName)}
            />
        )}
      </>
    );
};

export default ToolDependencyManager;