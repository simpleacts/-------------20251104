import { Row } from './common';

// --- PDF Template Tool ---
export type DocumentType = 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | 'worksheet';

export interface PdfTemplateBlock {
    id: string;
    type: 'HEADER' | 'RECIPIENT_INFO' | 'SENDER_INFO' | 'INFO' | 'TOTALS_HEADER' | 'ITEMS' | 'GROUPED_ITEMS' | 'SUMMARY' | 'NOTES' | 'BANK_INFO' | 'STAMP' | 'CUSTOM_TEXT' | 'DATA_FIELD' | 'PAGE_BREAK' | 'SPACER' | 'PAGE_NUMBER' | 'DESIGN_INFO';
    enabled: boolean;
    config: {
        title?: string;
        displayMode?: 'default' | 'worksheet_matrix';
        [key: string]: any;
    };
}

export interface PdfTemplate extends Row {
    id: string;
    name: string;
    type: DocumentType;
    config_json: string;
}

// --- PDF Item Group Config ---
export interface PdfItemGroupConfigItem {
  id: 'product_items' | 'print_costs' | 'setup_costs' | 'additional_options' | 'print_and_setup' | 'custom_items' | 'sample_items' | 'product_discount' | 'shipping';
  label: string;
  enabled: boolean;
  sort_order: number;
  config?: {
    showBreakdown?: boolean;
    breakdownItems?: string[];
    showUnitPriceInBreakdown?: boolean;
    consolidation?: 'none' | 'by_color_and_price' | 'by_price';
    displayMode?: 'lump_sum' | 'summary_per_item' | 'summary_per_location' | 'detailed_per_location' | 'per_location' | 'per_option';
    includeInUnitPrice?: ('bySize' | 'byLocation' | 'byPlateType' | 'byItem')[];
  };
}

export interface PdfItemGroupConfig extends Row {
  id: string;
  name: string;
  config_json: string; // JSON.stringify(PdfItemGroupConfigItem[])
}

