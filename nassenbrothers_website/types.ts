// types.ts

// ADD: Add AppLog type for system logging
export interface AppLog {
  id: number;
  timestamp: string;
  level: 'ERROR' | 'INFO' | 'WARN';
  message: string;
  stack_trace: string;
  user_agent: string;
  location: string;
}


// FIX: Add missing Recommendation type definition
export interface Recommendation {
  title: string;
  reason: string;
  productIds: string[];
}

export type PrintLocation = 'frontCenter' | 'backCenter' | 'leftSleeve' | 'rightSleeve' | 'frontLeftChest' | 'frontRightChest' | 'backNeck';
export type PrintSize = '10x10' | '30x40' | '35x50';
export type PlateType = 'normal' | 'decomposition';
export type SpecialInkType = 'silver' | 'gold' | 'foam' | 'luminous';

export interface SpecialInkDetail {
  type: SpecialInkType;
  count: number;
}

export interface PrintDesign {
  id: string;
  location: PrintLocation | '';
  size: PrintSize;
  colors: number;
  plateType: PlateType;
  specialInks: SpecialInkDetail[];
}

export interface OrderDetail {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface EstimationParams {
  items: OrderDetail[];
  printDesigns: PrintDesign[];
}

export interface CustomerInfo {
    id?: string;
    companyName: string;
    nameKanji: string;
    nameKana: string;
    email: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2: string;
    notes: string;
    quoteSubject: string;
    hasSeparateShippingAddress: boolean;
    shippingName: string;
    shippingPhone: string;
    shippingZipCode: string;
    shippingAddress1: string;
    shippingAddress2: string;
}

export interface ProductPrice {
    color: 'ホワイト' | 'カラー';
    size: string;
    listPrice: number;
    purchasePrice: number;
    price: number;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  variantName: string;
  description: string;
  code: string;
  jan_code: string;
  colors: string[];
  tags: string[];
  categoryId: string;
  generalImageCount: number;
  prices: ProductPrice[];
}

export interface BrandColor {
    code: string;
    name: string;
    hex: string;
    type: 'ホワイト' | 'カラー';
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
    printCostDetail: {
        base: number;
        byItem: number;
        bySize: number;
        byInk: number;
        byLocation: number;
        byPlateType: number;
    };
    setupCostDetail: Record<string, number>;
}

export interface SpecialInkOption {
    type: SpecialInkType;
    cost: number;
    displayName: string;
}

export interface PricingData {
    brandSellingPriceRates: Record<string, number>;
    plateCosts: Record<string, { cost: number; surchargePerColor: number; }>;
    specialInkOptions: SpecialInkOption[];
    specialInkCosts: Record<SpecialInkType, number>;
    additionalPrintCostsBySize: Partial<Record<PrintSize, number>>;
    additionalPrintCostsByLocation: Partial<Record<PrintLocation, number>>;
    additionalPrintCostsByTag: Record<string, number>;
    printPricingTiers: { min: number; max: number; firstColor: number; additionalColor: number }[];
    shippingCosts: Record<string, { cost: number; prefectures: string[] }>;
    shippingFreeThreshold: number;
    bringInFeeRate: number;
    printCostCategoryCombinations: Record<string, string>;
    plateCostCategoryCombinations: Record<string, string>;
    categoryPrintLocations: Record<string, string[]>;
    printSizeConstraints: PrintSizeConstraint[];
}

export interface Menu {
    id: number;
    name: string;
    path: string;
    parent_id: number | null;
    sort_order: number;
    icon?: string;
}

export interface Tag {
    tagId: string;
    tagName: string;
}
export interface Category {
    categoryId: string;
    categoryName: string;
    icon?: string;
    sort_order?: number;
}
export interface GalleryImage {
    id: string;
    title: string;
    description: string;
    tags: string[];
    imageCount: number;
    is_published: boolean;
}
export interface GalleryTag {
    tagId: string;
    tagName: string;
}
export interface Article {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    tags: string[];
    published_date: string;
    image_path: string;
    is_published: boolean;
}
export interface ArticleTag {
    tagId: string;
    tagName: string;
}

export interface PrintLocationData {
    locationId: string;
    label: string;
    groupName: string;
}

export interface PrintSizeData {
    sizeId: PrintSize;
    label: string;
}

export interface SizeOrder {
    sizeName: string;
    sortOrder: number;
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
    invoiceIssuerNumber: string;
}
export interface PartnerCode {
    code: string;
    partnerName: string;
    description: string;
    rate?: number;
}
export interface PrintSizeConstraint {
    type: 'tag' | 'location';
    id: string;
    sizes: PrintSize[];
}

export interface ContentBlock {
    id: string;
    type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'section-break' | 'dynamic-table' | 'custom-component';
    content?: string;
    items?: string[];
    data_key?: string;
    component?: string;
    props?: any;
}

export interface PageData {
    meta_title: string;
    meta_description: string;
    blocks: ContentBlock[];
}

export interface AppData {
    products: Record<string, Product[]>;
    colors: Record<string, Record<string, BrandColor>>;
    sizes: Record<string, Record<string, { name: string }>>;
    stock: Record<string, number>;
    tags: Tag[];
    categories: Category[];
    galleryImages: GalleryImage[];
    galleryTags: GalleryTag[];
    articles: Article[];
    articleTags: ArticleTag[];
    pricing: PricingData;
    printLocations: PrintLocationData[];
    companyInfo: CompanyInfoData;
    partnerCodes: PartnerCode[];
    menus: Menu[];
    printSizes: PrintSizeData[];
    sizeOrder: SizeOrder[];
    theme: Record<string, any>;
    uiText: Record<string, string>;
    customers: CustomerInfo[];
    pagesContent: Record<string, PageData>;
}

export interface EstimatorState {
    estimateId: string;
    originalEstimateId?: string | null;
    customerInfo: CustomerInfo;
    orderDetails: OrderDetail[];
    printDesigns: PrintDesign[];
    isDataConfirmed: boolean;
    isOrderPlaced: boolean;
    orderDate: string | null;
    isAdminMode?: boolean;
    isPartnerMode?: boolean;
    partnerInfo?: { code: string; name: string; rate?: number } | null;
    isBringInMode?: boolean;
    isReorder?: boolean;
}

export interface ShippingAddress {
    id: string;
    customer_id: string;
    name: string;
    zipCode: string;
    address1: string;
    address2: string;
    phone: string;
}

export type OrderStatus = '見積もり中' | '製作中' | '完了';
export type StepStatus = 'complete' | 'current' | 'upcoming';

export interface OrderStep {
    name: string;
    status: StepStatus;
    date: string | null;
}

export interface Invoice {
    id: string;
    date: string;
    paymentDueDate: string;
    totalCost: number;
    status: '入金済' | '未入金';
}

export interface Shipping {
    shippingDate: string;
    carrier: string;
    trackingNumber: string;
    status: '発送準備中' | '発送完了';
}

export interface CombinedOrderData {
    id: string;
    date: string;
    totalItems: number;
    totalCost: number;
    mainStatus: OrderStatus;
    quoteSubject?: string;
    quoteStatus?: '未確定' | '確認済';
    steps?: OrderStep[];
    invoice?: Invoice;
    shipping?: Shipping;
}
export interface MyPageData {
    customerInfo: CustomerInfo;
    addresses: ShippingAddress[];
    orders: CombinedOrderData[];
}

export interface MetaTagsProps {
    title: string;
    description: string;
    imageUrl?: string;
    canonicalUrl: string;
    noIndex?: boolean;
}
export interface StructuredDataProps {
    schema: object;
}

export interface BreadcrumbItem {
    name: string;
    path: string;
}

// Types for Dashboard Analytics
export interface TimeSeriesDataPoint {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SummaryData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  quoteCount: number;
  inProgressCount: number;
  completedCount: number;
}

export interface DashboardAnalyticsData {
  summary: SummaryData;
  timeSeries: TimeSeriesDataPoint[];
}

// ADD: Add missing HomePageProps interface definition
export interface HomePageProps {
  appData: AppData;
  onNavigateToEstimator: (searchQuery?: string) => void;
  onNavigateToProductDetail: (productId: string) => void;
  onNavigateToSearchResults: (query: string) => void;
  onNavigateToPrivacyPolicy: () => void;
  onNavigateToArticle: (slug: string) => void;
  onNavigateToArticleList: () => void;
}

export type LockType = 'unlocked' | 'immutable' | 'copy_and_edit';

export interface LockState {
    pages: Record<string, LockType>;
    theme: LockType;
    content: LockType;
    assets: LockType;
    uiText: LockType;
    homePage: LockType;
    productDetailPage: LockType;
    estimatorPage: LockType;
    searchResultsPage: LockType;
}

// ADD: Add ChatMessage interface for the AI Chat Assistant
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}
