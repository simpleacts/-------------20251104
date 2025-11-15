
// Estimator & Cost Service Types
export type PrintSize = '10x10' | '30x40' | '35x50';
export type PlateType = 'normal' | 'decomposition';
export type SpecialInkType = 'silver' | 'gold' | 'foam' | 'luminous';
export type PrintLocation = string; // e.g., 'front-chest', 'back-neck'

export interface SpecialInkDetail {
    type: SpecialInkType;
    count: number;
}

export interface PrintDesign {
    id: string;
    quote_id?: string;
    location: PrintLocation;
    imageSrc?: string;
    originalImageSrc?: string;
    imageName?: string;
    printMethod: 'silkscreen' | 'dtf';

    // Silkscreen specific
    size?: PrintSize;
    colors?: number;
    specialInks?: SpecialInkDetail[];
    plateType?: PlateType;

    // DTF specific
    widthCm?: number;
    heightCm?: number;
}

export interface OrderDetail {
    productId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    adjustedUnitPrice?: number;
    spareQuantity?: number;
    isBringIn?: boolean;
}

export interface CustomItem {
    id: string;
    label: string;
    amount: number; // Total amount (unitPrice * quantity) or a fixed amount
    enabled: boolean;
    type?: 'amount_only' | 'quantity_based';
    quantity?: number;
    unitPrice?: number;
}

export interface SampleItem {
    id: string;
    label: string;
    quantity: number;
    unitPrice: number;
}

export interface ProcessingGroup {
    id: string;
    name: string;
    items: OrderDetail[];
    printDesigns: PrintDesign[];
    selectedOptions?: { optionId: string }[];
    customItems?: CustomItem[];
    sampleItems?: SampleItem[];
}

export interface EstimationParams {
    processingGroups: ProcessingGroup[];
}

export interface GroupCost {
    groupId: string;
    groupName: string;
    silkscreenPrintCost: number;
    dtfPrintCost: number;
    setupCost: number;
    quantity: number;
    tshirtCost: number;
    additionalOptionsCost: number;
    customItemsCost: number;
    productDiscount: number;
    sampleItemsCost: number;
    bringInQuantity?: number;
    printCostDetail: {
        base: number;
        byItem: number;
        byItemDetail?: { tagId: string; cost: number; }[];
        bySize: number;
        byInk: number;
        byInkDetail?: Record<string, { cost: number; displayName: string; count: number; }>;
        byLocation: number;
        byPlateType: number;
    };
    designPrintCosts?: { designId: string, totalCost: number, detail?: Omit<CostDetails['printCostDetail'], 'byDtf'> }[];
    setupCostDetail?: Record<string, number>;
    additionalOptionsCostDetail: Record<string, number>;
}

export interface CostDetails {
    totalCost: number;
    shippingCost: number;
    tax: number;
    totalCostWithTax: number;
    costPerShirt: number;
    tshirtCost: number;
    setupCost: number;
    printCost: number;
    additionalOptionsCost: number;
    totalCustomItemsCost: number;
    totalProductDiscount: number;
    totalSampleItemsCost: number;
    printCostDetail: {
        base: number; // For silkscreen
        byDtf: number; // For DTF
        byItem: number;
        byItemDetail?: { tagId: string; cost: number; }[];
        bySize: number;
        byInk: number;
        byInkDetail?: Record<string, { cost: number; displayName: string; count: number; }>;
        byLocation: number;
        byPlateType: number;
    };
    setupCostDetail: Record<string, number>;
    additionalOptionsCostDetail: Record<string, number>;
    groupCosts?: GroupCost[];
}

