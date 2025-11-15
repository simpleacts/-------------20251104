import React, { useId } from 'react';
import { OrderDetail } from '../../types';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { TrashIcon } from '../atoms/icons';
import ToggleSwitch from '../atoms/ToggleSwitch';

interface OrderDetailRowProps {
  item: OrderDetail;
  onUpdate: (updates: Partial<OrderDetail>) => void;
  onRemove: () => void;
  isPriceEditing: boolean; // Individual toggle state
  onPriceEditToggle: (isEditing: boolean) => void;
  isAllPriceEditing: boolean; // Master toggle state from parent
}

const OrderDetailRow: React.FC<OrderDetailRowProps> = ({ item, onUpdate, onRemove, isPriceEditing, onPriceEditToggle, isAllPriceEditing }) => {
    const showAdjustedPriceInput = isPriceEditing || isAllPriceEditing;
    const adjustedPriceId = useId();
    const quantityId = useId();

    const handleToggle = () => {
        const newIsEditing = !isPriceEditing;
        onPriceEditToggle(newIsEditing);
        if (!newIsEditing && item.adjustedUnitPrice !== undefined) {
             onUpdate({ adjustedUnitPrice: undefined });
        }
    };

    const handleAdjustedPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onUpdate({ adjustedUnitPrice: value === '' ? undefined : +value });
    };

    return (
        <div className="grid grid-cols-12 items-center gap-x-2 gap-y-2 p-2 mb-1 bg-container-muted-bg dark:bg-container-muted-bg-dark rounded-md text-sm">
            {/* Col 1: Toggle */}
            <div className="col-span-1 flex justify-center items-center h-full">
                <ToggleSwitch checked={isPriceEditing} onChange={handleToggle} />
            </div>

            {/* Col 2-5: Product Info */}
            <div className="col-span-11 md:col-span-4">
                <p className="font-semibold truncate">{item.productName}</p>
                <p className="text-xs text-muted dark:text-muted-dark">{`${item.color} / ${item.size}`}</p>
            </div>
            
            {/* Col 6-7: Adjusted Price */}
            <div className="col-span-12 md:col-span-2">
                 <label htmlFor={adjustedPriceId} className="md:hidden text-xs text-muted dark:text-muted-dark">調整後単価</label>
                 {showAdjustedPriceInput ? (
                    <Input 
                        id={adjustedPriceId}
                        name="adjusted_unit_price"
                        type="number"
                        value={item.adjustedUnitPrice ?? ''}
                        onChange={handleAdjustedPriceChange}
                        className="w-full p-1 h-8 text-right"
                        placeholder="調整単価"
                    />
                 ) : (
                    <div className="w-full p-1 h-8 text-right text-muted flex items-center justify-end">--</div>
                 )}
            </div>
            
            {/* Col 8-9: Quantity */}
            <div className="col-span-6 md:col-span-2">
                <label htmlFor={quantityId} className="md:hidden text-xs text-muted dark:text-muted-dark">数量</label>
                <Input 
                    id={quantityId}
                    name="quantity"
                    type="number" 
                    min="0" 
                    value={item.quantity === 0 ? '' : item.quantity} 
                    onChange={e => onUpdate({ quantity: +e.target.value })}
                    className="w-full p-1 h-8 text-center"
                />
            </div>

            {/* Col 10-11: Selling Price */}
            <div className="col-span-6 md:col-span-2 text-right font-mono pr-2 flex flex-col items-end justify-center h-8">
                <label className="md:hidden text-xs text-muted dark:text-muted-dark">売値</label>
                <span>¥{(item.unitPrice || 0).toLocaleString()}</span>
            </div>
            
            {/* Col 12: Delete */}
            <div className="col-span-12 md:col-span-1 text-right">
                <Button variant="ghost" size="sm" onClick={onRemove} aria-label="明細を削除">
                <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </Button>
            </div>
        </div>
    );
};

export default OrderDetailRow;