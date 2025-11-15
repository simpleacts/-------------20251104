import { Row } from '@shared/types/common';

// --- Ink Mixing Tool Types (New/Updated) ---

export interface InkManufacturer extends Row {
    id: string;
    name: string;
}

export interface InkSeries extends Row {
    id: string;
    manufacturer_id: string;
    name: string;
    category: '水性' | '油性' | '溶剤';
    mixing_style?: 'pigment_base' | 'color_mixing';
}

export interface InkProduct extends Row {
    id: string;
    series_id: string;
    product_type?: 'base' | 'pigment' | 'color' | 'additive';
    color_name: string;
    color_code?: string;
    hex_value: string;
    unit_cost: number;
    unit_volume: number;
    unit_measure: 'g' | 'gallon';
}

export interface PantoneColor extends Row {
    id: string;
    code: string;
    type: 'coated' | 'uncoated';
    hex: string;
    rgb: string;
    cmyk: string;
}

export interface DicColor extends Row {
    id: string;
    code: string;
    part: '1' | '2';
    hex: string;
    rgb: string;
    cmyk: string;
}

export interface InkRecipe extends Row {
    id: string;
    name: string;
    created_at: string;
    pantone_id?: string | null;
    dic_id?: string | null;
    notes?: string;
    color_chip_url?: string;
    color_sample_url?: string;
}

export interface InkRecipeComponent extends Row {
    id: string;
    recipe_id: string;
    ink_product_id: string;
    amount: number;
}

export interface InkRecipeUsage extends Row {
    id: string;
    recipe_id: string;
    quote_id: string;
    used_at: string;
    end_user?: string;
    design_name?: string;
}

