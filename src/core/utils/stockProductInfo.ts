/**
 * stockテーブルから商品情報（カラー・サイズ・価格）を取得するユーティリティ関数
 * product_prices, product_colors, product_sizes, skusテーブルを削除し、stockから直接取得する
 */

import { Database, Row } from '../../shared/types';
import { getManufacturerTable } from './manufacturerTableAccess';

export interface ColorInfo {
    code: string;
    name: string;
}

export interface SizeInfo {
    code: string;
    name: string;
}

export interface PriceInfo {
    colorCode: string;
    colorName: string;
    sizeCode: string;
    sizeName: string;
    listPrice: number;
    costPrice: number;
}

export interface StockQuantityInfo {
    colorCode: string;
    colorName: string;
    sizeCode: string;
    sizeName: string;
    quantity: number;
}

export interface ProductInfoFromStock {
    colors: ColorInfo[];
    sizesByColor: Map<string, SizeInfo[]>;
    prices: PriceInfo[];
    stockQuantities: StockQuantityInfo[]; // 在庫数情報
    isDiscontinued: boolean;
}

/**
 * stockテーブルから商品のカラー・サイズ・価格情報を取得
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID
 * @param productCode 商品コード（品番）
 * @returns 商品情報
 */
export function getProductInfoFromStock(
    database: Database | null | undefined,
    manufacturerId: string,
    productCode: string
): ProductInfoFromStock {
    if (!database) {
        return {
            colors: [],
            sizesByColor: new Map(),
            prices: [],
            stockQuantities: [],
            isDiscontinued: true
        };
    }
    
    const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
    if (!stockTable?.data || !Array.isArray(stockTable.data)) {
        // stockテーブルが存在しない、またはデータがない場合
        // 廃盤商品の可能性がある
        return {
            colors: [],
            sizesByColor: new Map(),
            prices: [],
            stockQuantities: [],
            isDiscontinued: true
        };
    }
    
    const stockItems = stockTable.data.filter(
        (item: Row) => String(item.product_code || '') === String(productCode)
    );
    
    // stockにデータがない場合、廃盤商品の可能性
    if (stockItems.length === 0) {
        return {
            colors: [],
            sizesByColor: new Map(),
            prices: [],
            stockQuantities: [],
            isDiscontinued: true
        };
    }
    
    // カラーのユニークリスト
    const colorMap = new Map<string, ColorInfo>();
    stockItems.forEach((item: Row) => {
        const colorCode = String(item.color_code || '');
        const colorName = String(item.color_name || '');
        if (colorCode && !colorMap.has(colorCode)) {
            colorMap.set(colorCode, {
                code: colorCode,
                name: colorName
            });
        }
    });
    const colors = Array.from(colorMap.values());
    
    // サイズのユニークリスト（カラー別）
    const sizesByColor = new Map<string, SizeInfo[]>();
    
    // 価格情報（カラー×サイズ別）
    const prices: PriceInfo[] = [];
    // 在庫数情報（カラー×サイズ別）
    const stockQuantities: StockQuantityInfo[] = [];
    
    stockItems.forEach((item: Row) => {
        const colorCode = String(item.color_code || '');
        const colorName = String(item.color_name || '');
        const sizeCode = String(item.size_code || '');
        const sizeName = String(item.size_name || '');
        
        // サイズ情報をカラー別に追加
        if (colorCode && sizeCode) {
            if (!sizesByColor.has(colorCode)) {
                sizesByColor.set(colorCode, []);
            }
            const sizes = sizesByColor.get(colorCode)!;
            if (!sizes.find(s => s.code === sizeCode)) {
                sizes.push({
                    code: sizeCode,
                    name: sizeName
                });
            }
        }
        
        // 価格情報を追加（在庫数0でも価格情報は存在する）
        const listPrice = item.list_price as number | null | undefined;
        const costPrice = item.cost_price as number | null | undefined;
        if (listPrice !== null && listPrice !== undefined && 
            costPrice !== null && costPrice !== undefined) {
            prices.push({
                colorCode,
                colorName,
                sizeCode,
                sizeName,
                listPrice,
                costPrice
            });
        }
        
        // 在庫数情報を追加
        const quantity = item.quantity as number | null | undefined;
        if (quantity !== null && quantity !== undefined) {
            stockQuantities.push({
                colorCode,
                colorName,
                sizeCode,
                sizeName,
                quantity: quantity
            });
        }
    });
    
    return {
        colors,
        sizesByColor,
        prices,
        stockQuantities,
        isDiscontinued: false
    };
}

/**
 * stockテーブルから商品のカラーリストを取得
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID
 * @param productCode 商品コード（品番）
 * @returns カラーリスト
 */
export function getColorsFromStock(
    database: Database | null | undefined,
    manufacturerId: string,
    productCode: string
): ColorInfo[] {
    const info = getProductInfoFromStock(database, manufacturerId, productCode);
    return info.colors;
}

/**
 * stockテーブルから商品のサイズリストを取得（カラー別）
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID
 * @param productCode 商品コード（品番）
 * @param colorCode カラーコード（オプション、指定しない場合は全カラーのサイズを返す）
 * @returns サイズリスト
 */
export function getSizesFromStock(
    database: Database | null | undefined,
    manufacturerId: string,
    productCode: string,
    colorCode?: string
): SizeInfo[] {
    const info = getProductInfoFromStock(database, manufacturerId, productCode);
    
    if (colorCode) {
        return info.sizesByColor.get(colorCode) || [];
    }
    
    // 全カラーのサイズを統合（重複除去）
    const allSizes = new Map<string, SizeInfo>();
    info.sizesByColor.forEach((sizes) => {
        sizes.forEach((size) => {
            if (!allSizes.has(size.code)) {
                allSizes.set(size.code, size);
            }
        });
    });
    
    return Array.from(allSizes.values());
}

/**
 * stockテーブルから商品の価格情報を取得
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID
 * @param productCode 商品コード（品番）
 * @param colorCode カラーコード（オプション）
 * @param sizeCode サイズコード（オプション）
 * @returns 価格情報
 */
export function getPricesFromStock(
    database: Database | null | undefined,
    manufacturerId: string,
    productCode: string,
    colorCode?: string,
    sizeCode?: string
): PriceInfo[] {
    const info = getProductInfoFromStock(database, manufacturerId, productCode);
    
    if (!colorCode && !sizeCode) {
        return info.prices;
    }
    
    return info.prices.filter((price) => {
        if (colorCode && price.colorCode !== colorCode) return false;
        if (sizeCode && price.sizeCode !== sizeCode) return false;
        return true;
    });
}

/**
 * stockテーブルからproduct_codeでグループ化して商品マスター形式のデータを取得
 * products_masterテーブルの代替として使用
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID（オプション、指定しない場合は全メーカー）
 * @returns 商品マスター形式のRow配列
 */
export function getProductsMasterFromStock(
    database: Database | null | undefined,
    manufacturerId?: string
): Row[] {
    if (!database) return [];
    
    const productsMap = new Map<string, Row>();
    
    // メーカーIDが指定されている場合
    if (manufacturerId) {
        const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
        if (stockTable?.data && Array.isArray(stockTable.data)) {
            stockTable.data.forEach((item: Row) => {
                const productCode = String(item.product_code || '');
                if (!productCode) return;
                
                const key = `${manufacturerId}_${productCode}`;
                if (!productsMap.has(key)) {
                    // 最初のアイテムから商品情報を取得
                    productsMap.set(key, {
                        id: `prod_${manufacturerId}_${productCode}`,
                        manufacturer_id: manufacturerId,
                        productCode: productCode,
                        category_id: item.category_id || null,
                        is_published: item.is_published || 0,
                        brand_id: item.brand_id || null,
                        unique_code: null // stockテーブルにはunique_codeがない
                    });
                }
            });
        }
    } else {
        // 全メーカーのstockテーブルから取得
        const manufacturers = database.manufacturers?.data || [];
        manufacturers.forEach((manufacturer: Row) => {
            const mId = String(manufacturer.id || '');
            if (!mId) return;
            
            const stockTable = getManufacturerTable(database, 'stock', mId);
            if (stockTable?.data && Array.isArray(stockTable.data)) {
                stockTable.data.forEach((item: Row) => {
                    const productCode = String(item.product_code || '');
                    if (!productCode) return;
                    
                    const key = `${mId}_${productCode}`;
                    if (!productsMap.has(key)) {
                        productsMap.set(key, {
                            id: `prod_${mId}_${productCode}`,
                            manufacturer_id: mId,
                            productCode: productCode,
                            category_id: item.category_id || null,
                            is_published: item.is_published || 0,
                            brand_id: item.brand_id || null,
                            unique_code: null
                        });
                    }
                });
            }
        });
    }
    
    return Array.from(productsMap.values());
}

/**
 * stockテーブルからproduct_details形式のデータを取得
 * product_detailsテーブルの代替として使用
 * @param database データベースオブジェクト
 * @param manufacturerId メーカーID（オプション、指定しない場合は全メーカー）
 * @returns product_details形式のRow配列
 */
export function getProductDetailsFromStock(
    database: Database | null | undefined,
    manufacturerId?: string
): Row[] {
    if (!database) return [];
    
    const detailsMap = new Map<string, Row>();
    
    // メーカーIDが指定されている場合
    if (manufacturerId) {
        const stockTable = getManufacturerTable(database, 'stock', manufacturerId);
        if (stockTable?.data && Array.isArray(stockTable.data)) {
            stockTable.data.forEach((item: Row) => {
                const productCode = String(item.product_code || '');
                if (!productCode) return;
                
                const key = `${manufacturerId}_${productCode}`;
                if (!detailsMap.has(key)) {
                    // 最初のアイテムから商品詳細情報を取得
                    detailsMap.set(key, {
                        id: `detail_${manufacturerId}_${productCode}`,
                        product_id: `prod_${manufacturerId}_${productCode}`,
                        manufacturer_id: manufacturerId,
                        product_code: productCode,
                        productName: item.stock_product_name || item.product_name || null,
                        product_name: item.stock_product_name || item.product_name || null,
                        description: item.description || null,
                        images: item.images || null,
                        tags: item.tags || null
                    });
                }
            });
        }
    } else {
        // 全メーカーのstockテーブルから取得
        const manufacturers = database.manufacturers?.data || [];
        manufacturers.forEach((manufacturer: Row) => {
            const mId = String(manufacturer.id || '');
            if (!mId) return;
            
            const stockTable = getManufacturerTable(database, 'stock', mId);
            if (stockTable?.data && Array.isArray(stockTable.data)) {
                stockTable.data.forEach((item: Row) => {
                    const productCode = String(item.product_code || '');
                    if (!productCode) return;
                    
                    const key = `${mId}_${productCode}`;
                    if (!detailsMap.has(key)) {
                        detailsMap.set(key, {
                            id: `detail_${mId}_${productCode}`,
                            product_id: `prod_${mId}_${productCode}`,
                            manufacturer_id: mId,
                            product_code: productCode,
                            productName: item.stock_product_name || item.product_name || null,
                            product_name: item.stock_product_name || item.product_name || null,
                            description: item.description || null,
                            images: item.images || null,
                            tags: item.tags || null
                        });
                    }
                });
            }
        });
    }
    
    return Array.from(detailsMap.values());
}

