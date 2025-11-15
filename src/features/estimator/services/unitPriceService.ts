import { GroupCost } from '@shared/types';

/**
 * Calculates the average labor unit price for a processing group.
 * This includes all costs except the product cost itself, divided by the total number of items.
 * @param groupCost The cost breakdown for a specific processing group.
 * @returns The calculated labor unit price, rounded to the nearest integer.
 */
export const calculateLaborUnitPrice = (groupCost: GroupCost): number => {
    const totalGroupQuantity = groupCost.quantity;
    if (totalGroupQuantity === 0) return 0;

    const processingFeeTotal = (groupCost.silkscreenPrintCost || 0) +
                               (groupCost.dtfPrintCost || 0) +
                               (groupCost.setupCost || 0) +
                               (groupCost.additionalOptionsCost || 0) +
                               (groupCost.customItemsCost || 0) +
                               (groupCost.sampleItemsCost || 0);

    return Math.round(processingFeeTotal / totalGroupQuantity);
};

/**
 * Calculates the average selling unit price for sold items in a processing group.
 * This is the average material cost plus the labor unit price.
 * @param groupCost The cost breakdown for a specific processing group.
 * @param laborUnitPrice The pre-calculated labor unit price from `calculateLaborUnitPrice`.
 * @returns The calculated sales unit price, rounded to the nearest integer.
 */
export const calculateSalesUnitPrice = (groupCost: GroupCost, laborUnitPrice: number): number => {
    const salesQuantity = groupCost.quantity - (groupCost.bringInQuantity || 0);
    if (salesQuantity === 0) return 0;

    // tshirtCost already reflects any discounts applied.
    const salesItemCostPerItem = Math.round(groupCost.tshirtCost / salesQuantity);

    return salesItemCostPerItem + laborUnitPrice;
};