// FIX: Corrected import path for dtfService.
import {
    AppData,
    CostDetails,
    CustomerInfo,
    Database,
    EstimationParams,
    GroupCost,
    OrderDetail,
    Product,
} from '../../../shared/types';
import {
    DtfConsumable,
    DtfElectricityRate,
    DtfEquipment,
    DtfLaborCost,
    DtfPressTimeCost,
    DtfPrintSettings,
} from '../../dtf/types';
import { calculateDtfPrintCost } from '../../dtf/services/dtfService';
import {
    calculateSilkscreenPrintCost,
    calculateSilkscreenSetupCost,
} from '../../silkscreen/services/silkscreenService';
import { calculateAdditionalOptionsCost } from './additionalOptionsService';
import { calculateTshirtAndUnitPrice } from './productService';
import { calculateShippingCost } from './shippingService';


/**
 * 見積もり全体のコストを計算するメイン関数
 */
export const calculateCost = (
    params: EstimationParams,
    allProducts: Product[],
    customerInfo: CustomerInfo,
    appData: AppData,
    dtfData: {
        consumables: DtfConsumable[];
        equipment: DtfEquipment[];
        laborCosts: DtfLaborCost[];
        pressTimeCosts: DtfPressTimeCost[];
        electricityRates: DtfElectricityRate[];
    },
    dtfPrintSettings: DtfPrintSettings,
    options: { isReorder?: boolean; isBringInMode?: boolean } = {},
    database: Database // Add database to pass down
): { costDetails: CostDetails; updatedItems: OrderDetail[] } => {
    const { processingGroups } = params;
    const { isReorder, isBringInMode } = options;
    const { pricing, colors } = appData;

    let totalTshirtCost = 0;
    let totalSilkscreenPrintCost = 0;
    let totalDtfPrintCost = 0;
    let totalSetupCost = 0;
    let totalAdditionalOptionsCost = 0;
    let totalCustomItemsCost = 0;
    let totalProductDiscount = 0;
    let totalSampleItemsCost = 0;
    
    const allUpdatedItems: OrderDetail[] = [];
    const groupCosts: GroupCost[] = [];

    const finalPrintCostDetail: CostDetails['printCostDetail'] = { base: 0, byDtf: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 };
    let finalSetupCostDetail: Record<string, number> = {};
    const finalAdditionalOptionsCostDetail: Record<string, number> = {};
    
    processingGroups.forEach(group => {
        const { tshirtCost: standardTshirtCost, updatedItems } = calculateTshirtAndUnitPrice(group.items, allProducts, customerInfo, pricing, colors, isBringInMode);
        
        allUpdatedItems.push(...updatedItems);
        
        let adjustedTshirtCost = 0;
        let groupProductDiscount = 0;
        updatedItems.forEach(item => {
            const groupItem = group.items.find(i => i.productId === item.productId && i.color === item.color && i.size === item.size);
            const finalUnitPrice = groupItem?.adjustedUnitPrice ?? item.unitPrice;
            adjustedTshirtCost += finalUnitPrice * item.quantity;
            
            if (typeof groupItem?.adjustedUnitPrice === 'number' && groupItem.adjustedUnitPrice < item.unitPrice) {
                groupProductDiscount += (item.unitPrice - groupItem.adjustedUnitPrice) * item.quantity;
            }
        });

        totalTshirtCost += adjustedTshirtCost;
        totalProductDiscount += groupProductDiscount;

        const silkscreenDesigns = group.printDesigns.filter(d => d.printMethod === 'silkscreen');
        const dtfDesigns = group.printDesigns.filter(d => d.printMethod === 'dtf');

        const { totalPrintCost: groupSilkscreenPrintCost, printCostDetail, designPrintCosts: silkscreenDesignPrintCosts } = calculateSilkscreenPrintCost(group, allProducts, pricing, customerInfo, database);
        const { totalSetupCost: groupSetupCost, setupCostDetail } = calculateSilkscreenSetupCost(silkscreenDesigns, pricing, isReorder);
        
        const printQuantity = group.items.filter(i => !i.isBringIn).reduce((sum, item) => sum + item.quantity, 0);
        const bringInQuantity = group.items.filter(i => i.isBringIn).reduce((sum, item) => sum + item.quantity, 0);
        const totalPrintQuantity = printQuantity + bringInQuantity;

        const { totalDtfPrintCost: groupDtfPrintCost, designPrintCosts: dtfDesignPrintCosts } = calculateDtfPrintCost(dtfDesigns, totalPrintQuantity, dtfData, dtfPrintSettings, pricing);

        const { totalOptionsCost: groupAdditionalOptionsCost, optionsCostDetail } = calculateAdditionalOptionsCost(group, appData);
        
        const groupCustomItemsCost = (group.customItems || []).reduce((sum, item) => sum + item.amount, 0);
        totalCustomItemsCost += groupCustomItemsCost;

        const groupSampleItemsCost = (group.sampleItems || []).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        totalSampleItemsCost += groupSampleItemsCost;
        
        totalSilkscreenPrintCost += groupSilkscreenPrintCost;
        totalDtfPrintCost += groupDtfPrintCost;
        totalSetupCost += groupSetupCost;
        totalAdditionalOptionsCost += groupAdditionalOptionsCost;

        groupCosts.push({
            groupId: group.id,
            groupName: group.name,
            tshirtCost: adjustedTshirtCost,
            silkscreenPrintCost: groupSilkscreenPrintCost,
            dtfPrintCost: groupDtfPrintCost,
            setupCost: groupSetupCost,
            quantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
            additionalOptionsCost: groupAdditionalOptionsCost,
            customItemsCost: groupCustomItemsCost,
            productDiscount: groupProductDiscount,
            sampleItemsCost: groupSampleItemsCost,
            bringInQuantity: bringInQuantity,
            printCostDetail,
            designPrintCosts: [...(silkscreenDesignPrintCosts || []), ...(dtfDesignPrintCosts || [])],
            setupCostDetail,
            additionalOptionsCostDetail: optionsCostDetail
        });
        
        // Aggregate details
        finalPrintCostDetail.base += printCostDetail.base;
        finalPrintCostDetail.byItem += printCostDetail.byItem;
        finalPrintCostDetail.bySize += printCostDetail.bySize;
        finalPrintCostDetail.byInk += printCostDetail.byInk;
        finalPrintCostDetail.byDtf += groupDtfPrintCost;
        finalSetupCostDetail = { ...finalSetupCostDetail, ...setupCostDetail };
        Object.entries(optionsCostDetail).forEach(([name, cost]) => {
            finalAdditionalOptionsCostDetail[name] = (finalAdditionalOptionsCostDetail[name] || 0) + cost;
        });
    });

    const totalPrintCost = totalSilkscreenPrintCost + totalDtfPrintCost;
    const subtotal = totalTshirtCost + totalPrintCost + totalSetupCost + totalAdditionalOptionsCost + totalCustomItemsCost + totalSampleItemsCost;
    
    const shippingCost = calculateShippingCost(subtotal, customerInfo, pricing);
    const tax = Math.floor((subtotal + shippingCost) * 0.1);
    const totalCostWithTax = subtotal + shippingCost + tax;
    
    const totalQuantity = allUpdatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const costPerShirt = totalQuantity > 0 ? Math.round(totalCostWithTax / totalQuantity) : 0;
    
    const costDetails: CostDetails = {
        totalCost: subtotal,
        shippingCost,
        tax,
        totalCostWithTax,
        costPerShirt,
        tshirtCost: totalTshirtCost,
        printCost: totalPrintCost,
        setupCost: totalSetupCost,
        additionalOptionsCost: totalAdditionalOptionsCost,
        totalCustomItemsCost,
        totalProductDiscount,
        totalSampleItemsCost,
        printCostDetail: finalPrintCostDetail,
        setupCostDetail: finalSetupCostDetail,
        additionalOptionsCostDetail: finalAdditionalOptionsCostDetail,
        groupCosts
    };

    return { costDetails, updatedItems: allUpdatedItems };
};