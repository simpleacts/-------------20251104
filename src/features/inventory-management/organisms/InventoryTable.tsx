import { Button, PencilIcon, TimerIcon } from '@components/atoms';
import PaginatedListContainer from '@components/organisms/PaginatedListContainer';
import { getManufacturerTableName, isManufacturerDependentTable } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useTranslation } from '@shared/hooks/useTranslation';
import React from 'react';
import { InventoryItem } from '../hooks/useInventoryManagement';

interface InventoryTableProps {
    items: InventoryItem[];
    onAdjustStock: (skuId: string) => void;
    onViewHistory: (skuId: string) => void;
    lowStockThreshold: number;
    paginationConfig: { enabled: boolean; itemsPerPage: number; };
}

// 在庫アイテム行コンポーネント（データ使用ログ記録用）
const InventoryItemRow: React.FC<{
    item: InventoryItem;
    isLowStock: boolean;
    hasIncoming: boolean;
    incomingDateDisplay: string;
    lowStockThreshold: number;
    onAdjustStock: (skuId: string) => void;
    onViewHistory: (skuId: string) => void;
    t: (key: string, defaultValue?: string) => string;
}> = ({ item, isLowStock, hasIncoming, incomingDateDisplay, onAdjustStock, onViewHistory, t }) => {
    const { logDataUsage } = useDatabase();
    
    // データ使用ログを記録（最初のレンダリング時のみ）
    React.useEffect(() => {
        if (item.manufacturer_id && item.sku_id) {
            const tableName = isManufacturerDependentTable('stock')
                ? getManufacturerTableName('stock', item.manufacturer_id)
                : 'stock';
            const usedFields = [
                'sku_id', 'product_name', 'product_code', 'brand_name',
                'color_name', 'size_name', 'quantity', 'incoming_quantity',
                'next_arrival_date', 'incoming_dates'
            ].filter(f => item[f as keyof InventoryItem] !== undefined);
            logDataUsage('inventory-management', tableName, item.sku_id, usedFields, 'display');
        }
    }, [item.sku_id, item.manufacturer_id, logDataUsage]);
    
    return (
        <tr
            key={item.sku_id}
            className={`border-b border-default dark:border-default-dark hover:bg-base-200 dark:hover:bg-base-dark-300 ${
                isLowStock ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
            }`}
        >
            <td className="p-3 text-sm">{item.sku_id}</td>
            <td className="p-3 text-sm">{item.product_name || '-'}</td>
            <td className="p-3 text-sm">{item.product_code || '-'}</td>
            <td className="p-3 text-sm">{item.brand_name || '-'}</td>
            <td className="p-3 text-sm">{item.color_name || '-'}</td>
            <td className="p-3 text-sm">{item.size_name || '-'}</td>
            <td className={`p-3 text-sm font-semibold ${
                isLowStock ? 'text-red-600 dark:text-red-400' : ''
            }`}>
                {item.quantity}
            </td>
            <td className={`p-3 text-sm ${
                hasIncoming ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
            }`}>
                {item.incoming_quantity || '-'}
            </td>
            <td className={`p-3 text-sm ${
                hasIncoming ? 'text-blue-600 dark:text-blue-400' : ''
            }`}>
                {incomingDateDisplay}
            </td>
            <td className="p-3">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => onAdjustStock(item.sku_id)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1"
                    >
                        <PencilIcon className="w-4 h-4" />
                        {t('inventory.adjust', '調整')}
                    </Button>
                    <Button
                        onClick={() => onViewHistory(item.sku_id)}
                            variant="secondary"
                        size="sm"
                        className="flex items-center gap-1"
                    >
                        <TimerIcon className="w-4 h-4" />
                        {t('inventory.history', '履歴')}
                    </Button>
                </div>
            </td>
        </tr>
    );
};

const InventoryTable: React.FC<InventoryTableProps> = ({
    items,
    onAdjustStock,
    onViewHistory,
    lowStockThreshold,
    paginationConfig,
}) => {
    const { t } = useTranslation('inventory-management');

    return (
        <PaginatedListContainer
            data={items}
            paginationConfig={paginationConfig}
            paginationPosition="both"
            className="h-full w-full flex flex-col"
            header={(paginationInfo) => (
                <div className="px-4 py-2 text-sm text-white bg-gray-600 dark:bg-gray-700 rounded-t-md">
                    <span>
                        全 {paginationInfo.totalItems} 件 / {paginationInfo.itemsPerPage} 件ずつ表示
                    </span>
                </div>
            )}
        >
            {(paginatedItems) => (
                <div className="p-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-default dark:border-default-dark bg-base-200 dark:bg-base-dark-300">
                                <th className="text-left p-3 text-sm font-semibold">SKU ID</th>
                                <th className="text-left p-3 text-sm font-semibold">商品名</th>
                                <th className="text-left p-3 text-sm font-semibold">商品コード</th>
                                <th className="text-left p-3 text-sm font-semibold">ブランド</th>
                                <th className="text-left p-3 text-sm font-semibold">カラー</th>
                                <th className="text-left p-3 text-sm font-semibold">サイズ</th>
                                <th className="text-left p-3 text-sm font-semibold">在庫数</th>
                                <th className="text-left p-3 text-sm font-semibold">入荷予定数</th>
                                <th className="text-left p-3 text-sm font-semibold">入荷予定日</th>
                                <th className="text-left p-3 text-sm font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center p-8 text-muted dark:text-muted-dark">
                                        {t('inventory.no_items', '在庫データがありません。')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item) => {
                                    const isLowStock = item.quantity <= lowStockThreshold;
                                    const hasIncoming = item.incoming_quantity && item.incoming_quantity > 0;
                                    
                                    // 入荷予定日の表示（複数ある場合は最初の日付と件数を表示）
                                    const incomingDateDisplay = item.next_arrival_date
                                        ? item.incoming_dates && item.incoming_dates.length > 1
                                            ? `${item.next_arrival_date} (他${item.incoming_dates.length - 1}件)`
                                            : item.next_arrival_date
                                        : '-';

                                    return (
                                        <InventoryItemRow
                                            key={item.sku_id}
                                            item={item}
                                            isLowStock={isLowStock}
                                            hasIncoming={hasIncoming}
                                            incomingDateDisplay={incomingDateDisplay}
                                            lowStockThreshold={lowStockThreshold}
                                            onAdjustStock={onAdjustStock}
                                            onViewHistory={onViewHistory}
                                            t={t}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </PaginatedListContainer>
    );
};

export default InventoryTable;

