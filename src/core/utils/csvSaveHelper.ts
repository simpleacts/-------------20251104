/**
 * CSV保存用の共通ヘルパ関数
 * csv-writableモードでテーブルデータをCSVファイルに保存する
 */

import { Table, Row } from '@shared/types';
import { getStoredAppMode, isCsvWritableMode } from './appMode';
import { parseManufacturerTableName, isManufacturerDependentTable } from '../config/tableNames';
import { getCsvPath } from './csvPathResolver';

/**
 * テーブルデータをCSVファイルに保存する共通ヘルパ関数
 * csv-writableモードでのみ動作し、それ以外のモードでは何もしない
 * 
 * @param tableName テーブル名
 * @param tableData テーブルデータ（dataとschemaを含む）
 * @param manufacturerId メーカーID（メーカー依存テーブルの場合）
 * @returns 保存に成功した場合はtrue、それ以外はfalse
 */
export async function saveTableToCsv(
    tableName: string,
    tableData: Table | { data: Row[]; schema: any[] },
    manufacturerId?: string
): Promise<boolean> {
    const appMode = getStoredAppMode();
    
    // csv-writableモードでない場合はスキップ
    if (!isCsvWritableMode(appMode)) {
        console.warn(`[csvSaveHelper] saveTableToCsv called but appMode is not csv-writable (current: ${appMode})`);
        return false;
    }

    // sizes, colorsテーブルはstockテーブルから取得されるため、直接保存をスキップ
    if (tableName === 'sizes' || tableName === 'colors' || 
        tableName.startsWith('sizes_') || tableName.startsWith('colors_')) {
        console.warn(`[csvSaveHelper] Table '${tableName}' is derived from stock table and cannot be saved directly`);
        return false;
    }

    // products_master, product_tagsは削除済み（stockテーブルから取得）
    if (tableName === 'products_master' || tableName === 'product_tags' ||
        tableName.startsWith('products_master_') || tableName.startsWith('product_tags_')) {
        console.warn(`[csvSaveHelper] Table '${tableName}' is deprecated and cannot be saved directly`);
        return false;
    }

    // メーカー依存テーブルのチェック
    const { baseTableName, manufacturerId: parsedManufacturerId } = parseManufacturerTableName(tableName);
    if (isManufacturerDependentTable(baseTableName) && !manufacturerId && !parsedManufacturerId) {
        console.warn(`[csvSaveHelper] Manufacturer ID is required for manufacturer-dependent table: ${tableName}`);
        return false;
    }

    try {
        // manufacturerIdから`manu_`プレフィックスを削除（重複を防ぐ）
        let cleanManufacturerId = manufacturerId || parsedManufacturerId || undefined;
        if (cleanManufacturerId && cleanManufacturerId.startsWith('manu_')) {
            cleanManufacturerId = cleanManufacturerId.substring(5);
        }

        const csvPaths = getCsvPath(tableName, cleanManufacturerId);
        if (!csvPaths || csvPaths.length === 0) {
            console.warn(`[csvSaveHelper] No CSV path found for table: ${tableName}`);
            return false;
        }

        // データとスキーマを取得
        const data = 'data' in tableData ? tableData.data : tableData.data || [];
        const schema = 'schema' in tableData ? tableData.schema : tableData.schema || [];

        // APIに送信
        const response = await fetch('/api/save-csv.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: tableName,
                data: data,
                schema: schema,
                manufacturerId: cleanManufacturerId
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error(`[csvSaveHelper] Failed to save CSV for ${tableName}:`, error);
            return false;
        }

        const result = await response.json();
        if (result.success) {
            console.log(`[csvSaveHelper] Saved CSV for ${tableName} to ${result.path}`);
            return true;
        } else {
            console.error(`[csvSaveHelper] Save failed for ${tableName}:`, result.message);
            return false;
        }
    } catch (error) {
        console.error(`[csvSaveHelper] Error saving CSV for ${tableName}:`, error);
        return false;
    }
}

/**
 * 複数のテーブルを一度に保存する
 * @param tables テーブル名とデータのマップ
 * @returns 保存に成功したテーブルの数
 */
export async function saveMultipleTablesToCsv(
    tables: Map<string, { data: Row[]; schema: any[]; manufacturerId?: string }>
): Promise<number> {
    const appMode = getStoredAppMode();
    
    if (!isCsvWritableMode(appMode)) {
        return 0;
    }

    let successCount = 0;
    const promises: Promise<boolean>[] = [];

    for (const [tableName, tableData] of tables.entries()) {
        promises.push(
            saveTableToCsv(tableName, tableData, tableData.manufacturerId)
                .then(success => {
                    if (success) successCount++;
                    return success;
                })
        );
    }

    await Promise.all(promises);
    return successCount;
}

