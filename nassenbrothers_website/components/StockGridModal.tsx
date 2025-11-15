import React, { useMemo, useEffect } from 'react';
import { Product, BrandColor, SizeOrder } from '../types';

interface StockGridModalProps {
  product: Product;
  allColors: Record<string, BrandColor>;
  allSizes: Record<string, { name: string }>;
  stockData: Record<string, number>;
  sizeOrder: SizeOrder[];
  uiText: Record<string, string>;
  onClose: () => void;
}

const stockTitle = (stock: number, uiText: Record<string, string>) => {
    if (stock >= 0) return `在庫数: ${stock}`;
    return uiText['productDetail.stock.legend.unknown'] || '情報なし';
}


export const StockGridModal: React.FC<StockGridModalProps> = ({ product, allColors, allSizes, stockData, sizeOrder, uiText, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const productColors = useMemo(() => {
    return product.colors
      .map(colorCode => allColors[colorCode])
      .filter((c): c is BrandColor => !!c)
      .sort((a,b) => a.code.localeCompare(b.code));
  }, [product, allColors]);

  const sortedSizes = useMemo(() => {
    const sizeOrderMap = new Map(sizeOrder.map(s => [s.sizeName, s.sortOrder]));
    const productSizes = new Set(product.prices.map(p => p.size));
    // FIX: Explicitly cast sort values to Number to prevent arithmetic errors.
    return Array.from(productSizes).sort((a, b) => Number(sizeOrderMap.get(a) || 99) - Number(sizeOrderMap.get(b) || 99));
  }, [product, sizeOrder]);
  
  const sizeNameToCodeMap = useMemo(() => {
      // FIX: Added explicit type for '[code, data]' to resolve property access on 'unknown' error.
      return new Map(Object.entries(allSizes).map(([code, data]: [string, { name: string }]) => [data.name, code]));
  }, [allSizes]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div 
            className="fixed inset-0" 
            onClick={onClose}
            aria-hidden="true"
        ></div>
        <div className="relative bg-surface shadow-2xl w-full max-w-4xl animate-fade-in-up flex flex-col max-h-[90vh]">
            <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-text-heading">在庫状況</h3>
                    <p className="text-sm text-text-secondary">{product.name} {product.variantName}</p>
                </div>
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl" aria-label="閉じる">&times;</button>
            </header>
            <main className="p-4 sm:p-6">
                <div className="overflow-auto border max-h-[60vh]">
                    <table className="w-full text-sm text-center border-collapse min-w-[600px]">
                        <thead className="relative z-10">
                            <tr>
                                <th className="p-2 border font-semibold w-32 sticky top-0 left-0 bg-background-subtle z-20">カラー</th>
                                {sortedSizes.map(sizeName => (
                                    <th key={sizeName} className="p-2 border font-semibold min-w-[5rem] sticky top-0 bg-background-subtle z-10">
                                        {sizeName}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {productColors.map(color => (
                                <tr key={color.code}>
                                    <td className="p-2 border font-semibold sticky left-0 bg-surface z-10 w-32 text-left">
                                        <div className="flex items-center justify-start gap-2 px-1">
                                            <div className="w-4 h-4 border flex-shrink-0" style={{ backgroundColor: color.hex }}></div>
                                            <span className="text-xs">{color.name}</span>
                                        </div>
                                    </td>
                                    {sortedSizes.map(sizeName => {
                                        const sizeCode = sizeNameToCodeMap.get(sizeName);
                                        const stockKey = sizeCode ? `${product.code}-${color.code}-${sizeCode}` : '';
                                        const stock = stockData[stockKey] ?? -1;
                                        
                                        const isAvailableForColorType = product.prices.some(p => p.size === sizeName && p.color === color.type);

                                        return (
                                            <td key={sizeName} className={`p-2 border font-mono ${!isAvailableForColorType ? 'bg-gray-100' : ''}`} title={isAvailableForColorType ? stockTitle(stock, uiText) : '取扱なし'}>
                                                {isAvailableForColorType ? (stock >= 0 ? stock : '?') : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="text-xs text-text-secondary mt-4 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-semibold">凡例:</span>
                    <span>-: 取扱なし</span>
                    <span>?: 在庫情報なし</span>
                </div>
            </main>
            <footer className="p-3 bg-background-subtle border-t text-right flex-shrink-0">
                <button onClick={onClose} className="bg-primary text-white font-bold py-2 px-6 hover:bg-primary/90">
                    閉じる
                </button>
            </footer>
        </div>
    </div>
  );
};