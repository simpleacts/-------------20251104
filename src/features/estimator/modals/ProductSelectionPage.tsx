import { XMarkIcon } from '@components/atoms';
import { getManufacturerTableName } from '@core/config/tableNames';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getAllManufacturerTableData, getBrandNameForProduct, getManufacturerTable, getManufacturerTableData, getProductInfoFromStock } from '@core/utils';
import { useDevice } from '@shared/hooks/useDevice';
import { AppData, OrderDetail, Product, Row, Table } from '@shared/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductQuantityInputMobile from '../molecules/ProductQuantityInputMobile';
import ProductQuantityMatrix from '../molecules/ProductQuantityMatrix';
import ProductSelectionGrid from '../organisms/ProductSelectionGrid';


interface ProductSelectionPageProps {
    onClose: () => void;
    onUpdateItems: (items: OrderDetail[], productId: string) => void;
    appData: AppData;
    existingOrderDetails: OrderDetail[];
    lockedManufacturerId: string | null;
    filterKeyword?: string | null;
}

const ProductSelectionPage: React.FC<ProductSelectionPageProps> = ({ onClose, onUpdateItems, appData, existingOrderDetails, lockedManufacturerId, filterKeyword }) => {
    const { database, setDatabase, logDataAccess } = useDatabase();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManufacturer, setSelectedManufacturer] = useState<string>(''); // メーカー選択（空文字列は未選択）
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // 選択されたタグIDの配列
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});
    const [isLoadingData, setIsLoadingData] = useState(false);
    const loadedTablesRef = useRef<Set<string>>(new Set()); // 読み込み済みテーブルを追跡して無限ループを防ぐ
    const loadedManufacturersRef = useRef<Set<string>>(new Set()); // 読み込み済みメーカーを追跡
    const databaseRef = useRef(database); // 最新のdatabaseを参照するためのref
    
    const device = useDevice();
    
    // メーカー一覧を取得（最初に読み込む）
    const manufacturers = useMemo(() => {
        if (!database?.manufacturers?.data) return [];
        return database.manufacturers.data as Row[];
    }, [database?.manufacturers]);

    // メーカー一覧とタグテーブルを読み込む（初回のみ）
    useEffect(() => {
        const loadInitialData = async () => {
            if (!database) return;
            
            const tablesToLoad: string[] = [];
            
            // メーカー一覧を読み込む
            if (!database.manufacturers?.data) {
                tablesToLoad.push('manufacturers');
            }
            
            // 共通タグテーブルを読み込む（タグフィルタリング用）
            if (!database.tags?.data) {
                tablesToLoad.push('tags');
            }
            
            // 共通ブランドテーブルを読み込む（ブランドフィルタリング用）
            if (!database.brands?.data) {
                tablesToLoad.push('brands');
            }
            
            if (tablesToLoad.length > 0) {
                try {
                    const data = await fetchTables(tablesToLoad, { toolName: 'estimator' });
                    setDatabase(prev => ({ ...prev, ...data }));
                } catch (err) {
                    console.error('[ProductSelectionPage] Failed to load initial data:', err);
                }
            }
        };
        loadInitialData();
    }, [database, setDatabase]);

    // メーカーが読み込まれたら、デフォルトでmanu_0001を選択（lockedManufacturerIdが指定されている場合はそれを使用）
    useEffect(() => {
        if (manufacturers.length > 0 && !selectedManufacturer) {
            if (lockedManufacturerId) {
                setSelectedManufacturer(lockedManufacturerId);
            } else {
                // デフォルトでmanu_0001を選択（存在する場合）
                const defaultManufacturer = manufacturers.find(m => String(m.id) === 'manu_0001');
                if (defaultManufacturer) {
                    setSelectedManufacturer('manu_0001');
                } else {
                    // manu_0001が存在しない場合は最初のメーカーを選択
                    setSelectedManufacturer(manufacturers[0].id as string);
                }
            }
        }
    }, [manufacturers, selectedManufacturer, lockedManufacturerId]);

    // databaseの変更を追跡
    useEffect(() => {
        databaseRef.current = database;
    }, [database]);

    // 選択されたメーカーのデータのみを読み込む（言語設定と同様の方式）
    useEffect(() => {
        const loadSelectedManufacturerData = async () => {
            const currentDatabase = databaseRef.current;
            if (!currentDatabase || !selectedManufacturer) return;
            
            // 'all'は実際のメーカーIDではないため、テーブル読み込みをスキップ
            // 'all'の場合はgetAllManufacturerTableDataを使用してデータを取得する
            if (selectedManufacturer === 'all') {
                return;
            }
            
            // 既に読み込み済みのメーカーの場合はスキップ
            if (loadedManufacturersRef.current.has(selectedManufacturer)) {
                // テーブルが存在するか確認（データが空でもテーブルが存在すれば読み込み済みと見なす）
                const manufacturerTables = [
                    getManufacturerTableName('product_details', selectedManufacturer),
                    getManufacturerTableName('stock', selectedManufacturer),
                    getManufacturerTableName('tags', selectedManufacturer)
                ];
                
                const allTablesExist = manufacturerTables.every(tableName => {
                    const table = currentDatabase[tableName];
                    return table && table.data && Array.isArray(table.data);
                });
                
                if (allTablesExist) {
                    return; // すべてのテーブルが存在する場合はスキップ
                }
                // テーブルが存在しない場合は、読み込み済みフラグをリセットして再読み込み
                loadedManufacturersRef.current.delete(selectedManufacturer);
            }
            
            setIsLoadingData(true);
            loadedManufacturersRef.current.add(selectedManufacturer);
            
            try {
                // 選択されたメーカーのテーブルのみを読み込む（必要なテーブルのみ）
                // 商品一覧表示に必要なテーブル:
                // - product_details: 商品詳細情報（商品一覧表示用、manu_xxxx_details.csv）
                // - stock: 在庫情報（選択時の数量入力で使用、カラー・サイズ・価格情報の取得元）
                // - tags: タグマスタ（タグフィルタリング用）
                // - brands: ブランドマスタ（共通テーブルtemplates/common/brands.csvから取得、メーカー依存ではない）
                // getManufacturerTableNameを使用してテーブル名を生成（manu_プレフィックスの重複を防ぐ）
                const manufacturerTables = [
                    getManufacturerTableName('product_details', selectedManufacturer), // 商品詳細情報（商品一覧表示用）
                    getManufacturerTableName('stock', selectedManufacturer), // 在庫情報（選択時の数量入力で使用）
                    getManufacturerTableName('tags', selectedManufacturer) // タグマスタ（タグフィルタリング用）
                    // 注意: brandsは共通テーブル（templates/common/brands.csv）から取得するため、ここでは読み込まない
                ];
                
                // 既に読み込まれているテーブルはスキップ（テーブルが存在し、dataプロパティが配列として存在すれば読み込み済み）
                const tablesToLoad = manufacturerTables.filter(tableName => {
                    const table = currentDatabase[tableName];
                    return !table || !table.data || !Array.isArray(table.data);
                });
                
                if (tablesToLoad.length > 0) {
                    console.log(`[ProductSelectionPage] Loading tables for manufacturer ${selectedManufacturer}:`, {
                        selectedManufacturer,
                        manufacturerTables,
                        tablesToLoad
                    });
                    logDataAccess('estimator', tablesToLoad);
                    const newData = await fetchTables(tablesToLoad, { toolName: 'estimator' });
                    console.log(`[ProductSelectionPage] Manufacturer tables loaded:`, {
                        requestedTables: tablesToLoad,
                        loadedTables: Object.keys(newData),
                        tableDetails: Object.keys(newData).map(tableName => ({
                            tableName,
                            dataCount: newData[tableName]?.data?.length || 0
                        }))
                    });
                    setDatabase(prev => ({ ...prev, ...newData }));
                } else {
                    console.log(`[ProductSelectionPage] All tables already loaded for manufacturer ${selectedManufacturer}`, {
                        selectedManufacturer,
                        manufacturerTables,
                        existingTables: manufacturerTables.map(tableName => ({
                            tableName,
                            exists: !!currentDatabase[tableName],
                            dataCount: currentDatabase[tableName]?.data?.length || 0
                        }))
                    });
                }
            } catch (err) {
                console.error('[ProductSelectionPage] Failed to load manufacturer data:', err);
                // エラーが発生した場合は、読み込み済みフラグをリセットして再試行可能にする
                loadedManufacturersRef.current.delete(selectedManufacturer);
            } finally {
                setIsLoadingData(false);
            }
        };
        
        loadSelectedManufacturerData();
        // databaseの変更による再実行を防ぐため、selectedManufacturerのみを依存配列に含める
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedManufacturer]);

    // 注意: convertRowToProduct関数は削除しました
    // 商品選択時はhandleProductSelect関数で直接処理します:
    // - product_detailsから商品詳細情報を取得
    // - stockテーブルから選択した1品番分のデータを取得（カラー・サイズ・価格情報）

    useEffect(() => {
        if (selectedProduct) {
            const initialQuantities: Record<string, Record<string, number>> = {};
            const itemsForProduct = existingOrderDetails.filter(
                item => item.productId === selectedProduct.id
            );

            itemsForProduct.forEach(item => {
                if (!initialQuantities[item.color]) {
                    initialQuantities[item.color] = {};
                }
                initialQuantities[item.color][item.size] = item.quantity;
            });
            setQuantities(initialQuantities);
        } else {
            setQuantities({});
        }
    }, [selectedProduct, existingOrderDetails]);

    // ブランドデータ（共通テーブルtemplates/common/brands.csvから取得）
    const allBrands = useMemo(() => {
        if (!database) return [];
        return database.brands?.data || [];
    }, [database]);

    // 選択されたメーカーのブランドのみを取得
    const filteredBrands = useMemo(() => {
        if (!selectedManufacturer) return [];
        return allBrands.filter((b: Row) => String(b.manufacturer_id || '') === selectedManufacturer);
    }, [allBrands, selectedManufacturer]);

    // ブランドマップ（brand_id -> brand_name）
    const brandsMap = useMemo(() => {
        return new Map(filteredBrands.map((b: Row) => [String(b.id || ''), String(b.name || '')]));
    }, [filteredBrands]);

    // メーカー変更時にブランドフィルタとタグフィルタをリセット
    useEffect(() => {
        if (selectedManufacturer) {
            setSelectedBrand('all');
            setSelectedTags([]); // タグフィルタもリセット
        }
    }, [selectedManufacturer]);

    // カテゴリマップ
    const categoriesMap = useMemo(() => {
        if (!database?.categories) return new Map<string, string>();
        return new Map(database.categories.data.map((c: Row) => [c.categoryId as string, c.categoryName as string]));
    }, [database?.categories]);

    const handleProductSelect = (row: Row) => {
        if (!database || !selectedManufacturer) return;
        
        // product_detailsから選択された商品のproduct_codeを取得
        const productCode = String(row.productCode || '');
        if (!productCode) {
            console.error('[ProductSelectionPage] Product code not found in selected row:', row);
            return;
        }
        
        // 'all'の場合は、rowからmanufacturer_idを取得
        let manufacturerId = selectedManufacturer;
        if (selectedManufacturer === 'all') {
            manufacturerId = String(row.manufacturer_id || row.manufacturerId || '');
            if (!manufacturerId) {
                console.error('[ProductSelectionPage] manufacturer_id not found in row when "all" is selected:', row);
                return;
            }
        }
        
        // product_detailsから商品詳細情報を取得
        const productDetails = getManufacturerTableData(database, 'product_details', manufacturerId);
        const detail = productDetails.find((d: Row) => String(d.product_code || '') === productCode);
        
        // stockテーブルから選択した1品番分のデータを取得（カラー・サイズ・価格情報）
        const stockInfo = getProductInfoFromStock(database, manufacturerId, productCode);
        
        // ブランド名を取得（product_detailsのbrandフィールドまたはbrandsテーブルから）
        const brandName = detail?.brand 
            ? String(detail.brand)
            : getBrandNameForProduct(database, `prod_${manufacturerId}_${productCode}`, manufacturerId);
        
        // 価格情報をProduct型の形式に変換
        const prices = stockInfo.prices.map((price) => {
            // カラータイプを判定（簡易版：カラー名から判定）
            let colorType: 'ホワイト' | 'カラー' | 'スペシャル' = 'カラー';
            if (price.colorName.toLowerCase().includes('ホワイト') || price.colorName.toLowerCase().includes('white')) {
                colorType = 'ホワイト';
            }
            
            return {
                color: colorType,
                size: price.sizeName,
                listPrice: price.listPrice,
                purchasePrice: price.costPrice,
            };
        });
        
        // Product型に変換
        const product: Product = {
            id: `prod_${manufacturerId}_${productCode}`,
            brand: brandName,
            manufacturerId: manufacturerId,
            name: detail?.productName || productCode,
            description: detail?.description as string || '',
            images: detail?.images,
            code: productCode,
            jan_code: '', // product_detailsにjan_codeがない場合は空文字列
            colors: stockInfo.colors.map(c => c.code), // stockから取得したカラーコード
            prices: prices,
            tags: [], // 必要に応じてproduct_tagsから取得
            categoryId: detail?.category_id as string || '',
            is_published: true,
        };
        
        console.log('[ProductSelectionPage] Product selected:', {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            manufacturerId: product.manufacturerId,
            colorsCount: product.colors.length,
            pricesCount: product.prices.length,
            stockInfo: {
                colorsCount: stockInfo.colors.length,
                sizesCount: stockInfo.sizesByColor.size,
                pricesCount: stockInfo.prices.length
            }
        });
        
        setSelectedProduct(product);
    };

    const handleQuantityChange = (color: string, size: string, value: string) => {
        const qty = parseInt(value, 10);
        const newQty = isNaN(qty) || qty < 0 ? 0 : qty;
        setQuantities(prev => ({
            ...prev,
            [color]: {
                ...(prev[color] || {}),
                [size]: newQty
            }
        }));
    };

    const handleUpdateItems = () => {
        if (!selectedProduct) return;
        const updatedItemsForProduct: OrderDetail[] = [];
        Object.entries(quantities).forEach(([color, sizeQtys]) => {
            Object.entries(sizeQtys).forEach(([size, quantity]) => {
                if (quantity > 0) { // Only add items with quantity > 0
                    updatedItemsForProduct.push({
                        productId: selectedProduct.id,
                        productName: selectedProduct.productName || selectedProduct.code,
                        color, size, quantity: quantity || 0,
                        unitPrice: 0 // Unit price will be calculated by costService
                    });
                }
            });
        });
        onUpdateItems(updatedItemsForProduct, selectedProduct.id);
    };

    // 在庫テーブルから商品情報を集約（商品コードごとにグループ化）
    const stockItemsByProduct = useMemo(() => {
        if (!database || !database.manufacturers?.data) return new Map<string, Row[]>();
        
        const manufacturers = database.manufacturers.data as Row[];
        const stockItemsMap = new Map<string, Row[]>();
        
        manufacturers.forEach(manufacturer => {
            const tableName = `stock_${manufacturer.id}`;
            const stockTable = database[tableName];
            
            if (stockTable?.data && Array.isArray(stockTable.data)) {
                stockTable.data.forEach((item: Row) => {
                    // 階層的検索: メーカーID + 品番で商品を特定
                    const manufacturerId = item.manufacturer_id as string;
                    const productCode = item.product_code as string;
                    
                    // メーカーIDが一致する場合のみ追加
                    if (productCode && manufacturerId === manufacturer.id) {
                        // キー: manufacturerId_productCode（階層的検索のため）
                        const key = `${manufacturerId}_${productCode}`;
                        if (!stockItemsMap.has(key)) {
                            stockItemsMap.set(key, []);
                        }
                        stockItemsMap.get(key)!.push(item);
                    }
                });
            }
        });
        
        return stockItemsMap;
    }, [database]);

    // 在庫テーブルから商品情報を取得してproducts_master形式に変換（ハイブリッド構造対応）
    // 階層的検索: メーカーID + 品番で商品を特定
    const productsFromStock = useMemo(() => {
        if (!database || stockItemsByProduct.size === 0) return [];
        
        const products: Row[] = [];
        stockItemsByProduct.forEach((items, key) => {
            // キー: manufacturerId_productCode（階層的検索のため）
            const [manufacturerId, productCode] = key.split('_', 2);
            
            // 最初のアイテムから商品情報を取得
            const firstItem = items[0];
            if (firstItem && manufacturerId && productCode) {
                // 注意: products_masterは削除（stockテーブルに統合）
                // stockテーブルから商品情報を取得
                const product: Row = {
                    id: `prod_${manufacturerId}_${productCode}`,
                    productCode: productCode,
                    manufacturer_id: manufacturerId,
                    category_id: firstItem.category_id || null,
                    is_published: firstItem.is_published || 0,
                    brand_id: firstItem.brand_id || null,
                    name: firstItem.stock_product_name || '',
                    // 在庫テーブルから取得した商品情報を追加
                    _stockItems: items,
                    _fromStockTable: true
                };
                products.push(product);
            }
        });
        
        return products;
    }, [stockItemsByProduct, database]);

    // 商品選択モーダル（カード表示）用: product_details_manu_xxxxからデータを取得
    // 選択されたメーカーのproduct_detailsテーブルから商品一覧を取得
    // データ取得元: product_details_manu_xxxxテーブル（商品一覧表示用）
    // 注意: stockテーブルは商品一覧には使用せず、選択時の数量入力でのみ使用
    const productsForCardDisplay = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        
        // 'all'の場合はすべてのメーカーのデータを取得
        const productDetails = selectedManufacturer === 'all'
            ? getAllManufacturerTableData(database, 'product_details')
            : getManufacturerTableData(database, 'product_details', selectedManufacturer);
        
        if (!productDetails || productDetails.length === 0) return [];
        
        // product_detailsから商品一覧を取得（product_codeでグループ化）
        const productMap = new Map<string, Row>();
        
        productDetails.forEach((detail: Row) => {
            const productCode = detail.product_code as string;
            if (!productCode) return;
            
            // 'all'の場合はmanufacturer_idをdetailから取得
            const manufacturerId = selectedManufacturer === 'all' 
                ? (detail.manufacturer_id as string || '')
                : selectedManufacturer;
            
            if (!manufacturerId) return;
            
            // キー: manufacturerId_productCode（重複を防ぐため）
            const key = `${manufacturerId}_${productCode}`;
            if (productMap.has(key)) return;
            
            // product_detailsから商品情報を取得
            const product: Row = {
                id: `prod_${manufacturerId}_${productCode}`,
                productCode: productCode,
                manufacturer_id: manufacturerId,
                // product_detailsから取得した情報を使用
                productName: detail.productName || '',
                description: detail.description || null,
                images: detail.images || null,
                meta_title: detail.meta_title || null,
                meta_description: detail.meta_description || null,
                og_image_url: detail.og_image_url || null,
                og_title: detail.og_title || null,
                og_description: detail.og_description || null,
                brand: detail.brand || null // brandフィールド（manu_xxxx_details.csvのbrandカラム）
            };
            productMap.set(productCode, product);
        });
        
        return Array.from(productMap.values());
    }, [database, selectedManufacturer]);
    
    // 商品選択グリッド用: stock_manu_xxxxからデータを取得（選択されたメーカーのみ）
    const productsForGridDisplay = useMemo(() => {
        if (!database || !selectedManufacturer) return [];
        
        // 選択されたメーカーのstockテーブルから商品を取得
        const stockTable = getManufacturerTable(database, 'stock', selectedManufacturer);
        if (!stockTable?.data) return [];
        
        // 商品コードごとにグループ化
        const stockItemsByProduct = new Map<string, Row[]>();
        stockTable.data.forEach((item: Row) => {
            const productCode = item.product_code as string;
            const manufacturerId = item.manufacturer_id as string;
            if (productCode && manufacturerId === selectedManufacturer) {
                const key = `${manufacturerId}_${productCode}`;
                if (!stockItemsByProduct.has(key)) {
                    stockItemsByProduct.set(key, []);
                }
                stockItemsByProduct.get(key)!.push(item);
            }
        });
        
        // products_master形式に変換
        const products: Row[] = [];
        stockItemsByProduct.forEach((items, key) => {
            const [manufacturerId, productCode] = key.split('_', 2);
            const firstItem = items[0];
            if (firstItem && manufacturerId && productCode) {
                const product: Row = {
                    id: `stock_product_${manufacturerId}_${productCode}`,
                    code: productCode,
                    manufacturer_id: manufacturerId,
                    name: firstItem.stock_product_name || '',
                    _stockItems: items,
                    _fromStockTable: true
                };
                products.push(product);
            }
        });
        
        return products;
    }, [database, selectedManufacturer]);

    const renderProductList = () => {
        if (!database) {
            return (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">商品データを読み込み中...</p>
                </div>
            );
        }

        // カード表示用: product_detailsから取得した商品データを使用
        const productsForDisplay = productsForCardDisplay;

        // 選択されたメーカーのproduct_detailsデータを取得（カード表示用）
        // 'all'の場合はnullを返す（getManufacturerTableは特定のメーカーのテーブルのみを返すため）
        const productDetailsTable = selectedManufacturer === 'all'
            ? null
            : getManufacturerTable(database, 'product_details', selectedManufacturer);
        const schema = productDetailsTable?.schema || [];
        const aggregatedProductDetailsTable: Table | null = productDetailsTable ? {
            schema,
            data: productDetailsTable.data || []
        } : null;

        // 商品データがなくてもProductSelectionGridをレンダリングしてヘッダー（ドロップダウン）を常に表示
        return (
            <ProductSelectionGrid
                data={productsForDisplay}
                productDetailsTable={aggregatedProductDetailsTable}
                brands={filteredBrands}
                categories={database.categories?.data || []}
                manufacturers={manufacturers}
                onSelect={handleProductSelect}
                paginationConfig={{ enabled: true, itemsPerPage: 24 }}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedManufacturer={selectedManufacturer}
                onManufacturerChange={setSelectedManufacturer}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                lockedManufacturerId={lockedManufacturerId}
                filterKeyword={filterKeyword}
                brandsMap={brandsMap}
                categoriesMap={categoriesMap}
                viewMode="list" // リスト表示モード（軽量・高速）
            />
        );
    };

    const renderQuantityInput = () => {
        if (!selectedProduct) return null;

        if (device === 'mobile') {
            return (
                <ProductQuantityInputMobile 
                    selectedProduct={selectedProduct}
                    appData={appData}
                    quantities={quantities}
                    onQuantityChange={handleQuantityChange}
                />
            );
        }

        return (
            <ProductQuantityMatrix
                selectedProduct={selectedProduct}
                appData={appData}
                quantities={quantities}
                onQuantityChange={handleQuantityChange}
            />
        );
    };


    const totalItems = Object.values(quantities).flatMap(Object.values).reduce((sum, qty) => sum + (qty || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-[70vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-base-200 dark:border-base-dark-300 h-16">
                     <div className="flex items-center">
                        <button onClick={selectedProduct ? () => setSelectedProduct(null) : onClose} className="p-2 mr-2 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                           <i className="fas fa-arrow-left"></i>
                        </button>
                        <h2 className="text-lg font-bold">{selectedProduct ? (selectedProduct.productName || selectedProduct.code) : '商品を選択'}</h2>
                     </div>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300">
                        <XMarkIcon className="w-6 h-6" />
                     </button>
                </header>
                
                <div className="flex-grow flex flex-col min-h-0">
                    {!selectedProduct ? (
                        renderProductList()
                    ) : (
                        renderQuantityInput()
                    )}
                </div>

                <footer className="flex-shrink-0 p-4 bg-base-200 dark:bg-base-dark-300/50 border-t border-base-200 dark:border-base-dark-300">
                    <button 
                        onClick={handleUpdateItems}
                        disabled={!selectedProduct}
                        className="w-full px-4 py-3 text-sm font-bold rounded-lg bg-brand-primary text-white hover:bg-blue-800 disabled:bg-gray-400">
                            {totalItems > 0 ? `${totalItems}点を見積に反映` : '見積に反映'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ProductSelectionPage;
