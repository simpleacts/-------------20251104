import { MagnifyingGlassIcon } from '@components/atoms';
import PaginatedListContainer, { PaginationInfo } from '@components/organisms/PaginatedListContainer';
import { getManufacturerTableName, isManufacturerDependentTable } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { getBrandNameForProduct } from '@core/utils';
import { Row, Table } from '@shared/types';
import React, { useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid } from 'react-window';
import TagFilterModal from '../molecules/TagFilterModal';

interface ProductSelectionGridProps {
  data: Row[];
  productDetailsTable: Table | null;
  brands: Row[];
  categories: Row[];
  manufacturers?: Row[];
  onSelect: (product: Row) => void;
  paginationConfig?: { enabled: boolean; itemsPerPage: number };
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  selectedManufacturer?: string;
  onManufacturerChange?: (manufacturer: string) => void;
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  selectedTags?: string[]; // 選択されたタグIDの配列
  onTagsChange?: (tags: string[]) => void; // タグ選択変更時のコールバック
  lockedManufacturerId?: string | null;
  filterKeyword?: string | null;
  brandsMap?: Map<string, string>; // brand_id -> brand_name
  categoriesMap?: Map<string, string>; // categoryId -> categoryName
  viewMode?: 'list'; // 表示モード: 'list'（リスト表示のみ）
}

interface GridChildComponentProps {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data: any;
}

interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data: any;
}

// 選択用のシンプルな商品カード（編集機能や公開ボタンなし）
// コンテナ内に収まるようにサイズを調整
const SelectionProductCard: React.FC<{
    row: Row;
    detail: Row | undefined;
    brandName?: string; // ブランド名を直接渡す
    cardWidth: number;
    cardHeight: number;
    onSelect: () => void;
    manufacturerId?: string; // メーカーID（ログ記録用）
}> = ({ row, detail, brandName = '', cardWidth, cardHeight, onSelect, manufacturerId }) => {
    const { logDataUsage } = useDatabase();
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    
    // データ使用ログを記録（最初のレンダリング時のみ）
    const hasLoggedRef = React.useRef(false);
    React.useEffect(() => {
        if (!hasLoggedRef.current && cardWidth > 0 && cardHeight > 0) {
            // stockテーブルのデータ使用を記録（products_masterは削除、stockテーブルに統合）
            if (row.id && manufacturerId) {
                const tableName = isManufacturerDependentTable('stock') 
                    ? getManufacturerTableName('stock', manufacturerId)
                    : 'stock';
                const usedFields = ['productCode', 'manufacturer_id', 'brand_id', 'category_id', 'is_published'].filter(f => row[f] !== undefined);
                logDataUsage('estimator', tableName, String(row.id), usedFields, 'display');
            }
            
            // product_detailsテーブルのデータ使用を記録
            if (detail?.product_code && manufacturerId) {
                const tableName = isManufacturerDependentTable('product_details')
                    ? getManufacturerTableName('product_details', manufacturerId)
                    : 'product_details';
                const usedFields = ['product_code', 'manufacturer_id', 'productName', 'description', 'images'].filter(f => detail[f] !== undefined);
                logDataUsage('estimator', tableName, String(detail.product_code), usedFields, 'display');
            }
            
            hasLoggedRef.current = true;
        }
    }, [row.id, detail?.product_code, manufacturerId, cardWidth, cardHeight, logDataUsage]);
    
    const hasValidImage = detail?.images && typeof detail.images === 'string' && detail.images.trim() !== '' && !imageError;
    const imageUrl = hasValidImage ? detail.images : null;
    const productName = detail?.productName || '(名称未設定)';
    const description = detail?.description ? String(detail.description).substring(0, 80) : '';
    
    // 画像エリアの高さを動的に計算（カードの40-45%）
    const imageHeight = Math.max(120, Math.min(200, cardHeight * 0.45));
    
    const handleImageError = () => {
        // エラーが発生したら、画像を非表示にしてグレー背景を表示
        setImageError(true);
    };
    
    const handleImageLoad = () => {
        setImageLoaded(true);
    };
    

        return (
            <div 
                className="bg-card-100 dark:bg-card-dark-100 rounded-lg shadow flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-px border border-transparent hover:border-brand-primary"
                data-testid={`product-card-${row.id}`}
                style={{ 
                    width: `${cardWidth}px`, 
                    height: `${cardHeight}px`, 
                    minWidth: `${cardWidth}px`,
                    minHeight: `${cardHeight}px`,
                    maxWidth: `${cardWidth}px`,
                    boxSizing: 'border-box',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    visibility: 'visible',
                    opacity: 1,
                    zIndex: 1
                }}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            <div 
                className="w-full rounded-t-lg bg-gray-300 dark:bg-gray-700 p-2 flex items-center justify-center flex-shrink-0"
                style={{ height: `${imageHeight}px` }}
            >
                {imageUrl && !imageError ? (
                    <img 
                        src={imageUrl} 
                        alt={productName} 
                        className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                    />
                ) : null}
                {/* 画像がない場合やエラー時のプレースホルダー */}
                {(!imageUrl || imageError) && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-500 dark:text-gray-400 text-xs text-center">
                            <div className="mb-1">📦</div>
                            <div>{row.code || row.productCode || '画像なし'}</div>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3 flex-grow flex flex-col min-h-0 overflow-hidden">
                <h3 className="font-bold mb-1 text-sm text-density-card truncate" title={productName}>
                    {productName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                    {brandName && <span className="font-medium">{brandName}</span>}
                    {brandName && (row.code || row.productCode) && ' / '}
                    {(row.code || row.productCode) && <span>{row.code || row.productCode}</span>}
                </p>
                {description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex-grow line-clamp-2 mt-1 overflow-hidden">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

const ProductSelectionGrid: React.FC<ProductSelectionGridProps> = ({
    data,
    productDetailsTable,
    brands,
    categories,
    manufacturers = [],
    onSelect,
    paginationConfig,
    searchTerm = '',
    onSearchChange,
    selectedManufacturer = 'all',
    onManufacturerChange,
    selectedBrand = 'all',
    onBrandChange,
    selectedCategory = 'all',
    onCategoryChange,
    selectedTags = [],
    onTagsChange,
    lockedManufacturerId,
    filterKeyword,
    brandsMap,
    categoriesMap,
    viewMode = 'list' // リスト表示のみ
}) => {
    const { database } = useDatabase();
    const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
    
    const { enabled: isPaginationEnabled, itemsPerPage } = useMemo(() => ({
        enabled: paginationConfig?.enabled || false,
        itemsPerPage: paginationConfig?.itemsPerPage || 24,
    }), [paginationConfig]);
    
    const primaryKey = 'id';

    const productDetailsMap = React.useMemo(() => {
        if (!productDetailsTable) return new Map<string, Row>();
        // product_codeをキーとして使用（後方互換性のためproduct_idもチェック）
        return new Map(productDetailsTable.data.map(detail => {
            const key = detail.product_code ? String(detail.product_code) : String(detail.product_id || '');
            return [key, detail];
        }));
    }, [productDetailsTable]);

    // ブランド名マップを事前に作成（パフォーマンス最適化）
    const brandNameMap = React.useMemo(() => {
        const map = new Map<string, string>();
        if (!database?.brands?.data || !data) return map;
        
        data.forEach(row => {
            const rowId = String(row[primaryKey] || row.id);
            const brandId = String(row.brand_id || '');
            const manufacturerId = String(row.manufacturer_id || '');
            
            if (brandId && manufacturerId && !map.has(rowId)) {
                const brandName = getBrandNameForProduct(database, rowId, manufacturerId);
                if (brandName) {
                    map.set(rowId, brandName);
                }
            }
        });
        
        return map;
    }, [database, data, primaryKey]);

    // product_detailsからタグ情報を取得（tagsフィールドはJSON配列）
    // 注意: product_tags_manu_xxxxは削除（product_details_manu_xxxxのtagsフィールドで管理）
    const productTagsMap = React.useMemo(() => {
        if (!data || data.length === 0 || !database || !productDetailsTable) return new Map<string, Row[]>();
        const tagsMap = new Map<string, Row[]>();
        
        // 各商品のタグをマップに格納
        data.forEach((row: Row) => {
            const productId = String(row[primaryKey] || row.id);
            const productCode = row.productCode ? String(row.productCode) : (productId.includes('_') ? productId.split('_').slice(2).join('_') : productId);
            const manufacturerId = String(row.manufacturer_id || '');
            
            if (manufacturerId) {
                // product_detailsからタグ情報を取得
                const detail = productDetailsTable.data.find((d: Row) => 
                    (d.product_code && String(d.product_code) === productCode) ||
                    (d.product_id && String(d.product_id) === productId)
                );
                
                if (detail?.tags) {
                    try {
                        const tagIds = JSON.parse(String(detail.tags));
                        if (Array.isArray(tagIds)) {
                            // tag_idの配列をRow形式に変換
                            const tags = tagIds.map((tagId: string) => ({ tag_id: tagId }));
                            tagsMap.set(productId, tags);
                        }
                    } catch (e) {
                        // JSON解析に失敗した場合は空配列
                        tagsMap.set(productId, []);
                    }
                } else {
                    tagsMap.set(productId, []);
                }
            }
        });
        
        return tagsMap;
    }, [data, primaryKey, database, productDetailsTable]);

    // フィルタリングされたデータ
    // 新しい絞り込み方法に対応: 複数フィールド検索、スペース区切り検索に対応
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) {
            return [];
        }
        
        // 検索語をスペースで分割して複数キーワード検索に対応
        const searchTermStr = (searchTerm || '').trim();
        const searchTerms = searchTermStr 
            ? searchTermStr.toLowerCase().split(/\s+/).filter(term => term.length > 0)
            : [];
        const lowerFilterKeyword = filterKeyword ? String(filterKeyword).toLowerCase() : undefined;

        const filtered = data.filter(row => {
            // primaryKeyでアクセス（id または 他のキー）
            const rowId = String(row[primaryKey] || row.id);
            const detail = productDetailsMap.get(rowId);
            
            // 商品名（product_detailsから取得）
            const productName = (detail?.productName || '').toLowerCase();
            // 商品コード（在庫テーブルから作成したRowはcodeフィールドを使用）
            const productCode = String(row.productCode || row.code || '').toLowerCase();
            // 商品説明
            const description = (detail?.description || '').toLowerCase();
            // メーカーID
            const manufacturerId = String(row.manufacturer_id || '');
            
            // ブランド名を事前に作成したマップから取得（パフォーマンス最適化）
            const brandId = String(row.brand_id || '');
            const brandName = brandNameMap.get(rowId) || '';
            
            // フィルターキーワード（外部から渡されるキーワード）
            const matchesKeyword = !lowerFilterKeyword || 
                productName.includes(lowerFilterKeyword) || 
                productCode.includes(lowerFilterKeyword) ||
                description.includes(lowerFilterKeyword);
            
            // ブランドフィルタリング（brand_idベース）
            const matchesBrand = selectedBrand === 'all' || 
                (brandId && String(brandId) === selectedBrand) ||
                brandName.toLowerCase() === selectedBrand.toLowerCase();
            
            // カテゴリフィルタリング
            const categoryId = row.category_id || '';
            // カテゴリ名で選択されている場合は、categoriesMapを使ってIDに変換
            let categoryIdToMatch = selectedCategory;
            if (selectedCategory !== 'all' && categoriesMap) {
                // 選択された値がカテゴリ名の場合、IDに変換
                for (const [id, name] of categoriesMap.entries()) {
                    if (name === selectedCategory) {
                        categoryIdToMatch = id;
                        break;
                    }
                }
            }
            const matchesCategory = selectedCategory === 'all' || String(categoryId) === String(categoryIdToMatch);
            
            // 検索語フィルタリング（複数キーワード検索に対応）
            // すべての検索語が商品名、商品コード、説明のいずれかに含まれる必要がある
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term =>
                productName.includes(term) ||
                productCode.includes(term) ||
                description.includes(term) ||
                brandName.includes(term) ||
                manufacturerId.includes(term)
            );
            
            // メーカーフィルタリング
            const matchesManufacturer = (selectedManufacturer === 'all' || String(manufacturerId) === selectedManufacturer) &&
                (!lockedManufacturerId || row.manufacturer_id === lockedManufacturerId);
            
            // タグフィルタリング（選択されたタグのいずれかを持っている商品を表示）
            let matchesTags = true;
            if (selectedTags.length > 0) {
                const productTags = productTagsMap.get(rowId) || [];
                const productTagIds = productTags.map((tag: Row) => String(tag.tag_id || tag.id || ''));
                // 選択されたタグのいずれかが商品のタグに含まれているかチェック
                matchesTags = selectedTags.some(selectedTagId => productTagIds.includes(selectedTagId));
            }
            
            return matchesKeyword && matchesManufacturer && matchesBrand && matchesCategory && matchesSearch && matchesTags;
        });
        
        // デバッグ: フィルタリング結果を確認（開発環境のみ）
        if (process.env.NODE_ENV === 'development' && filtered.length === 0 && data.length > 0) {
            console.warn('[ProductSelectionGrid] All data filtered out.', {
                originalCount: data.length,
                searchTerm,
                selectedBrand,
                selectedCategory,
                filterKeyword,
                lockedManufacturerId,
                productDetailsMapSize: productDetailsMap.size,
                sampleRow: data[0]
            });
        }
        
        return filtered;
    }, [data, searchTerm, selectedManufacturer, selectedBrand, selectedCategory, selectedTags, lockedManufacturerId, filterKeyword, productDetailsMap, productTagsMap, categoriesMap, primaryKey, brandNameMap]);

    // ブランド一覧（重複除去、タグベース）
    const uniqueBrands = useMemo(() => {
        // brandsは既にタグベースのブランドリスト（{id: tag_id, name: brand_name}形式）
        const brandList = brands.map((brand: Row) => ({
            id: brand.id as string, // タグID（例: "brand_print-star"）
            name: brand.name as string // ブランド名（例: "Print Star"）
        }));
        // 重複除去（IDで）
        const uniqueMap = new Map<string, {id: string, name: string}>();
        brandList.forEach(b => {
            if (b.id && !uniqueMap.has(b.id)) {
                uniqueMap.set(b.id, b);
            }
        });
        return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [brands]);

    const Cell = React.memo(({ columnIndex, rowIndex, style, data: itemData }: GridChildComponentProps) => {
        const { columnCount, paginatedData, productDetailsMap, productTagsMap, primaryKey, cardWidth, cardHeight, gap, actualCardWidth, onSelect } = itemData as any;
        
        const index = rowIndex * columnCount + columnIndex;
        
        if (index >= paginatedData.length) return null;

        const row = paginatedData[index];
        if (!row) return null;

        const rowId = String(row[primaryKey] || row.id);
        // product_codeを取得（row.productCodeが存在する場合はそれを使用、存在しない場合はrowIdから抽出）
        const productCode = row.productCode ? String(row.productCode) : (rowId.includes('_') ? rowId.split('_').slice(2).join('_') : rowId);
        const detail = productDetailsMap.get(productCode) || productDetailsMap.get(rowId); // 後方互換性のためrowIdもチェック
        
        // 実際のカード幅（既に計算済み）
        // cardWidthやcardHeightが0またはundefinedの場合は、itemDataから取得できないため、styleから推測する
        let cardWidthToUse = actualCardWidth || cardWidth || 0;
        let cardHeightToUse = cardHeight || 0;
        
        // もしcardWidthやcardHeightが0またはundefinedの場合は、styleから計算を試みる
        if ((cardWidthToUse <= 0 || !cardWidthToUse) && style.width) {
            const styleWidth = typeof style.width === 'number' ? style.width : parseFloat(String(style.width).replace('px', ''));
            if (!isNaN(styleWidth) && styleWidth > 0) {
                cardWidthToUse = styleWidth - (gap || 16);
            }
        }
        if ((cardHeightToUse <= 0 || !cardHeightToUse) && style.height) {
            const styleHeight = typeof style.height === 'number' ? style.height : parseFloat(String(style.height).replace('px', ''));
            if (!isNaN(styleHeight) && styleHeight > 0) {
                cardHeightToUse = styleHeight - (gap || 16);
            }
        }
        
        // それでも0またはundefinedの場合は、デフォルト値を使用
        if (cardWidthToUse <= 0 || !cardWidthToUse) cardWidthToUse = 200;
        if (cardHeightToUse <= 0 || !cardHeightToUse) cardHeightToUse = 280;

        return (
            <div 
                style={{ 
                    ...style,
                    padding: 0,
                    paddingTop: 0,
                    paddingRight: 0,
                    paddingBottom: 0,
                    paddingLeft: 0,
                    boxSizing: 'border-box',
                    overflow: 'visible',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center'
                }}
            >
                <div style={{ 
                    width: `${cardWidthToUse}px`, 
                    height: `${cardHeightToUse}px`,
                    flexShrink: 0,
                    position: 'relative',
                    display: 'block',
                    overflow: 'visible'
                }}>
                    <SelectionProductCard
                        row={row}
                        detail={detail}
                        brandName={(() => {
                            const brandId = String(row.brand_id || '');
                            const manufacturerId = String(row.manufacturer_id || '');
                            return brandId && manufacturerId 
                                ? getBrandNameForProduct(database, rowId, manufacturerId)
                                : '';
                        })()}
                        cardWidth={cardWidthToUse}
                        cardHeight={cardHeightToUse}
                        onSelect={() => onSelect(row)}
                        manufacturerId={String(row.manufacturer_id || '')}
                    />
                </div>
            </div>
        );
    });
    
    Cell.displayName = 'ProductSelectionGridCell';

    return (
        <>
            <PaginatedListContainer
                data={filteredData}
                paginationConfig={paginationConfig || { enabled: true, itemsPerPage: 24 }}
                paginationPosition="header"
                className="h-full w-full flex flex-col"
                header={(paginationInfo: PaginationInfo) => (
                    <div className="flex-shrink-0 p-4 border-b border-base-200 dark:border-base-dark-300 space-y-3 overflow-x-hidden">
                        {filterKeyword && (
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm">
                                絞り込み中: <strong>{filterKeyword}</strong>
                            </div>
                        )}
                        {onSearchChange && (
                            <div className="relative">
                                <label htmlFor="product-search-input" className="sr-only">
                                    商品検索
                                </label>
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="product-search-input"
                                    name="product-search"
                                    type="text"
                                    placeholder="商品名、品番、説明、ブランド、メーカーIDで検索（スペース区切りで複数キーワード検索可）"
                                    value={searchTerm}
                                    onChange={e => onSearchChange(e.target.value)}
                                    className="w-full pl-10 p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                                    autoComplete="off"
                                    aria-label="商品検索"
                                />
                            </div>
                        )}
                        <div className="flex gap-2">
                            {onManufacturerChange && manufacturers.length > 0 && (
                                <div className="flex-1">
                                    <label htmlFor="product-manufacturer-filter" className="sr-only">
                                        メーカーで絞り込み
                                    </label>
                                    <select
                                        id="product-manufacturer-filter"
                                        name="product-manufacturer"
                                        value={selectedManufacturer}
                                        onChange={e => onManufacturerChange(e.target.value)}
                                        className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                                        aria-label="メーカーで絞り込み"
                                        disabled={!!lockedManufacturerId}
                                    >
                                        <option value="all">すべてのメーカー</option>
                                        {manufacturers.map(manufacturer => (
                                            <option key={manufacturer.id} value={manufacturer.id}>
                                                {manufacturer.name || manufacturer.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {onBrandChange && (
                                <div className="flex-1">
                                    <label htmlFor="product-brand-filter" className="sr-only">
                                        ブランドで絞り込み
                                    </label>
                                    <select
                                        id="product-brand-filter"
                                        name="product-brand"
                                        value={selectedBrand}
                                        onChange={e => onBrandChange(e.target.value)}
                                        className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                                        aria-label="ブランドで絞り込み"
                                        disabled={selectedManufacturer === 'all' && brands.length === 0}
                                    >
                                        <option value="all">すべてのブランド</option>
                                        {uniqueBrands.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {onCategoryChange && (
                                <div className="flex-1">
                                    <label htmlFor="product-category-filter" className="sr-only">
                                        カテゴリで絞り込み
                                    </label>
                                    <select
                                        id="product-category-filter"
                                        name="product-category"
                                        value={selectedCategory}
                                        onChange={e => onCategoryChange(e.target.value)}
                                        className="w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark"
                                        aria-label="カテゴリで絞り込み"
                                    >
                                        <option value="all">すべてのカテゴリ</option>
                                        {categories.map(cat => {
                                            const categoryId = cat.id;
                                            const categoryName = cat.categoryName || cat.name || categoryId;
                                            return (
                                                <option key={categoryId} value={categoryId}>{categoryName}</option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                            {onTagsChange && (
                                <div className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsTagFilterModalOpen(true)}
                                        className={`w-full p-2 border rounded-md bg-input-bg dark:bg-input-bg-dark text-left ${
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
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {paginationInfo.totalItems}件の商品が見つかりました
                        </div>
                    </div>
            )}
        >
            {(paginatedData) => (
                <div className="flex-grow min-h-0" style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {paginatedData.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400">
                                {filteredData.length === 0 
                                    ? '商品が見つかりませんでした' 
                                    : '表示する商品がありません'}
                            </p>
                        </div>
                    ) : (
                        // リスト表示モード（軽量・高速）
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                            <AutoSizer>
                            {({ height, width }) => {
                                if (width <= 0 || height <= 0) {
                                    return (
                                        <div className="flex items-center justify-center h-full">
                                            <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
                                        </div>
                                    );
                                }

                                // 画面幅に応じて列数を決定（1列: <640px, 2列: 640-1024px, 3列: >1024px）
                                const getColumnCount = (width: number): number => {
                                    if (width < 640) return 1; // モバイル
                                    if (width < 1024) return 2; // タブレット
                                    return 3; // デスクトップ
                                };

                                const columnCount = getColumnCount(width);
                                const columnWidth = Math.floor(width / columnCount);
                                const rowCount = Math.ceil(paginatedData.length / columnCount);
                                const itemHeight = 72; // 各アイテムの高さ

                                const GridCell = React.memo(({ columnIndex, rowIndex, style, data: itemData }: GridChildComponentProps) => {
                                    const { paginatedData, productDetailsMap, brandNameMap, primaryKey, onSelect, columnCount: cols } = itemData as any;
                                    const index = rowIndex * cols + columnIndex;
                                    const row = paginatedData[index];
                                    if (!row) return <div style={style} />;

                                    const rowId = String(row[primaryKey] || row.id);
                                    const productCode = row.productCode ? String(row.productCode) : (rowId.includes('_') ? rowId.split('_').slice(2).join('_') : rowId);
                                    const detail = productDetailsMap.get(productCode) || productDetailsMap.get(rowId);
                                    const brandName = brandNameMap.get(rowId) || '';
                                    // 商品名からカラーとサイズの情報を削除（カラーやサイズが含まれている場合）
                                    let productName = detail?.productName || row.productName || productCode;
                                    // カラーやサイズのパターンを削除（必要に応じて調整）
                                    productName = productName.replace(/\s*\([^)]*\)/g, '').trim(); // 括弧内の情報を削除

                                    return (
                                        <div
                                            style={style}
                                            className="px-2 py-2"
                                        >
                                            <div
                                                className="h-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                onClick={() => onSelect(row)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        onSelect(row);
                                                    }
                                                }}
                                            >
                                                <div className="flex flex-col h-full">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate mb-1">
                                                        {productName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                                        <div className="truncate">コード: {productCode}</div>
                                                        {brandName && <div className="truncate">ブランド: {brandName}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                                GridCell.displayName = 'GridCell';

                                return (
                                    <FixedSizeGrid
                                        height={height}
                                        width={width}
                                        columnCount={columnCount}
                                        columnWidth={columnWidth}
                                        rowCount={rowCount}
                                        rowHeight={itemHeight}
                                        itemData={{
                                            paginatedData,
                                            productDetailsMap,
                                            brandNameMap,
                                            primaryKey,
                                            onSelect,
                                            columnCount,
                                        }}
                                    >
                                        {GridCell}
                                    </FixedSizeGrid>
                                );
                            }}
                            </AutoSizer>
                        </div>
                    )}
                </div>
            )}
            </PaginatedListContainer>
            {onTagsChange && (
                <TagFilterModal
                    isOpen={isTagFilterModalOpen}
                    onClose={() => setIsTagFilterModalOpen(false)}
                    selectedTags={selectedTags}
                    onTagsChange={onTagsChange}
                    selectedManufacturer={selectedManufacturer !== 'all' ? selectedManufacturer : undefined}
                />
            )}
        </>
    );
};

export default React.memo(ProductSelectionGrid);

