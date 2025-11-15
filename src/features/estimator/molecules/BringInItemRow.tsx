import React from 'react';
import type { OrderDetail } from '@shared/types';
import { TrashIcon, Button, Input } from '@components/atoms';

interface BringInItemRowProps {
    item: OrderDetail;
    onUpdate: (updates: Partial<OrderDetail>) => void;
    onRemove: () => void;
}

const BringInItemRow: React.FC<BringInItemRowProps> = ({ item, onUpdate, onRemove }) => {
    return (
        <div className="grid grid-cols-12 items-center gap-2 p-2 mb-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <div className="col-span-8 flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-200">[持ち込み]</span>
                <Input
                    type="text"
                    value={item.productName}
                    placeholder="持ち込み品名 (例: Tシャツ)"
                    onChange={e => onUpdate({ productName: e.target.value })}
                    className="w-full text-sm h-8"
                />
            </div>
            <div className="col-span-2">
                <Input
                    type="number"
                    min="1"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={e => onUpdate({ quantity: +e.target.value })}
                    className="w-full text-center h-8"
                    placeholder="0"
                />
            </div>
            <div className="col-span-2 text-right">
                <Button variant="ghost" size="sm" onClick={onRemove} aria-label="持ち込み品目を削除">
                    <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </Button>
            </div>
        </div>
    );
};

export default BringInItemRow;