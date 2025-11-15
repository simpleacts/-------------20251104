/**
 * 商品の利用可能なサイズを解決するユーティリティ
 * 優先順位: stockテーブル → 全サイズ（フォールバック）
 */

import { Database, Row } from '../types';
import { getManufacturerTable } from '../../core/utils/manufacturerTableAccess';

export interface SizeInfo {
    id: string;
    sizeName: string;
    sizeCode?: string;
}

/**
 * カラー名からカラーIDを取得
 * 注意: colorsテーブルは削除済み（stockテーブルから取得）
 * この関数は後方互換性のため残していますが、使用しないことを推奨します
 */
export function getColorIdByName(
    database: Database,
    colorName: string,
    manufacturerId: string
): string | undefined {
    // colorsテーブルは削除済み（stockテーブルから取得）
    // 後方互換性のため、undefinedを返す
    return undefined;
}

/**
 * 商品の利用可能なサイズを取得
 * @param database データベース
 * @param productId 商品ID
 * @param manufacturerId メーカーID
 * @param colorName カラー名（オプション）
 * @param productCode 商品コード（オプション、在庫テーブルから取得する場合に使用）
 * @param colorCode カラーコード（オプション、在庫テーブルから取得する場合に使用）
 * @returns 利用可能なサイズのリスト
 */
export function getAvailableSizes(
    database: Database,
    productId: string,
    manufacturerId: string,
    colorName?: string,
    productCode?: string,
    colorCode?: string
): SizeInfo[] {
    // 在庫テーブルから直接取得する場合（階層的検索: メーカーID + 品番 + カラーコード + サイズコード）
    if (productCode && manufacturerId && database.manufacturers?.data) {
        const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
        
        if (stockTable?.data && Array.isArray(stockTable.data)) {
            // 階層的検索: メーカーID + 品番 + カラーコードでフィルタ
            let filteredItems = stockTable.data.filter((si: Row) => 
                si.manufacturer_id === manufacturerId &&
                si.product_code === productCode
            );
            
            // カラーコードが指定されている場合、さらにフィルタ
            if (colorCode) {
                filteredItems = filteredItems.filter((si: Row) => 
                    si.color_code === colorCode
                );
            }
            
            if (filteredItems.length > 0) {
                // サイズコードとサイズ名の一意なリストを取得（stockテーブルから直接取得）
                const sizeMap = new Map<string, { sizeCode: string; sizeName: string }>();
                filteredItems.forEach((si: Row) => {
                    const sizeCode = String(si.size_code || '');
                    const sizeName = String(si.size_name || '');
                    if (sizeCode && !sizeMap.has(sizeCode)) {
                        sizeMap.set(sizeCode, { sizeCode, sizeName });
                    }
                });
                
                return Array.from(sizeMap.values()).map((size, index) => ({
                    id: `size_${manufacturerId}_${size.sizeCode}`,
                    sizeName: size.sizeName,
                    sizeCode: size.sizeCode,
                }));
            }
        }
    }
    
    // フォールバック: sizesテーブルは削除済み（stockテーブルから取得）
    // データがない場合は空配列を返す
    
    return [];
}

/**
 * サイズIDのリストからサイズ情報を取得
 */
function getSizesByIds(
    database: Database,
    sizeIds: string[],
    manufacturerId: string
): SizeInfo[] {
    // sizesテーブルは削除済み（stockテーブルから取得）
    // 後方互換性のため、空配列を返す
    return [];
}

/**
 * サイズ名のリストからサイズ情報を取得（後方互換性のため）
 * @param database データベース
 * @param sizeNames サイズ名のリスト
 * @param manufacturerId メーカーID
 * @returns サイズ情報のリスト
 */
export function getSizesByNames(
    database: Database,
    sizeNames: string[],
    manufacturerId: string
): SizeInfo[] {
    // sizesテーブルは削除済み（stockテーブルから取得）
    // stockテーブルから取得する場合は、getAvailableSizesを使用してください
    // 後方互換性のため、空配列を返す
    return [];
}

