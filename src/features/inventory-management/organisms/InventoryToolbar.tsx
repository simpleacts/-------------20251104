import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Button, Input, PlusIcon, TimerIcon, ExclamationTriangleIcon } from '@components/atoms';

interface InventoryToolbarProps {
    onAdjustStock: () => void;
    onViewHistory: () => void;
    onManageIncoming: () => void;
    filterLowStock: boolean;
    onFilterLowStockChange: (filter: boolean) => void;
    lowStockThreshold: number;
    onLowStockThresholdChange: (threshold: number) => void;
    lowStockCount: number;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
    onAdjustStock,
    onViewHistory,
    onManageIncoming,
    filterLowStock,
    onFilterLowStockChange,
    lowStockThreshold,
    onLowStockThresholdChange,
    lowStockCount,
}) => {
    const { t } = useTranslation('inventory-management');

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-sm">
            <Button
                onClick={onAdjustStock}
                variant="primary"
                size="md"
                className="flex items-center gap-2"
            >
                <PlusIcon className="w-4 h-4" />
                {t('inventory.adjust_stock', '在庫調整')}
            </Button>

            <Button
                onClick={onViewHistory}
                variant="secondary"
                size="md"
                className="flex items-center gap-2"
            >
                <TimerIcon className="w-4 h-4" />
                {t('inventory.view_all_history', '全履歴')}
            </Button>

            <Button
                onClick={onManageIncoming}
                variant="secondary"
                size="md"
                className="flex items-center gap-2"
            >
                <TimerIcon className="w-4 h-4" />
                {t('inventory.manage_incoming', '入荷予定管理')}
            </Button>

            <div className="flex items-center gap-2">
                <input
                    id="filter-low-stock"
                    name="filter-low-stock"
                    type="checkbox"
                    checked={filterLowStock}
                    onChange={(e) => onFilterLowStockChange(e.target.checked)}
                    className="w-4 h-4"
                />
                <label htmlFor="filter-low-stock" className="text-sm">
                    {t('inventory.filter_low_stock', '在庫不足のみ表示')}
                </label>
            </div>

            {lowStockCount > 0 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="text-sm font-semibold">
                        {t('inventory.low_stock_count', '{count}件の在庫不足', { count: lowStockCount })}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2">
                <label htmlFor="low-stock-threshold" className="text-sm">
                    {t('inventory.threshold', 'アラート閾値:')}
                </label>
                <Input
                    id="low-stock-threshold"
                    name="low-stock-threshold"
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => onLowStockThresholdChange(parseInt(e.target.value) || 0)}
                    className="w-20"
                />
            </div>
        </div>
    );
};

export default InventoryToolbar;

