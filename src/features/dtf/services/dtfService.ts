import { PricingData, PrintDesign } from '@shared/types';
import { DtfConsumable, DtfElectricityRate, DtfEquipment, DtfLaborCost, DtfPressTimeCost, DtfPrintSettings } from '../types';

export interface DtfCalculationInputs {
    logoWidthMm: number;
    logoHeightMm: number;
    logoQuantity: number;
    profitMargin: number;
    roundUpTo10: boolean;
}

interface DtfData {
    consumables: DtfConsumable[];
    equipment: DtfEquipment[];
    laborCosts: DtfLaborCost[];
    pressTimeCosts: DtfPressTimeCost[];
    electricityRates: DtfElectricityRate[];
}

export interface DtfCalculationResult {
    costPerItem: number;
    sellingPricePerItem: number;
    detailsPerItem: {
        film: number;
        whiteInk: number;
        colorInk: number;
        powder: number;
        setup: number;
        equipmentAndPrintLabor: number;
        electricity: number;
        press: number;
    };
    totalFilmLengthMeters: number;
    printTimeHours: number;
}

export const calculateLayout = (logoWidthMm: number, logoHeightMm: number, logoQuantity: number, printSettings: DtfPrintSettings) => {
    const logosPerRow = Math.floor((printSettings.filmWidthMm + printSettings.logoMarginMm) / (logoWidthMm + printSettings.logoMarginMm));
    if (logosPerRow <= 0) return { logosPerRow: 0, totalFilmLengthMeters: 0 };
    const rowsNeeded = Math.ceil(logoQuantity / logosPerRow);
    const totalFilmLengthMm = rowsNeeded * (logoHeightMm + printSettings.logoMarginMm);
    return { logosPerRow, totalFilmLengthMeters: totalFilmLengthMm / 1000 };
};

export const calculateConsumableCost = (logoAreaCm2: number, totalFilmLengthMeters: number, logoQuantity: number, dtfData: DtfData) => {
    const getConsumable = (type: DtfConsumable['type']) => dtfData.consumables.find(c => c.type === type) || { unit_price: 0, consumption_rate: 0, unit: 'L' };
    
    const film = getConsumable('film');
    const inkWhite = getConsumable('ink_white');
    const inkColor = getConsumable('ink_color');
    const powder = getConsumable('powder');

    const filmCostPerMeter = (film.unit_price as number) / 100; // Assuming price is for 100m roll
    const totalFilmCost = totalFilmLengthMeters * filmCostPerMeter;

    const totalPrintAreaCm2 = logoAreaCm2 * logoQuantity;
    const whiteInkCostPerCm2 = (inkWhite.unit_price as number / 1000) * (inkWhite.consumption_rate as number);
    const totalWhiteInkCost = totalPrintAreaCm2 * whiteInkCostPerCm2;

    const colorInkCostPerCm2 = (inkColor.unit_price as number / 1000) * (inkColor.consumption_rate as number);
    const totalColorInkCost = totalPrintAreaCm2 * colorInkCostPerCm2;

    const powderCostPerCm2 = (powder.unit_price as number / 1000) * (powder.consumption_rate as number);
    const totalPowderCost = totalPrintAreaCm2 * powderCostPerCm2;
    
    return {
        totalFilmCost,
        totalWhiteInkCost,
        totalColorInkCost,
        totalPowderCost,
        totalConsumableCost: totalFilmCost + totalWhiteInkCost + totalColorInkCost + totalPowderCost,
    };
};

export const calculateOperationalCost = (totalFilmLengthMeters: number, dtfData: DtfData, printSettings: DtfPrintSettings) => {
    const printLabor = dtfData.laborCosts.find(c => c.name === 'DTF印刷') || { cost_per_hour: 1500, setup_fee: 0 };
    const electricityRate = dtfData.electricityRates[0] || { tier2_rate: 25.51 };

    const printTimeHours = totalFilmLengthMeters / printSettings.printSpeedMetersPerHour;
    const setupTimeHours = 0.5;
    const totalPrintWorkHours = printTimeHours + setupTimeHours;

    const monthlyWorkHours = printSettings.operatingDaysPerMonth * printSettings.operatingHoursPerDay;
    
    const totalEquipmentDepreciationPerHour = dtfData.equipment.reduce((sum, eq) => {
        const monthlyDepreciation = (eq.purchase_price as number) / ((eq.depreciation_years as number) * 12);
        return sum + (monthlyDepreciation / monthlyWorkHours);
    }, 0);
    const totalEquipmentDepreciationCost = totalEquipmentDepreciationPerHour * totalPrintWorkHours;

    const dtfPrintLaborCost = (printLabor.cost_per_hour as number) * totalPrintWorkHours;
    
    const totalWattsDuringPrint = dtfData.equipment.reduce((sum, eq) => sum + (eq.power_consumption_w as number), 0);
    const totalKwh = (totalWattsDuringPrint * totalPrintWorkHours) / 1000;
    const totalElectricityCost = totalKwh * (electricityRate.tier2_rate as number);

    const totalEquipmentAndPrintLaborCost = totalEquipmentDepreciationCost + dtfPrintLaborCost;

    return { totalEquipmentAndPrintLaborCost, totalElectricityCost, printTimeHours };
};

export const calculatePressCost = (logoQuantity: number, pressTimeMinutes: number, dtfData: DtfData) => {
    const pressLabor = dtfData.laborCosts.find(c => c.name === 'プレス工賃') || { cost_per_hour: 4000, setup_fee: 6000 };
    const pressTimeCosts = dtfData.pressTimeCosts || [];

    const setupFee = pressLabor.setup_fee as number;

    const pressCostEntry = [...pressTimeCosts]
        .sort((a, b) => (a.minutes as number) - (b.minutes as number))
        .filter(p => (p.minutes as number) <= pressTimeMinutes)
        .pop();
    
    let pressCostPerItem: number;
    if (pressCostEntry) {
        pressCostPerItem = pressCostEntry.price_per_press as number;
    } else {
        console.warn(`No press time cost entry found for ${pressTimeMinutes} minutes. Falling back to linear calculation.`);
        pressCostPerItem = ((pressLabor.cost_per_hour as number) / 60) * pressTimeMinutes;
    }
    
    const totalPressCost = pressCostPerItem * logoQuantity;
    return { totalPressCost, setupFee, pressCostPerItem };
};

export const calculateDtfCost = (
    inputs: DtfCalculationInputs,
    dtfData: DtfData,
    printSettings: DtfPrintSettings
): DtfCalculationResult | null => {
    const { logoWidthMm, logoHeightMm, logoQuantity, profitMargin, roundUpTo10 } = inputs;
    if (logoWidthMm <= 0 || logoHeightMm <= 0 || logoQuantity <= 0) return null;

    const { logosPerRow, totalFilmLengthMeters } = calculateLayout(logoWidthMm, logoHeightMm, logoQuantity, printSettings);
    if (logosPerRow <= 0) return null;
    
    const logoAreaCm2 = (logoWidthMm * logoHeightMm) / 100;
    const { 
        totalFilmCost,
        totalWhiteInkCost,
        totalColorInkCost,
        totalPowderCost,
        totalConsumableCost 
    } = calculateConsumableCost(logoAreaCm2, totalFilmLengthMeters, logoQuantity, dtfData);
    
    const { 
        totalEquipmentAndPrintLaborCost, 
        totalElectricityCost, 
        printTimeHours 
    } = calculateOperationalCost(totalFilmLengthMeters, dtfData, printSettings);

    const { 
        totalPressCost, 
        setupFee, 
        pressCostPerItem 
    } = calculatePressCost(logoQuantity, printSettings.pressTimeMinutesPerItem, dtfData);

    const totalCost = totalConsumableCost + totalEquipmentAndPrintLaborCost + totalElectricityCost + setupFee + totalPressCost;
    const costPerItem = totalCost / logoQuantity;

    let sellingPricePerItem = costPerItem * profitMargin;
    if (roundUpTo10) {
        sellingPricePerItem = Math.ceil(sellingPricePerItem / 10) * 10;
    }
    
    return {
        costPerItem,
        sellingPricePerItem,
        detailsPerItem: {
            film: totalFilmCost / logoQuantity,
            whiteInk: totalWhiteInkCost / logoQuantity,
            colorInk: totalColorInkCost / logoQuantity,
            powder: totalPowderCost / logoQuantity,
            setup: setupFee / logoQuantity,
            equipmentAndPrintLabor: totalEquipmentAndPrintLaborCost / logoQuantity,
            electricity: totalElectricityCost / logoQuantity,
            press: pressCostPerItem,
        },
        totalFilmLengthMeters,
        printTimeHours,
    };
};

/**
 * DTF印刷のプリント代を計算する (オーケストレーター向けラッパー)
 */
export const calculateDtfPrintCost = (
    dtfDesigns: PrintDesign[],
    printQuantity: number,
    dtfData: DtfData,
    dtfPrintSettings: DtfPrintSettings,
    pricingData: PricingData
): { totalDtfPrintCost: number; designPrintCosts: { designId: string; totalCost: number }[] } => {
    let totalDtfPrintCost = 0;
    const designPrintCosts: { designId: string; totalCost: number }[] = [];
    if (printQuantity <= 0) return { totalDtfPrintCost: 0, designPrintCosts: [] };

    dtfDesigns.forEach(design => {
        if (design.widthCm && design.heightCm && design.widthCm > 0 && design.heightCm > 0) {
            const dtfResult = calculateDtfCost({
                logoWidthMm: design.widthCm * 10,
                logoHeightMm: design.heightCm * 10,
                logoQuantity: printQuantity,
                profitMargin: pricingData.dtfProfitMargin,
                roundUpTo10: pricingData.dtfRoundUpTo10 ?? true,
            }, dtfData, dtfPrintSettings);

            if (dtfResult) {
                const designTotalCost = dtfResult.sellingPricePerItem * printQuantity;
                totalDtfPrintCost += designTotalCost;
                designPrintCosts.push({
                    designId: design.id,
                    totalCost: designTotalCost
                });
            }
        }
    });

    return { totalDtfPrintCost, designPrintCosts };
};
