import React, { useMemo } from 'react';
import { OrderDetail } from '@shared/types';

interface ProductDiscountSectionProps {
    items: OrderDetail[];
}

const ProductDiscountSection: React.FC<ProductDiscountSectionProps> = ({ items }) => {
    const { totalDiscount, discountDetails } = useMemo(() => {
        let totalDiscount = 0;
        const discountDetails: { name: string; discount: number }[] = [];

        items.forEach(item => {
            if (item.unitPrice && typeof item.adjustedUnitPrice === 'number' && item.adjustedUnitPrice < item.unitPrice) {
                const discountPerItem = item.unitPrice - item.adjustedUnitPrice;
                const totalItemDiscount = discountPerItem * item.quantity;
                totalDiscount += totalItemDiscount;
                discountDetails.push({
                    name: `${item.productName} (${item.color}/${item.size})`,
                    discount: totalItemDiscount
                });
            }
        });

        return { totalDiscount, discountDetails };
    }, [items]);

    if (totalDiscount <= 0) {
        return null;
    }

    return (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
            <h4 className="font-semibold text-red-800 dark:text-red-200">商品割引</h4>
            <div className="flex justify-between items-center mt-1 text-red-700 dark:text-red-200">
                <span>合計割引額</span>
                <span className="font-bold text-base">- ¥{totalDiscount.toLocaleString()}</span>
            </div>
             <details className="text-xs mt-1">
                <summary className="cursor-pointer">割引内訳</summary>
                <ul className="pl-4 mt-1 space-y-0.5">
                    {discountDetails.map((detail, index) => (
                        <li key={index} className="flex justify-between">
                            <span className="truncate pr-2">{detail.name}</span>
                            <span>- ¥{detail.discount.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
};

export default ProductDiscountSection;