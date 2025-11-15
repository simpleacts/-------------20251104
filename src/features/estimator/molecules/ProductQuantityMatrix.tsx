
import { useDatabase } from '@core/contexts/DatabaseContext';
import { getProductInfoFromStock } from '@core/utils';
import { AppData, BrandColor, Product, ProductPrice } from '@shared/types';
import { getAvailableSizes } from '@shared/utils/productSizeResolver';
import React, { useMemo } from 'react';

interface ProductQuantityMatrixProps {
    selectedProduct: Product;
    appData: AppData;
    quantities: Record<string, Record<string, number>>;
    onQuantityChange: (color: string, size: string, value: string) => void;
}

// サイズの並び順を取得（size_order_masterテーブルから、フォールバックはハードコードされた順序）
const getSizeOrder = (database: any): { [key: string]: number } => {
    const sizeOrderMap: { [key: string]: number } = {};
    
    // size_order_masterテーブルから並び順を取得
    if (database?.size_order_master?.data && Array.isArray(database.size_order_master.data)) {
        database.size_order_master.data.forEach((row: any) => {
            const sizeName = String(row.size_name || '');
            const sortOrder = parseInt(String(row.sort_order || '999'), 10);
            if (sizeName) {
                sizeOrderMap[sizeName] = sortOrder;
            }
        });
    }
    
    // フォールバック: ハードコードされた順序（size_order_masterに存在しないサイズ用）
    const FALLBACK_SIZE_ORDER: { [key: string]: number } = {
        '90': 17, '100': 18, '110': 19, '120': 20, '130': 21, '140': 22, '150': 23, '160': 24,
        'G-S': 11, 'G-M': 12, 'G-L': 13, 'WM': 14, 'WL': 15, 'XS': 1, 'S': 2,
        'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7, 'XXXXL': 8, '5XL': 9,
        '6XL': 10, 'F': 16,
    };
    
    // フォールバックをマージ（size_order_masterに存在しないサイズのみ）
    Object.keys(FALLBACK_SIZE_ORDER).forEach(sizeName => {
        if (!(sizeName in sizeOrderMap)) {
            sizeOrderMap[sizeName] = FALLBACK_SIZE_ORDER[sizeName];
        }
    });
    
    return sizeOrderMap;
};

const ProductQuantityMatrix: React.FC<ProductQuantityMatrixProps> = ({
    selectedProduct,
    appData,
    quantities,
    onQuantityChange,
}) => {
    const { database } = useDatabase();
    // カラー情報を取得（manufacturerIdが正しく設定されていることを確認）
    const availableColors = useMemo(() => {
        if (!selectedProduct.manufacturerId) {
            console.warn('[ProductQuantityMatrix] manufacturerId is missing for product:', selectedProduct.id);
            return [];
        }
        
        const manufacturerColors = appData.colors[selectedProduct.manufacturerId];
        if (!manufacturerColors) {
            console.warn('[ProductQuantityMatrix] No colors found for manufacturerId:', selectedProduct.manufacturerId);
            return [];
        }
        
        const colors = Object.values(manufacturerColors) as BrandColor[];
        
        // カラーコードの型を統一して比較（文字列として比較）
        const productColorCodes = selectedProduct.colors.map(c => String(c));
        const availableColorCodes = colors.map(c => String(c.colorCode));
        
        const filteredColors = colors.filter(c => {
            const colorCodeStr = String(c.colorCode);
            return productColorCodes.includes(colorCodeStr);
        });
        
        if (filteredColors.length === 0) {
            console.warn('[ProductQuantityMatrix] No matching colors found.', {
                productId: selectedProduct.id,
                manufacturerId: selectedProduct.manufacturerId,
                productColors: selectedProduct.colors,
                productColorCodesStr: productColorCodes,
                availableColorCodes: availableColorCodes,
                availableColorsCount: colors.length,
                manufacturerColorsCount: Object.keys(manufacturerColors).length
            });
        }
        
        return filteredColors.sort((a, b) => parseInt(String(a.colorCode), 10) - parseInt(String(b.colorCode), 10));
    }, [selectedProduct.manufacturerId, selectedProduct.colors, appData.colors]);

    const colorColumnWidth = useMemo(() => {
        if (availableColors.length === 0) return 192;
        const longestName = availableColors.reduce((max, color) => {
            const code = String(color.colorCode);
            const name = String(color.colorName);
            const fullName = `${code} ${name}`;
            return fullName.length > max.length ? fullName : max;
        }, '');
        // Rough estimation: 12px per character for mixed JP/EN + 40px for padding/icon
        const width = longestName.length * 12 + 40;
        return Math.max(150, width); // Min width of 150px
    }, [availableColors]);

    // サイズの並び順を取得
    const sizeOrder = useMemo(() => getSizeOrder(database), [database]);
    
    // サイズ情報を取得（カラーごとに異なるサイズ展開に対応）
    // カラーが選択されていない場合は、最初のカラーのサイズ展開を使用
    const availableSizesByColor = useMemo(() => {
        if (!database || !selectedProduct.manufacturerId) {
            // フォールバック: product_pricesから取得
            const uniqueSizeNames: string[] = [...new Set(selectedProduct.prices.map((p: ProductPrice) => p.size as string))];
            uniqueSizeNames.sort((a, b) => (sizeOrder[a] || 999) - (sizeOrder[b] || 999));
            return new Map<string, string[]>([
                ['default', uniqueSizeNames]
            ]);
        }
        
        const sizesMap = new Map<string, string[]>();
        
        // 各カラーごとにサイズ展開を取得（階層的検索: メーカーID + 品番 + カラーコード）
        availableColors.forEach((color: BrandColor) => {
            const colorName = String(color.colorName);
            const colorCode = String(color.colorCode);
            const sizes = getAvailableSizes(
                database,
                selectedProduct.id,
                selectedProduct.manufacturerId,
                colorName,
                selectedProduct.code, // 商品コード
                colorCode // カラーコード
            );
            const sizeNames = sizes.map(s => s.sizeName);
            sizeNames.sort((a, b) => (sizeOrder[a] || 999) - (sizeOrder[b] || 999));
            sizesMap.set(colorName, sizeNames);
        });
        
        // デフォルトサイズ（最初のカラーまたは全サイズ）
        if (availableColors.length > 0) {
            const firstColorName = String(availableColors[0].colorName);
            const defaultSizes = sizesMap.get(firstColorName) || [];
            sizesMap.set('default', defaultSizes);
        }
        
        return sizesMap;
    }, [database, selectedProduct, availableColors]);
    
    // 全カラーで共通のサイズリストを取得（マトリックス表示用）
    const allUniqueSizeNames = useMemo(() => {
        const sizeSet = new Set<string>();
        availableSizesByColor.forEach(sizes => {
            sizes.forEach(size => sizeSet.add(size));
        });
        const sizeNames = Array.from(sizeSet);
        sizeNames.sort((a, b) => (sizeOrder[a] || 999) - (sizeOrder[b] || 999));
        return sizeNames;
    }, [availableSizesByColor, sizeOrder]);
    
    const uniqueSizeNames = allUniqueSizeNames;

    // 在庫数情報を取得
    const stockInfo = useMemo(() => {
        if (!database || !selectedProduct.manufacturerId || !selectedProduct.code) {
            return null;
        }
        
        return getProductInfoFromStock(
            database,
            selectedProduct.manufacturerId,
            selectedProduct.code
        );
    }, [database, selectedProduct.manufacturerId, selectedProduct.code]);

    // カラー情報が取得できない場合のエラーメッセージ
    if (availableColors.length === 0) {
        return (
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">カラー情報が見つかりません</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        商品: {selectedProduct.name} (ID: {selectedProduct.id})
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        メーカーID: {selectedProduct.manufacturerId || '未設定'}
                    </p>
                    {selectedProduct.colors.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            商品カラーコード: {selectedProduct.colors.join(', ')}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow overflow-auto p-4">
            <table className="border-collapse text-sm">
                <thead>
                    <tr className="bg-base-200 dark:bg-base-dark-300">
                        <th className="sticky left-0 bg-base-200 dark:bg-base-dark-300 p-2 border border-base-300 dark:border-base-dark-300 z-10 whitespace-nowrap" style={{ width: `${colorColumnWidth}px`, minWidth: `${colorColumnWidth}px` }}>カラー/サイズ</th>
                        {uniqueSizeNames.map((sizeName: string) => (
                            <th key={sizeName} className="p-2 border border-base-300 dark:border-base-dark-300 font-semibold" style={{ width: '60px' }}>{sizeName}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {availableColors.map((color: BrandColor) => {
                        const colorCode = String(color.colorCode);
                        const colorName = String(color.colorName);
                        
                        // このカラーで利用可能なサイズを取得
                        const colorSizes = availableSizesByColor.get(colorName) || [];
                        const isSizeAvailable = (sizeName: string) => colorSizes.includes(sizeName);
                        
                        return (
                            <tr key={colorCode}>
                                <td className="sticky left-0 bg-base-100 dark:bg-base-dark-200 p-2 border border-base-300 dark:border-base-dark-300 font-semibold whitespace-nowrap z-10" style={{ width: `${colorColumnWidth}px`, minWidth: `${colorColumnWidth}px` }}>
                                    <div className="flex items-center gap-2">
                                        <span style={{backgroundColor: color.hex}} className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0"></span>
                                        {colorCode} {colorName}
                                    </div>
                                </td>
                                {uniqueSizeNames.map((sizeName: string) => {
                                    const inputId = `quantity-${colorCode}-${sizeName}`;
                                    const available = isSizeAvailable(sizeName);
                                    
                                    // 在庫数を取得（カラー名とサイズ名で検索）
                                    const stockQuantity = stockInfo?.stockQuantities.find(
                                        sq => sq.colorName === colorName && sq.sizeName === sizeName
                                    )?.quantity ?? 0;
                                    const hasStock = stockQuantity > 0;
                                    
                                    // 現在の入力値を取得
                                    const currentValue = (quantities[colorName] || {})[sizeName] || 0;
                                    
                                    return (
                                        <td key={sizeName} className={`p-1 border border-base-300 dark:border-base-dark-300 ${!available || !hasStock ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : ''}`}>
                                            {available && hasStock ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <input
                                                        id={inputId}
                                                        name={`quantity-${colorCode}-${sizeName}`}
                                                        type="number"
                                                        min="0"
                                                        max={stockQuantity}
                                                        value={currentValue || ''}
                                                        onChange={e => {
                                                            const value = parseInt(e.target.value, 10) || 0;
                                                            if (value <= stockQuantity) {
                                                                onQuantityChange(colorName, sizeName, e.target.value);
                                                            }
                                                        }}
                                                        className="w-full p-1 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-secondary rounded"
                                                        placeholder="0"
                                                        aria-label={`${colorName} ${sizeName} の数量（在庫: ${stockQuantity}）`}
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        在庫: {stockQuantity}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full p-2 text-center text-gray-400 dark:text-gray-500">
                                                    {available ? `在庫: ${stockQuantity}` : '-'}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ProductQuantityMatrix;
