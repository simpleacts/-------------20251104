import { Database, Row, Table } from '../../shared/types';
import { getManufacturerTableName, isManufacturerDependentTable, parseManufacturerTableName } from '../config/tableNames';
import { filterDeletedItems, getAllDeletedItems } from './deletedItemsTracker';

/**
 * メーカー依存テーブルにアクセスするためのヘルパー関数
 * データベースの更新・マージ機能も提供
 */

/**
 * メーカー依存テーブルを取得
 * @param database データベースオブジェクト
 * @param tableName ベーステーブル名（例: 'products_master'）
 * @param manufacturerId メーカーID
 * @returns テーブルデータ（存在しない場合はundefined）
 * @throws {Error} パラメータが無効な場合
 */
export function getManufacturerTable(
    database: Partial<Database> | null | undefined,
    tableName: string,
    manufacturerId: string
): Table | undefined {
    // パラメータ検証
    if (!database) {
        if (DEBUG_MODE) {
            console.warn('[getManufacturerTable] database is null or undefined');
        }
        return undefined;
    }
    
    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
        if (DEBUG_MODE) {
            console.warn('[getManufacturerTable] invalid tableName:', tableName);
        }
        return undefined;
    }
    
    if (!manufacturerId || typeof manufacturerId !== 'string' || manufacturerId.trim() === '') {
        if (DEBUG_MODE) {
            console.warn('[getManufacturerTable] invalid manufacturerId:', manufacturerId);
        }
        return undefined;
    }
    
    // 無効なmanufacturerIdの値をチェック
    if (manufacturerId === 'undefined' || manufacturerId === 'null') {
        if (DEBUG_MODE) {
            console.warn('[getManufacturerTable] manufacturerId has invalid value:', manufacturerId);
        }
        return undefined;
    }
    
    try {
        const manufacturerTableName = getManufacturerTableName(tableName, manufacturerId);
        const table = database[manufacturerTableName];
        
        // デバッグログを追加
        if (DEBUG_MODE || tableName === 'stock') {
            console.log('[getManufacturerTable] Debug:', {
                tableName,
                manufacturerId,
                manufacturerTableName,
                hasTable: !!table,
                tableKeys: Object.keys(database).filter(k => k.includes('stock') || k.includes(tableName)),
                tableStructure: table ? {
                    hasData: 'data' in table,
                    isArray: Array.isArray(table.data),
                    dataLength: table.data?.length || 0
                } : null
            });
        }
        
        // テーブルが存在するが、データ構造が不正な場合
        if (table && (!('data' in table) || !Array.isArray(table.data))) {
            if (DEBUG_MODE) {
                console.warn(`[getManufacturerTable] Table '${manufacturerTableName}' has invalid structure`, {
                    hasData: 'data' in table,
                    isArray: Array.isArray(table.data),
                    table: table
                });
            }
            return undefined;
        }
        
        return table;
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[getManufacturerTable] Error getting manufacturer table:', error);
        }
        return undefined;
    }
}

/**
 * メーカー依存テーブルのデータを取得
 * @param database データベースオブジェクト
 * @param tableName ベーステーブル名
 * @param manufacturerId メーカーID
 * @returns データ配列（存在しない場合は空配列）
 */
export function getManufacturerTableData(
    database: Partial<Database> | null | undefined,
    tableName: string,
    manufacturerId: string
): Row[] {
    try {
        const table = getManufacturerTable(database, tableName, manufacturerId);
        
        // テーブルが存在しない場合
        if (!table) {
            return [];
        }
        
        // データが存在しない、または配列でない場合
        if (!table.data || !Array.isArray(table.data)) {
            if (DEBUG_MODE) {
                console.warn(`[getManufacturerTableData] Table '${getManufacturerTableName(tableName, manufacturerId)}' has no valid data`);
            }
            return [];
        }
        
        return table.data;
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[getManufacturerTableData] Error getting manufacturer table data:', error);
        }
        return [];
    }
}

/**
 * デバッグモードの判定（開発環境のみログを出力）
 */
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * すべてのメーカーのテーブルデータを取得
 * 
 * データ取得の優先順位:
 * 1. 統合データ（ベーステーブル名で直接存在するデータ）- APIが統合済みデータを返す場合
 * 2. manufacturersテーブルからメーカーIDを取得して集計 - 推奨方法
 * 3. データベースオブジェクトから直接検索（フォールバック）- manufacturersテーブルが読み込まれていない場合
 * 
 * @param database データベースオブジェクト
 * @param tableName ベーステーブル名
 * @returns すべてのメーカーのデータを統合した配列
 */
export function getAllManufacturerTableData(
    database: Partial<Database> | null | undefined,
    tableName: string
): Row[] {
    // パラメータ検証
    if (!database) {
        if (DEBUG_MODE) {
            console.warn('[getAllManufacturerTableData] database is null or undefined');
        }
        return [];
    }
    
    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
        if (DEBUG_MODE) {
            console.warn('[getAllManufacturerTableData] invalid tableName:', tableName);
        }
        return [];
    }
    
    try {
        // 優先1: 統合データ（ベーステーブル名で直接存在するデータ）
        // APIがベーステーブル名（例: 'brands'）で統合されたデータを返す場合
        const baseTable = database[tableName];
        if (baseTable && 'data' in baseTable && Array.isArray(baseTable.data) && baseTable.data.length > 0) {
            if (DEBUG_MODE) {
                console.log(`[getAllManufacturerTableData] Found unified data for '${tableName}' (${baseTable.data.length} rows)`);
            }
            return baseTable.data;
        }
        
        // 優先2: manufacturersテーブルからメーカーIDを取得して集計
        const manufacturers = database.manufacturers?.data || [];
        if (manufacturers.length > 0) {
            const allData: Row[] = [];
            
            for (const manufacturer of manufacturers) {
                // manufacturerオブジェクトの検証
                if (!manufacturer || typeof manufacturer !== 'object') {
                    if (DEBUG_MODE) {
                        console.warn('[getAllManufacturerTableData] Invalid manufacturer object:', manufacturer);
                    }
                    continue;
                }
                
                const manufacturerId = manufacturer.id as string;
                // 無効なmanufacturerIdをスキップ
                if (!manufacturerId || 
                    typeof manufacturerId !== 'string' || 
                    manufacturerId.trim() === '' ||
                    manufacturerId === 'undefined' || 
                    manufacturerId === 'null') {
                    continue;
                }
                
                try {
                    const data = getManufacturerTableData(database, tableName, manufacturerId);
                    if (data.length > 0) {
                        allData.push(...data);
                    }
                } catch (error) {
                    if (DEBUG_MODE) {
                        console.warn(`[getAllManufacturerTableData] Error getting data for manufacturer '${manufacturerId}':`, error);
                    }
                    // エラーが発生しても他のメーカーのデータ取得を続行
                    continue;
                }
            }
            
            if (allData.length > 0) {
                if (DEBUG_MODE) {
                    console.log(`[getAllManufacturerTableData] Found ${allData.length} rows from ${manufacturers.length} manufacturers for '${tableName}'`);
                }
                return allData;
            }
        }
        
        // 優先3: データベースオブジェクトから直接メーカー別テーブルを検索（フォールバック）
        // manufacturersテーブルが読み込まれていない場合でも、メーカー別テーブルが直接存在する場合は取得
        const allData: Row[] = [];
        
        try {
            // ファイル名の変換を考慮してサフィックスを取得
            // getManufacturerTableNameを使用してファイル名変換ロジックを統一
            const testManufacturerId = 'manu_0001'; // ダミーIDでファイル名を取得
            const testTableName = getManufacturerTableName(tableName, testManufacturerId);
            const suffix = testTableName.substring(testManufacturerId.length); // '_stock' などのサフィックスを取得
            const prefix = 'manu_';
            
            for (const [key, table] of Object.entries(database)) {
                // 新しい命名規則: manu_XXXX_tableName 形式を検索
                // または 後方互換性: tableName_manu_XXXX 形式も検索
                const isManufacturerTable = 
                    (key.startsWith(prefix) && key.endsWith(suffix)) || // manu_XXXX_tableName形式
                    key.startsWith(`${tableName}_`); // tableName_manu_XXXX形式（後方互換性）
                
                if (isManufacturerTable && table && 'data' in table && Array.isArray(table.data)) {
                    const data = table.data || [];
                    if (data.length > 0) {
                        allData.push(...data);
                    }
                }
            }
        } catch (error) {
            if (DEBUG_MODE) {
                console.warn('[getAllManufacturerTableData] Error in fallback search:', error);
            }
        }
        
        if (allData.length > 0) {
            if (DEBUG_MODE) {
                console.log(`[getAllManufacturerTableData] Found ${allData.length} rows via fallback search for '${tableName}'`);
            }
            return allData;
        }
        
        // すべての方法でデータが見つからなかった場合、空配列を返す
        return [];
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[getAllManufacturerTableData] Unexpected error:', error);
        }
        return [];
    }
}

/**
 * 特定のメーカーのテーブルにデータを検索
 * @param database データベースオブジェクト
 * @param tableName ベーステーブル名
 * @param manufacturerId メーカーID
 * @param predicate 検索条件関数
 * @returns マッチした最初の行（存在しない場合はundefined）
 */
export function findInManufacturerTable(
    database: Partial<Database> | null | undefined,
    tableName: string,
    manufacturerId: string,
    predicate: (row: Row) => boolean
): Row | undefined {
    // パラメータ検証
    if (typeof predicate !== 'function') {
        if (DEBUG_MODE) {
            console.warn('[findInManufacturerTable] predicate must be a function');
        }
        return undefined;
    }
    
    try {
        const data = getManufacturerTableData(database, tableName, manufacturerId);
        return data.find(predicate);
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[findInManufacturerTable] Error finding data:', error);
        }
        return undefined;
    }
}

/**
 * すべてのメーカーのテーブルからデータを検索
 * @param database データベースオブジェクト
 * @param tableName ベーステーブル名
 * @param predicate 検索条件関数
 * @returns マッチした最初の行（存在しない場合はundefined）
 */
export function findInAllManufacturerTables(
    database: Partial<Database> | null | undefined,
    tableName: string,
    predicate: (row: Row) => boolean
): Row | undefined {
    if (!database) {
        return undefined;
    }
    
    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
        if (DEBUG_MODE) {
            console.warn('[findInAllManufacturerTables] invalid tableName:', tableName);
        }
        return undefined;
    }
    
    if (typeof predicate !== 'function') {
        if (DEBUG_MODE) {
            console.warn('[findInAllManufacturerTables] predicate must be a function');
        }
        return undefined;
    }
    
    try {
        const manufacturers = database.manufacturers?.data || [];
        
        for (const manufacturer of manufacturers) {
            // manufacturerオブジェクトの検証
            if (!manufacturer || typeof manufacturer !== 'object') {
                continue;
            }
            
            const manufacturerId = manufacturer.id as string;
            // 無効なmanufacturerIdをスキップ
            if (!manufacturerId || 
                typeof manufacturerId !== 'string' || 
                manufacturerId.trim() === '' ||
                manufacturerId === 'undefined' || 
                manufacturerId === 'null') {
                continue;
            }
            
            try {
                const found = findInManufacturerTable(database, tableName, manufacturerId, predicate);
                if (found) return found;
            } catch (error) {
                if (DEBUG_MODE) {
                    console.warn(`[findInAllManufacturerTables] Error searching in manufacturer '${manufacturerId}':`, error);
                }
                // エラーが発生しても他のメーカーの検索を続行
                continue;
            }
        }
        
        return undefined;
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[findInAllManufacturerTables] Unexpected error:', error);
        }
        return undefined;
    }
}

/**
 * テーブル名がメーカー依存テーブルかどうかを確認し、適切なテーブルを取得
 * @param database データベースオブジェクト
 * @param tableName テーブル名（メーカー付き名またはベース名）
 * @param manufacturerId メーカーID（オプション、ベーステーブル名の場合に使用）
 * @returns テーブルデータ
 */
export function getTable(
    database: Partial<Database> | null | undefined,
    tableName: string,
    manufacturerId?: string
): Table | undefined {
    // パラメータ検証
    if (!database) {
        return undefined;
    }
    
    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
        if (DEBUG_MODE) {
            console.warn('[getTable] invalid tableName:', tableName);
        }
        return undefined;
    }
    
    try {
        // 既にメーカー付きテーブル名の場合は直接返す
        const parsed = parseManufacturerTableName(tableName);
        if (parsed.manufacturerId) {
            const table = database[tableName];
            // テーブルが存在するが、データ構造が不正な場合
            if (table && (!('data' in table) || !Array.isArray(table.data))) {
                if (DEBUG_MODE) {
                    console.warn(`[getTable] Table '${tableName}' has invalid structure`);
                }
                return undefined;
            }
            return table;
        }
        
        // メーカー依存テーブルで、manufacturerIdが指定されている場合
        if (isManufacturerDependentTable(tableName) && manufacturerId) {
            return getManufacturerTable(database, tableName, manufacturerId);
        }
        
        // メーカー非依存テーブルは直接アクセス
        const table = database[tableName];
        // テーブルが存在するが、データ構造が不正な場合
        if (table && (!('data' in table) || !Array.isArray(table.data))) {
            if (DEBUG_MODE) {
                console.warn(`[getTable] Table '${tableName}' has invalid structure`);
            }
            return undefined;
        }
        return table;
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[getTable] Error getting table:', error);
        }
        return undefined;
    }
}

/**
 * テーブルのプライマリキーを取得する
 * @param table テーブルオブジェクト
 * @returns プライマリキーのフィールド名（デフォルト: 'id'）
 */
function getPrimaryKey(table: Table): string {
    try {
        // スキーマの最初のフィールドをプライマリキーとして使用
        if (table && table.schema && Array.isArray(table.schema) && table.schema.length > 0) {
            const firstField = table.schema[0];
            if (firstField && firstField.name && typeof firstField.name === 'string') {
                return firstField.name;
            }
        }
    } catch (error) {
        if (DEBUG_MODE) {
            console.warn('[getPrimaryKey] Error getting primary key:', error);
        }
    }
    // デフォルトは 'id'
    return 'id';
}

/**
 * 新しいデータベースデータを既存のデータベースとマージし、削除されたアイテムを除外する
 * 
 * マージルール:
 * - メーカー依存テーブル: メーカー別テーブルは個別に保持（結合しない）
 * - 通常テーブル: IDでマージ（重複は更新、新規は追加）
 * 
 * @param prevDatabase 既存のデータベース
 * @param newData 新しいデータ
 * @returns マージされたデータベース
 */
export function updateDatabaseWithNewData(
    prevDatabase: Partial<Database> | null,
    newData: Partial<Database>
): Partial<Database> {
    // パラメータ検証
    if (!newData || typeof newData !== 'object') {
        if (DEBUG_MODE) {
            console.warn('[updateDatabaseWithNewData] newData is invalid');
        }
        return prevDatabase || {};
    }
    
    try {
        if (!prevDatabase) {
            // 既存のデータがない場合は、削除されたIDを除外して返す
            const filtered: Partial<Database> = {};
            const allDeletedItems = getAllDeletedItems();
            
            Object.keys(newData).forEach(tableName => {
                try {
                    const table = newData[tableName];
                    const isManufacturerSpecific = tableName.includes('manu_');
                    
                    // メーカー別テーブルは個別に保持
                    if (isManufacturerSpecific) {
                        if (table && 'data' in table) {
                            filtered[tableName] = table;
                        }
                        return;
                    }
                    
                    if (!table || !table.data) {
                        filtered[tableName] = table;
                        return;
                    }
                    
                    // データ構造の検証
                    if (!Array.isArray(table.data)) {
                        if (DEBUG_MODE) {
                            console.warn(`[updateDatabaseWithNewData] Table '${tableName}' has invalid data structure`);
                        }
                        filtered[tableName] = table;
                        return;
                    }
                    
                    // 削除されたIDを除外
                    const deletedIds = allDeletedItems.get(tableName);
                    if (deletedIds && deletedIds.size > 0) {
                        const pk = getPrimaryKey(table);
                        const filteredData = filterDeletedItems(tableName, table.data, pk);
                        filtered[tableName] = {
                            ...table,
                            data: filteredData
                        };
                    } else {
                        filtered[tableName] = table;
                    }
                } catch (error) {
                    if (DEBUG_MODE) {
                        console.warn(`[updateDatabaseWithNewData] Error processing table '${tableName}':`, error);
                    }
                    // エラーが発生しても他のテーブルの処理を続行
                }
            });
            
            return filtered;
        }

        // 既存のデータとマージ
        const merged: Partial<Database> = { ...prevDatabase };
        const allDeletedItems = getAllDeletedItems();
        
        // すべてのテーブルを処理
        Object.keys(newData).forEach(tableName => {
            try {
                const newTable = newData[tableName];
                if (!newTable) return;
                
                const isManufacturerSpecific = tableName.includes('manu_');
                
                // メーカー別テーブルは個別に保持（結合しない）
                if (isManufacturerSpecific) {
                    if ('data' in newTable) {
                        merged[tableName] = newTable;
                    }
                    return;
                }
                
                // 通常テーブルのマージ処理
                if (!newTable.data) {
                    // データがない場合はスキップ
                    return;
                }
                
                // データ構造の検証
                if (!Array.isArray(newTable.data)) {
                    if (DEBUG_MODE) {
                        console.warn(`[updateDatabaseWithNewData] Table '${tableName}' has invalid data structure`);
                    }
                    return;
                }
                
                const existingTable = merged[tableName];
                const deletedIds = allDeletedItems.get(tableName);
                
                // 削除されたIDを除外
                let filteredNewData = newTable.data;
                if (deletedIds && deletedIds.size > 0) {
                    const pk = getPrimaryKey(newTable);
                    filteredNewData = filterDeletedItems(tableName, newTable.data, pk);
                }
                
                if (!existingTable || !existingTable.data) {
                    // 既存のテーブルがない場合は、フィルタリングされた新しいデータを使用
                    merged[tableName] = {
                        ...newTable,
                        data: filteredNewData
                    };
                } else {
                    // 既存のテーブルがある場合は、IDでマージ
                    if (!Array.isArray(existingTable.data)) {
                        if (DEBUG_MODE) {
                            console.warn(`[updateDatabaseWithNewData] Existing table '${tableName}' has invalid data structure`);
                        }
                        merged[tableName] = {
                            ...newTable,
                            data: filteredNewData
                        };
                        return;
                    }
                    
                    const pk = getPrimaryKey(existingTable);
                    const existingDataMap = new Map(
                        existingTable.data.map((r: Row) => [String(r[pk]), r])
                    );
                    
                    // 新しいデータを追加または更新
                    filteredNewData.forEach((r: Row) => {
                        existingDataMap.set(String(r[pk]), r);
                    });
                    
                    merged[tableName] = {
                        ...existingTable,
                        data: Array.from(existingDataMap.values())
                    };
                }
            } catch (error) {
                if (DEBUG_MODE) {
                    console.warn(`[updateDatabaseWithNewData] Error processing table '${tableName}':`, error);
                }
                // エラーが発生しても他のテーブルの処理を続行
            }
        });
        
        return merged;
    } catch (error) {
        if (DEBUG_MODE) {
            console.error('[updateDatabaseWithNewData] Unexpected error:', error);
        }
        // エラーが発生した場合は、既存のデータベースを返す（または空のオブジェクト）
        return prevDatabase || {};
    }
}

