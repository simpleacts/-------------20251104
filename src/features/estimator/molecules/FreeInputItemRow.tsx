import React, { useMemo } from 'react';
import { CustomItem } from '@shared/types';
import { TrashIcon, Button, Input, Select } from '@components/atoms';
import { useDatabase } from '@core/contexts/DatabaseContext';

interface FreeInputItemRowProps {
    item: CustomItem;
    onUpdate: (updates: Partial<CustomItem>) => void;
    onRemove: () => void;
}

// 数値入力のUXを改善するラッパーコンポーネント
const NumberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { value: number | undefined | null; onChange: (value: number) => void; }> = ({ value, onChange, id, name, ...props }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = parseFloat(e.target.value);
        onChange(isNaN(num) ? 0 : num);
    };

    return (
        <Input
            id={id}
            name={name}
            type="number"
            value={value === 0 || value === undefined || value === null ? '' : String(value)}
            onChange={handleChange}
            placeholder="0"
            {...props}
        />
    );
};

const FreeInputItemRow: React.FC<FreeInputItemRowProps> = ({ item, onUpdate, onRemove }) => {
    const { database } = useDatabase();
    
    // データベースから調整項目タイプを取得（sort_orderでソート）
    const freeInputItemTypes = useMemo(() => {
        const types = database?.free_input_item_types?.data || [];
        return [...types].sort((a, b) => {
            const aOrder = (a.sort_order as number) || 0;
            const bOrder = (b.sort_order as number) || 0;
            return aOrder - bOrder;
        });
    }, [database?.free_input_item_types]);

    // データベースから取得したタイプでquantity_basedかどうかを判定
    const isQuantityBased = useMemo(() => {
        const quantityBasedType = freeInputItemTypes.find(type => type.code === 'quantity_based');
        return item.type === (quantityBasedType?.code as string) || item.type === 'quantity_based';
    }, [item.type, freeInputItemTypes]);

    const handleTypeChange = (newType: string) => {
        const updates: Partial<CustomItem> = { type: newType };
        if (newType === 'quantity_based') {
            // amount_onlyから切り替えた時、amountを単価と見なして再計算
            updates.unitPrice = item.amount;
            updates.quantity = item.quantity || 1;
            updates.amount = item.amount * (item.quantity || 1);
        } else {
            // quantity_basedから切り替えた時、合計金額を維持
            updates.amount = item.amount;
        }
        onUpdate(updates);
    };

    const handleFieldChange = (field: 'label' | 'unitPrice' | 'quantity' | 'amount', value: any) => {
        if (isQuantityBased && (field === 'unitPrice' || field === 'quantity')) {
            const newUnitPrice = field === 'unitPrice' ? Number(value) : (item.unitPrice || 0);
            const newQuantity = field === 'quantity' ? Number(value) : (item.quantity || 0);
            onUpdate({
                [field]: value,
                amount: newUnitPrice * newQuantity
            });
        } else {
            onUpdate({ [field]: value });
        }
    };

    const inputId = `custom-item-${item.id}`;
    const typeSelectId = `custom-item-type-${item.id}`;
    const unitPriceId = `custom-item-unit-price-${item.id}`;
    const quantityId = `custom-item-quantity-${item.id}`;
    const amountId = `custom-item-amount-${item.id}`;

    return (
        <div className="grid grid-cols-12 items-center gap-2 p-2 mb-1 rounded-md bg-green-50 dark:bg-green-900/20">
            <div className="col-span-5">
                <label htmlFor={inputId} className="sr-only">項目名</label>
                <Input
                    id={inputId}
                    name={inputId}
                    type="text"
                    value={item.label}
                    placeholder="項目名 (例: サンプル作成費)"
                    onChange={e => onUpdate({ label: e.target.value })}
                    className="w-full text-sm h-8"
                />
            </div>
            <div className="col-span-2">
                <label htmlFor={typeSelectId} className="sr-only">項目タイプ</label>
                 <Select
                    id={typeSelectId}
                    name={typeSelectId}
                    value={item.type || (freeInputItemTypes.length > 0 ? (freeInputItemTypes[0].code as string) : '')}
                    onChange={e => handleTypeChange(e.target.value)}
                    className="text-xs h-8"
                >
                    {freeInputItemTypes.length === 0 ? (
                        <option value="">項目タイプを読み込み中...</option>
                    ) : (
                        freeInputItemTypes.map(type => (
                            <option key={type.id as string} value={type.code as string}>
                                {type.name}
                            </option>
                        ))
                    )}
                </Select>
            </div>
            <div className="col-span-4">
                {isQuantityBased ? (
                    <div className="flex items-center gap-1 text-sm">
                        <label htmlFor={unitPriceId} className="sr-only">単価</label>
                        <NumberInput
                            id={unitPriceId}
                            name={unitPriceId}
                            value={item.unitPrice}
                            onChange={val => handleFieldChange('unitPrice', val)}
                            className="w-24 h-8 text-right"
                        />
                        <span className="px-1">×</span>
                        <label htmlFor={quantityId} className="sr-only">数量</label>
                        <NumberInput
                            id={quantityId}
                            name={quantityId}
                            value={item.quantity}
                            onChange={val => handleFieldChange('quantity', val)}
                            className="w-16 h-8 text-center"
                        />
                    </div>
                ) : (
                    <>
                        <label htmlFor={amountId} className="sr-only">金額</label>
                        <NumberInput
                            id={amountId}
                            name={amountId}
                            value={item.amount}
                            onChange={val => handleFieldChange('amount', val)}
                            className="w-full h-8 text-right"
                        />
                    </>
                )}
            </div>
            <div className="col-span-1 text-right">
                <Button variant="ghost" size="sm" onClick={onRemove} aria-label="調整項目を削除">
                    <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </Button>
            </div>
        </div>
    );
};

export default FreeInputItemRow;