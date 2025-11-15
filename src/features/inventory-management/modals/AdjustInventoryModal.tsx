import { Button, Input, Select, XMarkIcon } from '@components/atoms';
import { useTranslation } from '@shared/hooks/useTranslation';
import React, { useEffect, useState } from 'react';
import { InventoryItem } from '../hooks/useInventoryManagement';

interface AdjustInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    skuId: string | null;
    inventoryItems: InventoryItem[];
    onAdjust: (skuId: string, quantityChange: number, reason: string, notes?: string) => Promise<void>;
}

const AdjustInventoryModal: React.FC<AdjustInventoryModalProps> = ({
    isOpen,
    onClose,
    skuId,
    inventoryItems,
    onAdjust,
}) => {
    const { t } = useTranslation('inventory-management');
    const [selectedSkuId, setSelectedSkuId] = useState<string>(skuId || '');
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease' | 'set'>('increase');
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedItem = inventoryItems.find(item => item.sku_id === selectedSkuId);
    const currentQuantity = selectedItem?.quantity || 0;

    useEffect(() => {
        if (skuId) {
            setSelectedSkuId(skuId);
        }
    }, [skuId]);

    useEffect(() => {
        if (!isOpen) {
            // モーダルを閉じる際にリセット
            setSelectedSkuId(skuId || '');
            setAdjustmentType('increase');
            setQuantity('');
            setReason('');
            setNotes('');
        }
    }, [isOpen, skuId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSkuId || !quantity || !reason) {
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
            let quantityChange: number;
            if (adjustmentType === 'increase') {
                quantityChange = quantityNum;
            } else if (adjustmentType === 'decrease') {
                quantityChange = -quantityNum;
            } else {
                // set
                quantityChange = quantityNum - currentQuantity;
            }

            await onAdjust(selectedSkuId, quantityChange, reason, notes || undefined);
        } catch (error) {
            // エラーはonAdjust内で処理される
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const calculatedQuantity = adjustmentType === 'set'
        ? quantity ? parseFloat(quantity) : currentQuantity
        : adjustmentType === 'increase'
        ? currentQuantity + (quantity ? parseFloat(quantity) : 0)
        : currentQuantity - (quantity ? parseFloat(quantity) : 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b border-default dark:border-default-dark">
                    <h2 className="text-xl font-bold">
                        {t('inventory.adjust_stock', '在庫調整')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted dark:text-muted-dark hover:text-base-content dark:hover:text-base-dark"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="sku-select" className="block text-sm font-medium mb-1">
                            {t('inventory.select_sku', 'SKUを選択')} *
                        </label>
                        <Select
                            id="sku-select"
                            name="sku-select"
                            value={selectedSkuId}
                            onChange={(e) => setSelectedSkuId(e.target.value)}
                            required
                            disabled={!!skuId} // skuIdが指定されている場合は変更不可
                        >
                            <option value="">{t('inventory.select_sku_placeholder', 'SKUを選択してください')}</option>
                            {inventoryItems.map(item => (
                                <option key={item.sku_id} value={item.sku_id}>
                                    {item.sku_id} - {item.product_name || item.product_code} ({item.color_name}, {item.size_name}) - 現在: {item.quantity}個
                                </option>
                            ))}
                        </Select>
                    </div>

                    {selectedItem && (
                        <div className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-md">
                            <p className="text-sm">
                                <strong>{t('inventory.current_stock', '現在の在庫数')}:</strong> {currentQuantity}個
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="adjustment-type" className="block text-sm font-medium mb-1">
                            {t('inventory.adjustment_type', '調整タイプ')} *
                        </label>
                        <Select
                            id="adjustment-type"
                            name="adjustment-type"
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value as 'increase' | 'decrease' | 'set')}
                            required
                        >
                            <option value="increase">{t('inventory.increase', '増加')}</option>
                            <option value="decrease">{t('inventory.decrease', '減少')}</option>
                            <option value="set">{t('inventory.set', '設定')}</option>
                        </Select>
                    </div>

                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                            {adjustmentType === 'set' 
                                ? t('inventory.new_quantity', '新しい在庫数') 
                                : t('inventory.quantity', '数量')} *
                        </label>
                        <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="0"
                            step="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                        />
                        {adjustmentType !== 'set' && (
                            <p className="text-xs text-muted dark:text-muted-dark mt-1">
                                {t('inventory.after_adjustment', '調整後の在庫数: {quantity}個', { quantity: calculatedQuantity })}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium mb-1">
                            {t('inventory.reason', '理由')} *
                        </label>
                        <Select
                            id="reason"
                            name="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="">{t('inventory.select_reason', '理由を選択してください')}</option>
                            <option value="purchase">{t('inventory.reason_purchase', '仕入れ')}</option>
                            <option value="sale">{t('inventory.reason_sale', '販売')}</option>
                            <option value="return">{t('inventory.reason_return', '返品')}</option>
                            <option value="damage">{t('inventory.reason_damage', '破損')}</option>
                            <option value="loss">{t('inventory.reason_loss', '紛失')}</option>
                            <option value="adjustment">{t('inventory.reason_adjustment', '棚卸調整')}</option>
                            <option value="other">{t('inventory.reason_other', 'その他')}</option>
                        </Select>
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium mb-1">
                            {t('inventory.notes', '備考')}
                        </label>
                        <Input
                            id="notes"
                            name="notes"
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('inventory.notes_placeholder', '任意の備考を入力')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            disabled={isSubmitting}
                        >
                            {t('common.cancel', 'キャンセル')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting || !selectedSkuId || !quantity || !reason}
                        >
                            {isSubmitting ? t('common.saving', '保存中...') : t('common.save', '保存')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdjustInventoryModal;

