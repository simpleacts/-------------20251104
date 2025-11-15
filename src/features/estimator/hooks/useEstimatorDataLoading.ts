import { useEffect, useMemo, useRef, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { 
    getAllManufacturerTableData, 
    getManufacturerTable, 
    updateDatabaseWithNewData
} from '@core/utils';
import transformDatabaseToAppData from '@shared/utils/estimatorDataTransformer';
import { isManufacturerDependentTable } from '@core/config/tableNames';
import { getEstimatorEssentialTables } from '@core/config/Routes';
import { AppData, Database } from '@shared/types';
import { useDebugMode } from '@shared/hooks/useDebugMode';

interface UseEstimatorDataLoadingOptions {
    toolName: 'estimator';
}

/**
 * 見積作成ツール用のデータ読み込みフック（v2の動作パターンに基づく）
 * - 必須テーブルのみを読み込む
 * - 必須テーブルが読み込まれたらデータ変換を実行
 * - 商品データや顧客データの段階的読み込みは行わない（必要に応じて個別に読み込む）
 */
export const useEstimatorDataLoading = (options: UseEstimatorDataLoadingOptions) => {
    const { toolName } = options;
    const { database, setDatabase, logDataAccess } = useDatabase();
    const { addLog } = useDebugMode(toolName);
    
    const [isLoading, setIsLoading] = useState(true);
    const [loadingPhase, setLoadingPhase] = useState<'essential' | 'transform' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [appData, setAppData] = useState<AppData | null>(null);

    const essentialTables = useMemo(() => getEstimatorEssentialTables(), []);

    // データベースのテーブル存在キーを計算（テーブル名のソート済みリスト）
    const databaseTablesKey = useMemo(() => {
        if (!database) return '';
        return Object.keys(database).filter(k => database[k]).sort().join(',');
    }, [database]);

    // 読み込み済みフラグを追跡して無限ループを防ぐ（useRefでメモ化）
    const loadingPhasesRef = useRef<Set<string>>(new Set());
    const isProcessingRef = useRef(false);
    
    useEffect(() => {
        const loadAndTransformData = async () => {
            // 既に処理中の場合はスキップ
            if (isProcessingRef.current) {
                return;
            }
            
            if (!database) {
                setIsLoading(true);
                return;
            }
    
            // 必須テーブルの読み込み
            if (!loadingPhasesRef.current.has('essential')) {
                const missingEssentialTables = essentialTables.filter(t => {
                    // メーカー依存テーブルの場合は、getAllManufacturerTableDataを使用してデータが存在するかどうかを確認
                    if (isManufacturerDependentTable(t)) {
                        const allData = getAllManufacturerTableData(database, t);
                        return allData.length === 0;
                    }
                    // 通常のテーブルの場合は、直接チェック
                    const table = database[t];
                    return !table || !table.data || table.data.length === 0;
                });
                
                if (missingEssentialTables.length > 0) {
                    isProcessingRef.current = true;
                    setIsLoading(true);
                    setLoadingPhase('essential');
                    setError(null);
                    loadingPhasesRef.current.add('essential');
                    logDataAccess(toolName, missingEssentialTables);
                    try {
                        addLog('debug', 'data-loading', '必須テーブル読み込み開始（見積API）', { tables: missingEssentialTables });
                        console.log(`[${toolName}] Loading essential tables via ${toolName} API...`);
                        const newData = await fetchTables(missingEssentialTables, { toolName });
                        addLog('info', 'data-loading', '必須テーブル読み込み成功（見積API）', { 
                            loadedTables: Object.keys(newData || {}),
                            brandsExists: !!newData?.brands,
                            brandsDataLength: newData?.brands?.data?.length || 0
                        });
                        setDatabase(prev => updateDatabaseWithNewData(prev, newData));
                        isProcessingRef.current = false;
                        // 次の段階へ進むために再実行
                        return;
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        addLog('warning', 'data-loading', '見積API失敗、標準APIにフォールバック', {
                            error: error.message
                        }, error);
                        console.warn(`[${toolName}] Estimator API failed, falling back to standard API:`, err);
                        try {
                            addLog('debug', 'data-loading', '必須テーブル読み込み開始（標準API）', { tables: missingEssentialTables });
                            const newData = await fetchTables(missingEssentialTables, { toolName });
                            addLog('info', 'data-loading', '必須テーブル読み込み成功（標準API）', { loadedTables: Object.keys(newData || {}) });
                            setDatabase(prev => updateDatabaseWithNewData(prev, newData));
                            isProcessingRef.current = false;
                            return;
                        } catch (fallbackErr) {
                            const fallbackError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
                            const errorMessage = fallbackError.message || '必須データの読み込みに失敗しました。';
                            addLog('error', 'data-loading', '必須テーブル読み込み失敗', {
                                tables: missingEssentialTables,
                                error: errorMessage
                            }, fallbackError);
                            console.error(`[${toolName}] Failed to load essential tables:`, errorMessage, fallbackErr);
                            setError(errorMessage);
                            setIsLoading(false);
                            setLoadingPhase(null);
                            loadingPhasesRef.current.delete('essential');
                            isProcessingRef.current = false;
                            return;
                        }
                    }
                } else {
                    // 必須テーブルは既に読み込み済み
                    loadingPhasesRef.current.add('essential');
                }
            }
    
            // appDataが既に設定されている場合は、これ以上処理しない
            if (appData) {
                setIsLoading(false);
                setLoadingPhase(null);
                isProcessingRef.current = false;
                return;
            }
            
            // すべての必須テーブルが読み込まれたらデータ変換（一度だけ実行）
            const allTablesLoaded = essentialTables.every(t => {
                // メーカー依存テーブルの場合
                if (isManufacturerDependentTable(t)) {
                    // まず、ベーステーブル名でテーブルが存在するかチェック（統合データ）
                    const baseTable = database[t];
                    if (baseTable && 'data' in baseTable && Array.isArray(baseTable.data)) {
                        // テーブルが存在する場合は読み込み済み
                        return true;
                    }
                    
                    // manufacturersテーブルが存在しない場合は、まだ読み込まれていない
                    const manufacturers = database.manufacturers?.data || [];
                    if (manufacturers.length === 0) {
                        return false;
                    }
                    
                    // 少なくとも1つのメーカーでテーブルが存在するかチェック
                    const hasAnyManufacturerTable = manufacturers.some((m: any) => {
                        const manufacturerId = m?.id as string;
                        if (!manufacturerId || manufacturerId === 'undefined' || manufacturerId.trim() === '') {
                            return false;
                        }
                        const manufacturerTable = getManufacturerTable(database, t, manufacturerId);
                        return manufacturerTable && 'data' in manufacturerTable && Array.isArray(manufacturerTable.data);
                    });
                    
                    return hasAnyManufacturerTable;
                }
                // 通常のテーブルの場合は、直接チェック
                const table = database[t];
                // テーブルが存在し、dataプロパティが配列として存在すれば「読み込まれた」と見なす
                // データが空でも、テーブルが存在することが重要
                return table && table.data && Array.isArray(table.data);
            });
            
            console.log(`[${toolName}] Checking allTablesLoaded:`, {
                allTablesLoaded,
                appDataExists: !!appData,
                transformPhaseCompleted: loadingPhasesRef.current.has('transform'),
                tablesStatus: essentialTables.map(t => {
                    if (isManufacturerDependentTable(t)) {
                        const allData = getAllManufacturerTableData(database, t);
                        return {
                            table: t,
                            exists: allData.length > 0 || !!database[t],
                            hasData: allData.length > 0
                        };
                    }
                    return {
                        table: t,
                        exists: !!database[t],
                        hasData: database[t]?.data?.length > 0
                    };
                })
            });
            
            if (allTablesLoaded && !appData && !loadingPhasesRef.current.has('transform')) {
                isProcessingRef.current = true;
                setIsLoading(true);
                setLoadingPhase('transform');
                setError(null);
                loadingPhasesRef.current.add('transform');
                try {
                    addLog('debug', 'data-transform', 'データ変換開始', {
                        requiredTables: essentialTables.length,
                        loadedTables: Object.keys(database).filter(k => database[k]).length
                    });
                    // 次のイベントループで実行してUIを更新させる
                    await new Promise(resolve => setTimeout(resolve, 0));
                    console.log(`[${toolName}] Transforming data...`);
                    const transformedData = transformDatabaseToAppData(database as Database);
                    if (transformedData) {
                        addLog('info', 'data-transform', 'データ変換成功', {
                            productCount: Object.keys(transformedData.products || {}).length,
                            hasCompanyInfo: !!transformedData.companyInfo
                        });
                        console.log(`[${toolName}] Data transformation successful, setting appData`);
                        setAppData(transformedData);
                        setIsLoading(false);
                        setLoadingPhase(null);
                        isProcessingRef.current = false;
                        // appDataが設定されたので、これ以上処理しないようにする
                        return;
                    } else {
                        const missingTables = essentialTables.filter(t => {
                            if (isManufacturerDependentTable(t)) {
                                const allData = getAllManufacturerTableData(database, t);
                                return allData.length === 0;
                            }
                            return !database[t] || !database[t].data || database[t].data.length === 0;
                        });
                        const errorMsg = "データ変換に失敗しました。必要なテーブルが不足している可能性があります。";
                        addLog('error', 'data-transform', 'データ変換失敗', {
                            availableTables: Object.keys(database).filter(k => database[k]),
                            missingEssentialTables: missingTables
                        });
                        console.error(`[${toolName}] Data transformation returned null`);
                        setError(errorMsg);
                        setIsLoading(false);
                        setLoadingPhase(null);
                        loadingPhasesRef.current.delete('transform');
                        isProcessingRef.current = false;
                    }
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'データ変換中にエラーが発生しました。';
                    addLog('error', 'data-transform', 'データ変換中にエラー発生', {
                        error: errorMessage
                    }, err instanceof Error ? err : new Error(String(err)));
                    console.error(`[${toolName}] Error during data transformation:`, errorMessage, err);
                    setError(errorMessage);
                    setIsLoading(false);
                    setLoadingPhase(null);
                    loadingPhasesRef.current.delete('transform');
                    isProcessingRef.current = false;
                }
            } else if (!allTablesLoaded && loadingPhase === null && !isProcessingRef.current) {
                // すべてのテーブルが読み込まれていないが、何もロード中でない場合は待機
                setIsLoading(true);
            } else if (allTablesLoaded && appData && loadingPhase !== 'transform') {
                // すべてのテーブルが読み込まれていて、データ変換も完了している場合
                setIsLoading(false);
                setLoadingPhase(null);
                isProcessingRef.current = false;
            }
        };
        loadAndTransformData();
    }, [databaseTablesKey, essentialTables.join(','), appData, loadingPhase, toolName, setDatabase, logDataAccess, addLog]);
    
    return {
        isLoading,
        loadingPhase,
        error,
        appData,
        setAppData
    };
};
