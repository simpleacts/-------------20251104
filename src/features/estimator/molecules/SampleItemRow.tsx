import React from 'react';
import { SampleItem } from '@shared/types';
import { TrashIcon, Button, Input } from '@components/atoms';

interface SampleItemRowProps {
    item: SampleItem;
    onUpdate: (updates: Partial<SampleItem>) => void;
    onRemove: () => void;
}

const NumberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { value: number | undefined | null; onChange: (value: number) => void; }> = ({ value, onChange, ...props }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = parseFloat(e.target.value);
        onChange(isNaN(num) ? 0 : num);
    };

    return (
        <Input
            type="number"
            value={value === 0 || value === undefined || value === null ? '' : String(value)}
            onChange={handleChange}
            placeholder="0"
            {...props}
        />
    );
};

const SampleItemRow: React.FC<SampleItemRowProps> = ({ item, onUpdate, onRemove }) => {
    const total = (item.unitPrice || 0) * (item.quantity || 0);

    return (
        <div className={`grid grid-cols-12 items-center gap-2 p-2 mb-1 rounded-md bg-blue-50 dark:bg-blue-900/20`}>
            <div className="col-span-4">
                <Input
                    type="text"
                    value={item.label}
                    placeholder="サンプル品名"
                    onChange={e => onUpdate({ label: e.target.value })}
                    className="w-full text-sm h-8"
                />
            </div>
            <div className="col-span-6 flex items-center gap-1 text-sm">
                <NumberInput
                    value={item.unitPrice}
                    onChange={val => onUpdate({ unitPrice: val })}
                    className="w-24 h-8 text-right"
                />
                <span className="px-1">×</span>
                <NumberInput
                    value={item.quantity}
                    onChange={val => onUpdate({ quantity: val })}
                    className="w-16 h-8 text-center"
                />
                <span className="px-1">=</span>
                <span className="font-mono font-semibold w-24 text-right">
                    ¥{total.toLocaleString()}
                </span>
            </div>
            <div className="col-span-2 text-right">
                <Button variant="ghost" size="sm" onClick={onRemove} aria-label="サンプル項目を削除">
                    <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </Button>
            </div>
        </div>
    );
};

export default SampleItemRow;