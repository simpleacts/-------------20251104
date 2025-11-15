import React, { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useRef, useState } from 'react';
// FIX: Corrected type import path to use `../components/types/index` instead of `../types/index`.
import { Database, Row, Table, ToolDependency } from '../../shared/types';
import { getManufacturerTableName, isManufacturerDependentTable, parseManufacturerTableName } from '../config/tableNames';
import { getStoredAppMode, isCsvWritableMode } from '../utils/appMode';
import { getCsvPath } from '../utils/csvPathResolver';
import { trackDeletedItem } from '../utils/deletedItemsTracker';

interface DatabaseContextType {
    database: Partial<Database> | null;
    setDatabase: Dispatch<SetStateAction<Partial<Database> | null>>;
    logDataAccess: (source: string, tables: string[]) => void;
    logDataUsage: (source: string, tableName: string, rowId: string, fields?: string[], usageType?: 'display' | 'calculation' | 'filter' | 'other') => void;
    logError: (message: string, error?: Error | unknown, context?: Record<string, any>) => void;
    logWarning: (message: string, context?: Record<string, any>) => void;
    logInfo: (message: string, context?: Record<string, any>) => void;
    trackDeletedItem: (tableName: string, itemId: string | number) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode; initialDatabase: Partial<Database> | null }> = ({ children, initialDatabase }) => {
    const [database, setDatabaseState] = useState<Partial<Database> | null>(initialDatabase);
    const saveQueueRef = useRef<Map<string, { table: string; data: Row[]; schema: any[]; manufacturerId?: string }>>(new Map());
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // CSVファイルに保存する関数
    const saveToCsv = useCallback(async (tableName: string, tableData: Table, manufacturerId?: string) => {
        const appMode = getStoredAppMode();
        
        // csv-writableモードでない場合はスキップ
        if (!isCsvWritableMode(appMode)) {
            return;
        }

        // sizes, colorsテーブルはstockテーブルから取得されるため、直接保存をスキップ
        // メーカー依存テーブル名（sizes_manu_0001など）もチェック
        if (tableName === 'sizes' || tableName === 'colors' || 
            tableName.startsWith('sizes_') || tableName.startsWith('colors_')) {
            return;
        }

        // products_master, product_tagsは削除済み（stockテーブルから取得）
        // product_detailsは商品データ管理ツールから更新可能
        if (tableName === 'products_master' || tableName === 'product_tags' ||
            tableName.startsWith('products_master_') || tableName.startsWith('product_tags_')) {
            return;
        }

        // stockテーブルはcsv-writableモードでCSVに保存可能
        // csv-debugモードでは読み込みのみ（ここではスキップされない）

        // メーカー依存テーブル（brands, tagsなど）は、manufacturerIdが提供されている場合のみ保存可能
        // ベーステーブル名（brands, tagsなど）でmanufacturerIdがない場合はスキップ
        const { baseTableName, manufacturerId: parsedManufacturerId } = parseManufacturerTableName(tableName);
        if (isManufacturerDependentTable(baseTableName) && !manufacturerId && !parsedManufacturerId) {
            // メーカー依存テーブルでmanufacturerIdが提供されていない場合はスキップ
            // メーカー依存テーブル名（brands_manu_0001など）の場合は、manufacturerIdが抽出されているので保存可能
            return;
        }

        try {
            // manufacturerIdから`manu_`プレフィックスを削除（重複を防ぐ）
            let cleanManufacturerId = manufacturerId || parsedManufacturerId || undefined;
            if (cleanManufacturerId && cleanManufacturerId.startsWith('manu_')) {
                cleanManufacturerId = cleanManufacturerId.substring(5); // 'manu_'の長さは5
            }
            const csvPaths = getCsvPath(tableName, cleanManufacturerId);
            if (!csvPaths || csvPaths.length === 0) {
                console.warn(`[DatabaseContext] No CSV path found for table: ${tableName}`);
                return;
            }

            // 最初のパスを使用（通常は1つ）
            // csvPathはログ用のみ（実際のパスはPHP側で決定）
            
            let response: Response;
            try {
                response = await fetch('/api/save-csv.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: tableName,
                        data: tableData.data || [],
                        schema: tableData.schema || [],
                        manufacturerId: cleanManufacturerId
                    })
                });
            } catch (fetchError) {
                const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
                if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                    console.error(`[DatabaseContext] サーバーに接続できません。PHPサーバーが起動しているか確認してください。`);
                    console.error(`[DatabaseContext] サーバーを起動するには、プロジェクトルートで以下のコマンドを実行してください:`);
                    console.error(`[DatabaseContext]   start-server.bat`);
                    console.error(`[DatabaseContext] または手動で: php -S localhost:8080`);
                }
                console.error(`[DatabaseContext] Error saving CSV for ${tableName}:`, error);
                return;
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error(`[DatabaseContext] Failed to save CSV for ${tableName}:`, error);
                return;
            }

            const result = await response.json();
            if (result.success) {
                console.log(`[DatabaseContext] Saved CSV for ${tableName} to ${result.path}`);
            }
        } catch (error) {
            console.error(`[DatabaseContext] Error saving CSV for ${tableName}:`, error);
        }
    }, []);

    // 変更されたテーブルをキューに追加（デバウンス）
    const queueTableSave = useCallback((tableName: string, tableData: Table, manufacturerId?: string) => {
        const key = manufacturerId ? `${tableName}_${manufacturerId}` : tableName;
        saveQueueRef.current.set(key, { table: tableName, data: tableData.data || [], schema: tableData.schema || [], manufacturerId });

        // 既存のタイムアウトをクリア
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // 500ms後に保存（デバウンス）
        saveTimeoutRef.current = setTimeout(() => {
            const queue = Array.from(saveQueueRef.current.values());
            saveQueueRef.current.clear();

            queue.forEach(({ table, data, schema, manufacturerId }) => {
                saveToCsv(table, { schema, data }, manufacturerId);
            });
        }, 500);
    }, [saveToCsv]);

    // setDatabaseをラップして、csv-writableモードの場合は自動保存
    const setDatabase = useCallback<Dispatch<SetStateAction<Partial<Database> | null>>>((update) => {
        setDatabaseState(prevDb => {
            const newDb = typeof update === 'function' ? update(prevDb) : update;
            
            // csv-writableモードの場合、変更されたテーブルを検出して保存
            const appMode = getStoredAppMode();
            if (isCsvWritableMode(appMode) && prevDb && newDb) {
                // 変更されたテーブルを検出
                Object.keys(newDb).forEach(key => {
                    const newTable = newDb[key];
                    const prevTable = prevDb[key];
                    
                    if (newTable && 'data' in newTable && Array.isArray(newTable.data)) {
                        // テーブルが新規追加されたか、データが変更されたかチェック
                        if (!prevTable || JSON.stringify(prevTable.data) !== JSON.stringify(newTable.data)) {
                            // メーカー依存テーブルの場合、manufacturerIdを抽出
                            const parsed = parseManufacturerTableName(key);
                            if (parsed.manufacturerId) {
                                // メーカー依存テーブル名（brands_manu_0001など）の場合
                                queueTableSave(parsed.baseTableName, newTable as Table, parsed.manufacturerId);
                            } else if (isManufacturerDependentTable(key)) {
                                // ベーステーブル名（brandsなど）でメーカー依存テーブルの場合
                                // manufacturerIdが提供されていないため、スキップ（saveToCsvで処理される）
                                queueTableSave(key, newTable as Table);
                            } else {
                                // 通常のテーブルの場合
                                queueTableSave(key, newTable as Table);
                            }
                        }
                    }
                });
            }
            
            return newDb;
        });
    }, [queueTableSave]);

    const logDataAccess = useCallback((source: string, tables: string[]) => {
        if (!tables || tables.length === 0) return;
        
        setDatabase(prevDb => {
            if (!prevDb || !prevDb.app_logs || !prevDb.tool_dependencies) {
                 console.warn(`'app_logs' or 'tool_dependencies' table not available, skipping data access log for source: ${source}`);
                 return prevDb;
            }

            const dependencies = prevDb.tool_dependencies.data as ToolDependency[];
            
            // メーカー依存テーブルの場合、実際にアクセスしたメーカー別テーブル名を取得
            const actualTables: string[] = [];
            const manufacturers = prevDb.manufacturers?.data || [];
            
            tables.forEach(tableName => {
                if (isManufacturerDependentTable(tableName)) {
                    // メーカーごとのテーブル名を追加
                    manufacturers.forEach((m: Row) => {
                        const manufacturerId = m.id as string;
                        if (manufacturerId && manufacturerId !== 'undefined') {
                            const manufacturerTableName = getManufacturerTableName(tableName, manufacturerId);
                            // 実際にデータベースに存在するテーブルのみを追加
                            if (prevDb[manufacturerTableName]) {
                                actualTables.push(manufacturerTableName);
                            }
                        }
                    });
                } else {
                    // メーカー非依存テーブルはそのまま
                    actualTables.push(tableName);
                }
            });
            
            const access_details = actualTables.map(tableName => {
                // まず完全なテーブル名で検索
                let dep = dependencies.find(d => d.tool_name === source && d.table_name === tableName);
                
                // 見つからない場合、メーカー依存テーブルの場合はベーステーブル名で検索
                if (!dep) {
                    const { baseTableName } = parseManufacturerTableName(tableName);
                    if (baseTableName && baseTableName !== tableName) {
                        dep = dependencies.find(d => d.tool_name === source && d.table_name === baseTableName);
                    }
                }
                
                return {
                    table_name: tableName,  // 実際のテーブル名（_manu_xxxx付き）
                    load_strategy: dep?.load_strategy || 'unknown',
                    read_fields: dep?.read_fields || '',
                    write_fields: dep?.write_fields || ''
                };
            });

            const logEntry: Row = {
                id: `log_${Date.now()}_${Math.random()}`,
                timestamp: new Date().toISOString(),
                level: 'DATA_ACCESS',
                message: `${source} が ${actualTables.length} 件のテーブルにアクセスしました。`,
                user_id: 'system',
                context: JSON.stringify({
                    tool: source,
                    access_details: access_details
                })
            };
            
            const newDb = {
                ...prevDb,
                app_logs: {
                    ...prevDb.app_logs,
                    data: [...(prevDb.app_logs.data || []), logEntry]
                }
            };
            return newDb;
        });
    }, [setDatabase]);

    // 実際に使用したデータを1項目ずつ記録
    // エラーが発生しても確実にログを記録できるようにtry-catchで保護
    // ログは自動的にサーバー（データベースまたはCSVファイル）に保存される
    const logDataUsage = useCallback((
        source: string, 
        tableName: string, 
        rowId: string, 
        fields?: string[], 
        usageType: 'display' | 'calculation' | 'filter' | 'other' = 'other'
    ) => {
        if (!tableName || !rowId) return;
        
        try {
            let logEntry: Row | null = null;
            
            setDatabase(prevDb => {
                if (!prevDb || !prevDb.app_logs) {
                    return prevDb;
                }

                logEntry = {
                    id: `usage_${Date.now()}_${Math.random()}`,
                    timestamp: new Date().toISOString(),
                    level: 'DATA_USAGE',
                    message: `${source} が ${tableName} テーブルの行 ${rowId} を使用しました（${usageType}）`,
                    user_id: 'system',
                    context: JSON.stringify({
                        tool: source,
                        table_name: tableName,
                        row_id: rowId,
                        fields: fields || [],
                        usage_type: usageType
                    })
                };
                
                const newDb = {
                    ...prevDb,
                    app_logs: {
                        ...prevDb.app_logs,
                        data: [...prevDb.app_logs.data, logEntry]
                    }
                };
                return newDb;
            });
            
            // サーバーに自動保存（非同期、エラーが発生してもログ記録は継続）
            // 注意: ログはフロントエンドのメモリ内に保存され、次回のデータ読み込み時に
            // データベースまたはCSVファイルに反映されます
            // ライブモードの場合、app_logsテーブルへの書き込み権限が必要です
        } catch (error) {
            // エラーが発生してもログ記録は継続（コンソールに出力のみ）
            console.error('[logDataUsage] Failed to log data usage:', error, {
                source,
                tableName,
                rowId,
                fields,
                usageType
            });
        }
    }, [setDatabase]);

    const logError = useCallback((message: string, error?: Error | unknown, context?: Record<string, any>) => {
        setDatabase(prevDb => {
            if (!prevDb || !prevDb.app_logs) {
                return prevDb;
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            const stackTrace = error instanceof Error ? error.stack : 'N/A';
            
            // コンテキストからfingerprintを取得（エラー解析済みの場合）
            const fingerprint = context?.fingerprint;
            const errorType = context?.errorType || 'UNKNOWN';
            const errorCategory = context?.errorCategory || 'OTHER';
            const severity = context?.severity || 'MEDIUM';
            
            // fingerprintがある場合、重複エラーをチェック
            if (fingerprint) {
                const existingLogs = prevDb.app_logs.data || [];
                const existingErrorIndex = existingLogs.findIndex((log: Row) => {
                    try {
                        const logContext = log.context ? JSON.parse(log.context as string) : {};
                        return logContext.fingerprint === fingerprint && log.level === 'ERROR';
                    } catch {
                        return false;
                    }
                });
                
                if (existingErrorIndex !== -1) {
                    // 既存のエラーが見つかった場合、件数をカウントアップ
                    const existingLog = existingLogs[existingErrorIndex];
                    try {
                        const existingContext = existingLog.context ? JSON.parse(existingLog.context as string) : {};
                        const count = (existingContext.count || 1) + 1;
                        const lastOccurrence = existingLog.timestamp;
                        
                        // 既存のログを更新（件数と最終発生時刻を更新）
                        const updatedLogs = [...(prevDb.app_logs.data || [])];
                        updatedLogs[existingErrorIndex] = {
                            ...existingLog,
                            timestamp: new Date().toISOString(), // 最新の発生時刻に更新
                            context: JSON.stringify({
                                ...existingContext,
                                count,
                                lastOccurrence,
                                lastMessage: message, // 最新のメッセージを保存
                                lastStackTrace: stackTrace // 最新のスタックトレースを保存
                            })
                        };
                        
                        return {
                            ...prevDb,
                            app_logs: {
                                ...prevDb.app_logs,
                                data: updatedLogs
                            }
                        };
                    } catch (e) {
                        // パースエラーの場合は新規作成
                    }
                }
            }
            
            // 新規エラーまたはfingerprintがない場合は新規作成
            const logEntry: Row = {
                id: `log_${Date.now()}_${Math.random()}`,
                timestamp: new Date().toISOString(),
                level: 'ERROR',
                message: message || errorMessage,
                stack_trace: stackTrace,
                user_id: context?.userId || 'system',
                context: JSON.stringify({
                    error: errorMessage,
                    errorType,
                    errorCategory,
                    severity,
                    fingerprint: fingerprint || null,
                    count: 1, // 初回は1件
                    ...context
                })
            };

            const newDb = {
                ...prevDb,
                app_logs: {
                    ...prevDb.app_logs,
                    data: [...(prevDb.app_logs.data || []), logEntry]
                }
            };
            return newDb;
        });
    }, [setDatabase]);

    const logWarning = useCallback((message: string, context?: Record<string, any>) => {
        setDatabase(prevDb => {
            if (!prevDb || !prevDb.app_logs) {
                return prevDb;
            }

            const logEntry: Row = {
                id: `log_${Date.now()}_${Math.random()}`,
                timestamp: new Date().toISOString(),
                level: 'WARN',
                message: message,
                user_id: 'system',
                context: context ? JSON.stringify(context) : undefined
            };

            const newDb = {
                ...prevDb,
                app_logs: {
                    ...prevDb.app_logs,
                    data: [...(prevDb.app_logs.data || []), logEntry]
                }
            };
            return newDb;
        });
    }, [setDatabase]);

    const logInfo = useCallback((message: string, context?: Record<string, any>) => {
        setDatabase(prevDb => {
            if (!prevDb || !prevDb.app_logs) {
                return prevDb;
            }

            const logEntry: Row = {
                id: `log_${Date.now()}_${Math.random()}`,
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: message,
                user_id: 'system',
                context: context ? JSON.stringify(context) : undefined
            };

            const newDb = {
                ...prevDb,
                app_logs: {
                    ...prevDb.app_logs,
                    data: [...(prevDb.app_logs.data || []), logEntry]
                }
            };
            return newDb;
        });
    }, [setDatabase]);

    const handleTrackDeletedItem = useCallback((tableName: string, itemId: string | number) => {
        trackDeletedItem(tableName, itemId);
    }, []);

    return (
        <DatabaseContext.Provider value={{ database, setDatabase, logDataAccess, logDataUsage, logError, logWarning, logInfo, trackDeletedItem: handleTrackDeletedItem }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = (): DatabaseContextType => {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};