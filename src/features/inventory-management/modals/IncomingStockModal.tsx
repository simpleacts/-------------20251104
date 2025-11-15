import { Button, CheckIcon, Input, TrashIcon, XMarkIcon } from '@components/atoms';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Row } from '@shared/types';
import React, { useEffect, useMemo, useState } from 'react';
import { InventoryItem } from '../hooks/useInventoryManagement';

interface IncomingStockItem extends Row {
    id: string;
    sku_id: string;
    quantity: number;
    arrival_date: string;
}

interface IncomingStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    skuId: string | null;
    inventoryItems: InventoryItem[];
    incomingStockData: IncomingStockItem[];
    onAdd: (skuId: string, quantity: number, arrivalDate: string) => Promise<void>;
    onUpdate: (incomingId: string, quantity: number, arrivalDate: string) => Promise<void>;
    onDelete: (incomingId: string) => Promise<void>;
    onReceive: (incomingId: string) => Promise<void>;
}

const IncomingStockModal: React.FC<IncomingStockModalProps> = ({
    isOpen,
    onClose,
    skuId,
    inventoryItems,
    incomingStockData,
    onAdd,
    onUpdate,
    onDelete,
    onReceive,
}) => {
    const { t } = useTranslation('inventory-management');
    const [selectedSkuId, setSelectedSkuId] = useState<string>(skuId || '');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [arrivalDate, setArrivalDate] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedItem = inventoryItems.find(item => item.sku_id === selectedSkuId);
    const filteredIncomingStock = useMemo(() => {
        if (!selectedSkuId) return [];
        return incomingStockData.filter(inc => inc.sku_id === selectedSkuId);
    }, [incomingStockData, selectedSkuId]);

    useEffect(() => {
        if (skuId) {
            setSelectedSkuId(skuId);
        }
    }, [skuId]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedSkuId(skuId || '');
            setEditingId(null);
            setQuantity('');
            setArrivalDate('');
        }
    }, [isOpen, skuId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSkuId || !quantity || !arrivalDate) {
            alert(t('inventory.fill_required', '必須項目を入力してください。'));
            return;
        }

        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            alert(t('inventory.invalid_quantity', '有効な数量を入力してください。'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd(selectedSkuId, quantityNum, arrivalDate);
            setQuantity('');
            setArrivalDate('');
        } catch (error) {
            // エラーはonAdd内で処理される
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: IncomingStockItem) => {
        setEditingId(item.id);
        setQuantity(String(item.quantity));
        setArrivalDate(item.arrival_date);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId || !quantity || !arrivalDate) {
            alert(t('inventory.fill_required', '必須項目を入力してください。'));
            return;
        }

        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            alert(t('inventory.invalid_quantity', '有効な数量を入力してください。'));
            return;
        }

        setIsSubmitting(true);
        try {
            await onUpdate(editingId, quantityNum, arrivalDate);
            setEditingId(null);
            setQuantity('');
            setArrivalDate('');
        } catch (error) {
            // エラーはonUpdate内で処理される
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setQuantity('');
        setArrivalDate('');
    };

    const handleDelete = async (incomingId: string) => {
        if (!window.confirm(t('inventory.confirm_delete', 'この入荷予定を削除しますか？'))) {
            return;
        }

        try {
            await onDelete(incomingId);
        } catch (error) {
            // エラーはonDelete内で処理される
        }
    };

    const handleReceive = async (incomingId: string) => {
        if (!window.confirm(t('inventory.confirm_receive', 'この入荷予定を在庫に反映しますか？'))) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onReceive(incomingId);
        } catch (error) {
            // エラーはonReceive内で処理される
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark flex-shrink-0">
                    <h2 className="text-xl font-bold">
                        {t('inventory.incoming_stock_management', '入荷予定管理')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted dark:text-muted-dark hover:text-base-content dark:hover:text-base-dark"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-default dark:border-default-dark flex-shrink-0">
                    <div>
                        <label htmlFor="incoming-sku-select" className="block text-sm font-medium mb-1">
                            {t('inventory.select_sku', 'SKUを選択')} *
                        </label>
                        <select
                            id="incoming-sku-select"
                            name="incoming-sku-select"
                            value={selectedSkuId}
                            onChange={(e) => setSelectedSkuId(e.target.value)}
                            className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-base-100 dark:bg-base-dark-200"
                            disabled={inventoryItems.length === 0}
                        >
                            <option value="">{t('inventory.select_sku_placeholder', 'SKUを選択してください')}</option>
                            {inventoryItems.map(item => (
                                <option key={item.sku_id} value={item.sku_id}>
                                    {item.sku_id} - {item.product_name || item.product_code} ({item.color_name}, {item.size_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedItem && (
                        <div className="mt-3 p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                            <p className="text-sm">
                                <strong>{t('inventory.current_stock', '現在の在庫数')}:</strong> {selectedItem.quantity}個
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto p-4">
                    {/* 新規追加フォーム */}
                    {selectedSkuId && !editingId && (
                        <form onSubmit={handleAdd} className="mb-6 p-4 bg-base-200 dark:bg-base-dark-300 rounded-md">
                            <h3 className="text-lg font-semibold mb-3">{t('inventory.add_incoming', '入荷予定を追加')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="incoming-quantity" className="block text-sm font-medium mb-1">
                                        {t('inventory.quantity', '数量')} *
                                    </label>
                                    <Input
                                        id="incoming-quantity"
                                        name="incoming-quantity"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="incoming-date" className="block text-sm font-medium mb-1">
                                        {t('inventory.arrival_date', '入荷予定日')} *
                                    </label>
                                    <Input
                                        id="incoming-date"
                                        name="incoming-date"
                                        type="date"
                                        value={arrivalDate}
                                        onChange={(e) => setArrivalDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isSubmitting || !quantity || !arrivalDate}
                                        className="w-full"
                                    >
                                        {isSubmitting ? t('common.saving', '保存中...') : t('common.add', '追加')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* 編集フォーム */}
                    {editingId && (
                        <form onSubmit={handleUpdate} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                            <h3 className="text-lg font-semibold mb-3">{t('inventory.edit_incoming', '入荷予定を編集')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="edit-quantity" className="block text-sm font-medium mb-1">
                                        {t('inventory.quantity', '数量')} *
                                    </label>
                                    <Input
                                        id="edit-quantity"
                                        name="edit-quantity"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="edit-date" className="block text-sm font-medium mb-1">
                                        {t('inventory.arrival_date', '入荷予定日')} *
                                    </label>
                                    <Input
                                        id="edit-date"
                                        name="edit-date"
                                        type="date"
                                        value={arrivalDate}
                                        onChange={(e) => setArrivalDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isSubmitting || !quantity || !arrivalDate}
                                    >
                                        {isSubmitting ? t('common.saving', '保存中...') : t('common.save', '保存')}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        variant="secondary"
                                        disabled={isSubmitting}
                                    >
                                        {t('common.cancel', 'キャンセル')}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* 入荷予定一覧 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">{t('inventory.incoming_list', '入荷予定一覧')}</h3>
                        {filteredIncomingStock.length === 0 ? (
                            <div className="text-center py-8 text-muted dark:text-muted-dark">
                                {t('inventory.no_incoming', '入荷予定がありません。')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-default dark:border-default-dark bg-base-200 dark:bg-base-dark-300">
                                            <th className="text-left p-3 text-sm font-semibold">{t('inventory.quantity', '数量')}</th>
                                            <th className="text-left p-3 text-sm font-semibold">{t('inventory.arrival_date', '入荷予定日')}</th>
                                            <th className="text-left p-3 text-sm font-semibold">{t('inventory.actions', '操作')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredIncomingStock.map((item) => {
                                            const isPast = new Date(item.arrival_date) < new Date();
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`border-b border-default dark:border-default-dark hover:bg-base-200 dark:hover:bg-base-dark-300 ${
                                                        isPast ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                                                    }`}
                                                >
                                                    <td className="p-3 text-sm font-semibold">{item.quantity}</td>
                                                    <td className={`p-3 text-sm ${
                                                        isPast ? 'text-yellow-600 dark:text-yellow-400' : ''
                                                    }`}>
                                                        {item.arrival_date}
                                                        {isPast && (
                                                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                                                                ({t('inventory.past_date', '過去の日付')})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            {!isPast && (
                                                                <Button
                                                                    onClick={() => handleReceive(item.id)}
                                                                    variant="primary"
                                                                    size="sm"
                                                                    disabled={isSubmitting}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <CheckIcon className="w-4 h-4" />
                                                                    {t('inventory.receive', '入荷処理')}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                onClick={() => handleEdit(item)}
                                                                variant="secondary"
                                                                size="sm"
                                                                disabled={isSubmitting || !!editingId}
                                                                className="flex items-center gap-1"
                                                            >
                                                                {t('common.edit', '編集')}
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(item.id)}
                                                                variant="danger"
                                                                size="sm"
                                                                disabled={isSubmitting}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                                {t('common.delete', '削除')}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end p-4 border-t border-default dark:border-default-dark flex-shrink-0">
                    <Button onClick={onClose} variant="secondary">
                        {t('common.close', '閉じる')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default IncomingStockModal;

