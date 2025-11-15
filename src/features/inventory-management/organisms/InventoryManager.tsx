import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from '@shared/hooks/useTranslation';
import { PageHeader } from '@components/molecules';
import { useInventoryManagement, InventoryItem } from '../hooks/useInventoryManagement';
import InventoryTable from './InventoryTable';
import InventoryToolbar from './InventoryToolbar';
import AdjustInventoryModal from '../modals/AdjustInventoryModal';
import InventoryHistoryModal from '../modals/InventoryHistoryModal';
import IncomingStockModal from '../modals/IncomingStockModal';
import InventoryAlert from './InventoryAlert';
import { MagnifyingGlassIcon } from '@components/atoms';
import { getManufacturerTableData } from '@core/utils';
import { Row } from '@shared/types';
import { fetchTables } from '@core/data/db.live';
import { useDatabase } from '@core/contexts/DatabaseContext';
import TagFilterModal from '@features/estimator/molecules/TagFilterModal';
import { getManufacturerTableName } from '@core/config/tableNames';

type InventoryManagerProps = ReturnType<typeof useInventoryManagement>;

const InventoryManager: React.FC<InventoryManagerProps> = (props) => {
    const { t } = useTranslation('inventory-management');
    const {
        database,
        inventoryItems,
        lowStockItems,
        lowStockThreshold,
        setLowStockThreshold,
        updateStock,
        stockHistory,
        addIncomingStock,
        updateIncomingStock,
        deleteIncomingStock,
        receiveIncomingStock,
        paginationConfig,
        selectedManufacturer,
        setSelectedManufacturer,
        manufacturers,
    } = props;

    // databaseはuseInventoryManagementから取得しているが、setDatabaseが必要なためuseDatabaseを使用
    const { setDatabase: setDatabaseContext } = useDatabase();
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
    const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);

    // ブランド、カテゴリ、タグデータを取得
    const productDetails = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        return getManufacturerTableData(database, 'product_details', selectedManufacturer);
    }, [database, selectedManufacturer]);

    // ブランド一覧を取得（brandsテーブルから、選択中のメーカーで登録のあるブランドのみ）
    // 商品選択モーダル、商品データ管理と同じ方式
    const allBrands = useMemo(() => {
        return database?.brands?.data || [];
    }, [database?.brands]);

    // 選択されたメーカーのブランド一覧を取得
    const brands = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        return allBrands.filter((b: Row) => String(b.manufacturer_id || '') === selectedManufacturer);
    }, [database, selectedManufacturer, allBrands]);

    // ユニークなブランド一覧（フィルター用 - product_detailsから実際に使用されているブランドのみ）
    const uniqueBrands = useMemo(() => {
        if (!productDetails || productDetails.length === 0) return [];
        const brandSet = new Set<string>();
        productDetails.forEach((product: Row) => {
            const brand = String(product.brand || '');
            if (brand) brandSet.add(brand);
        });
        // brandsテーブルから選択されたメーカーのブランドのみをフィルタリング
        return brands
            .filter((b: Row) => brandSet.has(String(b.name || '')))
            .map((b: Row) => ({ id: String(b.id || ''), name: String(b.name || '') }));
    }, [productDetails, brands]);

    // カテゴリ一覧を取得
    const categories = useMemo(() => {
        return database?.categories?.data || [];
    }, [database?.categories]);

    // 商品のタグマップを作成
    const productTagsMap = useMemo(() => {
        if (!productDetails || productDetails.length === 0) return new Map<string, string[]>();
        const tagsMap = new Map<string, string[]>();
        
        productDetails.forEach((product: Row) => {
            const productCode = String(product.product_code || '');
            if (productCode && product.tags) {
                try {
                    const tagIds = JSON.parse(String(product.tags));
                    if (Array.isArray(tagIds)) {
                        tagsMap.set(productCode, tagIds.map((id: string) => String(id)));
                    }
                } catch (e) {
                    // JSON解析に失敗した場合は空配列
                }
            }
        });
        
        return tagsMap;
    }, [productDetails]);

    // 在庫アイテムにブランド、カテゴリ、タグ情報を追加
    const inventoryItemsWithDetails = useMemo(() => {
        return inventoryItems.map(item => {
            const productDetail = productDetails.find((p: Row) => 
                String(p.product_code || '') === item.product_code
            );
            
            const brandName = productDetail?.brand || '';
            
            return {
                ...item,
                brand: brandName,
                brand_name: brandName, // InventoryTableで使用されるフィールド
                category_id: productDetail?.category_id || '',
                tags: productDetail?.tags || '',
            };
        });
    }, [inventoryItems, productDetails]);

    // 検索とフィルタリング
    const filteredItems = useMemo(() => {
        // 検索語をスペースで分割して複数キーワード検索に対応
        const searchTermStr = (searchTerm || '').trim();
        const searchTerms = searchTermStr 
            ? searchTermStr.toLowerCase().split(/\s+/).filter(term => term.length > 0)
            : [];

        // 各フィルタリング条件で除外されたアイテム数をカウント
        let afterSearch = 0;
        let afterBrand = 0;
        let afterCategory = 0;
        let afterTags = 0;
        let afterLowStock = 0;

        const filtered = inventoryItemsWithDetails.filter(item => {
            // 検索語フィルタリング（複数キーワード検索に対応）
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term =>
                item.product_name?.toLowerCase().includes(term) ||
                item.product_code?.toLowerCase().includes(term) ||
                item.color_name?.toLowerCase().includes(term) ||
                item.size_name?.toLowerCase().includes(term) ||
                String(item.brand || '').toLowerCase().includes(term)
            );
            if (!matchesSearch) return false;
            afterSearch++;
            
            // ブランドフィルタリング
            const matchesBrand = selectedBrand === 'all' || 
                String(item.brand || '').toLowerCase() === selectedBrand.toLowerCase() ||
                String(item.brand || '') === selectedBrand;
            if (!matchesBrand) return false;
            afterBrand++;
            
            // カテゴリフィルタリング
            const categoryId = String(item.category_id || '');
            const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory;
            if (!matchesCategory) return false;
            afterCategory++;
            
            // タグフィルタリング（選択されたタグのいずれかを持っている商品を表示）
            let matchesTags = true;
            if (selectedTags.length > 0) {
                const productCode = String(item.product_code || '');
                const productTagIds = productTagsMap.get(productCode) || [];
                matchesTags = selectedTags.some(selectedTagId => productTagIds.includes(selectedTagId));
            }
            if (!matchesTags) return false;
            afterTags++;
            
            // 在庫不足フィルタリング
            const matchesLowStock = !filterLowStock || item.quantity <= lowStockThreshold;
            if (!matchesLowStock) return false;
            afterLowStock++;
            
            return true;
        });

        // 詳細なデバッグログ
        // console.log('[InventoryManager] ===== 検索・フィルタリング詳細 =====');
        // console.log('[InventoryManager] 入力データ:', {
        //     inventoryItemsCount: inventoryItems.length,
        //     inventoryItemsWithDetailsCount: inventoryItemsWithDetails.length,
        //     selectedManufacturer
        // });
        // console.log('[InventoryManager] 検索条件:', {
        //     searchTerm: searchTerm || '(なし)',
        //     searchTerms: searchTerms.length > 0 ? searchTerms : '(なし)',
        //     selectedBrand: selectedBrand || '(なし)',
        //     selectedCategory: selectedCategory || '(なし)',
        //     selectedTags: selectedTags.length > 0 ? selectedTags : '(なし)',
        //     filterLowStock: filterLowStock ? `在庫数 <= ${lowStockThreshold}` : '(無効)',
        //     lowStockThreshold
        // });
        // console.log('[InventoryManager] フィルタリング結果:', {
        //     '検索語フィルタ後': afterSearch,
        //     'ブランドフィルタ後': afterBrand,
        //     'カテゴリフィルタ後': afterCategory,
        //     'タグフィルタ後': afterTags,
        //     '在庫不足フィルタ後': afterLowStock,
        //     '最終結果': filtered.length
        // });
        
        // // サンプルデータ（最初の3件）を表示
        // if (filtered.length > 0) {
        //     console.log('[InventoryManager] 表示されるアイテム（サンプル・最初の3件）:', filtered.slice(0, 3).map(item => ({
        //         sku_id: item.sku_id,
        //         product_code: item.product_code,
        //         product_name: item.product_name,
        //         brand: item.brand || '(なし)',
        //         category_id: item.category_id || '(なし)',
        //         color_name: item.color_name,
        //         size_name: item.size_name,
        //         quantity: item.quantity
        //     })));
        // } else {
        //     console.log('[InventoryManager] ⚠️ 表示されるアイテムがありません');
        //     // フィルタリング前のデータのサンプルを表示
        //     if (inventoryItemsWithDetails.length > 0) {
        //         console.log('[InventoryManager] フィルタリング前のデータ（サンプル・最初の3件）:', inventoryItemsWithDetails.slice(0, 3).map(item => ({
        //             sku_id: item.sku_id,
        //             product_code: item.product_code,
        //             product_name: item.product_name,
        //             brand: item.brand || '(なし)',
        //             category_id: item.category_id || '(なし)',
        //             color_name: item.color_name,
        //             size_name: item.size_name,
        //             quantity: item.quantity
        //         })));
        //     }
        // }
        // console.log('[InventoryManager] ===========================================');

        return filtered;
    }, [inventoryItemsWithDetails, searchTerm, selectedBrand, selectedCategory, selectedTags, productTagsMap, filterLowStock, lowStockThreshold, inventoryItems.length, selectedManufacturer]);

    // メーカー変更時にフィルターをリセット
    const handleManufacturerChange = useCallback((manufacturerId: string) => {
        setSelectedManufacturer(manufacturerId);
        setSelectedBrand('all');
        setSelectedCategory('all');
        setSelectedTags([]);
    }, [setSelectedManufacturer]);

    // 必要なテーブルを読み込む（categories, tags, brands）
    // 在庫管理ツールは在庫データベースの閲覧編集のみを行うため、
    // メーカー依存ファイル3つ（stock、product_details、tags）と共通テーブル（categories、tags、brands）にアクセス
    // 商品データ管理や商品選択モーダルと同じパターン：テーブルが存在しない場合のみ読み込む
    const loadedCommonTablesRef = React.useRef<Set<string>>(new Set());
    useEffect(() => {
        const loadRequiredTables = async () => {
            if (!database) return;
            
            const tablesToLoad: string[] = [];
            
            // 共通カテゴリテーブルを読み込む（カテゴリフィルタリング用）
            if (!database.categories && !loadedCommonTablesRef.current.has('categories')) {
                tablesToLoad.push('categories');
                loadedCommonTablesRef.current.add('categories');
            }
            
            // 共通タグテーブルを読み込む（タグフィルタリング用）
            if (!database.tags && !loadedCommonTablesRef.current.has('tags')) {
                tablesToLoad.push('tags');
                loadedCommonTablesRef.current.add('tags');
            }
            
            // 共通ブランドテーブルを読み込む（ブランドフィルタリング用）
            if (!database.brands && !loadedCommonTablesRef.current.has('brands')) {
                tablesToLoad.push('brands');
                loadedCommonTablesRef.current.add('brands');
            }
            
            if (tablesToLoad.length > 0) {
                try {
                    const data = await fetchTables(tablesToLoad, { toolName: 'inventory-management' });
                    setDatabaseContext(prev => ({ ...(prev || {}), ...data }));
                } catch (err) {
                    console.error('[InventoryManager] Failed to load required tables:', err);
                    // エラーが発生した場合は、読み込み済みフラグをリセット
                    tablesToLoad.forEach(table => loadedCommonTablesRef.current.delete(table));
                }
            }
        };
        loadRequiredTables();
    }, [database, setDatabaseContext]); // databaseを依存配列に含めるが、loadedCommonTablesRefで重複読み込みを防ぐ

    // 選択されたメーカーのproduct_detailsとtagsを読み込む
    // 在庫管理ツールはメーカー依存ファイル3つ（stock、product_details、tags）にアクセス
    const loadedManufacturerTablesRef = React.useRef<Set<string>>(new Set());
    useEffect(() => {
        const loadManufacturerTables = async () => {
            if (!database || !selectedManufacturer) return;
            
            const tablesToLoad: string[] = [];
            
            // product_detailsテーブルを読み込む
            const productDetailsTableName = getManufacturerTableName('product_details', selectedManufacturer);
            const productDetailsKey = `${selectedManufacturer}_product_details`;
            if (!database[productDetailsTableName]?.data && !loadedManufacturerTablesRef.current.has(productDetailsKey)) {
                tablesToLoad.push(productDetailsTableName);
                loadedManufacturerTablesRef.current.add(productDetailsKey);
            }
            
            // tagsテーブルを読み込む（メーカー依存タグ）
            // 注意: tagsは共通タグとメーカー依存タグがマージされているため、個別に読み込む必要はない
            // ただし、メーカー依存タグのみを取得する場合は読み込む
            const tagsTableName = getManufacturerTableName('tags', selectedManufacturer);
            const tagsKey = `${selectedManufacturer}_tags`;
            // tagsは共通タグとマージされているため、個別に読み込まない
            // メーカー依存タグはTagFilterModalで動的に取得される
            
            if (tablesToLoad.length > 0) {
                try {
                    const data = await fetchTables(tablesToLoad, { toolName: 'inventory-management' });
                    setDatabaseContext(prev => ({ ...(prev || {}), ...data }));
                } catch (err) {
                    // 404エラーは正常（product_detailsやtagsが存在しない場合がある）
                    // console.log('[InventoryManager] Manufacturer tables not found:', selectedManufacturer, tablesToLoad);
                }
            }
        };
        loadManufacturerTables();
        // selectedManufacturerが変更されたときに、読み込み済みフラグをリセット
        return () => {
            if (selectedManufacturer) {
                loadedManufacturerTablesRef.current.delete(`${selectedManufacturer}_product_details`);
                loadedManufacturerTablesRef.current.delete(`${selectedManufacturer}_tags`);
            }
        };
    }, [selectedManufacturer, setDatabaseContext]); // databaseを依存配列から削除して、重複読み込みを防ぐ

    const handleAdjustStock = (skuId: string) => {
        setSelectedSkuId(skuId);
        setIsAdjustModalOpen(true);
    };

    const handleViewHistory = (skuId: string) => {
        setSelectedSkuId(skuId);
        setIsHistoryModalOpen(true);
    };

    const handleAdjustComplete = async (
        skuId: string,
        quantityChange: number,
        reason: string,
        notes?: string
    ) => {
        try {
            await updateStock(skuId, quantityChange, reason, notes);
            setIsAdjustModalOpen(false);
            setSelectedSkuId(null);
        } catch (error) {
            // エラーはupdateStock内で処理される
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <PageHeader
                title={t('inventory.title', '商品在庫管理')}
                description={t('inventory.description', '{count}件のSKU在庫を管理しています。', { count: inventoryItems.length })}
            >
                <InventoryToolbar
                    onAdjustStock={() => {
                        setSelectedSkuId(null);
                        setIsAdjustModalOpen(true);
                    }}
                    onViewHistory={() => setIsHistoryModalOpen(true)}
                    onManageIncoming={() => {
                        setSelectedSkuId(null);
                        setIsIncomingModalOpen(true);
                    }}
                    filterLowStock={filterLowStock}
                    onFilterLowStockChange={setFilterLowStock}
                    lowStockThreshold={lowStockThreshold}
                    onLowStockThresholdChange={setLowStockThreshold}
                    lowStockCount={lowStockItems.length}
                />
            </PageHeader>

            {/* 検索バーとフィルター */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-4">
                    <div className="mb-4 space-y-3">
                        {/* 検索バー（上段） */}
                        <div className="relative">
                            <label htmlFor="inventory-search-input" className="sr-only">
                                在庫検索
                            </label>
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="inventory-search-input"
                                name="inventory-search"
                                type="text"
                                placeholder={t('inventory.search_placeholder', '商品名、コード、カラー、サイズで検索（スペース区切りで複数キーワード検索可）')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
                                autoComplete="off"
                                aria-label="在庫検索"
                            />
                        </div>

                        {/* フィルター（中段：メーカー、ブランド、カテゴリ、タグ） */}
                        <div className="flex gap-2">
                        {/* メーカー選択 */}
                        <div className="flex-1">
                            <label htmlFor="inventory-manufacturer-filter" className="sr-only">
                                メーカーで絞り込み
                            </label>
                            <select
                                id="inventory-manufacturer-filter"
                                name="inventory-manufacturer"
                                value={selectedManufacturer}
                                onChange={(e) => handleManufacturerChange(e.target.value)}
                                className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
                                aria-label="メーカーで絞り込み"
                            >
                                {!manufacturers.length ? (
                                    <option value="">読み込み中...</option>
                                ) : (
                                    <>
                                        <option value="">メーカーを選択</option>
                                        {manufacturers.map((m: Row) => (
                                            <option key={m.id} value={m.id as string}>
                                                {m.name as string}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>

                        {/* ブランド選択 */}
                        {selectedManufacturer && uniqueBrands.length > 0 && (
                            <div className="flex-1">
                                <label htmlFor="inventory-brand-filter" className="sr-only">
                                    ブランドで絞り込み
                                </label>
                                <select
                                    id="inventory-brand-filter"
                                    name="inventory-brand"
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                    className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-white"
                                    aria-label="ブランドで絞り込み"
                                >
                                    <option value="all">すべてのブランド</option>
                                    {uniqueBrands.map((brand: { id: string; name: string }) => (
                                        <option key={brand.id} value={brand.name}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* カテゴリ選択 */}
                        {selectedManufacturer && categories.length > 0 && (
                            <div className="flex-1">
                                <label htmlFor="inventory-category-filter" className="sr-only">
                                    カテゴリで絞り込み
                                </label>
                                <select
                                    id="inventory-category-filter"
                                    name="inventory-category"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-white"
                                    aria-label="カテゴリで絞り込み"
                                >
                                    <option value="all">すべてのカテゴリ</option>
                                    {categories.map((cat: Row) => {
                                        const categoryId = cat.id;
                                        const categoryName = cat.categoryName || cat.name || categoryId;
                                        return (
                                            <option key={categoryId} value={categoryId}>
                                                {categoryName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {/* タグ選択 */}
                        {selectedManufacturer && (
                            <div className="flex-1">
                                <button
                                    type="button"
                                    onClick={() => setIsTagFilterModalOpen(true)}
                                    className={`w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark text-left ${
                                        selectedTags.length > 0 
                                            ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/20' 
                                            : ''
                                    }`}
                                    aria-label="タグで絞り込み"
                                >
                                    {selectedTags.length > 0 
                                        ? `タグ (${selectedTags.length}件選択中)` 
                                        : 'タグで絞り込み'}
                                </button>
                            </div>
                        )}
                        </div>
                    </div>

                    {lowStockItems.length > 0 && (
                        <div className="mb-4">
                            <InventoryAlert items={lowStockItems} threshold={lowStockThreshold} />
                        </div>
                    )}

                    {/* 在庫テーブル（ページネーション付き） */}
                    <InventoryTable
                        items={filteredItems}
                        onAdjustStock={handleAdjustStock}
                        onViewHistory={handleViewHistory}
                        lowStockThreshold={lowStockThreshold}
                        paginationConfig={paginationConfig}
                    />
                </div>
            </div>

            {/* Modals */}
            <AdjustInventoryModal
                isOpen={isAdjustModalOpen}
                onClose={() => {
                    setIsAdjustModalOpen(false);
                    setSelectedSkuId(null);
                }}
                skuId={selectedSkuId}
                inventoryItems={inventoryItems}
                onAdjust={handleAdjustComplete}
            />

            <InventoryHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => {
                    setIsHistoryModalOpen(false);
                    setSelectedSkuId(null);
                }}
                skuId={selectedSkuId}
                inventoryItems={inventoryItems}
                stockHistory={stockHistory}
            />

            <IncomingStockModal
                isOpen={isIncomingModalOpen}
                onClose={() => {
                    setIsIncomingModalOpen(false);
                    setSelectedSkuId(null);
                }}
                skuId={selectedSkuId}
                inventoryItems={inventoryItems}
                incomingStockData={(database?.incoming_stock?.data || []) as any}
                onAdd={addIncomingStock}
                onUpdate={updateIncomingStock}
                onDelete={deleteIncomingStock}
                onReceive={receiveIncomingStock}
            />

            {/* タグフィルターモーダル */}
            <TagFilterModal
                isOpen={isTagFilterModalOpen}
                onClose={() => setIsTagFilterModalOpen(false)}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                selectedManufacturer={selectedManufacturer || undefined}
            />
        </div>
    );
};

export default InventoryManager;

