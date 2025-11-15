import React, { useMemo } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { XMarkIcon } from '@components/atoms';
import { StockHistoryItem, InventoryItem } from '../hooks/useInventoryManagement';

interface InventoryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    skuId: string | null;
    inventoryItems: InventoryItem[];
    stockHistory: StockHistoryItem[];
}

const InventoryHistoryModal: React.FC<InventoryHistoryModalProps> = ({
    isOpen,
    onClose,
    skuId,
    inventoryItems,
    stockHistory,
}) => {
    const { t } = useTranslation('inventory-management');

    // 選択されたSKUの履歴をフィルタリング
    const filteredHistory = useMemo(() => {
        if (skuId) {
            return stockHistory.filter(h => h.sku_id === skuId);
        }
        return stockHistory;
    }, [stockHistory, skuId]);

    // 履歴を日付順（新しい順）でソート
    const sortedHistory = useMemo(() => {
        return [...filteredHistory].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
        });
    }, [filteredHistory]);

    const selectedItem = skuId ? inventoryItems.find(item => item.sku_id === skuId) : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark flex-shrink-0">
                    <h2 className="text-xl font-bold">
                        {skuId 
                            ? t('inventory.history_for_sku', '在庫履歴: {sku}', { sku: skuId })
                            : t('inventory.all_history', '在庫履歴一覧')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted dark:text-muted-dark hover:text-base-content dark:hover:text-base-dark"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {selectedItem && (
                    <div className="p-4 bg-base-200 dark:bg-base-dark-300 border-b border-default dark:border-default-dark">
                        <p className="text-sm">
                            <strong>{t('inventory.product', '商品')}:</strong> {selectedItem.product_name || selectedItem.product_code}
                        </p>
                        <p className="text-sm">
                            <strong>{t('inventory.current_stock', '現在の在庫数')}:</strong> {selectedItem.quantity}個
                        </p>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto p-4">
                    {sortedHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted dark:text-muted-dark">
                            {t('inventory.no_history', '履歴がありません。')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-default dark:border-default-dark">
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.date', '日時')}</th>
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.change', '変更量')}</th>
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.before', '変更前')}</th>
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.after', '変更後')}</th>
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.reason', '理由')}</th>
                                        <th className="text-left p-2 text-sm font-semibold">{t('inventory.notes', '備考')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedHistory.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b border-default dark:border-default-dark hover:bg-base-200 dark:hover:bg-base-dark-300"
                                        >
                                            <td className="p-2 text-sm">
                                                {new Date(item.created_at).toLocaleString('ja-JP')}
                                            </td>
                                            <td className={`p-2 text-sm font-semibold ${
                                                item.quantity_change > 0 
                                                    ? 'text-green-600 dark:text-green-400' 
                                                    : item.quantity_change < 0 
                                                    ? 'text-red-600 dark:text-red-400' 
                                                    : ''
                                            }`}>
                                                {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                                            </td>
                                            <td className="p-2 text-sm">{item.quantity_before}</td>
                                            <td className="p-2 text-sm font-semibold">{item.quantity_after}</td>
                                            <td className="p-2 text-sm">{item.reason}</td>
                                            <td className="p-2 text-sm text-muted dark:text-muted-dark">
                                                {item.notes || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryHistoryModal;

