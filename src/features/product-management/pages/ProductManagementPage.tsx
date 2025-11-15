import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getManufacturerTable, getManufacturerTableData, getManufacturerTableName, updateDatabase } from '@core/utils';
import { useTranslation } from '@shared/hooks/useTranslation';
import { Database, Row } from '@shared/types';
import { SpinnerIcon, MagnifyingGlassIcon } from '@components/atoms';
import { PageHeader } from '@components/molecules';
import ProductCard from '../organisms/ProductCard';
import { useDebugMode } from '@shared/hooks/useDebugMode';
import DebugPanel from '@components/organisms/DebugPanel';
import TagFilterModal from '@features/estimator/molecules/TagFilterModal';
import PaginatedListContainer, { PaginationInfo } from '@shared/ui/organisms/PaginatedListContainer';

const ProductManagementPage: React.FC = () => {
    const { t } = useTranslation('product-management');
    const { database, setDatabase } = useDatabase();
    const { debugMode, setDebugMode, logs, addLog, clearLogs, exportLogs } = useDebugMode('product-management');
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Row | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    
    // メーカー一覧を取得
    const manufacturers = useMemo(() => {
        return database?.manufacturers?.data || [];
    }, [database?.manufacturers]);

    // 選択されたメーカーの商品詳細データを取得
    const productDetails = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        const details = getManufacturerTableData(database, 'product_details', selectedManufacturer);
        // データがない場合は早期リターンでパフォーマンス最適化
        if (!details || details.length === 0) return [];
        return details;
    }, [database, selectedManufacturer]);

    // カテゴリ一覧を取得
    const categories = useMemo(() => {
        return database?.categories?.data || [];
    }, [database?.categories]);

    // ブランド一覧を取得（全メーカー）
    const allBrands = useMemo(() => {
        return database?.brands?.data || [];
    }, [database?.brands]);

    // 選択されたメーカーのブランド一覧を取得
    const brands = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        return allBrands.filter((b: Row) => String(b.manufacturer_id || '') === selectedManufacturer);
    }, [database, selectedManufacturer, allBrands]);

    // ユニークなブランド一覧（フィルター用）
    const uniqueBrands = useMemo(() => {
        if (!productDetails || productDetails.length === 0) return [];
        const brandSet = new Set<string>();
        productDetails.forEach((product: Row) => {
            const brand = String(product.brand || '');
            if (brand) brandSet.add(brand);
        });
        return Array.from(brandSet).map(brand => ({ id: brand, name: brand }));
    }, [productDetails]);

    // 商品のタグマップを作成（パフォーマンス最適化）
    const productTagsMap = useMemo(() => {
        if (!productDetails || productDetails.length === 0) return new Map<string, string[]>();
        const tagsMap = new Map<string, string[]>();
        
        productDetails.forEach((product: Row) => {
            const productCode = String(product.product_code || '');
            if (product.tags) {
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

    // フィルタリングされた商品リスト（パフォーマンス最適化）
    const filteredProducts = useMemo(() => {
        // 早期リターンでパフォーマンス最適化
        if (!productDetails || productDetails.length === 0) return [];
        
        // 検索語をスペースで分割して複数キーワード検索に対応
        const searchTermStr = (searchTerm || '').trim();
        const searchTerms = searchTermStr 
            ? searchTermStr.toLowerCase().split(/\s+/).filter(term => term.length > 0)
            : [];
        
        return productDetails.filter((product: Row) => {
            const productCode = String(product.product_code || '').toLowerCase();
            const productName = String(product.productName || product.product_name || '').toLowerCase();
            const brand = String(product.brand || '').toLowerCase();
            const description = String(product.description || '').toLowerCase();
            
            // 検索語フィルタリング（複数キーワード検索に対応）
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term =>
                productCode.includes(term) ||
                productName.includes(term) ||
                brand.includes(term) ||
                description.includes(term)
            );
            
            // ブランドフィルタリング
            const matchesBrand = selectedBrand === 'all' || 
                brand === selectedBrand.toLowerCase() ||
                String(product.brand || '') === selectedBrand;
            
            // カテゴリフィルタリング（product_detailsにcategory_idがある場合）
            const categoryId = String(product.category_id || '');
            const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory;
            
            // タグフィルタリング（選択されたタグのいずれかを持っている商品を表示）
            let matchesTags = true;
            if (selectedTags.length > 0) {
                const productCode = String(product.product_code || '');
                const productTagIds = productTagsMap.get(productCode) || [];
                matchesTags = selectedTags.some(selectedTagId => productTagIds.includes(selectedTagId));
            }
            
            return matchesSearch && matchesBrand && matchesCategory && matchesTags;
        });
    }, [productDetails, searchTerm, selectedBrand, selectedCategory, selectedTags, productTagsMap]);

    // データ読み込み
    useEffect(() => {
        const loadData = async () => {
            if (!database) {
                setIsLoading(true);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const requiredTables = ['manufacturers', 'brands', 'categories', 'tags'];
                const missingTables = requiredTables.filter(t => !database[t]);
                
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables, { toolName: 'product-management' });
                    setDatabase(prev => ({ ...prev, ...data }));
                }

                // 最初のメーカーを選択
                if (!selectedManufacturer && manufacturers.length > 0) {
                    setSelectedManufacturer(manufacturers[0].id as string);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('product.load_failed', 'データの読み込みに失敗しました。'));
                addLog('error', 'data-loading', 'データ読み込みエラー', { error: err instanceof Error ? err.message : String(err) });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [database, setDatabase, manufacturers.length, selectedManufacturer, addLog, t]);

    // 選択されたメーカーのproduct_detailsテーブルを読み込む
    useEffect(() => {
        const loadManufacturerData = async () => {
            if (!database || !selectedManufacturer) return;

            const tableName = getManufacturerTableName('product_details', selectedManufacturer);
            const table = database[tableName];
            
            if (!table || !table.data || table.data.length === 0) {
                try {
                    const data = await fetchTables([tableName], { toolName: 'product-management' });
                    setDatabase(prev => ({ ...prev, ...data }));
                } catch (err) {
                    console.error(`[ProductManagementPage] Failed to load ${tableName}:`, err);
                    addLog('error', 'data-loading', `テーブル読み込みエラー: ${tableName}`, { error: err instanceof Error ? err.message : String(err) });
                }
            }
        };

        loadManufacturerData();
    }, [database, selectedManufacturer, setDatabase, addLog]);

    // メーカー変更時にフィルターをリセット
    const handleManufacturerChange = useCallback((manufacturerId: string) => {
        setSelectedManufacturer(manufacturerId);
        setSelectedBrand('all');
        setSelectedCategory('all');
        setSelectedTags([]);
    }, []);

    const handleProductClick = useCallback((product: Row) => {
        setSelectedProduct(product);
        setIsEditModalOpen(true);
        setIsEditMode(false);
        setFormData({
            product_code: String(product.product_code || ''),
            productName: String(product.productName || ''),
            product_name: String(product.product_name || ''),
            description: String(product.description || ''),
            images: String(product.images || ''),
            tags: String(product.tags || ''),
            brand: String(product.brand || ''),
            meta_title: String(product.meta_title || ''),
            meta_description: String(product.meta_description || ''),
            og_image_url: String(product.og_image_url || ''),
            og_title: String(product.og_title || ''),
            og_description: String(product.og_description || ''),
        });
        // タグIDを配列として取得
        try {
            const tagIds = product.tags ? JSON.parse(String(product.tags)) : [];
            setSelectedTagIds(Array.isArray(tagIds) ? tagIds.map((id: string) => String(id)) : []);
        } catch (e) {
            setSelectedTagIds([]);
        }
    }, []);

    const handleProductDelete = useCallback(async (product: Row) => {
        if (!database || !selectedManufacturer) return;
        
        const productCode = String(product.product_code || '');
        if (!productCode) return;

        if (!confirm(t('product.delete_confirm', `品番「${productCode}」とその在庫データを削除しますか？`))) {
            return;
        }

        try {
            // product_detailsから削除
            const detailsTableName = getManufacturerTableName('product_details', selectedManufacturer);
            const detailsTable = getManufacturerTable(database, 'product_details', selectedManufacturer);
            
            if (detailsTable?.data) {
                const updatedDetails = detailsTable.data.filter((item: Row) => 
                    String(item.product_code || '') !== productCode
                );
                
                await updateDatabase(
                    'product-management',
                    detailsTableName,
                    {
                        schema: detailsTable.schema || [],
                        data: updatedDetails
                    },
                    database,
                    setDatabase,
                    selectedManufacturer
                );
            }

            // stockから同じ品番のデータを一括削除
            const stockTableName = getManufacturerTableName('stock', selectedManufacturer);
            const stockTable = getManufacturerTable(database, 'stock', selectedManufacturer);
            
            if (stockTable?.data) {
                const updatedStock = stockTable.data.filter((item: Row) => 
                    String(item.product_code || '') !== productCode
                );
                
                await updateDatabase(
                    'product-management',
                    stockTableName,
                    {
                        schema: stockTable.schema || [],
                        data: updatedStock
                    },
                    database,
                    setDatabase,
                    selectedManufacturer
                );
            }

            addLog('info', 'product-delete', `品番「${productCode}」を削除しました`, { productCode });
        } catch (err) {
            console.error('[ProductManagementPage] Failed to delete product:', err);
            addLog('error', 'product-delete', '商品削除エラー', { error: err instanceof Error ? err.message : String(err) });
            alert(t('product.delete_failed', '削除に失敗しました。'));
        }
    }, [database, selectedManufacturer, setDatabase, addLog, t]);

    const handleProductSave = useCallback(async () => {
        if (!database || !selectedManufacturer || !selectedProduct) return;
        
        setIsSaving(true);
        setSaveError(null);

        try {
            const tableName = getManufacturerTableName('product_details', selectedManufacturer);
            const table = getManufacturerTable(database, 'product_details', selectedManufacturer);
            
            if (!table || !table.data) {
                throw new Error('テーブルが見つかりません');
            }

            // タグIDをJSON配列として保存
            const tagsJson = JSON.stringify(selectedTagIds);

            // 既存のデータを更新
            const updatedData = table.data.map((item: Row) => {
                if (String(item.product_code || '') === formData.product_code) {
                    return {
                        ...item,
                        ...formData,
                        tags: tagsJson,
                        id: item.id || `detail_${selectedManufacturer}_${formData.product_code}`,
                        manufacturer_id: selectedManufacturer,
                    };
                }
                return item;
            });

            // データベースを更新（自動的にCSVに保存される）
            await updateDatabase(
                'product-management',
                tableName,
                {
                    schema: table.schema || [],
                    data: updatedData
                },
                database,
                setDatabase,
                selectedManufacturer
            );

            setIsEditMode(false);
            setIsEditModalOpen(false);
            setSelectedProduct(null);
            setFormData({});
            setSelectedTagIds([]);
        } catch (err) {
            console.error('[ProductManagementPage] Failed to save:', err);
            setSaveError(err instanceof Error ? err.message : t('product.save_failed', '保存に失敗しました。'));
        } finally {
            setIsSaving(false);
        }
    }, [database, selectedManufacturer, selectedProduct, formData, selectedTagIds, setDatabase, t]);

    if (isLoading) {
        return (
                <div className="flex h-full w-full items-center justify-center">
                    <SpinnerIcon className="w-12 h-12 text-brand-primary" />
                </div>
        );
    }
    
    if (error) {
        return (
                <div className="p-4 text-red-600 dark:text-red-400">
                <h3 className="font-bold mb-2">{t('product.error', 'エラーが発生しました')}</h3>
                <p>{error}</p>
                </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={t('product.title', '商品データ管理')}
                description={t('product.description', '商品詳細情報を管理します')}
            />

            <div className="flex-1 overflow-auto p-4">
                <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-md p-4">
                    {!isEditModalOpen ? (
                        <>
                            {/* 検索バーとフィルター */}
                            <div className="mb-4 space-y-3">
                                {/* 検索バー（上段） */}
                                <div className="relative">
                                    <label htmlFor="product-search-input" className="sr-only">
                                        商品検索
                                    </label>
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="product-search-input"
                                        name="product-search"
                                        type="text"
                                        placeholder={t('product.search_placeholder', '品番・商品名・ブランドで検索（スペース区切りで複数キーワード検索可）')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
                                        autoComplete="off"
                                        aria-label="商品検索"
                                    />
                                </div>

                                {/* フィルター（下段：メーカー、ブランド、カテゴリ、タグ） */}
                                <div className="flex gap-2">
                                    {/* メーカー選択 */}
                                    <div className="flex-1">
                                        <label htmlFor="product-manufacturer-filter" className="sr-only">
                                            メーカーで絞り込み
                                        </label>
                                        <select
                                            id="product-manufacturer-filter"
                                            name="product-manufacturer"
                                            value={selectedManufacturer}
                                            onChange={(e) => handleManufacturerChange(e.target.value)}
                                            className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
                                            aria-label="メーカーで絞り込み"
                                        >
                                            <option value="">{t('product.select_manufacturer', 'メーカーを選択')}</option>
                                            {manufacturers.map((m: Row) => (
                                                <option key={m.id} value={m.id as string}>
                                                    {m.name as string}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ブランド選択 */}
                                    {selectedManufacturer && (
                                        <div className="flex-1">
                                            <label htmlFor="product-brand-filter" className="sr-only">
                                                ブランドで絞り込み
                                            </label>
                                            <select
                                                id="product-brand-filter"
                                                name="product-brand"
                                                value={selectedBrand}
                                                onChange={(e) => setSelectedBrand(e.target.value)}
                                                className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
                                                aria-label="ブランドで絞り込み"
                                                disabled={!selectedManufacturer || uniqueBrands.length === 0}
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
                                            <label htmlFor="product-category-filter" className="sr-only">
                                                カテゴリで絞り込み
                                            </label>
                                            <select
                                                id="product-category-filter"
                                                name="product-category"
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full p-2 border border-default dark:border-default-dark rounded-md bg-input-bg dark:bg-input-bg-dark"
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

                            {/* 商品カードグリッド（ページネーション付き） */}
                            {selectedManufacturer ? (
                                <PaginatedListContainer
                                    data={filteredProducts}
                                    paginationConfig={{ enabled: true, itemsPerPage: 24 }}
                                    paginationPosition="header"
                                    className="h-full w-full flex flex-col"
                                    header={(paginationInfo: PaginationInfo) => (
                                        <div className="flex-shrink-0 mb-4">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {paginationInfo.totalItems}件の商品が見つかりました
                                                {paginationInfo.totalPages > 1 && (
                                                    <span className="ml-2">
                                                        （{paginationInfo.startIndex} - {paginationInfo.endIndex}件目を表示）
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                >
                                    {(paginatedData) => (
                                        <>
                                            {paginatedData.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                    {searchTerm || selectedBrand !== 'all' || selectedCategory !== 'all' || selectedTags.length > 0
                                                        ? t('product.no_search_results', '検索結果がありません')
                                                        : t('product.no_products', '商品が登録されていません')
                                                    }
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {paginatedData.map((product: Row) => (
                                                        <ProductCard
                                                            key={product.id || product.product_code}
                                                            product={product}
                                                            onClick={() => handleProductClick(product)}
                                                            onDelete={() => handleProductDelete(product)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </PaginatedListContainer>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {t('product.select_manufacturer_first', 'メーカーを選択してください')}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* ボタンエリア（戻る、編集、キャンセル、保存） */}
                            <div className="mb-4 flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setIsEditMode(false);
                                        setSelectedProduct(null);
                                        setFormData({});
                                        setSelectedTagIds([]);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-base-200 dark:bg-base-dark-300 hover:bg-base-300 dark:hover:bg-base-dark-300/80"
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    戻る
                                </button>
                                {!isEditMode && (
                                    <button
                                        onClick={() => setIsEditMode(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-brand-primary-dark"
                                    >
                                        <i className="fas fa-edit"></i>
                                        編集
                                    </button>
                                )}
                                {isEditMode && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditMode(false);
                                                // フォームデータを元に戻す
                                                if (selectedProduct) {
                                                    setFormData({
                                                        product_code: String(selectedProduct.product_code || ''),
                                                        productName: String(selectedProduct.productName || ''),
                                                        product_name: String(selectedProduct.product_name || ''),
                                                        description: String(selectedProduct.description || ''),
                                                        images: String(selectedProduct.images || ''),
                                                        tags: String(selectedProduct.tags || ''),
                                                        brand: String(selectedProduct.brand || ''),
                                                        meta_title: String(selectedProduct.meta_title || ''),
                                                        meta_description: String(selectedProduct.meta_description || ''),
                                                        og_image_url: String(selectedProduct.og_image_url || ''),
                                                        og_title: String(selectedProduct.og_title || ''),
                                                        og_description: String(selectedProduct.og_description || ''),
                                                    });
                                                    try {
                                                        const tagIds = selectedProduct.tags ? JSON.parse(String(selectedProduct.tags)) : [];
                                                        setSelectedTagIds(Array.isArray(tagIds) ? tagIds.map((id: string) => String(id)) : []);
                                                    } catch (e) {
                                                        setSelectedTagIds([]);
                                                    }
                                                }
                                                setSaveError(null);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-base-200 dark:bg-base-dark-300 hover:bg-base-300 dark:hover:bg-base-dark-300/80"
                                            disabled={isSaving}
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={handleProductSave}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-brand-primary text-white hover:bg-brand-primary-dark"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    保存中...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save"></i>
                                                    保存
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            {/* 編集フォーム */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg mb-4">
                                    {t('product.edit_title', '商品詳細編集')}
                                </h3>

                                {saveError && (
                                    <div className="alert alert-error mb-4">
                                        <span>{saveError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* 品番 */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.code', '品番')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.product_code || ''}
                                            className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 text-base-content dark:text-base-dark-content"
                                            disabled
                                            readOnly
                                        />
                                    </div>

                                    {/* 商品名 */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.name', '商品名')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.productName || ''}
                                            className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 text-base-content dark:text-base-dark-content"
                                            disabled
                                            readOnly
                                        />
                                    </div>

                                    {/* 商品名（略称） */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.name_short', '商品名（略称）')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.product_name || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {/* ブランド */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.brand', 'ブランド')}</span>
                                        </label>
                                        <select
                                            value={formData.brand || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                            className="select select-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            disabled={!isEditMode}
                                        >
                                            <option value="">ブランドを選択</option>
                                            {brands.map((b: Row) => (
                                                <option key={b.id} value={String(b.name || '')}>
                                                    {String(b.name || '')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 説明 */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.description_text', '説明')}</span>
                                        </label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            rows={4}
                                        />
                                    </div>

                                    {/* 画像URL（カンマ区切り） */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.images', '画像URL（カンマ区切り）')}</span>
                                        </label>
                                        <textarea
                                            value={formData.images || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, images: e.target.value }))}
                                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            rows={3}
                                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                                        />
                                    </div>

                                    {/* タグ（チェックボックスで複数選択） */}
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.tags', 'タグ')}</span>
                                        </label>
                                        <div className="border rounded-md p-4 max-h-64 overflow-y-auto bg-input-bg dark:bg-input-bg-dark">
                                            {(() => {
                                                // 共通タグとメーカー依存タグを取得
                                                const tags: Row[] = [];
                                                const commonTagsTable = database?.tags;
                                                if (commonTagsTable?.data && Array.isArray(commonTagsTable.data)) {
                                                    tags.push(...commonTagsTable.data);
                                                }
                                                if (selectedManufacturer) {
                                                    const manufacturerTags = getManufacturerTableData(database, 'tags', selectedManufacturer);
                                                    tags.push(...manufacturerTags);
                                                }
                                                // 重複除去
                                                const uniqueTagsMap = new Map<string, Row>();
                                                tags.forEach(tag => {
                                                    const tagId = String(tag.id || '');
                                                    if (tagId && !uniqueTagsMap.has(tagId)) {
                                                        uniqueTagsMap.set(tagId, tag);
                                                    }
                                                });
                                                const availableTags = Array.from(uniqueTagsMap.values()).sort((a, b) => {
                                                    const nameA = String(a.tagName || a.name || a.value || a.id || '').toLowerCase();
                                                    const nameB = String(b.tagName || b.name || b.value || b.id || '').toLowerCase();
                                                    return nameA.localeCompare(nameB);
                                                });

                                                if (availableTags.length === 0) {
                                                    return (
                                                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                                            タグがありません
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {availableTags.map(tag => {
                                                            const tagId = String(tag.id || '');
                                                            const tagName = String(tag.tagName || tag.name || tag.value || tag.id || '');
                                                            const isSelected = selectedTagIds.includes(tagId);

                                                            return (
                                                                <label
                                                                    key={tagId}
                                                                    className={`flex items-center gap-2 p-2 rounded hover:bg-base-200 dark:hover:bg-base-dark-300 cursor-pointer ${
                                                                        isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                                                                    } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            if (isEditMode) {
                                                                                const newSelectedTagIds = isSelected
                                                                                    ? selectedTagIds.filter(id => id !== tagId)
                                                                                    : [...selectedTagIds, tagId];
                                                                                setSelectedTagIds(newSelectedTagIds);
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 flex-shrink-0"
                                                                        disabled={!isEditMode}
                                                                    />
                                                                    <span className="flex-1 text-sm truncate">{tagName}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* SEO設定 */}
                                    <div className="divider">{t('product.seo_settings', 'SEO設定')}</div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.meta_title', 'メタタイトル')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.meta_title || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.meta_description', 'メタ説明')}</span>
                                        </label>
                                        <textarea
                                            value={formData.meta_description || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            rows={3}
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {/* OG設定 */}
                                    <div className="divider">{t('product.og_settings', 'OG設定')}</div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.og_image_url', 'OG画像URL')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.og_image_url || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, og_image_url: e.target.value }))}
                                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.og_title', 'OGタイトル')}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.og_title || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
                                            className="input input-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">{t('product.og_description', 'OG説明')}</span>
                                        </label>
                                        <textarea
                                            value={formData.og_description || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                                            className="textarea textarea-bordered w-full bg-input-bg dark:bg-input-bg-dark text-base-content dark:text-base-dark-content"
                                            rows={3}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>


            {/* デバッグパネル */}
            <DebugPanel
                debugMode={debugMode}
                onToggle={setDebugMode}
                logs={logs}
                onClearLogs={clearLogs}
                onExportLogs={exportLogs}
                toolName={t('product.title', '商品データ管理')}
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

export default ProductManagementPage;

