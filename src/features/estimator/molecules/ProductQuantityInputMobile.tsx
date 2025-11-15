
import React, { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { getProductInfoFromStock } from '@core/utils';
import { AppData, BrandColor, Product, ProductPrice } from '@shared/types';
import { getAvailableSizes } from '@shared/utils/productSizeResolver';

interface ProductQuantityInputMobileProps {
    selectedProduct: Product;
    appData: AppData;
    quantities: Record<string, Record<string, number>>;
    onQuantityChange: (color: string, size: string, value: string) => void;
}

const SIZE_ORDER: { [key: string]: number } = {
    '90': 1, '100': 2, '110': 3, '120': 4, '130': 5, '140': 6, '150': 7, '160': 8,
    'G-S': 9, 'G-M': 10, 'G-L': 11, 'WM': 12, 'WL': 13, 'XS': 14, 'S': 15,
    'M': 16, 'L': 17, 'XL': 18, 'XXL': 19, 'XXXL': 20, 'XXXXL': 21, '5XL': 22,
    '6XL': 23, 'F': 24,
};


const ProductQuantityInputMobile: React.FC<ProductQuantityInputMobileProps> = ({
    selectedProduct,
    appData,
    quantities,
    onQuantityChange,
}) => {
    const { database } = useDatabase();
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    // カラー情報を取得（manufacturerIdが正しく設定されていることを確認）
    const availableColors = useMemo(() => {
        if (!selectedProduct.manufacturerId) {
            console.warn('[ProductQuantityInputMobile] manufacturerId is missing for product:', selectedProduct.id);
            return [];
        }
        
        const manufacturerColors = appData.colors[selectedProduct.manufacturerId];
        if (!manufacturerColors) {
            console.warn('[ProductQuantityInputMobile] No colors found for manufacturerId:', selectedProduct.manufacturerId);
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
            console.warn('[ProductQuantityInputMobile] No matching colors found.', {
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
    
    useEffect(() => {
        if (availableColors.length > 0 && !selectedColor) {
            setSelectedColor(String(availableColors[0].colorName));
        } else if(availableColors.length > 0 && selectedColor && !availableColors.some(c => String(c.colorName) === selectedColor)) {
            setSelectedColor(String(availableColors[0].colorName));
        } else if (availableColors.length === 0) {
            setSelectedColor(null);
        }
    }, [selectedProduct, availableColors, selectedColor]);

    // 選択されたカラーで利用可能なサイズを取得（階層的検索: メーカーID + 品番 + カラーコード）
    const availableSizes = useMemo(() => {
        if (!selectedColor || !database || !selectedProduct.manufacturerId) {
            // フォールバック: product_pricesから取得
            const uniqueSizeNames: string[] = [...new Set(selectedProduct.prices.map((p: ProductPrice) => p.size as string))];
            uniqueSizeNames.sort((a, b) => (SIZE_ORDER[a] || 99) - (SIZE_ORDER[b] || 99));
            return uniqueSizeNames.map(name => ({ name }));
        }
        
        // 選択されたカラーのカラーコードを取得
        const selectedColorObj = availableColors.find(c => String(c.colorName) === selectedColor);
        const colorCode = selectedColorObj ? String(selectedColorObj.colorCode) : undefined;
        
        const sizes = getAvailableSizes(
            database,
            selectedProduct.id,
            selectedProduct.manufacturerId,
            selectedColor,
            selectedProduct.code, // 商品コード
            colorCode // カラーコード
        );
        
        const sizeNames = sizes.map(s => s.sizeName);
        sizeNames.sort((a, b) => (SIZE_ORDER[a] || 99) - (SIZE_ORDER[b] || 99));
        
        return sizeNames.map(name => ({ name }));
    }, [selectedColor, database, selectedProduct, availableColors]);
    
    const currentColorInfo = availableColors.find(c => String(c.colorName) === selectedColor);

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

    return (
        <div className="flex-grow overflow-y-auto p-4">
            <div className="mb-4">
                <label htmlFor="color-select" className="block text-sm font-medium mb-1">カラーを選択</label>
                <select
                    id="color-select"
                    name="color-select"
                    value={selectedColor || ''}
                    onChange={e => setSelectedColor(e.target.value)}
                    className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                >
                    {availableColors.map((color: BrandColor) => {
                        const colorCode = String(color.colorCode);
                        const colorName = String(color.colorName);
                        return (
                            <option key={colorCode} value={colorName}>
                                {colorCode} {colorName}
                            </option>
                        );
                    })}
                </select>
            </div>

            {selectedColor && currentColorInfo && (
                 <div className="space-y-2">
                    <h4 className="font-semibold p-2 bg-base-200 dark:bg-base-dark-300 sticky top-0 flex items-center gap-2 z-10">
                        <span style={{backgroundColor: currentColorInfo.hex}} className="w-4 h-4 rounded-full border border-gray-400"></span>
                        {currentColorInfo.code} {currentColorInfo.name}
                    </h4>
                    {availableSizes.map((size: { name: string }) => {
                        const inputId = `qty-${selectedColor}-${size.name}`;
                        // 在庫数を取得
                        const stockQuantity = stockInfo?.stockQuantities.find(
                            sq => sq.colorName === selectedColor && sq.sizeName === size.name
                        )?.quantity ?? 0;
                        const hasStock = stockQuantity > 0;
                        const currentValue = (quantities[selectedColor!] || {})[size.name] || 0;
                        
                        return (
                            <div key={size.name} className={`flex items-center justify-between p-2 ${!hasStock ? 'opacity-50' : ''}`}>
                                <div className="flex flex-col">
                                    <label htmlFor={inputId} className="text-sm">{size.name}</label>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        在庫: {stockQuantity}
                                    </span>
                                </div>
                                <input 
                                    id={inputId}
                                    name={inputId}
                                    type="number" 
                                    min="0"
                                    max={hasStock ? stockQuantity : 0}
                                    value={currentValue || ''}
                                    onChange={e => {
                                        const value = parseInt(e.target.value, 10) || 0;
                                        if (hasStock && value <= stockQuantity) {
                                            onQuantityChange(selectedColor!, size.name, e.target.value);
                                        }
                                    }}
                                    disabled={!hasStock}
                                    className="w-24 p-1 border rounded-md text-center bg-input-bg dark:bg-input-bg-dark disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                    aria-label={`${size.name} の数量（在庫: ${stockQuantity}）`}
                                    placeholder="0"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProductQuantityInputMobile;
