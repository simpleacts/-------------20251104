import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getManufacturerTableName, isManufacturerDependentTable } from '../config/tableNames';
import { useDatabase } from '../contexts/DatabaseContext';
import { useNavigation } from '../contexts/NavigationContext';
import { fetchTables, getInitialTables, loadLiveOrMockDatabase } from '../data/db.live';
import { AppMode } from '../types/appMode';
import { DEFAULT_APP_MODE, getPersistedAppMode, getStoredAppMode, setStoredAppMode } from '../utils/appMode';
import { updateDatabaseWithNewData } from '../utils/manufacturerTableAccess';

/**
 * 初期モードを決定する
 * 1. localStorageに保存されている値を優先
 * 2. 保存されていない場合、API接続を試行して自動判定（成功→live、失敗→csv-debug）
 */
const getInitialAppMode = async (): Promise<AppMode> => {
    const savedMode = getPersistedAppMode();
    if (savedMode) {
        return savedMode;
    }

    // localStorageに保存されていない場合、API接続を試行して自動判定
    try {
        // タイムアウトを設定（2秒以内に応答がない場合は失敗とみなす）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        try {
            // HEADメソッドを試行（軽量）- use app-initialization-data.php for system initialization
            let response = await fetch('/api/app-initialization-data.php?tables=settings', { 
                method: 'HEAD',
                signal: controller.signal
            }).catch(() => null);
            
            // HEADが失敗した場合、GETメソッドで試行
            if (!response || !response.ok) {
                response = await fetch('/api/app-initialization-data.php?tables=settings', {
                    signal: controller.signal
                }).catch(() => null);
            }
            
            clearTimeout(timeoutId);
            
            if (response && response.ok) {
                // API接続が成功した場合、liveモードに設定
                const mode: AppMode = 'live';
                setStoredAppMode(mode);
                console.log('API接続を検出しました。ライブモードに設定します。');
                return mode;
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.log('API接続がタイムアウトしました。CSVデバッグモードを使用します。');
            } else {
                throw fetchError; // 他のエラーは再スロー
            }
        }
    } catch (e) {
        // API接続が失敗した場合（404、ネットワークエラーなど）、csv-debugモードに設定
        console.log('API接続に失敗しました。CSVデバッグモードを使用します。', e);
    }

    // デフォルトはcsv-debug
    const mode: AppMode = 'csv-debug';
    setStoredAppMode(mode);
    return mode;
};

function useAppDataInitialization() {
    const { database, setDatabase, logDataAccess } = useDatabase();
    const { currentPage, selectedTable } = useNavigation();
    const [error, setError] = useState<string | null>(null);
    const [appMode, setAppMode] = useState<AppMode>(() => getStoredAppMode());
    const [isModeInitialized, setIsModeInitialized] = useState(false);
    
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const isLoadingData = isLoadingInitial || isLoadingPage;

    const [prefetchingTables, setPrefetchingTables] = useState(new Set<string>());
    const initialLoadRef = useRef(true);
    const isInitialLoadLogged = useRef(false);

    // 初期モードの決定（初回のみ実行）
    useEffect(() => {
        if (isModeInitialized) return;
        
        // タイムアウトを設定（5秒以内に完了しない場合はデフォルトモードにフォールバック）
        const timeoutId = setTimeout(() => {
            console.warn('モード初期化がタイムアウトしました。CSVデバッグモードを使用します。');
            const fallbackMode: AppMode = DEFAULT_APP_MODE;
            setStoredAppMode(fallbackMode);
            setAppMode(fallbackMode);
            setIsModeInitialized(true);
        }, 5000);
        
        getInitialAppMode()
            .then(mode => {
                clearTimeout(timeoutId);
                setAppMode(mode);
                setIsModeInitialized(true);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('モード初期化中にエラーが発生しました:', error);
                // エラーが発生しても必ず初期化を完了させる（csv-debugモードにフォールバック）
                const fallbackMode: AppMode = DEFAULT_APP_MODE;
                setStoredAppMode(fallbackMode);
                setAppMode(fallbackMode);
                setIsModeInitialized(true);
            });
        
        return () => clearTimeout(timeoutId);
    }, [isModeInitialized]);

    useEffect(() => {
        if (!isModeInitialized) return;
        setStoredAppMode(appMode);
    }, [appMode, isModeInitialized]);

    useEffect(() => {
        // モードが初期化されるまで待機
        if (!isModeInitialized) return;

        const initializeDb = async () => {
            try {
                setError(null);
                setDatabase(null);
                setIsLoadingInitial(true);
                const db = await loadLiveOrMockDatabase(appMode);
                setDatabase(db);
            } catch (e) {
                console.error("Database initialization failed:", e);
                const message = e instanceof Error ? e.message : `データベースの読み込み中に予期せぬエラーが発生しました: ${String(e)}`;
                setError(message);
                setDatabase({});
            } finally {
                setIsLoadingInitial(false);
            }
        };
        initializeDb();
    }, [appMode, setDatabase, isModeInitialized]);

    // 前回チェックしたテーブルリストと読み込み状態を記録（無限ループを防ぐため）
    const lastCheckedTablesRef = useRef<string>('');
    const isLoadingRef = useRef(false);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    // databaseのテーブルリストを追跡（文字列化して比較）
    const databaseTablesKey = useMemo(() => {
        if (!database) return '';
        return Object.keys(database).sort().join(',');
    }, [database]);

    // 先読みを無効化: ページが変わったときの自動データ読み込みを削除
    // 各ツールページやモーダルで必要な時に必要なデータを読み込む方式に変更
    // useEffect(() => {
    //     if (isLoadingInitial || !database) return;
    //     if (isLoadingRef.current) return; // 既に読み込み中の場合はスキップ

    //     const loadPageData = async () => {
    //         const requiredTables = getRequiredTablesForPage(currentPage, selectedTable, database);
    //         
    //         // メーカー依存テーブルの場合、メーカー別テーブルが存在するかチェック
    //         const missingTables = requiredTables.filter(t => {
    //             // ベーステーブルが存在する場合はスキップ
    //             if (database[t]) return false;
    //             
    //             // メーカー依存テーブルの場合、メーカー別テーブルが存在するかチェック
    //             if (isManufacturerDependentTable(t)) {
    //                 const manufacturers = database.manufacturers?.data || [];
    //                 // 少なくとも1つのメーカー別テーブルが存在するかチェック
    //                 const hasAnyManufacturerTable = manufacturers.some((m: any) => {
    //                     const manufacturerId = m.id as string;
    //                     if (!manufacturerId) return false;
    //                     const manufacturerTableName = getManufacturerTableName(t, manufacturerId);
    //                     return !!database[manufacturerTableName];
    //                 });
    //                 // メーカー別テーブルが存在する場合はスキップ
    //                 if (hasAnyManufacturerTable) return false;
    //             }
    //             
    //             return true;
    //         });
    //         
    //         // 前回と同じチェックキーの場合で、かつ必要なテーブルが既に読み込まれている場合はスキップ
    //         const currentCheckKey = `${currentPage}:${selectedTable}:${requiredTables.sort().join(',')}`;
    //         const allRequiredLoaded = requiredTables.every(t => {
    //             // ベーステーブルが存在する場合は読み込み済み
    //             if (database[t]) return true;
    //             // メーカー依存テーブルの場合、メーカー別テーブルが存在するかチェック
    //             if (isManufacturerDependentTable(t)) {
    //                 const manufacturers = database.manufacturers?.data || [];
    //                 return manufacturers.some((m: any) => {
    //                     const manufacturerId = m.id as string;
    //                     if (!manufacturerId) return false;
    //                     const manufacturerTableName = getManufacturerTableName(t, manufacturerId);
    //                     return !!database[manufacturerTableName];
    //                 });
    //             }
    //             return loadedTablesRef.current.has(t);
    //         });
    //         
    //         if (lastCheckedTablesRef.current === currentCheckKey && allRequiredLoaded) {
    //             return;
    //         }
    //         lastCheckedTablesRef.current = currentCheckKey;

    //         if (missingTables.length > 0) {
    //             isLoadingRef.current = true;
    //             setIsLoadingPage(true);
    //             logDataAccess(currentPage, missingTables);
    //             try {
    //                 // Use tool-specific API endpoint based on currentPage
    //                 const newData = await fetchTables(missingTables, { toolName: currentPage });
    //                 setDatabase(prev => {
    //                     const merged = mergeDatabaseData(prev, newData);
    //                     // 読み込んだテーブルを記録
    //                     Object.keys(newData).forEach(table => {
    //                         loadedTablesRef.current.add(table);
    //                     });
    //                     return merged;
    //                 });
    //             } catch (e) {
    //                 const message = e instanceof Error ? e.message : `ページデータの読み込みに失敗しました: ${String(e)}`;
    //                 setError(message);
    //             } finally {
    //                 setIsLoadingPage(false);
    //                 isLoadingRef.current = false;
    //             }
    //         } else {
    //             // 必要なテーブルが既に読み込まれている場合も記録
    //             requiredTables.forEach(table => {
    //                 if (database[table]) {
    //                     loadedTablesRef.current.add(table);
    //                 }
    //             });
    //         }
    //     };

    //     loadPageData();
    // }, [currentPage, selectedTable, isLoadingInitial, databaseTablesKey, setDatabase, logDataAccess]);

    useEffect(() => {
        if (database && !isLoadingData && !isInitialLoadLogged.current) {
            if (database.app_logs && database.tool_dependencies) {
                logDataAccess('initial_load', getInitialTables());
                isInitialLoadLogged.current = true;
            }
        }
    }, [database, isLoadingData, logDataAccess]);

    const prefetchTables = useCallback(async (tablesToFetch: string[], source: string) => {
        if (!database) return;

        const currentPrefetching = prefetchingTables;
        
        // メーカー依存テーブルの場合、メーカー別テーブルが存在するかチェック
        const missingTables = tablesToFetch.filter(t => {
            // 既にプリフェッチ中の場合はスキップ
            if (currentPrefetching.has(t)) return false;
            
            // ベーステーブルが存在する場合はスキップ
            if (database[t]) return false;
            
            // メーカー依存テーブルの場合、メーカー別テーブルが存在するかチェック
            if (isManufacturerDependentTable(t)) {
                const manufacturers = database.manufacturers?.data || [];
                // 少なくとも1つのメーカー別テーブルが存在するかチェック
                const hasAnyManufacturerTable = manufacturers.some((m: any) => {
                    const manufacturerId = m.id as string;
                    if (!manufacturerId) return false;
                    const manufacturerTableName = getManufacturerTableName(t, manufacturerId);
                    return !!database[manufacturerTableName];
                });
                // メーカー別テーブルが存在する場合はスキップ
                if (hasAnyManufacturerTable) return false;
            }
            
            return true;
        });

        if (missingTables.length > 0) {
            logDataAccess(source, missingTables);
            setPrefetchingTables(prev => new Set([...prev, ...missingTables]));
            try {
                    // Prefetch uses the source page name as tool identifier
                    // If source is not provided, use app-initialization (for initial tables only)
                    const newData = await fetchTables(missingTables, { toolName: source || 'app-initialization' });
                    setDatabase(prev => updateDatabaseWithNewData(prev, newData));
            } catch (e) {
                console.error(`Prefetching failed for tables: ${missingTables.join(', ')}`, e);
            } finally {
                setPrefetchingTables(prev => {
                    const newSet = new Set(prev);
                    missingTables.forEach(t => newSet.delete(t));
                    return newSet;
                });
            }
        }
    }, [database, prefetchingTables, setDatabase, logDataAccess]);

    return {
        database,
        setDatabase,
        error,
        appMode,
        setAppMode,
        isLoadingData,
        prefetchTables,
    };
}

export default useAppDataInitialization;