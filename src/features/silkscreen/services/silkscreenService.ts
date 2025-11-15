import { Database, OrderDetail, PricingData, PrintDesign, ProcessingGroup, Product, Row } from '@shared/types';

export const calculateSilkscreenPrintCost = (
    group: ProcessingGroup,
    allProducts: Product[],
    pricing: PricingData,
    customerInfo: CustomerInfo,
    database: Database
): {
    totalPrintCost: number;
    printCostDetail: {
        base: number;
        byItem: number;
        bySize: number;
        byInk: number;
        byLocation: number;
        byPlateType: number;
    };
    designPrintCosts?: { designId: string; totalCost: number; detail?: any }[];
} => {
    const totalQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity === 0) {
        return { totalPrintCost: 0, printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 }, designPrintCosts: [] };
    }

    const firstProductId = group.items[0]?.productId;
    const product = allProducts.find(p => p.id === firstProductId);
    const categoryId = product?.categoryId;

    const categoryPricingSchedule = database.category_pricing_schedules?.data.find(
        (s: Row) => s.category_id === categoryId && (s.customer_group_id === customerInfo.customer_group_id || s.customer_group_id === 1 || s.customer_group_id === '1')
    );

    const scheduleId = categoryPricingSchedule?.schedule_id ?? 1;
    const relevantTiers = pricing.printPricingTiers.filter(t => String(t.schedule_id) === String(scheduleId));
    
    const tier = relevantTiers.find(t => totalQuantity >= t.min && totalQuantity <= t.max);
    if (!tier) {
        return { totalPrintCost: 0, printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 }, designPrintCosts: [] };
    }

    let totalPrintCost = 0;
    const printCostDetail: { base: number; byItem: number; bySize: number; byInk: number; byLocation: number; byPlateType: number; } = {
        base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0
    };
    const designPrintCosts: { designId: string; totalCost: number; detail?: any }[] = [];

    const silkscreenDesigns = group.printDesigns.filter(d => d.printMethod === 'silkscreen');

    silkscreenDesigns.forEach(design => {
        const colors = design.colors || 0;
        if (colors <= 0) return;

        const basePricePerItem = tier.firstColor + (tier.additionalColor * Math.max(0, colors - 1));
        
        const inkCostPerItem = (design.specialInks || []).reduce((sum, ink) => {
            const inkInfo = pricing.specialInkOptions.find(o => o.type === ink.type);
            return sum + ((inkInfo?.cost || 0) * ink.count);
        }, 0);
        
        const sizeCostPerItem = pricing.additionalPrintCostsBySize[design.size!] || 0;
        const locationCostPerItem = pricing.additionalPrintCostsByLocation[design.location!] || 0;

        const unitPrintPrice = basePricePerItem + inkCostPerItem + sizeCostPerItem + locationCostPerItem;
        const designTotalPrintCost = unitPrintPrice * totalQuantity;

        totalPrintCost += designTotalPrintCost;

        printCostDetail.base += basePricePerItem * totalQuantity;
        printCostDetail.byInk += inkCostPerItem * totalQuantity;
        printCostDetail.bySize += sizeCostPerItem * totalQuantity;
        printCostDetail.byLocation += locationCostPerItem * totalQuantity;
        
        designPrintCosts.push({
            designId: design.id,
            totalCost: designTotalPrintCost,
            detail: {
                base: basePricePerItem * totalQuantity,
                byInk: inkCostPerItem * totalQuantity,
                bySize: sizeCostPerItem * totalQuantity,
                byLocation: locationCostPerItem * totalQuantity,
            }
        });
    });

    const itemTags = new Set(group.items.flatMap(item => {
        const p = allProducts.find(prod => prod.id === item.productId);
        return p ? p.tags : [];
    }));
    
    let itemSurcharge = 0;
    itemTags.forEach(tagId => {
        const cost = pricing.additionalPrintCostsByTag[tagId] || 0;
        if (cost > itemSurcharge) {
            itemSurcharge = cost;
        }
    });
    const totalItemSurcharge = itemSurcharge * totalQuantity;
    printCostDetail.byItem = totalItemSurcharge;
    totalPrintCost += totalItemSurcharge;
    
    let plateTypeSurcharge = 0;
    silkscreenDesigns.forEach(design => {
        if (design.plateType === 'decomposition' && design.colors && design.colors > 0) {
            const key = `${design.size}-${design.plateType}`;
            const plateCostRule = pricing.plateCosts[key];
            if (plateCostRule && plateCostRule.surchargePerColor > 0) {
                plateTypeSurcharge += plateCostRule.surchargePerColor * design.colors;
            }
        }
    });
    printCostDetail.byPlateType = plateTypeSurcharge;
    totalPrintCost += plateTypeSurcharge;

    return { totalPrintCost, printCostDetail, designPrintCosts };
};

export const calculateSilkscreenSetupCost = (
    silkscreenDesigns: PrintDesign[],
    pricing: PricingData,
    isReorder?: boolean
): {
    totalSetupCost: number;
    setupCostDetail: Record<string, number>;
} => {
    if (isReorder) {
        return {
            totalSetupCost: 0,
            setupCostDetail: {},
        };
    }

    let totalSetupCost = 0;
    const setupCostDetail: Record<string, number> = {};

    silkscreenDesigns.forEach(design => {
        if (!design.size || !design.plateType || !design.colors || design.colors <= 0) {
            setupCostDetail[design.id] = 0;
            return;
        }

        const key = `${design.size}-${design.plateType}`;
        const plateCostRule = pricing.plateCosts[key];

        if (plateCostRule) {
            const costForDesign = plateCostRule.cost * design.colors;
            setupCostDetail[design.id] = costForDesign;
            totalSetupCost += costForDesign;
        } else {
            setupCostDetail[design.id] = 0;
        }
    });

    return { totalSetupCost, setupCostDetail };
};