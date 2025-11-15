import React from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { ExclamationTriangleIcon, XMarkIcon } from '@components/atoms';
import { InventoryItem } from '../hooks/useInventoryManagement';

interface InventoryAlertProps {
    items: InventoryItem[];
    threshold: number;
}

const InventoryAlert: React.FC<InventoryAlertProps> = ({ items, threshold }) => {
    const { t } = useTranslation('inventory-management');
    const [isDismissed, setIsDismissed] = React.useState(false);

    if (isDismissed || items.length === 0) return null;

    return (
        <div className="mx-4 mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                            {t('inventory.low_stock_alert', '在庫不足アラート')}
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {t('inventory.low_stock_message', '{count}件の商品が在庫不足です（閾値: {threshold}以下）', {
                                count: items.length,
                                threshold: threshold
                            })}
                        </p>
                        <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                            {items.slice(0, 5).map(item => (
                                <li key={item.sku_id}>
                                    {item.product_name || item.product_code} ({item.color_name}, {item.size_name}): {item.quantity}個
                                </li>
                            ))}
                            {items.length > 5 && (
                                <li className="text-yellow-600 dark:text-yellow-400">
                                    {t('inventory.and_more', '他{count}件...', { count: items.length - 5 })}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
                <button
                    onClick={() => setIsDismissed(true)}
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default InventoryAlert;

