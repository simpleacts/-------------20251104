export interface InventoryDetailItem {
    id: string;
    manufacturer_id: string;
    product_code: string;
    productCode?: string;
    productName?: string;
    product_name?: string;
    description?: string;
    brand?: string;
    category_id?: string;
    tags?: string;
    stock_summary?: {
        total_quantity: number;
    };
}

export interface InventoryDetailsResponse {
    items: InventoryDetailItem[];
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface InventoryStockMatrixRow {
    color_code: string | null;
    color_name: string | null;
    size_code: string | null;
    size_name: string | null;
    quantity: number | null;
    incoming_quantity_1?: number | null;
    incoming_date_1?: string | null;
    incoming_quantity_2?: number | null;
    incoming_date_2?: string | null;
    incoming_quantity_3?: number | null;
    incoming_date_3?: string | null;
}

export interface InventoryStockMatrixResponse {
    product: InventoryDetailItem | null;
    stockMatrix: {
        rows: InventoryStockMatrixRow[];
        colorKeys: (string | null)[];
        sizeKeys: (string | null)[];
    };
}

