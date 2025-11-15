import { InventoryDetailsResponse, InventoryStockMatrixResponse } from '../types';

interface SearchDetailsParams {
    page?: number;
    pageSize?: number;
    manufacturerIds?: string[];
    productCodes?: string[];
    searchTerm?: string;
    searchTerms?: string[];
    brands?: string[];
    categoryIds?: string[];
    tagIds?: string[];
    colorNames?: string[];
    colorCodes?: string[];
    sizeNames?: string[];
    sizeCodes?: string[];
    stockStatus?: 'in_stock' | 'out_of_stock' | 'any';
}

const buildFormData = (params: Record<string, any>): FormData => {
    const formData = new FormData();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item));
        } else {
            formData.append(key, String(value));
        }
    });
    return formData;
};

export const searchInventoryDetails = async (params: SearchDetailsParams): Promise<InventoryDetailsResponse> => {
    const formData = buildFormData({
        action: 'search_details',
        ...params,
    });

    const response = await fetch('/api/inventory-management-data.php', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('在庫検索APIの呼び出しに失敗しました。');
    }

    return response.json();
};

export const fetchStockMatrix = async (manufacturerId: string, productCode: string): Promise<InventoryStockMatrixResponse> => {
    const formData = buildFormData({
        action: 'get_stock_matrix',
        manufacturerId,
        productCode,
    });

    const response = await fetch('/api/inventory-management-data.php', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('在庫マトリクスAPIの呼び出しに失敗しました。');
    }

    return response.json();
};

