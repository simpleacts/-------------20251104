import { ArrowUturnLeftIcon, Button, Input, SpinnerIcon } from '@components/atoms';
import { getManufacturerTableName } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Row } from '@shared/types';
import React from 'react';
import { fetchStockMatrix, searchInventoryDetails } from '../../api';
import { InventoryItem, StockHistoryItem } from '../../hooks/useInventoryManagement';
import AdjustInventoryModal from '../../modals/AdjustInventoryModal';
import IncomingStockModal from '../../modals/IncomingStockModal';
import InventoryHistoryModal from '../../modals/InventoryHistoryModal';
import {
    InventoryDetailItem,
    InventoryDetailsResponse,
    InventoryStockMatrixResponse,
    InventoryStockMatrixRow,
} from '../../types';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const createBaseFilters = () => ({
    manufacturerIds: [] as string[],
    productCodes: '',
    searchTerm: '',
    brands: [] as string[],
    categoryIds: [] as string[],
    tagIds: [] as string[],
    colorNames: '',
    colorCodes: '',
    sizeNames: '',
    sizeCodes: '',
    stockStatus: 'any' as 'any' | 'in_stock' | 'out_of_stock',
});

const normalizeValue = (value: string | number | null | undefined) =>
    (value ?? '').toString().trim().toLowerCase();

const buildColorKey = (colorCode?: string | null, colorName?: string | null) =>
    `${normalizeValue(colorCode)}|${normalizeValue(colorName)}`;

const buildSizeKey = (sizeCode?: string | null, sizeName?: string | null) =>
    `${normalizeValue(sizeCode)}|${normalizeValue(sizeName)}`;

const buildCellKey = (
    colorCode?: string | null,
    colorName?: string | null,
    sizeCode?: string | null,
    sizeName?: string | null,
) => `${buildColorKey(colorCode, colorName)}__${buildSizeKey(sizeCode, sizeName)}`;

const formatLabel = (code?: string | null, name?: string | null) => {
    const codeStr = (code ?? '').toString().trim();
    const nameStr = (name ?? '').toString().trim();
    if (codeStr && nameStr) {
        return `${codeStr} / ${nameStr}`;
    }
    return codeStr || nameStr || '-';
};

type ColorEntry = {
    key: string;
    color_code: string | null;
    color_name: string | null;
    label: string;
};

type SizeEntry = {
    key: string;
    size_code: string | null;
    size_name: string | null;
    label: string;
};

type IncomingStockModalItem = {
    id: string;
    sku_id: string;
    quantity: number;
    arrival_date: string;
};

const SearchPage: React.FC = () => {
    const { t } = useTranslation('inventory-management');
    const { setDatabase } = useDatabase();

    const [filters, setFilters] = React.useState(createBaseFilters);

    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(50);
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchError, setSearchError] = React.useState<string | null>(null);
    const [results, setResults] = React.useState<InventoryDetailsResponse | null>(null);
    const [selectedItem, setSelectedItem] = React.useState<InventoryDetailItem | null>(null);
    const [matrix, setMatrix] = React.useState<InventoryStockMatrixResponse | null>(null);
    const [isLoadingMatrix, setIsLoadingMatrix] = React.useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
    const [isIncomingModalOpen, setIsIncomingModalOpen] = React.useState(false);

    const [manufacturers, setManufacturers] = React.useState<Row[]>([]);
    const [brands, setBrands] = React.useState<Row[]>([]);
    const [categories, setCategories] = React.useState<Row[]>([]);
    const [commonTags, setCommonTags] = React.useState<Row[]>([]);
    const [manufacturerTags, setManufacturerTags] = React.useState<Row[]>([]);
    const [inventoryItemsForModals, setInventoryItemsForModals] = React.useState<InventoryItem[]>([]);
    const [stockHistory, setStockHistory] = React.useState<StockHistoryItem[]>([]);
    const [incomingStockEntries, setIncomingStockEntries] = React.useState<IncomingStockModalItem[]>([]);
    const [adjustSkuId, setAdjustSkuId] = React.useState<string | null>(null);
    const [historySkuId, setHistorySkuId] = React.useState<string | null>(null);
    const [incomingSkuId, setIncomingSkuId] = React.useState<string | null>(null);
    const [alertThreshold, setAlertThreshold] = React.useState(20);
    const [viewMode, setViewMode] = React.useState<'results' | 'detail'>('results');

    const getDefaultManufacturerIds = React.useCallback(() => {
        if (!manufacturers.length) return [];
        const preferred = manufacturers.find((m) => {
            const id = String(m.id || '').toLowerCase();
            return id === 'manu_0001';
        });
        const target = preferred || manufacturers[0];
        const id = String(target?.id || '');
        return id ? [id] : [];
    }, [manufacturers]);

    const normalizeTagList = React.useCallback((rows: Row[]) => {
        const seen = new Set<string>();
        const normalized: Row[] = [];
        rows.forEach((row) => {
            const id = String(row.id ?? '');
            if (!id || seen.has(id)) return;
            seen.add(id);
            normalized.push(row);
        });
        return normalized;
    }, []);

    React.useEffect(() => {
        const loadCommonData = async () => {
            try {
                const tables = await fetchTables(['manufacturers', 'brands', 'categories', 'tags'], {
                    toolName: 'inventory-management',
                });
                setDatabase((prev) => ({ ...(prev || {}), ...tables }));
                setManufacturers((tables.manufacturers?.data as Row[]) || []);
                setBrands((tables.brands?.data as Row[]) || []);
                setCategories((tables.categories?.data as Row[]) || []);
                const tagRows = ((tables.tags?.data as Row[]) || []).filter((tag: Row) => tag.scope !== 'manufacturer');
                setCommonTags(normalizeTagList(tagRows));
            } catch (error) {
                console.error('[InventorySearchPage] Failed to load master tables:', error);
            }
        };
        loadCommonData();
    }, [setDatabase, normalizeTagList]);

    React.useEffect(() => {
        if (!manufacturers.length) return;
        if (filters.manufacturerIds.length > 0) return;
        const defaults = getDefaultManufacturerIds();
        if (!defaults.length) return;
        setFilters((prev) => ({ ...prev, manufacturerIds: defaults }));
    }, [manufacturers, filters.manufacturerIds.length, getDefaultManufacturerIds]);

    React.useEffect(() => {
        const loadManufacturerTags = async () => {
            if (!filters.manufacturerIds.length) {
                setManufacturerTags([]);
                return;
            }
            try {
                const tableNames = filters.manufacturerIds.map((id) => getManufacturerTableName('tags', id));
                const data = await fetchTables(tableNames, { toolName: 'inventory-management' });
                const commonIds = new Set(commonTags.map((tag) => String(tag.id ?? '')));
                const merged: Row[] = [];
                tableNames.forEach((tableName, index) => {
                    const manufacturerId = filters.manufacturerIds[index];
                    const rows = normalizeTagList((data[tableName]?.data as Row[]) || []);
                    rows.forEach((row) => {
                        const id = String(row.id ?? '');
                        if (!id || commonIds.has(id)) {
                            return;
                        }
                        merged.push({
                            ...row,
                            manufacturer_id: manufacturerId,
                        });
                    });
                });
                setManufacturerTags(merged);
            } catch (error) {
                console.error('[InventorySearchPage] Failed to load manufacturer tags:', error);
            }
        };
        loadManufacturerTags();
    }, [filters.manufacturerIds, commonTags, normalizeTagList]);

    React.useEffect(() => {
        if (!selectedItem || !matrix) {
            setInventoryItemsForModals([]);
            setIncomingStockEntries([]);
            setStockHistory([]);
            return;
        }

        const derivedItems: InventoryItem[] = [];
        const derivedIncoming: IncomingStockModalItem[] = [];

        matrix.stockMatrix.rows.forEach((row, index) => {
            const colorToken = row.color_code || row.color_name || `color-${index}`;
            const sizeToken = row.size_code || row.size_name || `size-${index}`;
            const skuId = [
                selectedItem.manufacturer_id,
                selectedItem.product_code || selectedItem.productCode,
                colorToken,
                sizeToken,
                index,
            ]
                .filter((token) => token !== undefined && token !== null && token !== '')
                .map((token) => token?.toString().trim())
                .join('__');

            derivedItems.push({
                sku_id: skuId || `sku-${index}`,
                quantity: row.quantity ?? 0,
                product_name: selectedItem.productName || selectedItem.product_name,
                product_code: selectedItem.product_code || selectedItem.productCode,
                color_name: row.color_name ?? '',
                color_code: row.color_code ?? '',
                size_name: row.size_name ?? '',
                size_code: row.size_code ?? '',
                manufacturer_id: selectedItem.manufacturer_id,
                cell_key: buildCellKey(row.color_code, row.color_name, row.size_code, row.size_name),
            } as InventoryItem);

            [1, 2, 3].forEach((slot) => {
                const qty = row[`incoming_quantity_${slot}` as keyof InventoryStockMatrixRow] as
                    | number
                    | null
                    | undefined;
                const date = row[`incoming_date_${slot}` as keyof InventoryStockMatrixRow] as
                    | string
                    | null
                    | undefined;
                if ((qty ?? 0) > 0) {
                    derivedIncoming.push({
                        id: `${skuId || `sku-${index}`}_incoming_${slot}`,
                        sku_id: skuId || `sku-${index}`,
                        quantity: qty ?? 0,
                        arrival_date: date ? String(date) : '',
                    });
                }
            });
        });

        setInventoryItemsForModals(derivedItems);
        setIncomingStockEntries(derivedIncoming);
        setStockHistory([]);
    }, [selectedItem, matrix]);

    const handleFilterChange = (field: keyof typeof filters, value: any) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const parseListInput = (value: string) => {
        return value
            .split(/[\n,]+/)
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
    };

    const renderCheckboxList = (
        items: Row[],
        selected: string[],
        labelKey: keyof Row,
        valueKey: keyof Row,
        onToggle: (value: string) => void,
    ) => (
        <div className="space-y-1 max-h-40 overflow-auto border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark">
            {items.map((item) => {
                const value = String(item[valueKey] ?? '');
                if (!value) return null;
                const label = String(item[labelKey] ?? value);
                const checked = selected.includes(value);
                return (
                    <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={checked}
                            onChange={() => onToggle(value)}
                        />
                        <span>{label}</span>
                    </label>
                );
            })}
        </div>
    );

    const toggleSelection = (current: string[], value: string) => {
        if (current.includes(value)) {
            return current.filter((item) => item !== value);
        }
        return [...current, value];
    };

    const buildSearchPayload = () => {
        const payload: Record<string, any> = {
            page,
            pageSize,
            manufacturerIds: filters.manufacturerIds,
            searchTerm: filters.searchTerm,
            stockStatus: filters.stockStatus,
        };

        if (filters.productCodes.trim()) {
            payload.productCodes = parseListInput(filters.productCodes);
        }
        if (filters.colorNames.trim()) {
            payload.colorNames = parseListInput(filters.colorNames);
        }
        if (filters.colorCodes.trim()) {
            payload.colorCodes = parseListInput(filters.colorCodes);
        }
        if (filters.sizeNames.trim()) {
            payload.sizeNames = parseListInput(filters.sizeNames);
        }
        if (filters.sizeCodes.trim()) {
            payload.sizeCodes = parseListInput(filters.sizeCodes);
        }
        if (filters.brands.length > 0) {
            payload.brands = filters.brands;
        }
        if (filters.categoryIds.length > 0) {
            payload.categoryIds = filters.categoryIds;
        }
        if (filters.tagIds.length > 0) {
            payload.tagIds = filters.tagIds;
        }

        return payload;
    };

    const handleSearch = async (targetPage = 1) => {
        setIsSearching(true);
        setSearchError(null);
        setResults(null);
        setSelectedItem(null);
        setMatrix(null);
        setViewMode('results');

        try {
            const payload = {
                ...buildSearchPayload(),
                page: targetPage,
            };
            const response = await searchInventoryDetails(payload);
            setResults(response);
            setPage(response.pagination.page);
        } catch (error: any) {
            console.error('[InventorySearchPage] search error:', error);
            setSearchError(error?.message || '検索に失敗しました。');
        } finally {
            setIsSearching(false);
        }
    };

    const handlePageChange = (nextPage: number) => {
        handleSearch(nextPage);
    };

    const handleBackToResults = () => {
        setViewMode('results');
    };

    const handleSelectItem = async (item: InventoryDetailItem) => {
        setSelectedItem(item);
        setMatrix(null);
        setIsLoadingMatrix(true);
        setViewMode('detail');
        try {
            const response = await fetchStockMatrix(item.manufacturer_id, item.product_code);
            setMatrix(response);
        } catch (error: any) {
            console.error('[InventorySearchPage] stock matrix error:', error);
        } finally {
            setIsLoadingMatrix(false);
        }
    };

    const matrixStats = React.useMemo(() => {
        if (!matrix) {
            return { totalQuantity: 0, totalIncoming: 0, colorCount: 0, sizeCount: 0 };
        }
        const rows = matrix.stockMatrix.rows || [];
        let totalQuantity = 0;
        let totalIncoming = 0;
        const colorSet = new Set<string>();
        const sizeSet = new Set<string>();
        rows.forEach((row) => {
            totalQuantity += row.quantity ?? 0;
            [1, 2, 3].forEach((slot) => {
                const qty = row[`incoming_quantity_${slot}` as keyof InventoryStockMatrixRow] as
                    | number
                    | null
                    | undefined;
                if (qty) {
                    totalIncoming += qty;
                }
            });
            colorSet.add(buildColorKey(row.color_code, row.color_name));
            sizeSet.add(buildSizeKey(row.size_code, row.size_name));
        });
        return {
            totalQuantity,
            totalIncoming,
            colorCount: colorSet.size,
            sizeCount: sizeSet.size,
        };
    }, [matrix]);

    const colorEntries = React.useMemo<ColorEntry[]>(() => {
        if (!matrix) return [];
        const map = new Map<string, ColorEntry>();
        matrix.stockMatrix.rows.forEach((row) => {
            const key = buildColorKey(row.color_code, row.color_name);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    color_code: row.color_code ?? null,
                    color_name: row.color_name ?? null,
                    label: formatLabel(row.color_code, row.color_name),
                });
            }
        });
        const entries = Array.from(map.values());
        const fallbackOrder = new Map(entries.map((entry, idx) => [entry.key, idx]));
        const orderKeys = (matrix.stockMatrix.colorKeys || []).map((value) => normalizeValue(value));
        if (orderKeys.length) {
            const getIndex = (entry: ColorEntry) => {
                const candidates = [entry.color_code, entry.color_name, entry.label];
                const idx = orderKeys.findIndex((value) =>
                    candidates.some((candidate) => normalizeValue(candidate) === value),
                );
                return idx === -1 ? orderKeys.length + (fallbackOrder.get(entry.key) ?? 0) : idx;
            };
            entries.sort((a, b) => getIndex(a) - getIndex(b));
        }
        return entries;
    }, [matrix]);

    const sizeEntries = React.useMemo<SizeEntry[]>(() => {
        if (!matrix) return [];
        const map = new Map<string, SizeEntry>();
        matrix.stockMatrix.rows.forEach((row) => {
            const key = buildSizeKey(row.size_code, row.size_name);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    size_code: row.size_code ?? null,
                    size_name: row.size_name ?? null,
                    label: formatLabel(row.size_code, row.size_name),
                });
            }
        });
        const entries = Array.from(map.values());
        const fallbackOrder = new Map(entries.map((entry, idx) => [entry.key, idx]));
        const orderKeys = (matrix.stockMatrix.sizeKeys || []).map((value) => normalizeValue(value));
        if (orderKeys.length) {
            const getIndex = (entry: SizeEntry) => {
                const candidates = [entry.size_code, entry.size_name, entry.label];
                const idx = orderKeys.findIndex((value) =>
                    candidates.some((candidate) => normalizeValue(candidate) === value),
                );
                return idx === -1 ? orderKeys.length + (fallbackOrder.get(entry.key) ?? 0) : idx;
            };
            entries.sort((a, b) => getIndex(a) - getIndex(b));
        }
        return entries;
    }, [matrix]);

    const cellRowMap = React.useMemo(() => {
        const map = new Map<string, InventoryStockMatrixRow>();
        if (!matrix) return map;
        matrix.stockMatrix.rows.forEach((row) => {
            map.set(buildCellKey(row.color_code, row.color_name, row.size_code, row.size_name), row);
        });
        return map;
    }, [matrix]);

    const skuLookupByCell = React.useMemo(() => {
        const map = new Map<string, InventoryItem>();
        inventoryItemsForModals.forEach((item) => {
            const key = buildCellKey(item.color_code, item.color_name, item.size_code, item.size_name);
            map.set(key, item);
        });
        return map;
    }, [inventoryItemsForModals]);

    const skuToCellKeyMap = React.useMemo(() => {
        const map = new Map<string, string>();
        inventoryItemsForModals.forEach((item) => {
            const key = buildCellKey(item.color_code, item.color_name, item.size_code, item.size_name);
            map.set(item.sku_id, key);
        });
        return map;
    }, [inventoryItemsForModals]);

    const incomingBySku = React.useMemo(() => {
        const map = new Map<string, IncomingStockModalItem[]>();
        incomingStockEntries.forEach((entry) => {
            const list = map.get(entry.sku_id) || [];
            list.push(entry);
            map.set(entry.sku_id, list);
        });
        map.forEach((list, key) => {
            list.sort((a, b) => (a.arrival_date || '').localeCompare(b.arrival_date || ''));
            map.set(key, list);
        });
        return map;
    }, [incomingStockEntries]);

    const getDefaultSkuId = () => inventoryItemsForModals[0]?.sku_id || null;

    const openAdjustModal = (skuId?: string | null) => {
        const resolved = skuId || getDefaultSkuId();
        setAdjustSkuId(resolved);
        setIsAdjustModalOpen(true);
    };

    const openHistoryModal = (skuId?: string | null) => {
        const resolved = skuId || getDefaultSkuId();
        setHistorySkuId(resolved);
        setIsHistoryModalOpen(true);
    };

    const openIncomingModal = (skuId?: string | null) => {
        const resolved = skuId || getDefaultSkuId();
        setIncomingSkuId(resolved);
        setIsIncomingModalOpen(true);
    };

    const handleAdjustInventory = async (
        skuId: string,
        quantityChange: number,
        reason: string,
        notes?: string,
    ) => {
        const cellKey = skuToCellKeyMap.get(skuId);
        if (!cellKey) return;
        setMatrix((prev) => {
            if (!prev) return prev;
            const updatedRows = prev.stockMatrix.rows.map((row) => {
                if (buildCellKey(row.color_code, row.color_name, row.size_code, row.size_name) === cellKey) {
                    const updatedQuantity = Math.max(0, (row.quantity ?? 0) + quantityChange);
                    return { ...row, quantity: updatedQuantity };
                }
                return row;
            });
            return {
                ...prev,
                stockMatrix: {
                    ...prev.stockMatrix,
                    rows: updatedRows,
                },
            };
        });
        setIsAdjustModalOpen(false);
        setAdjustSkuId(null);
    };

    const handleIncomingAdd = async (skuId: string, quantity: number, arrivalDate: string) => {
        setIncomingStockEntries((prev) => [
            ...prev,
            {
                id: `incoming-${Date.now()}`,
                sku_id: skuId,
                quantity,
                arrival_date: arrivalDate,
            },
        ]);
    };

    const handleIncomingUpdate = async (incomingId: string, quantity: number, arrivalDate: string) => {
        setIncomingStockEntries((prev) =>
            prev.map((entry) =>
                entry.id === incomingId ? { ...entry, quantity, arrival_date: arrivalDate } : entry,
            ),
        );
    };

    const handleIncomingDelete = async (incomingId: string) => {
        setIncomingStockEntries((prev) => prev.filter((entry) => entry.id !== incomingId));
    };

    const handleIncomingReceive = async (incomingId: string) => {
        setIncomingStockEntries((prev) => prev.filter((entry) => entry.id !== incomingId));
    };

    const handleResetFilters = React.useCallback(() => {
        const defaults = getDefaultManufacturerIds();
        const baseFilters = createBaseFilters();
        baseFilters.manufacturerIds = defaults;
        setFilters(baseFilters);
        setResults(null);
        setSelectedItem(null);
        setMatrix(null);
        setPage(1);
        setViewMode('results');
    }, [getDefaultManufacturerIds, setResults, setSelectedItem, setMatrix, setPage]);

    const renderSearchForm = () => (
        <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow p-4 space-y-4">
            <div>
                <label className="block text-sm font-semibold mb-1">メーカー</label>
                <select
                    multiple
                    value={filters.manufacturerIds}
                    onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                        handleFilterChange('manufacturerIds', selected);
                    }}
                    className="w-full min-h-[120px] border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                >
                    {manufacturers.map((manufacturer) => (
                        <option key={manufacturer.id as string} value={manufacturer.id as string}>
                            {manufacturer.name as string}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">品番（複数可）</label>
                    <textarea
                        className="w-full border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                        rows={3}
                        value={filters.productCodes}
                        onChange={(e) => handleFilterChange('productCodes', e.target.value)}
                        placeholder="品番を改行またはカンマ区切りで入力"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">キーワード検索</label>
                    <input
                        className="w-full border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        placeholder="商品名や説明で検索"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">カラー名（部分一致）</label>
                    <textarea
                        className="w-full border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                        rows={2}
                        value={filters.colorNames}
                        onChange={(e) => handleFilterChange('colorNames', e.target.value)}
                        placeholder="改行またはカンマ区切り"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">サイズ名（部分一致）</label>
                    <textarea
                        className="w-full border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                        rows={2}
                        value={filters.sizeNames}
                        onChange={(e) => handleFilterChange('sizeNames', e.target.value)}
                        placeholder="改行またはカンマ区切り"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">ブランド</label>
                    {renderCheckboxList(
                        brands,
                        filters.brands,
                        'name',
                        'name',
                        (value) => handleFilterChange('brands', toggleSelection(filters.brands, value)),
                    )}
                    <div className="mt-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleFilterChange('brands', [])}>
                            全てクリア
                        </Button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">カテゴリ</label>
                    {renderCheckboxList(
                        categories,
                        filters.categoryIds,
                        'categoryName',
                        'id',
                        (value) => handleFilterChange('categoryIds', toggleSelection(filters.categoryIds, value)),
                    )}
                    <div className="mt-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleFilterChange('categoryIds', [])}>
                            全てクリア
                        </Button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">タグ（共通）</label>
                    {renderCheckboxList(
                        commonTags,
                        filters.tagIds,
                        'tagName',
                        'id',
                        (value) => handleFilterChange('tagIds', toggleSelection(filters.tagIds, String(value))),
                    )}
                    <div className="mt-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleFilterChange('tagIds', [])}>
                            全てクリア
                        </Button>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1">タグ（メーカー依存）</label>
                {manufacturerTags.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">対象メーカーのタグがありません。</div>
                ) : (
                    <div className="space-y-2">
                        {filters.manufacturerIds.map((manufacturerId) => {
                            const tagItems = manufacturerTags.filter(
                                (tag) => String(tag.manufacturer_id) === manufacturerId,
                            );
                            if (tagItems.length === 0) return null;
                            const manufacturerName =
                                manufacturers.find((m) => String(m.id) === manufacturerId)?.name || manufacturerId;
                            return (
                                <div key={manufacturerId} className="border rounded-md p-2">
                                    <div className="text-sm font-semibold mb-1">{manufacturerName} のタグ</div>
                                    {renderCheckboxList(
                                        tagItems,
                                        filters.tagIds,
                                        'tagName',
                                        'id',
                                        (value) =>
                                            handleFilterChange('tagIds', toggleSelection(filters.tagIds, String(value))),
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="mt-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleFilterChange('tagIds', [])}>
                        全てクリア
                    </Button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1">在庫状態</label>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="stockStatus"
                            value="any"
                            checked={filters.stockStatus === 'any'}
                            onChange={() => handleFilterChange('stockStatus', 'any')}
                        />
                        すべて
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="stockStatus"
                            value="in_stock"
                            checked={filters.stockStatus === 'in_stock'}
                            onChange={() => handleFilterChange('stockStatus', 'in_stock')}
                        />
                        在庫あり
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="stockStatus"
                            value="out_of_stock"
                            checked={filters.stockStatus === 'out_of_stock'}
                            onChange={() => handleFilterChange('stockStatus', 'out_of_stock')}
                        />
                        在庫なし
                    </label>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-sm font-semibold mb-1">ページサイズ</label>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const size = parseInt(e.target.value, 10) || 50;
                            setPageSize(size);
                        }}
                        className="border rounded-md p-2 bg-input-bg dark:bg-input-bg-dark"
                    >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}件/ページ
                            </option>
                        ))}
                    </select>
                </div>

                <Button
                    onClick={() => handleSearch(1)}
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={isSearching}
                >
                    {isSearching && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                    検索
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={handleResetFilters}
                >
                    条件をリセット
                </Button>
            </div>
        </div>
    );

    const renderResults = () => {
        if (isSearching) {
            return (
                <div className="flex items-center justify-center py-12">
                    <SpinnerIcon className="w-10 h-10 text-brand-primary animate-spin" />
                </div>
            );
        }

        if (searchError) {
            return <div className="p-4 text-red-600 dark:text-red-400">{searchError}</div>;
        }

        if (!results) {
            return (
                <div className="p-4 text-gray-500 dark:text-gray-400">
                    フィルターを設定して「検索」を実行してください。
                </div>
            );
        }

        if (results.items.length === 0) {
            return (
                <div className="p-4 text-gray-500 dark:text-gray-400">
                    条件に一致する商品がありません。
                </div>
            );
        }

        const { pagination, items } = results;

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-base-200 dark:bg-base-dark-300 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {pagination.totalCount} 件中 {((pagination.page - 1) * pagination.pageSize) + 1} -{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} 件を表示
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={!pagination.hasPrevPage}
                            onClick={() => handlePageChange(pagination.page - 1)}
                        >
                            前へ
                        </Button>
                        <div className="flex items-center">
                            <span className="px-2 text-sm">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={!pagination.hasNextPage}
                            onClick={() => handlePageChange(pagination.page + 1)}
                        >
                            次へ
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const isSelected =
                            selectedItem?.product_code === item.product_code &&
                            selectedItem?.manufacturer_id === item.manufacturer_id;
                        return (
                            <div
                                key={`${item.manufacturer_id}_${item.product_code}`}
                                className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${
                                    isSelected
                                        ? 'border-brand-primary bg-brand-primary/10'
                                        : 'hover:border-brand-primary hover:bg-brand-primary/5'
                                }`}
                                onClick={() => handleSelectItem(item)}
                            >
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>{item.manufacturer_id}</span>
                                    {item.stock_summary && (
                                        <span className="font-semibold text-brand-primary">
                                            合計在庫: {item.stock_summary.total_quantity}
                                        </span>
                                    )}
                                </div>
                                <div className="text-lg font-semibold">{item.product_code}</div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    {item.productName || item.product_name || '-'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {item.brand && <span>ブランド: {item.brand} </span>}
                                    {item.category_id && <span> / カテゴリ: {item.category_id}</span>}
                                </div>
                                {item.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                                        {item.description}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDetailView = () => {
        const maxColorNameLength = colorEntries.reduce((max, entry) => {
            const length = (entry.color_name || '').length;
            return length > max ? length : max;
        }, 0);
        const colorColumnWidth = Math.min(Math.max(maxColorNameLength * 12, 160), 320);
        const renderMatrixSection = () => {
            if (isLoadingMatrix) {
                return (
                    <div className="flex items-center justify-center py-8">
                        <SpinnerIcon className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                );
            }

            if (!matrix) {
                return (
                    <div className="text-gray-500 dark:text-gray-400">
                        詳細データを読み込めませんでした。検索結果から別の商品を選択してください。
                    </div>
                );
            }

            if (colorEntries.length === 0 || sizeEntries.length === 0) {
                return (
                    <div className="text-gray-500 dark:text-gray-400">
                        在庫マトリクスのデータが見つかりませんでした。
                    </div>
                );
            }

            return (
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-2 min-w-[900px]">
                        <thead>
                            <tr>
                                <th
                                    className="bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark sticky left-0 z-30"
                                    style={{ top: 0, minWidth: colorColumnWidth }}
                                >
                                    <span className="sr-only">カラー列</span>
                                </th>
                                {sizeEntries.map((size) => (
                                    <th
                                        key={size.key}
                                        className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300 p-2 bg-base-200 dark:bg-base-dark-300 border border-default dark:border-default-dark sticky z-20"
                                        style={{ top: 0 }}
                                    >
                                        {size.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {colorEntries.map((color) => (
                                <tr key={color.key}>
                                    <th
                                            className="bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark sticky left-0 z-20"
                                            style={{ minWidth: colorColumnWidth, maxWidth: colorColumnWidth }}
                                    >
                                            <div className="flex flex-col items-center justify-center text-center p-3">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    {color.color_code || '-'}
                                                </div>
                                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                    {color.color_name || '-'}
                                                </div>
                                            </div>
                                    </th>
                                    {sizeEntries.map((size) => {
                                        const cellKey = buildCellKey(
                                            color.color_code,
                                            color.color_name,
                                            size.size_code,
                                            size.size_name,
                                        );
                                        const cellRow = cellRowMap.get(cellKey);
                                        const skuItem = skuLookupByCell.get(cellKey);
                                        const skuId = skuItem?.sku_id || null;
                                            const quantity = typeof cellRow?.quantity === 'number' ? cellRow?.quantity : null;
                                            const hasIncoming =
                                                [cellRow?.incoming_quantity_1, cellRow?.incoming_quantity_2, cellRow?.incoming_quantity_3].some(
                                                    (val) => !!val && Number(val) > 0,
                                                );
                                        const isLowStock =
                                            typeof quantity === 'number' &&
                                            quantity <= alertThreshold &&
                                            alertThreshold > 0;
                                        return (
                                            <td key={size.key} className="align-top">
                                                <div
                                                    className={`rounded-2xl border p-3 min-h-[140px] flex flex-col items-center justify-center gap-3 bg-base-100 dark:bg-base-dark-300 ${
                                                        isLowStock
                                                            ? 'border-amber-500 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]'
                                                            : 'border-default dark:border-default-dark'
                                                    }`}
                                                >
                                                    <div className="text-3xl font-semibold text-center">
                                                        {typeof quantity === 'number' ? quantity : '-'}
                                                    </div>
                                                    <Button
                                                        variant={hasIncoming ? 'primary' : 'secondary'}
                                                        size="sm"
                                                        className={`w-full max-w-[140px] text-xs ${hasIncoming ? '' : 'opacity-60'}`}
                                                        disabled={!hasIncoming || !skuId}
                                                        onClick={() => skuId && openIncomingModal(skuId)}
                                                    >
                                                        {hasIncoming ? '入荷予定あり' : '入荷予定なし'}
                                                    </Button>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        };

        return (
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow p-4 space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleBackToResults}
                    >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        検索結果に戻る
                    </Button>
                    {selectedItem && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedItem.manufacturer_id} / {selectedItem.product_code}
                        </div>
                    )}
                </div>

                {!selectedItem ? (
                    <div className="text-gray-500 dark:text-gray-400">
                        検索結果から商品を選択してください。
                    </div>
                ) : (
                    <>
                        <div className="bg-base-200 dark:bg-base-dark-300 rounded-xl p-4 space-y-3 border border-default dark:border-default-dark">
                            <div className="flex flex-wrap justify-between gap-4">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {selectedItem.manufacturer_id}
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {selectedItem.product_code} / {selectedItem.productName || selectedItem.product_name || '-'}
                                    </div>
                                    {selectedItem.brand && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300">ブランド: {selectedItem.brand}</div>
                                    )}
                                    {selectedItem.category_id && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300">カテゴリ: {selectedItem.category_id}</div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                                    {matrix?.product?.description || selectedItem.description || '説明文は登録されていません。'}
                                </div>
                            </div>
                            {selectedItem.tags && selectedItem.tags.split(',').filter((tag) => tag.trim().length > 0).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedItem.tags
                                        ?.split(',')
                                        .map((tag) => tag.trim())
                                        .filter((tag) => tag.length > 0)
                                        .map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 rounded-full text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/40"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 items-center">
                                <Button variant="primary" size="sm" disabled={!inventoryItemsForModals.length} onClick={() => openAdjustModal()}>
                                    在庫調整
                                </Button>
                                <Button variant="secondary" size="sm" disabled={!inventoryItemsForModals.length} onClick={() => openHistoryModal()}>
                                    全履歴
                                </Button>
                                <Button variant="secondary" size="sm" disabled={!inventoryItemsForModals.length} onClick={() => openIncomingModal()}>
                                    入荷予定管理
                                </Button>
                                <div className="flex items-center gap-2 bg-base-100 dark:bg-base-dark-200 rounded-md px-3 py-1">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">アラート閾値</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={alertThreshold}
                                        onChange={(e) => {
                                            const next = parseInt(e.target.value, 10);
                                            setAlertThreshold(Number.isNaN(next) ? 0 : next);
                                        }}
                                        className="w-20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-base-200 dark:bg-base-dark-300 p-3 border border-default dark:border-default-dark">
                                <div className="text-xs text-gray-500 dark:text-gray-400">総在庫</div>
                                <div className="text-2xl font-bold">{matrixStats.totalQuantity.toLocaleString()} 点</div>
                            </div>
                            <div className="rounded-lg bg-base-200 dark:bg-base-dark-300 p-3 border border-default dark:border-default-dark">
                                <div className="text-xs text-gray-500 dark:text-gray-400">入荷予定</div>
                                <div className="text-2xl font-bold">{matrixStats.totalIncoming.toLocaleString()} 点</div>
                            </div>
                            <div className="rounded-lg bg-base-200 dark:bg-base-dark-300 p-3 border border-default dark:border-default-dark">
                                <div className="text-xs text-gray-500 dark:text-gray-400">カラー数</div>
                                <div className="text-2xl font-bold">{matrixStats.colorCount}</div>
                            </div>
                            <div className="rounded-lg bg-base-200 dark:bg-base-dark-300 p-3 border border-default dark:border-default-dark">
                                <div className="text-xs text-gray-500 dark:text-gray-400">サイズ数</div>
                                <div className="text-2xl font-bold">{matrixStats.sizeCount}</div>
                            </div>
                        </div>

                        {renderMatrixSection()}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="h-full overflow-auto p-4 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">商品在庫検索</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        検索条件を設定し、絞り込み後に一覧・詳細を確認できます。
                    </p>
                </div>

                {viewMode === 'results' ? (
                    <>
                        {renderSearchForm()}
                        <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow p-4">
                            <h2 className="text-lg font-semibold mb-4">検索結果</h2>
                            {renderResults()}
                        </div>
                    </>
                ) : (
                    renderDetailView()
                )}
            </div>

            <AdjustInventoryModal
                isOpen={isAdjustModalOpen}
                onClose={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustSkuId(null);
                }}
                skuId={adjustSkuId}
                inventoryItems={inventoryItemsForModals}
                onAdjust={handleAdjustInventory}
            />
            <InventoryHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => {
                    setIsHistoryModalOpen(false);
                    setHistorySkuId(null);
                }}
                skuId={historySkuId}
                inventoryItems={inventoryItemsForModals}
                stockHistory={stockHistory}
            />
            <IncomingStockModal
                isOpen={isIncomingModalOpen}
                onClose={() => {
                    setIsIncomingModalOpen(false);
                    setIncomingSkuId(null);
                }}
                skuId={incomingSkuId}
                inventoryItems={inventoryItemsForModals}
                incomingStockData={incomingStockEntries}
                onAdd={handleIncomingAdd}
                onUpdate={handleIncomingUpdate}
                onDelete={handleIncomingDelete}
                onReceive={handleIncomingReceive}
            />
        </>
    );
};

export default SearchPage;

