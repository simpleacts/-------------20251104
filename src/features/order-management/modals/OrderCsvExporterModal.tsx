import React, { useMemo, useState } from 'react';
import { Database, OrderDetail, Row } from '@shared/types';
import { EnrichedQuote } from '../types';
import { XMarkIcon } from '@components/atoms';
import { convertToCSV, downloadCSV } from '@shared/utils/csv';
import { getAllManufacturerTableData, getManufacturerTable, getProductsMasterFromStock } from '@core/utils';

interface OrderCsvExporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { manufacturerId: number, quotes: EnrichedQuote[] } | null;
    database: Database;
}

interface AggregatedItem {
    item: OrderDetail;
    totalQuantity: number;
    fromQuotes: string[];
}

const OrderCsvExporterModal: React.FC<OrderCsvExporterModalProps> = ({ isOpen, onClose, data, database }) => {
    const [spares, setSpares] = useState<Record<string, number>>({});

    const { manufacturerName, aggregatedItems } = useMemo(() => {
        if (!data) return { manufacturerName: '', aggregatedItems: [] };

        const manufacturer = database.manufacturers.data.find(m => m.id === data.manufacturerId);
        const name = manufacturer ? (manufacturer.name as string) : `不明なメーカー (ID: ${data.manufacturerId})`;

        const itemsMap = new Map<string, AggregatedItem>();
        data.quotes.forEach(quote => {
            // メーカー依存テーブルから全商品を取得
            const allProducts = getProductsMasterFromStock(database);
            const itemsForManufacturer = quote.items.filter(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (!product) return false;
                const brand = database.brands.data.find(b => b.id === product.brand_id);
                return brand?.manufacturer_id === data.manufacturerId;
            });

            itemsForManufacturer.forEach(item => {
                const key = `${item.productId}-${item.color}-${item.size}`;
                if (itemsMap.has(key)) {
                    const existing = itemsMap.get(key)!;
                    existing.totalQuantity += (item.quantity as number);
                    if (!existing.fromQuotes.includes(quote.quote_code as string)) {
                        existing.fromQuotes.push(quote.quote_code as string);
                    }
                } else {
                    itemsMap.set(key, {
                        item: item,
                        totalQuantity: (item.quantity as number),
                        fromQuotes: [quote.quote_code as string]
                    });
                }
            });
        });

        const sortedItems = Array.from(itemsMap.values()).sort((a,b) => String(a.item.productName).localeCompare(String(b.item.productName)));

        return { manufacturerName: name, aggregatedItems: sortedItems };
    }, [data, database]);

    const handleSparesChange = (key: string, value: string) => {
        const numValue = parseInt(value, 10);
        setSpares(prev => ({
            ...prev,
            [key]: isNaN(numValue) || numValue < 0 ? 0 : numValue
        }));
    };

    const handleDownload = () => {
        if (!data) return;
        
        let csvRows: Row[] = [];

        // stockテーブルから全商品を取得（products_masterの代替）
        const allProducts = getProductsMasterFromStock(database);
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        
        // colors, sizesテーブルは削除済み（stockテーブルから取得）
        // stockテーブルからカラーコードとサイズコードのマップを作成
        const colorMap = new Map<string, string>();
        const sizeMap = new Map<string, string>();
        
        const stockTable = getManufacturerTable(database, 'stock', String(data.manufacturerId));
        if (stockTable?.data && Array.isArray(stockTable.data)) {
            stockTable.data.forEach((item: Row) => {
                const product = productMap.get(item.product_id as string);
                const brandId = product?.brand_id;
                const colorName = String(item.color_name || '');
                const colorCode = String(item.color_code || '');
                const sizeName = String(item.size_name || '');
                const sizeCode = String(item.size_code || '');
                
                if (brandId && colorName && colorCode) {
                    colorMap.set(`${brandId}-${colorName}`, colorCode);
                }
                if (brandId && sizeName && sizeCode) {
                    sizeMap.set(`${brandId}-${sizeName}`, sizeCode);
                }
            });
        }

        const itemsForCsv = aggregatedItems.map(aggItem => {
            const key = `${aggItem.item.productId}-${aggItem.item.color}-${aggItem.item.size}`;
            const spareQty = spares[key] || 0;
            return {
                ...aggItem.item,
                finalQuantity: aggItem.totalQuantity + spareQty
            };
        });

        if (manufacturerName.includes('TOMS')) {
            csvRows = itemsForCsv.map((item: OrderDetail & { finalQuantity: number }) => {
                const product = productMap.get(item.productId);
                const brandId = (product as Row)?.brand_id;
                return {
                    '品番': (product as Row)?.code || '',
                    'カラーコード': colorMap.get(`${brandId}-${item.color}`) || '',
                    'サイズコード': sizeMap.get(`${brandId}-${item.size}`) || '',
                    '数量': item.finalQuantity,
                };
            });
        } else if (manufacturerName.includes('キャブ')) {
            csvRows = itemsForCsv.map((item: OrderDetail & { finalQuantity: number }) => {
                 const product = productMap.get(item.productId);
                return {
                    '商品コード': (product as Row)?.code || '',
                    'カラー': item.color || '',
                    'サイズ': item.size || '',
                    '枚数': item.finalQuantity,
                };
            });
        } else {
            alert(`メーカー「${manufacturerName}」用のCSVフォーマットが定義されていません。`);
            return;
        }

        const csvString = convertToCSV(csvRows);
        downloadCSV(csvString, `${manufacturerName}_発注_${new Date().toISOString().slice(0,10)}.csv`);
    };


    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-dark-300">
                    <h2 className="text-xl font-bold">発注用CSVを作成: {manufacturerName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <p className="text-sm mb-4">{data.quotes.length}件の案件から商品をまとめています。</p>
                    <table className="min-w-full text-sm">
                        <thead className="bg-base-200 dark:bg-base-dark-300">
                            <tr>
                                <th className="p-2 text-left">商品</th>
                                <th className="p-2 text-center">必要数</th>
                                <th className="p-2 text-center">予備</th>
                                <th className="p-2 text-center">発注合計</th>
                                <th className="p-2 text-left">関連案件</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregatedItems.map(({item, totalQuantity, fromQuotes}) => {
                                const key = `${item.productId}-${item.color}-${item.size}`;
                                const spareQty = spares[key] || 0;
                                return (
                                    <tr key={key} className="border-b border-base-200 dark:border-base-dark-300">
                                        <td className="p-2">
                                            <p className="font-semibold">{item.productName}</p>
                                            <p className="text-xs text-gray-500">{item.color} / {item.size}</p>
                                        </td>
                                        <td className="p-2 text-center">{totalQuantity}</td>
                                        <td className="p-2 text-center w-24">
                                            <input
                                                type="number"
                                                value={spares[key] || ''}
                                                onChange={e => handleSparesChange(key, e.target.value)}
                                                className="w-full p-1 border rounded-md text-center bg-base-100 dark:bg-base-dark-200"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-2 text-center font-bold">{totalQuantity + spareQty}</td>
                                        <td className="p-2 text-xs text-gray-500">{fromQuotes.join(', ')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </main>
                <footer className="flex justify-end gap-3 p-4 bg-base-100 dark:bg-base-dark-200 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-md">キャンセル</button>
                    <button onClick={handleDownload} className="px-4 py-2 bg-brand-primary text-white hover:bg-blue-800 rounded-md">CSVをダウンロード</button>
                </footer>
            </div>
        </div>
    );
};

export default OrderCsvExporterModal;