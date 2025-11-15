import { Row } from '@shared/types/common';

// --- DTF Calculator Types ---
export interface DtfConsumable extends Row {
    name: string;
    type: 'ink_white' | 'ink_color' | 'film' | 'powder' | 'cleaning';
    unit_price: number;
    unit: string;
    consumption_rate: number;
    consumption_unit: string;
}

export interface DtfEquipment extends Row {
    name: string;
    purchase_price: number;
    depreciation_years: number;
    power_consumption_w: number;
}

export interface DtfLaborCost extends Row {
    name: string;
    cost_per_hour: number;
    setup_fee: number;
}

export interface DtfPressTimeCost extends Row {
    minutes: number;
    price_per_press: number;
}

export interface DtfElectricityRate extends Row {
    provider: string;
    base_fee: number;
    tier1_kwh: number;
    tier1_rate: number;
    tier2_kwh: number;
    tier2_rate: number;
    tier3_rate: number;
}

// Fix: Added missing properties to DtfPrintSettings to align with dtfCostService, resolving multiple type errors.
export interface DtfPrintSettings {
    filmWidthMm: number;
    logoMarginMm: number;
    printSpeedMetersPerHour: number;
    pressTimeMinutesPerItem: number;
    operatingHoursPerDay: number;
    operatingDaysPerMonth: number;
}

// FIX: Add DtfPrinter and DtfPrintSpeed types to resolve type errors.
export interface DtfPrinter extends Row {
    id: number;
    name: string;
    film_width_mm: number;
    printable_width_mm: number;
    is_default: boolean;
}

export interface DtfPrintSpeed extends Row {
    id: number;
    printer_id: number;
    resolution_dpi: string;
    pass_count: number;
    ink_density?: number;
    speed_sqm_per_hour_min: number;
    notes?: string;
    is_default: boolean;
}

