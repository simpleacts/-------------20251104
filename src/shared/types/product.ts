import { Row } from './common';
import { PrintSize, PrintLocation, SpecialInkType } from './estimator';

export interface ProductPrice {
    color: 'ホワイト' | 'カラー' | 'スペシャル';
    size: string;
    listPrice: number;
    purchasePrice: number;
}

export interface Product {
    id: string;
    brand: string;
    manufacturerId: string;
    name: string;
    description: string;
    code: string;
    jan_code: string;
    colors: string[]; // color codes
    prices: ProductPrice[];
    tags: string[]; // tag IDs
    categoryId: string;
    is_published: boolean;
    images?: string;
}

export interface BrandColor extends Row {
    colorCode: string;
    colorName: string;
    hex: string;
    type: 'ホワイト' | 'カラー' | 'スペシャル';
}

// ヘルパー関数
export function getColorCode(color: BrandColor | Row): string {
    return (color.colorCode as string) || '';
}

export function getColorName(color: BrandColor | Row): string {
    return (color.colorName as string) || '';
}

export interface Tag {
    tagId: string;
    tagName: string;
}

export interface Category {
    categoryId: string;
    categoryName: string;
}

export interface SpecialInkOption {
    type: SpecialInkType;
    cost: number;
    displayName: string;
}

export interface PrintLocationData {
  locationId: string;
  groupName: string;
  label: string;
}

export interface PrintPricingTier extends Row {
  id: string;
  min: number;
  max: number;
  firstColor: number;
  additionalColor: number;
  schedule_id?: string;
  user_id?: string;
}

export interface PricingData {
    plateCosts: Record<string, { cost: number; surchargePerColor: number; }>;
    specialInkOptions: SpecialInkOption[];
    specialInkCosts: Record<SpecialInkType, number>;
    additionalPrintCostsBySize: Partial<Record<PrintSize, number>>;
    additionalPrintCostsByLocation: Partial<Record<PrintLocation, number>>;
    additionalPrintCostsByTag: Record<string, number>;
    printPricingTiers: PrintPricingTier[];
    shippingCosts: Record<string, { cost: number; prefectures: string[] }>;
    shippingFreeThreshold: number;
    bringInFeeRate: number;
    printCostCategoryCombinations: Record<string, string>; // categoryId -> combinationId
    plateCostCategoryCombinations: Record<string, string>; // categoryId -> combinationId
    categoryPrintLocations: Record<string, string[]>; // categoryId -> locationId[]
    printSizeConstraints: { type: 'tag' | 'location', id: string, sizes: PrintSize[] }[];
    // New pricing rule system data
    pricingRules: Row[];
    pricingAssignments: Row[];
    volumeDiscountSchedules: Row[];
    defaultSellingMarkup: number;
    defaultBringInMarkup: number;
    dtfProfitMargin: number;
    dtfRoundUpTo10?: boolean;
}

// Fix: Added AdditionalOption interface to resolve import errors.
export interface AdditionalOption extends Row {
    id: string;
    name: string;
    cost_per_item: number;
    description: string;
}

