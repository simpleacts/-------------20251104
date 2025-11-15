import { Row, Table } from './common';
import { EstimationParams as BaseEstimatorState } from './estimator';
import { AdditionalOption, BrandColor, Category, PricingData, Product, Tag } from './product';
// FIX: Corrected import path for DTF types.
import { DtfConsumable, DtfElectricityRate, DtfEquipment, DtfLaborCost, DtfPressTimeCost, DtfPrinter, DtfPrintSettings, DtfPrintSpeed } from '../../features/dtf/types';
import { GalleryImage } from './seo';

export interface CustomerInfo {
    companyName: string;
    nameKanji: string;
    nameKana: string;
    email: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2: string;
    notes: string;
    customer_group_id: string;
    has_separate_shipping_address: boolean;
    shipping_name: string;
    shipping_phone: string;
    shipping_zip_code: string;
    shipping_address1: string;
    shipping_address2: string;
}

export interface CompanyInfoData {
    companyName: string;
    zip: string;
    address: string;
    tel: string;
    fax: string;
    bankName: string;
    bankBranchName: string;
    bankAccountType: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    invoiceIssuerNumber?: string;
}

export interface ShippingInfo {
    // ...
}

export interface PartnerCode {
    code: string;
    partnerName: string;
    description: string;
    rate?: number;
}

export interface EstimatorState extends BaseEstimatorState {
    customerInfo: Row;
    senderInfo: CompanyInfoData | Row | null;
    isDataConfirmed: boolean;
    isOrderPlaced: boolean;
    orderDate: string | null;
    estimateId: string;
    isBringInMode: boolean;
    isReorder: boolean;
    originalEstimateId: string | null;
    isAdminMode?: boolean;
    isPartnerMode?: boolean;
    partnerInfo?: PartnerCode | null;
    shippingInfo?: ShippingInfo;
}

export interface AppData {
    products: Record<string, Product[]>; // by brand
    colors: Record<string, Record<string, BrandColor>>; // by brand, by color code
    sizes: Record<string, Record<string, { name: string }>>; // by brand, by size code
    stock: Record<string, number>; // key: `${productCode}-${colorCode}-${sizeCode}`
    tags: Tag[];
    categories: Category[];
    pricing: PricingData;
    printLocations: { locationId: string, groupName: string, label: string }[];
    companyInfo: CompanyInfoData;
    partnerCodes: PartnerCode[];
    prefectures: Row[];
    customer_groups: Row[];
    additionalOptions: AdditionalOption[];
    settings: Table;
    color_settings: Table;
    layout_settings: Table;
    behavior_settings: Table;
    pagination_settings: Table;
    
    // Safely access optional tables
    galleryImages: GalleryImage[];
    galleryTags: Tag[];
    pdf_templates: Row[];
    pdf_item_display_configs: Table;
    pdf_preview_zoom_configs: Table;
    app_logs: Table;
    tool_migrations: Table;
    importer_mappings: Table;
    sql_export_presets: Table;
    dev_roadmap: Table;
    dev_constitution: Table;
    dev_guidelines_recommended: Table;
    dev_guidelines_prohibited: Table;
    task_master: Table;
    quote_tasks: Table;
    task_generation_rules: Table;
    task_time_settings: Table;
    bills: Table;
    bill_items: Table;
    invoice_parsing_templates: Table;
    emails: Table;
    email_attachments: Table;
    email_accounts: Table;
    google_api_settings: Table;
    // DTF Data
    dtfConsumables: DtfConsumable[];
    dtfEquipment: DtfEquipment[];
    dtfLaborCosts: DtfLaborCost[];
    dtfPressTimeCosts: DtfPressTimeCost[];
    dtfElectricityRates: DtfElectricityRate[];
    dtfPrintSettings: DtfPrintSettings;
    dtfPrinters: DtfPrinter[];
    dtfPrintSpeeds: DtfPrintSpeed[];
    posts: Table;
    post_categories: Table;
    post_tags: Table;
    post_tag_relations: Table;
    work_sessions: Table;
    work_session_quotes: Table;
}

