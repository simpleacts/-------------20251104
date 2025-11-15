
import { useEffect, useMemo, useState, useRef } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getAllManufacturerTableData, getManufacturerTable, getProductsMasterFromStock, getProductDetailsFromStock } from '@core/utils';
import { BrandColor, CompanyInfoData, OrderDetail, Row, Table } from '@shared/types';
import { QuoteData } from '@features/order-management/types';

export const useWorksheetData = (selectedQuote: Row | null) => {
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadingRef = useRef(false);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    const requiredTables = [
        'quotes', 'customers', 'quote_items', 'stock',
        'brands', 'company_info'
        // 注意: products_master, product_detailsは削除済み（stockテーブルから取得）
        // 注意: colorsは削除済み（stockテーブルから取得）
    ];
    
    // データベースのテーブル存在キーを計算（テーブル名のソート済みリスト）
    const databaseTablesKey = useMemo(() => {
        if (!database) return '';
        return Object.keys(database).filter(k => database[k]).sort().join(',');
    }, [database]);

    useEffect(() => {
        const loadData = async () => {
            if (!database) return;
            
            // 既に読み込み中の場合はスキップ
            if (loadingRef.current) {
                return;
            }
            
            // 必要なテーブルが既にすべて読み込まれている場合はスキップ
            const allTablesLoaded = requiredTables.every(t => {
                if (loadedTablesRef.current.has(t)) return true;
                if (database[t]) {
                    loadedTablesRef.current.add(t);
                    return true;
                }
                return false;
            });
            
            if (allTablesLoaded) {
                setIsLoading(false);
                return;
            }
            
            const missingTables = requiredTables.filter(t => !loadedTablesRef.current.has(t) && !database[t]);
            if (missingTables.length > 0) {
                loadingRef.current = true;
                setIsLoading(true);
                setError(null);
                try {
                    // worksheet-data.phpが存在しないため、toolNameを指定せずにフォールバックを使用
                    const data = await fetchTables(missingTables);
                    // 読み込んだテーブルを記録
                    Object.keys(data || {}).forEach(table => {
                        loadedTablesRef.current.add(table);
                    });
                    setDatabase(prev => ({ ...prev, ...data }));
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
                } finally {
                    setIsLoading(false);
                    loadingRef.current = false;
                }
            } else {
                setIsLoading(false);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requiredTables.join(','), databaseTablesKey]);

    const companyInfo = useMemo(() => {
        if (!database?.company_info?.data) return undefined;
        const infoData: Partial<CompanyInfoData> = {};
        (database.company_info.data as Row[]).forEach(row => {
            const keyMap: Record<string, keyof CompanyInfoData> = {
                'COMPANY_NAME': 'companyName', 'COMPANY_ZIP': 'zip', 'COMPANY_ADDRESS': 'address', 'COMPANY_TEL': 'tel', 'COMPANY_FAX': 'fax', 'BANK_NAME': 'bankName', 'BANK_BRANCH_NAME': 'bankBranchName', 'BANK_ACCOUNT_TYPE': 'bankAccountType', 'BANK_ACCOUNT_NUMBER': 'bankAccountNumber', 'BANK_ACCOUNT_HOLDER': 'bankAccountHolder', 'INVOICE_ISSUER_NUMBER': 'invoiceIssuerNumber',
            };
            const mappedKey = keyMap[row.key as string];
            if (mappedKey) { (infoData as any)[mappedKey] = row.value; }
        });
        return infoData as CompanyInfoData;
    }, [database?.company_info]);

    const allProductsMap = useMemo(() => {
        const map = new Map<string, Row>();
        if (!database) return map;
        // stockテーブルから全商品を取得（products_masterとproduct_detailsの代替）
        const allProducts = getProductsMasterFromStock(database);
        const allProductDetails = getProductDetailsFromStock(database);
        if (allProducts.length === 0) return map;

        // ブランドデータ（brands_manu_XXXXテーブルから取得）
        const detailsMap = new Map(allProductDetails.map(d => [d.product_id, d]));
        
        // 商品IDごとのブランド名をマップに格納（stockテーブルのbrand_idから）
        const productBrandMap = new Map<string, string>();
        const manufacturers = database.manufacturers?.data || [];
        // brandsは共通テーブル（templates/common/brands.csv）から取得
        const brandsTable = database.brands?.data || [];
        const brandsMap = new Map(brandsTable.map((b: Row) => [b.id, b.name]));
        
        allProducts.forEach((p: Row) => {
            const productId = String(p.id || '');
            const brandId = String(p.brand_id || '');
            if (brandId) {
                const brandName = String(brandsMap.get(brandId) || '');
                if (brandName) {
                    productBrandMap.set(productId, brandName);
                }
            }
        });

        allProducts.forEach((p: Row) => {
            const details = detailsMap.get(p.id as string);
            const brandName = productBrandMap.get(p.id as string) || '';
            // FIX: Use Object.assign to prevent "Spread types may only be created from object types" error.
            map.set(p.id as string, Object.assign({}, p, details || {}, { brand: brandName }));
        });
        return map;
    }, [database]);

    const worksheetDataList: QuoteData[] = useMemo(() => {
        if (!selectedQuote || !database?.quote_items) return [];
        // 注意: colorsは削除済み（stockテーブルから取得）

        const quoteItemsTable = database.quote_items as Table;
        if (!quoteItemsTable || !Array.isArray(quoteItemsTable.data)) return [];

        const allItemsForQuote = quoteItemsTable.data.filter(item => item.quote_id === selectedQuote.id);
        if (allItemsForQuote.length === 0) return [];

        const itemsByProduct = allItemsForQuote.reduce((acc, item) => {
            const productId = item.product_id as string;
            if (!acc[productId]) {
                acc[productId] = [];
            }
            acc[productId].push(item);
            return acc;
        }, {} as Record<string, Row[]>);

        return Object.entries(itemsByProduct).map(([productId, items]) => {
            const product = allProductsMap.get(productId);
            if (!product) return null;

            const customersTable = database.customers as Table | undefined;
            const customer = customersTable && Array.isArray(customersTable.data) 
                ? customersTable.data.find(c => c.id === selectedQuote.customer_id) 
                : undefined;
            const brandToManufacturerMap = new Map((database.brands?.data || []).map(b => [b.id, b.manufacturer_id]));
            const manufacturerIdForProduct = brandToManufacturerMap.get((product as any).brand_id);
            
            // colorsテーブルは削除済み（stockテーブルから取得）
            // stockテーブルからカラー情報を取得
            const brandColors: BrandColor[] = [];
            if (manufacturerIdForProduct) {
                const stockTable = getManufacturerTable(database, 'stock', String(manufacturerIdForProduct));
                if (stockTable?.data && Array.isArray(stockTable.data)) {
                    const colorMap = new Map<string, BrandColor>();
                    stockTable.data.forEach((item: Row) => {
                        const colorCode = String(item.color_code || '');
                        const colorName = String(item.color_name || '');
                        if (colorCode && colorName && !colorMap.has(colorCode)) {
                            colorMap.set(colorCode, {
                                id: `color_${manufacturerIdForProduct}_${colorCode}`,
                                manufacturer_id: String(manufacturerIdForProduct),
                                colorCode: colorCode,
                                colorName: colorName,
                                name: colorName,
                                code: colorCode,
                                colorType: 'カラー',
                                hex: ''
                            } as BrandColor);
                        }
                    });
                    brandColors.push(...Array.from(colorMap.values()));
                }
            }
            
            const uniqueColorNames = [...new Set((items as Row[]).map(i => String(i.color)))];
            const uniqueSizeNames = [...new Set((items as Row[]).map(i => String(i.size)))];
            
            const uniqueColors = brandColors.filter(c => uniqueColorNames.includes(String(c.name)));
            const uniqueSizes = uniqueSizeNames.map(name => ({ sizeName: name }));
            
            const quantities: Record<string, Record<string, number>> = {};
            (items as Row[]).forEach(item => {
                const colorKey = String(item.color);
                const sizeKey = String(item.size);
                if (!quantities[colorKey]) quantities[colorKey] = {};
                quantities[colorKey][sizeKey] = item.quantity as number;
            });

            const sizeTotals: Record<string, number> = {};
            const colorTotals: Record<string, number> = {};
            let grandTotal = 0;

            uniqueSizes.forEach(s => sizeTotals[String(s.sizeName)] = 0);
            uniqueColors.forEach(c => {
                const colorKey = String(c.name);
                colorTotals[colorKey] = 0;
            });

            (items as Row[]).forEach(item => {
                const qty = item.quantity as number;
                const sizeKey = String(item.size);
                const colorKey = String(item.color);
                if (Object.prototype.hasOwnProperty.call(sizeTotals, sizeKey)) {
                    sizeTotals[sizeKey] += qty;
                }
                if (Object.prototype.hasOwnProperty.call(colorTotals, colorKey)) {
                    colorTotals[colorKey] += qty;
                }
                grandTotal += qty;
            });
            
            let proofingImages: { name: string; dataUrl: string }[] = [];
            const internalNotes = selectedQuote.internal_notes || '';
            const match = (internalNotes as string).match(/PROOFING_IMAGES_JSON_START\n(.*?)\nPROOFING_IMAGES_JSON_END/s);
            if (match && match[1]) {
                try {
                    const parsedImages = JSON.parse(match[1]);
                    proofingImages = parsedImages.map((img: any) => ({
                        name: `${img.colorName}`,
                        dataUrl: img.dataUrl,
                    }));
                } catch (e) { console.error(`Failed to parse proofing images JSON from internal_notes: ${String(e)}`); }
            }

            return {
                quote: { ...selectedQuote, database }, // Pass database through here
                customer, 
                items: items as OrderDetail[], 
                product, 
                uniqueColors, 
                uniqueSizes,
                quantities, 
                totals: { sizeTotals, colorTotals, grandTotal }, 
                proofingImages
            };
        }).filter((data): data is QuoteData => data !== null);

    }, [selectedQuote, database, allProductsMap]);
    
    return { worksheetDataList, companyInfo, isLoading: isLoading || !database, error };
};
