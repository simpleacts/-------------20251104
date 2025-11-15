/**
 * ブランドをbrandsテーブルから取得するユーティリティ関数
 * 新しい命名規則: manu_XXXX_brands テーブルを使用
 */

import { Database, Row } from '../../shared/types';
import { getManufacturerTable } from './manufacturerTableAccess';

/**
 * 商品のブランドIDを取得（stockテーブルのbrand_idから）
 * 注意: products_masterは削除（stockテーブルに統合）
 * @param database データベースオブジェクト
 * @param productId 商品ID（prod_{manufacturerId}_{productCode}形式）
 * @param manufacturerId メーカーID
 * @returns ブランドID（存在しない場合は空文字列）
 */
export function getBrandIdForProduct(
    database: Database | null | undefined,
    productId: string,
    manufacturerId: string
): string {
    if (!database) return '';
    
    // productIdからproduct_codeを抽出
    const productCode = productId.includes('_') ? productId.split('_').slice(2).join('_') : productId;
    
    const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
    if (!stockTable?.data || !Array.isArray(stockTable.data)) return '';
    
    // stockテーブルから最初のアイテムを取得（同じproduct_codeのアイテムは同じbrand_idを持つ）
    const stockItem = stockTable.data.find(
        (item: Row) => String(item.product_code || '') === productCode
    );
    
    return stockItem ? String(stockItem.brand_id || '') : '';
}

/**
 * 商品のブランド名を取得
 * @param database データベースオブジェクト
 * @param productId 商品ID
 * @param manufacturerId メーカーID
 * @returns ブランド名（存在しない場合は空文字列）
 */
export function getBrandNameForProduct(
    database: Database | null | undefined,
    productId: string,
    manufacturerId: string
): string {
    const brandId = getBrandIdForProduct(database, productId, manufacturerId);
    if (!brandId) return '';
    
    // brandsは共通テーブル（templates/common/brands.csv）から取得
    const brandsTable = database.brands;
    if (!brandsTable?.data || !Array.isArray(brandsTable.data)) return '';
    
    const brand = brandsTable.data.find(
        (b: Row) => String(b.id) === String(brandId)
    );
    
    return brand ? String(brand.name || '') : '';
}

/**
 * ブランドIDからブランド名を取得
 * @param database データベースオブジェクト
 * @param brandId ブランドID
 * @param manufacturerId メーカーID（使用されないが、後方互換性のため残す）
 * @returns ブランド名（存在しない場合は空文字列）
 */
export function getBrandNameById(
    database: Database | null | undefined,
    brandId: string,
    manufacturerId?: string
): string {
    if (!database || !brandId) return '';
    
    // brandsは共通テーブル（templates/common/brands.csv）から取得
    const brandsTable = database.brands;
    if (!brandsTable?.data || !Array.isArray(brandsTable.data)) return '';
    
    const brand = brandsTable.data.find(
        (b: Row) => String(b.id) === String(brandId)
    );
    
    return brand ? String(brand.name || '') : '';
}


