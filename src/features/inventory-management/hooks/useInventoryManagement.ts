import { getManufacturerTableName } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { getManufacturerTable, updateDatabase } from '@core/utils';
import { Row, Table } from '@shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface InventoryItem extends Row {
    sku_id: string;
    quantity: number;
    product_name?: string;
    product_code?: string;
    color_name?: string;
    color_code?: string;
    size_name?: string;
    size_code?: string;
    brand_name?: string;
    manufacturer_id?: string;
    incoming_quantity?: number; // 入荷予定数の合計
    incoming_dates?: string[]; // 入荷予定日のリスト
    next_arrival_date?: string; // 最も近い入荷予定日
}

export interface StockHistoryItem extends Row {
    id: string;
    sku_id: string;
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    reason: string;
    notes?: string;
    created_at: string;
    created_by?: string;
}

export const useInventoryManagement = (
    paginationConfig: { enabled: boolean; itemsPerPage: number; },
    addDebugLog?: (level: 'info' | 'warning' | 'error' | 'debug', category: string, message: string, data?: any, error?: Error) => void
) => {
    const { database, setDatabase, logDataAccess } = useDatabase();
    const { currentPage } = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lowStockThreshold, setLowStockThreshold] = useState(10); // デフォルトの在庫アラート閾値
    const [selectedManufacturer, setSelectedManufacturer] = useState<string>('manu_0001'); // デフォルトでmanu_0001を選択
    const loadedManufacturersRef = useRef<Set<string>>(new Set()); // 読み込み済みメーカーを追跡
    
    const log = addDebugLog || (() => {}); // デバッグログ関数（提供されない場合は何もしない）

    // 商品在庫管理ではstock_manu_xxxxのみ取得
    const requiredTables = useMemo(() => [
        'manufacturers' // メーカー一覧のみ（stockテーブルは別途読み込む）
    ], []);

    const loadedStockTablesRef = useRef<Set<string>>(new Set());
    const loadedTablesRef = useRef<Set<string>>(new Set());
    const databaseRef = useRef(database);
    
    // databaseの最新値をrefに保持
    useEffect(() => {
        databaseRef.current = database;
    }, [database]);

    // メーカー一覧を取得
    const manufacturers = useMemo(() => {
        if (!database?.manufacturers?.data) return [];
        return database.manufacturers.data as Row[];
    }, [database?.manufacturers]);

    // メーカー一覧を読み込む（初回のみ）
    useEffect(() => {
        let isMounted = true;
        const loadManufacturers = async () => {
            const currentDb = databaseRef.current;
            if (!currentDb || currentDb.manufacturers?.data) return;
            
            try {
                const data = await fetchTables(['manufacturers'], { toolName: 'inventory-management' });
                if (isMounted) {
                    setDatabase(prev => ({ ...(prev || {}), ...data }));
                }
            } catch (err) {
                console.error('[useInventoryManagement] Failed to load manufacturers:', err);
            }
        };
        loadManufacturers();
        return () => {
            isMounted = false;
        };
    }, [setDatabase]); // databaseを依存配列から削除

    // メーカーが読み込まれたら、デフォルトでmanu_0001を選択（存在しない場合は最初のメーカーを選択）
    useEffect(() => {
        if (manufacturers.length === 0) return;

        const hasSelected = manufacturers.some(
            (m: Row) => String(m.id || '') === selectedManufacturer
        );

        if (!hasSelected) {
            const manu0001 = manufacturers.find((m: Row) => String(m.id || '') === 'manu_0001');
            const manufacturerId = manu0001 
                ? String(manu0001.id || '')
                : String(manufacturers[0].id || '');
            
            if (manufacturerId) {
                setSelectedManufacturer(manufacturerId);
            }
        }
    }, [manufacturers, selectedManufacturer]);

    // 選択されたメーカーのデータのみを読み込む（言語設定と同様の方式）
    useEffect(() => {
        let isMounted = true;
        const loadSelectedManufacturerData = async () => {
            if (!selectedManufacturer) {
                if (isMounted) {
                    setIsLoading(false);
                }
                return;
            }
            
            const stockTableName = getManufacturerTableName('stock', selectedManufacturer);
            const currentDb = databaseRef.current;
            
            // 既に読み込み済みのメーカーの場合は、データベースにテーブルが存在するか確認
            if (loadedManufacturersRef.current.has(selectedManufacturer)) {
                // データベースにテーブルが存在するか確認（最新のdatabaseを参照）
                const table = currentDb?.[stockTableName];
                if (table && table.data && Array.isArray(table.data) && table.data.length > 0) {
                    // データが存在する場合は読み込み済みと見なす
                    if (isMounted) {
                        setIsLoading(false);
                    }
                    return;
                }
                // データが存在しない場合は、読み込み済みフラグをリセットして再読み込み
                loadedManufacturersRef.current.delete(selectedManufacturer);
            }
            
            if (isMounted) {
                setIsLoading(true);
                setError(null);
            }
            loadedManufacturersRef.current.add(selectedManufacturer);
            
            try {
                // 選択されたメーカーのstockテーブルのみを読み込む
                // 新しい命名規則を使用: manu_XXXX_stock
                
                log('debug', 'data-loading', '在庫テーブル読み込み開始', { table: stockTableName, manufacturerId: selectedManufacturer });
                logDataAccess('inventory-management', [stockTableName]);
                const stockData = await fetchTables([stockTableName], { toolName: 'inventory-management' });
                log('info', 'data-loading', '在庫テーブル読み込み成功', {
                    table: stockTableName,
                    manufacturerId: selectedManufacturer,
                    loadedTables: Object.keys(stockData || {}),
                    dataCount: stockData?.[stockTableName]?.data?.length || 0
                });
                if (isMounted) {
                    setDatabase(prev => {
                        const newDb = { ...(prev || {}), ...stockData };
                        // console.log('[useInventoryManagement] setDatabase called:', {
                        //     stockTableName,
                        //     hasData: !!stockData?.[stockTableName],
                        //     dataCount: stockData?.[stockTableName]?.data?.length || 0,
                        //     newDbKeys: Object.keys(newDb).filter(k => k.includes('stock'))
                        // });
                        return newDb;
                    });
                    // データベース更新後にisLoadingをfalseに設定
                    setIsLoading(false);
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                const errorMessage = error.message || '在庫データの読み込みに失敗しました。';
                log('error', 'data-loading', '在庫テーブル読み込み失敗', {
                    manufacturer: selectedManufacturer,
                    error: errorMessage
                }, error);
                if (isMounted) {
                    setError(errorMessage);
                    setIsLoading(false);
                }
            }
        };
        
        loadSelectedManufacturerData();
        return () => {
            isMounted = false;
        };
    }, [selectedManufacturer, setDatabase, logDataAccess, log]); // databaseを依存配列から削除し、useRefで最新値を参照

    // 在庫データをstock_{manufacturer_id}テーブルから直接取得（選択されたメーカーのみ）
    const inventoryItems = useMemo((): InventoryItem[] => {
        if (!database || !selectedManufacturer) {
            // console.log('[useInventoryManagement] inventoryItems: no database or manufacturer', { 
            //     hasDatabase: !!database, 
            //     selectedManufacturer 
            // });
            return [];
        }

        // 選択されたメーカーの在庫テーブルからデータを取得
        const stockTable = getManufacturerTable(database, 'stock', selectedManufacturer);
        const tableName = getManufacturerTableName('stock', selectedManufacturer);
        const allStockItems = stockTable?.data || [];

        // データベースの状態を詳細にログ出力
        const allTableKeys = Object.keys(database);
        const stockTableKeys = allTableKeys.filter(k => k.includes('stock'));
        const manufacturerTableKeys = allTableKeys.filter(k => k.includes(selectedManufacturer));

        // console.log('[useInventoryManagement] inventoryItems - 詳細デバッグ:', {
        //     selectedManufacturer,
        //     tableName,
        //     hasTable: !!stockTable,
        //     dataLength: allStockItems.length,
        //     stockTableStructure: stockTable ? {
        //         hasData: 'data' in stockTable,
        //         isArray: Array.isArray(stockTable.data),
        //         dataLength: stockTable.data?.length || 0,
        //         schemaLength: stockTable.schema?.length || 0
        //     } : null,
        //     availableTables: stockTableKeys,
        //     manufacturerTables: manufacturerTableKeys,
        //     allTableKeysCount: allTableKeys.length,
        //     databaseKeys: allTableKeys.slice(0, 20) // 最初の20件のみ表示
        // });

        if (allStockItems.length === 0) {
            return [];
        }

        return allStockItems.map((stockItem: Row) => {
            // stockテーブルから直接必要な情報を取得
            const productCode = stockItem.product_code as string || '';
            const manufacturerId = stockItem.manufacturer_id as string || '';
            const colorName = stockItem.color_name as string || '';
            const sizeName = stockItem.size_name as string || '';
            const colorCode = stockItem.color_code as string || '';
            const sizeCode = stockItem.size_code as string || '';

            // 商品名はstockテーブルから取得（stock_product_nameまたはproduct_nameフィールド）
            const productName = (stockItem.stock_product_name as string) || 
                               (stockItem.product_name as string) || 
                               productCode;

            // 入荷予定情報（在庫テーブルに含まれる）
            // CSVファイルには incoming_quantity_1, incoming_date_1 などのフィールドがある
            const incomingQuantity1 = stockItem.incoming_quantity_1 as number || 0;
            const incomingQuantity2 = stockItem.incoming_quantity_2 as number || 0;
            const incomingQuantity3 = stockItem.incoming_quantity_3 as number || 0;
            const incomingQuantity = incomingQuantity1 + incomingQuantity2 + incomingQuantity3;
            
            const incomingDate1 = stockItem.incoming_date_1 as string | null;
            const incomingDate2 = stockItem.incoming_date_2 as string | null;
            const incomingDate3 = stockItem.incoming_date_3 as string | null;
            
            // 後方互換性のため、incoming_quantity と incoming_date もチェック
            const legacyIncomingQuantity = stockItem.incoming_quantity as number || 0;
            const legacyIncomingDate = stockItem.incoming_date as string | null;
            
            const incomingDates: string[] = [];
            let nextArrivalDate: string | undefined;

            // 入荷予定日を収集（未来の日付のみ）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const addIncomingDate = (dateStr: string | null) => {
                if (!dateStr) return;
                const arrivalDate = new Date(dateStr);
                arrivalDate.setHours(0, 0, 0, 0);
                if (arrivalDate >= today) {
                    incomingDates.push(dateStr);
                    if (!nextArrivalDate || arrivalDate < new Date(nextArrivalDate)) {
                        nextArrivalDate = dateStr;
                    }
                }
            };
            
            addIncomingDate(incomingDate1);
            addIncomingDate(incomingDate2);
            addIncomingDate(incomingDate3);
            addIncomingDate(legacyIncomingDate);
            
            // 入荷予定数の合計を計算（legacyフィールドも含める）
            const totalIncomingQuantity = incomingQuantity + legacyIncomingQuantity;

            // SKU IDを生成（manufacturer_id + product_code + color_code + size_code）
            const skuId = `${manufacturerId}_${productCode}_${colorCode}_${sizeCode}`;

            return {
                id: stockItem.id || skuId,
                sku_id: skuId,
                quantity: stockItem.quantity as number || 0,
                product_name: productName,
                product_code: productCode,
                color_name: colorName,
                color_code: colorCode,
                size_name: sizeName,
                size_code: sizeCode,
                brand_name: '', // ブランドはメーカーに統合されたため不要
                incoming_quantity: totalIncomingQuantity > 0 ? totalIncomingQuantity : undefined,
                incoming_dates: incomingDates.length > 0 ? incomingDates : undefined,
                next_arrival_date: nextArrivalDate,
                manufacturer_id: manufacturerId,
            } as InventoryItem;
        });
    }, [database, selectedManufacturer]);

    // 在庫が少ない商品をフィルタリング
    const lowStockItems = useMemo(() => {
        return inventoryItems.filter(item => item.quantity <= lowStockThreshold);
    }, [inventoryItems, lowStockThreshold]);

    // 在庫を更新（stock_{manufacturer_id}テーブルに対応）
    const updateStock = useCallback(async (
        skuId: string,
        quantityChange: number,
        reason: string,
        notes?: string
    ) => {
        if (!database) return;

        // SKU IDからmanufacturer_id、product_code、color_code、size_codeを抽出
        // フォーマット: {manufacturer_id}_{product_code}_{color_code}_{size_code}
        const skuParts = skuId.split('_');
        if (skuParts.length < 4) {
            throw new Error('無効なSKU ID形式です。');
        }

        // manufacturer_idを特定（最初の部分がIDの可能性があるが、実際のデータ構造に合わせて調整が必要）
        // まず、inventoryItemsから該当するアイテムを検索
        const inventoryItem = inventoryItems.find(item => item.sku_id === skuId);
        if (!inventoryItem || !inventoryItem.manufacturer_id) {
            throw new Error('在庫アイテムが見つかりません。');
        }

        const manufacturerId = inventoryItem.manufacturer_id;
        const stockTableName = getManufacturerTableName('stock', manufacturerId);
        const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
        
        if (!stockTable?.data) {
            throw new Error('在庫テーブルが見つかりません。');
        }

        // 在庫アイテムを検索（階層的検索: メーカーID + 品番 + カラーコード + サイズコード）
        const productCode = inventoryItem.product_code;
        const colorCode = inventoryItem.color_code;
        const sizeCode = inventoryItem.size_code;

        // 階層的検索: メーカーID + 品番 + カラーコード + サイズコード
        const stockItem = (stockTable.data as Row[]).find((si: Row) => {
            // 1. メーカーID + 品番で商品を特定
            if (si.manufacturer_id !== manufacturerId || si.product_code !== productCode) {
                return false;
            }
            
            // 2. メーカーID + 品番 + カラーコードでカラーを特定
            if (colorCode && si.color_code !== colorCode) {
                return false;
            }
            
            // 3. メーカーID + 品番 + カラーコード + サイズコードでサイズを特定
            if (sizeCode && si.size_code !== sizeCode) {
                return false;
            }
            
            return true;
        });

        if (!stockItem) {
            throw new Error('在庫アイテムが見つかりません。');
        }

        const currentQuantity = stockItem.quantity as number || 0;
        const newQuantity = currentQuantity + quantityChange;

        if (newQuantity < 0) {
            throw new Error('在庫数が負の値になることはできません。');
        }

        const quantityBefore = currentQuantity;
        const quantityAfter = newQuantity;

        // ローカル状態を更新
        setDatabase(prev => {
            if (!prev) return null;
            const newDb = JSON.parse(JSON.stringify(prev));
            const stockTable = newDb[stockTableName] as Table;
            if (!stockTable?.data) return newDb;

            const stockIndex = stockTable.data.findIndex((s: Row) => s.id === stockItem.id);
            
            if (stockIndex > -1) {
                stockTable.data[stockIndex] = { ...stockTable.data[stockIndex], quantity: newQuantity };
            }

            // 在庫履歴を記録（stock_historyテーブルが存在する場合）
            if (newDb.stock_history) {
                const historyTable = newDb.stock_history as Table;
                const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                historyTable.data.push({
                    id: historyId,
                    sku_id: skuId,
                    quantity_change: quantityChange,
                    quantity_before: quantityBefore,
                    quantity_after: quantityAfter,
                    reason: reason,
                    notes: notes || '',
                    created_at: new Date().toISOString(),
                });
            }

            return newDb;
        });

        // サーバーに保存
        try {
            const stockOperation = [{
                type: 'UPDATE' as const,
                data: { quantity: newQuantity },
                where: { id: stockItem.id }
            }];
            
            const stockResult = await updateDatabase(currentPage, stockTableName, stockOperation, database);
            if (!stockResult.success) {
                throw new Error(stockResult.error || '在庫の更新に失敗しました');
            }

            // 在庫履歴を記録（stock_historyテーブルが存在する場合）
            if (database.stock_history) {
                const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const historyOperation = [{
                    type: 'INSERT' as const,
                    data: {
                        id: historyId,
                        sku_id: skuId,
                        quantity_change: quantityChange,
                        quantity_before: quantityBefore,
                        quantity_after: quantityAfter,
                        reason: reason,
                        notes: notes || '',
                        created_at: new Date().toISOString(),
                    }
                }];
                await updateDatabase(currentPage, 'stock_history', historyOperation, database);
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            log('error', 'stock-update', '在庫更新失敗', {
                skuId,
                quantityChange,
                reason,
                error: err.message
            }, err);
            console.error('[useInventoryManagement] Failed to update stock:', error);
            alert('在庫の更新に失敗しました: ' + err.message);
            throw error;
        }
    }, [database, setDatabase, currentPage, inventoryItems]);

    // 在庫履歴を取得
    const stockHistory = useMemo((): StockHistoryItem[] => {
        if (!database?.stock_history) return [];
        const stockHistoryTable = database.stock_history as Table | undefined;
        if (!stockHistoryTable || !Array.isArray(stockHistoryTable.data)) return [];
        return stockHistoryTable.data as StockHistoryItem[];
    }, [database]);

    // 入荷予定を追加
    const addIncomingStock = useCallback(async (
        skuId: string,
        quantity: number,
        arrivalDate: string
    ) => {
        if (!database?.incoming_stock) return;

        const incomingId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // sku_idからmanufacturer_idを抽出
        // 形式1: {manufacturer_id}_{product_code}_{color_code}_{size_code}
        // 形式2: sku_00000001（旧形式の場合はinventoryItemsから取得）
        let manufacturerId: string | undefined;
        const skuParts = skuId.split('_');
        if (skuParts.length >= 4 && skuParts[0] !== 'sku') {
            // 新形式: 最初の部分がmanufacturer_id
            manufacturerId = skuParts[0];
        } else {
            // 旧形式: inventoryItemsから取得
            const inventoryItem = inventoryItems.find(item => item.sku_id === skuId);
            manufacturerId = inventoryItem?.manufacturer_id;
        }

        // ローカル状態を更新
        setDatabase(prev => {
            if (!prev) return null;
            const newDb = JSON.parse(JSON.stringify(prev));
            const incomingTable = newDb.incoming_stock as Table;
            incomingTable.data.push({
                id: incomingId,
                sku_id: skuId,
                manufacturer_id: manufacturerId,
                quantity: quantity,
                arrival_date: arrivalDate,
            });
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = [{
                type: 'INSERT' as const,
                data: {
                    id: incomingId,
                    sku_id: skuId,
                    manufacturer_id: manufacturerId,
                    quantity: quantity,
                    arrival_date: arrivalDate,
                }
            }];
            const result = await updateDatabase(currentPage, 'incoming_stock', operation, database);
            if (!result.success) {
                throw new Error(result.error || '入荷予定の追加に失敗しました');
            }
        } catch (error) {
            console.error('[useInventoryManagement] Failed to add incoming stock:', error);
            alert('入荷予定の追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    }, [database, setDatabase, currentPage, inventoryItems]);

    // 入荷予定を更新
    const updateIncomingStock = useCallback(async (
        incomingId: string,
        quantity: number,
        arrivalDate: string
    ) => {
        if (!database?.incoming_stock) return;

        // ローカル状態を更新
        setDatabase(prev => {
            if (!prev) return null;
            const newDb = JSON.parse(JSON.stringify(prev));
            const incomingTable = newDb.incoming_stock as Table;
            const index = incomingTable.data.findIndex((inc: Row) => inc.id === incomingId);
            if (index > -1) {
                incomingTable.data[index] = {
                    ...incomingTable.data[index],
                    quantity: quantity,
                    arrival_date: arrivalDate,
                };
            }
            return newDb;
        });

        // サーバーに保存
        try {
            const operation = [{
                type: 'UPDATE' as const,
                data: {
                    quantity: quantity,
                    arrival_date: arrivalDate,
                },
                where: { id: incomingId }
            }];
            const result = await updateDatabase(currentPage, 'incoming_stock', operation, database);
            if (!result.success) {
                throw new Error(result.error || '入荷予定の更新に失敗しました');
            }
        } catch (error) {
            console.error('[useInventoryManagement] Failed to update incoming stock:', error);
            alert('入荷予定の更新に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    }, [database, setDatabase, currentPage]);

    // 入荷予定を削除
    const deleteIncomingStock = useCallback(async (incomingId: string) => {
        if (!database?.incoming_stock) return;

        // ローカル状態を更新
        setDatabase(prev => {
            if (!prev) return null;
            const newDb = JSON.parse(JSON.stringify(prev));
            const incomingTable = newDb.incoming_stock as Table;
            incomingTable.data = incomingTable.data.filter((inc: Row) => inc.id !== incomingId);
            return newDb;
        });

        // サーバーから削除
        try {
            const operation = [{
                type: 'DELETE' as const,
                where: { id: incomingId }
            }];
            const result = await updateDatabase(currentPage, 'incoming_stock', operation, database);
            if (!result.success) {
                throw new Error(result.error || '入荷予定の削除に失敗しました');
            }
        } catch (error) {
            console.error('[useInventoryManagement] Failed to delete incoming stock:', error);
            alert('入荷予定の削除に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    }, [database, setDatabase, currentPage]);

    // 入荷予定を在庫に反映（入荷処理）
    const receiveIncomingStock = useCallback(async (incomingId: string) => {
        if (!database?.incoming_stock) return;

        const incomingStockTable = database.incoming_stock as Table | undefined;
        if (!incomingStockTable || !Array.isArray(incomingStockTable.data)) return;
        const incomingItem = incomingStockTable.data.find((inc: Row) => inc.id === incomingId);
        if (!incomingItem) {
            throw new Error('入荷予定が見つかりません');
        }

        const skuId = incomingItem.sku_id as string;
        const quantity = incomingItem.quantity as number;

        // 在庫を増加
        await updateStock(skuId, quantity, 'purchase', '入荷予定から入荷処理');

        // 入荷予定を削除
        await deleteIncomingStock(incomingId);
    }, [database, updateStock, deleteIncomingStock]);

    return {
        database,
        isLoading,
        error,
        inventoryItems,
        lowStockItems,
        lowStockThreshold,
        setLowStockThreshold,
        updateStock,
        stockHistory,
        addIncomingStock,
        updateIncomingStock,
        deleteIncomingStock,
        receiveIncomingStock,
        paginationConfig,
        selectedManufacturer,
        setSelectedManufacturer,
        manufacturers,
    };
};

