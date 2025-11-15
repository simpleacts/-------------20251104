
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { getAllManufacturerTableData, getManufacturerTable, getProductsMasterFromStock, getProductDetailsFromStock } from '@core/utils';
import { isManufacturerDependentTable } from '@core/config/tableNames';
import { BrandColor, CanvasState, CompanyInfoData, CostDetails, Database, DocumentType, OrderDetail, PrintDesign, ProcessingGroup, Row, Table } from '@shared/types';
import { EnrichedQuote, QuoteData } from '@features/order-management/types';

export const useDocumentData = (proofingCanvases: CanvasState[]) => {
    const { database, setDatabase } = useDatabase();
    const [isLoading, setIsLoading] = useState(true);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedQuote, setSelectedQuote] = useState<EnrichedQuote | null>(null);
    const selectedQuoteRef = useRef<EnrichedQuote | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | 'all' | 'worksheet'>('all');
    // 日付フィルター: 開始日と終了日
    const [dateFilterStart, setDateFilterStart] = useState<string>('');
    const [dateFilterEnd, setDateFilterEnd] = useState<string>('');
    
    // selectedQuoteが変更されたときにrefを更新
    useEffect(() => {
        selectedQuoteRef.current = selectedQuote;
    }, [selectedQuote]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!database) return;
            setIsLoading(true);
            setError(null);
            try {
                const initialTables = ['quotes', 'customers', 'quote_tasks', 'quote_items', 'quote_designs'];
                const missingTables = initialTables.filter(t => !database[t]);
                if (missingTables.length > 0) {
                    const data = await fetchTables(missingTables);
                    setDatabase(prev => ({ ...prev, ...data }));
                }
            } catch (err) {
                setError('帳票一覧の読み込みに失敗しました。');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [database, setDatabase]);

    useEffect(() => {
        if (!selectedQuote) return;

        const fetchPreviewData = async () => {
            if (!database) return;
            setIsPreviewLoading(true);
            try {
                let requiredTables: string[] = [];
                if (selectedQuote.document_type === 'worksheet') {
                    requiredTables = ['company_info'];
                    // 注意: products_master, product_details, product_tags, colorsは削除済み（stockテーブルから取得）
                } else {
                    requiredTables = [
                        'company_info', 'pdf_templates', 'pdf_item_display_configs', 
                        // 注意: products_master, product_details, product_tags, colorsは削除済み（stockテーブルから取得） 
                        'print_locations', 'tags', 'additional_print_costs_by_tag',
                        'plate_costs'
                    ];
                }

                const missingTables = requiredTables.filter(t => {
                    // メーカー依存テーブルの場合は、getAllManufacturerTableDataを使用してデータが存在するかどうかを確認
                    if (isManufacturerDependentTable(t)) {
                        const allData = getAllManufacturerTableData(database, t);
                        return allData.length === 0;
                    }
                    // 通常のテーブルの場合は、直接チェック
                    return !database[t];
                });

                if (missingTables.length > 0) {
                    const newData = await fetchTables(missingTables);
                    setDatabase(prev => ({ ...prev, ...newData }));
                }
            } catch (err) {
                setError('プレビューデータの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setIsPreviewLoading(false);
            }
        };

        fetchPreviewData();
    }, [selectedQuote, database, setDatabase]);

    const documents = useMemo(() => {
        if (!database?.quotes || !database?.customers || !database.quote_items) return [];

        const customerMap = new Map<string, Row>(database.customers.data.map(c => [c.id, c]));
        const tasksMap = (database.quote_tasks?.data || []).reduce((acc, task) => {
            const quoteId = task.quote_id as string;
            if (!acc[quoteId]) acc[quoteId] = [];
            acc[quoteId].push(task);
            return acc;
        }, {} as Record<string, Row[]>);

        const allDocs = (database.quotes?.data || []).map((q): EnrichedQuote => ({
            ...q,
            id: q.id as string | null,
            customer: customerMap.get(q.customer_id as string) || null,
            items: (database.quote_items.data.filter(item => item.quote_id === q.id)).map((i: Row): OrderDetail => ({
                productId: i.product_id as string,
                productName: i.product_name as string,
                color: i.color as string,
                size: i.size as string,
                quantity: i.quantity as number,
                unitPrice: i.unit_price as number,
            })),
            product: null,
            proofingImage: null,
            tasks: (tasksMap[q.id as string] as any[]) || [],
            document_type: q.document_type || (q.quote_status === '受注' || q.quote_status === '完了' ? 'worksheet' : 'estimate')
        }));
        
        const quoteIdsWithWorksheet = new Set(allDocs.filter(d => d.document_type === 'worksheet').map(d => d.id));
        const quotesForWorksheets = (database.quotes?.data || []).filter(q => 
            !quoteIdsWithWorksheet.has(q.id) && 
            (q.quote_status === '受注' || q.quote_status === '完了' || q.production_status !== '未着手')
        );
        
        quotesForWorksheets.forEach(q => {
            const existing = allDocs.find(d => d.id === q.id);
            if (existing) {
                if (existing.document_type !== 'worksheet') {
                     allDocs.push({
                        ...existing,
                        document_type: 'worksheet',
                        virtual_id: `${q.id}-worksheet`,
                    });
                }
            } else {
                 allDocs.push({
                    ...q,
                    id: q.id as string | null,
                    customer: customerMap.get(q.customer_id as string) || null,
                    items: (database.quote_items.data.filter(item => item.quote_id === q.id)).map((i: Row): OrderDetail => ({
                        productId: i.product_id as string,
                        productName: i.product_name as string,
                        color: i.color as string,
                        size: i.size as string,
                        quantity: i.quantity as number,
                        unitPrice: i.unit_price as number,
                    })),
                    product: null,
                    proofingImage: null,
                    tasks: (tasksMap[q.id as string] as any[]) || [],
                    document_type: 'worksheet',
                    virtual_id: `${q.id}-worksheet`,
                });
            }
        });

        // 指示書は除外（別管理にする）
        return allDocs.filter(doc => doc.document_type !== 'worksheet');

    }, [database]);
    
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const docType = doc.document_type || 'estimate';
            const matchesType = docTypeFilter === 'all' || docType === docTypeFilter;
            const matchesSearch = searchTerm === '' ||
                (doc.quote_code as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.customer?.company_name as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.subject as string)?.toLowerCase().includes(searchTerm.toLowerCase());
            
            // 日付フィルター
            let matchesDate = true;
            if (dateFilterStart || dateFilterEnd) {
                // 帳票タイプに応じて日付を取得
                let docDate: Date | null = null;
                
                if (docType === 'invoice') {
                    // 請求書: payment_due_date（支払期日）またはcreated_at
                    const dateStr = (doc as any).payment_due_date || doc.created_at;
                    docDate = dateStr ? new Date(dateStr) : null;
                } else if (docType === 'delivery_slip') {
                    // 納品書: shipping_date（納品日）またはcreated_at
                    const dateStr = (doc as any).shipping_date || doc.created_at;
                    docDate = dateStr ? new Date(dateStr) : null;
                } else if (docType === 'receipt') {
                    // 領収書: payment_date（入金日）またはcreated_at
                    const dateStr = (doc as any).payment_date || doc.created_at;
                    docDate = dateStr ? new Date(dateStr) : null;
                } else {
                    // 見積書その他: created_at（作成日）
                    docDate = doc.created_at ? new Date(doc.created_at) : null;
                }
                
                if (docDate) {
                    const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
                    const endDate = dateFilterEnd ? new Date(dateFilterEnd + 'T23:59:59') : null; // 終了日は当日の23:59:59まで
                    
                    if (startDate && docDate < startDate) {
                        matchesDate = false;
                    }
                    if (endDate && docDate > endDate) {
                        matchesDate = false;
                    }
                } else {
                    // 日付が取得できない場合は除外しない（フィルターが設定されている場合のみ）
                    matchesDate = !dateFilterStart && !dateFilterEnd;
                }
            }
            
            return matchesType && matchesSearch && matchesDate;
        }).sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
    }, [documents, searchTerm, docTypeFilter, dateFilterStart, dateFilterEnd]);
    
    useEffect(() => {
        // 現在選択中の帳票がフィルター結果に含まれているかチェック
        const currentQuote = selectedQuoteRef.current;
        const currentQuoteId = currentQuote?.virtual_id || currentQuote?.id;
        const isCurrentQuoteInFiltered = currentQuoteId && filteredDocuments.some(d => (d.virtual_id || d.id) === currentQuoteId);
        
        // 現在選択中の帳票がフィルター結果に含まれていない場合のみ変更
        if (filteredDocuments.length > 0) {
            if (!isCurrentQuoteInFiltered) {
                setSelectedQuote(filteredDocuments[0]);
            }
            // 現在選択中の帳票がフィルター結果に含まれている場合は何もしない（選択を維持）
        } else if (filteredDocuments.length === 0) {
            setSelectedQuote(null);
        }
    }, [filteredDocuments]); // selectedQuoteを依存配列から削除して無限ループを防ぐ
    
    const allProductsMap = useMemo(() => {
      const map = new Map<string, Row>();
      if (!database) return map;
      
      // stockテーブルから全商品を取得（products_masterとproduct_detailsの代替）
      const allProducts = getProductsMasterFromStock(database);
      const allProductDetails = getProductDetailsFromStock(database);
      if (allProducts.length === 0) return map;

      // ブランドデータ（brands_manu_XXXXテーブルから取得）
      const detailsMap = new Map<string, Row>(allProductDetails.map(d => [d.product_id, d]));
      
      // 商品IDごとのブランド名をマップに格納（products_masterのbrand_idから）
      const productBrandMap = new Map<string, string>();
      const manufacturers = database.manufacturers?.data || [];
      // brandsは共通テーブル（templates/common/brands.csv）から取得
      const brandsTable = database.brands;
      const brandsMap = brandsTable?.data ? new Map(brandsTable.data.map((b: Row) => [b.id, b.name])) : new Map();
      
      manufacturers.forEach((m: Row) => {
        const manufacturerId = String(m.id || '');
        const productsMasterTable = getManufacturerTable(database, 'products_master', manufacturerId);
        if (productsMasterTable?.data && brandsMap.size > 0) {
          productsMasterTable.data.forEach((p: Row) => {
            const productId = String(p.id || '');
            const brandId = String(p.brand_id || '');
            if (brandId) {
              const brandName = String(brandsMap.get(brandId) || '');
              if (brandName) {
                productBrandMap.set(productId, brandName);
              }
            }
          });
        }
      });

      allProducts.forEach(p => {
          const details = detailsMap.get(p.id as string);
          const brandName = productBrandMap.get(p.id as string) || '';
          map.set(p.id as string, { ...p, ...(details || {}), brand: brandName });
      });
      return map;
    }, [database]);

    const companyInfo = useMemo(() => {
        if (!database?.company_info) return undefined;
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

    const worksheetDataList: QuoteData[] = useMemo(() => {
        if (!selectedQuote || selectedQuote.document_type !== 'worksheet') return [];
        // 注意: colorsは削除済み（stockテーブルから取得）

        const allItemsForQuote = selectedQuote.items;
        if (!Array.isArray(allItemsForQuote) || allItemsForQuote.length === 0) return [];

        const itemsByProduct = allItemsForQuote.reduce((acc, item) => {
            const productId = (item as OrderDetail).productId as string;
            if (!acc[productId]) {
                acc[productId] = [];
            }
            (acc[productId] as OrderDetail[]).push(item);
            return acc;
        }, {} as Record<string, OrderDetail[]>);

        return Object.entries(itemsByProduct).map(([productId, items]) => {
            const product = allProductsMap.get(productId);
            if (!product) return null;

            // FIX: Replaced complex IIFE destructuring with direct destructuring assignment to resolve 'Spread types may only be created from object types' error.
            const { customer: _c, items: _i, product: _p, proofingImage: _pi, tasks: _t, virtual_id: _v, ...rawQuote } = Object.assign({}, selectedQuote);

            const customer = database?.customers?.data?.find(c => c.id === selectedQuote.customer_id) || null;
            // ブランドデータ（stockテーブルから取得）
            // 商品のmanufacturer_idを直接使用（brandsテーブルは削除）
            const manufacturerIdForProduct = (product as any).manufacturer_id || (product as any).manufacturerId;
            
            const colorsTable = database?.colors as Table | undefined;
            const brandColors = colorsTable && Array.isArray(colorsTable.data) 
                ? colorsTable.data.filter(c => String(c.manufacturer_id) === String(manufacturerIdForProduct)) 
                : [];
            
            const uniqueColorNames = [...new Set((items as OrderDetail[]).map(i => String(i.color)))];
            const uniqueSizeNames = [...new Set((items as OrderDetail[]).map(i => String(i.size)))];
            
            const uniqueColors = brandColors.filter(c => uniqueColorNames.includes(String(c.name))) as BrandColor[];
            const uniqueSizes = uniqueSizeNames.map(name => ({ sizeName: name }));

            const quantities: Record<string, Record<string, number>> = {};
            (items as OrderDetail[]).forEach(item => {
                quantities[String(item.color)] = quantities[String(item.color)] || {};
                quantities[String(item.color)][String(item.size)] = item.quantity;
            });

            const sizeTotals: Record<string, number> = {};
            const colorTotals: Record<string, number> = {};
            let grandTotal = 0;

            uniqueSizes.forEach(s => sizeTotals[String(s.sizeName)] = 0);
            uniqueColors.forEach(c => {
                const colorKey = String(c.name);
                colorTotals[colorKey] = 0;
            });

            (items as OrderDetail[]).forEach(item => {
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
                quote: Object.assign({}, rawQuote, { database: database! }),
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
    
    const pdfRenderData = useMemo(() => {
        if (!selectedQuote || selectedQuote.document_type === 'worksheet' || !database?.pdf_templates || !database?.company_info) return null;

        const quote = selectedQuote;
        if (!quote.customer) return null;

        const documentType = (quote.document_type || 'estimate') as DocumentType;
        const templateId = quote.last_used_template_id || database.pdf_templates.data.find(t => t.type === documentType)?.id;
        if (!templateId) {
            console.error(`No template found for document type: ${documentType}`);
            return null;
        }
        const template = database.pdf_templates.data.find(t => t.id === templateId);
        if (!template) {
             console.error(`Template with id ${templateId} not found.`);
             return null;
        }
        
        let config = { blocks: [], margins: { top: 20, right: 15, bottom: 20, left: 15 } };
        try {
            config = JSON.parse(template.config_json as string);
        } catch (e) {
            console.error("Failed to parse template config in DocumentManager", e);
        }
        
        const items = quote.items as OrderDetail[];
        const totalQuantity = items.reduce((sum, i) => sum + (i.quantity as number), 0);
        const tshirtCost = items.reduce((sum, i) => sum + ((i.unitPrice as number || 0) * (i.quantity as number)), 0);
        const totalCostExTax = (quote.total_cost_ex_tax as number) || 0;
        const shippingCost = (quote.shipping_cost as number) || 0;
        const tax = (quote.tax as number) || 0;
        const totalCostWithTax = (quote.total_cost_in_tax as number) || 0;
        
        // 見積書のデータから可能な限り正確な情報を取得
        // JSONフィールドから詳細情報を取得する試み
        let processingGroupsData: ProcessingGroup[] | null = null;
        let costDetailsData: Partial<CostDetails> | null = null;
        
        // processing_groups_json または cost_details_json フィールドがある場合
        if ((quote as any).processing_groups_json) {
            try {
                processingGroupsData = JSON.parse((quote as any).processing_groups_json);
            } catch (e) {
                console.warn('Failed to parse processing_groups_json', e);
            }
        }
        
        if ((quote as any).cost_details_json) {
            try {
                costDetailsData = JSON.parse((quote as any).cost_details_json);
            } catch (e) {
                console.warn('Failed to parse cost_details_json', e);
            }
        }
        
        // 保存されているデータから詳細情報を取得、なければ計算
        const printCost = (costDetailsData?.printCost as number) || ((quote as any).print_cost as number) || 0;
        const setupCost = (costDetailsData?.setupCost as number) || ((quote as any).setup_cost as number) || 0;
        const additionalOptionsCost = (costDetailsData?.additionalOptionsCost as number) || ((quote as any).additional_options_cost as number) || 0;
        const totalCustomItemsCost = (costDetailsData?.totalCustomItemsCost as number) || ((quote as any).custom_items_cost as number) || 0;
        const totalProductDiscount = (costDetailsData?.totalProductDiscount as number) || ((quote as any).product_discount as number) || 0;
        const totalSampleItemsCost = (costDetailsData?.totalSampleItemsCost as number) || ((quote as any).sample_items_cost as number) || 0;
        
        // 詳細情報がない場合は、残りを計算（ただし、これは近似値）
        const etcCost = totalCostExTax - tshirtCost - printCost - setupCost - additionalOptionsCost - totalCustomItemsCost - totalSampleItemsCost + totalProductDiscount;
        const calculatedPrintCost = printCost > 0 ? printCost : (etcCost > 0 ? etcCost : 0);

        const cost: CostDetails = {
            totalCost: totalCostExTax,
            shippingCost: shippingCost,
            tax: tax,
            totalCostWithTax: totalCostWithTax,
            costPerShirt: totalQuantity > 0 ? (totalCostWithTax / totalQuantity) : 0,
            tshirtCost,
            printCost: calculatedPrintCost,
            setupCost: setupCost,
            additionalOptionsCost: additionalOptionsCost,
            totalCustomItemsCost: totalCustomItemsCost,
            totalProductDiscount: totalProductDiscount,
            totalSampleItemsCost: totalSampleItemsCost,
            printCostDetail: costDetailsData?.printCostDetail || { 
                base: calculatedPrintCost, 
                byDtf: 0, 
                byItem: 0, 
                bySize: 0, 
                byInk: 0, 
                byLocation: 0, 
                byPlateType: 0 
            },
            setupCostDetail: costDetailsData?.setupCostDetail || {},
            additionalOptionsCostDetail: costDetailsData?.additionalOptionsCostDetail || {},
            groupCosts: [{
                groupId: String(quote.id),
                groupName: quote.subject as string,
                tshirtCost,
                silkscreenPrintCost: calculatedPrintCost,
                dtfPrintCost: 0,
                setupCost: setupCost,
                quantity: totalQuantity,
                additionalOptionsCost: additionalOptionsCost,
                customItemsCost: totalCustomItemsCost,
                productDiscount: totalProductDiscount,
                sampleItemsCost: totalSampleItemsCost,
                printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
                designPrintCosts: [],
                setupCostDetail: {},
                additionalOptionsCostDetail: {}
            }],
        };

        return {
            blocks: config.blocks,
            margins: config.margins,
            templateId: templateId as string,
            templates: database.pdf_templates.data,
            database: database as Database,
            documentType: documentType,
            orderDetails: quote.items as OrderDetail[],
            processingGroups: processingGroupsData || [{ 
                id: String(quote.id), 
                name: String(quote.subject), 
                items: quote.items as any, 
                printDesigns: (() => {
                    const quoteDesignsTable = database.quote_designs as Table | undefined;
                    return (quoteDesignsTable && Array.isArray(quoteDesignsTable.data))
                        ? (quoteDesignsTable.data.filter(d => d.quote_id === quote.id) as PrintDesign[])
                        : [];
                })(),
                customItems: [], // 保存されていない場合は空配列
                sampleItems: [], // 保存されていない場合は空配列
                selectedOptions: [] // 保存されていない場合は空配列
            }],
            cost: cost,
            totalQuantity: quote.items.reduce((sum, i) => sum + (i.quantity as number), 0),
            customerInfo: quote.customer as any,
            estimateId: quote.quote_code as string,
            companyInfo: companyInfo,
            paymentDueDate: quote.payment_due_date,
        };
    }, [selectedQuote, database, companyInfo]);
    
    return {
        database, // FIX: Added `database` to the return object.
        isLoading, isPreviewLoading, error,
        documents, filteredDocuments,
        selectedQuote, setSelectedQuote,
        searchTerm, setSearchTerm,
        docTypeFilter, setDocTypeFilter,
        dateFilterStart, setDateFilterStart,
        dateFilterEnd, setDateFilterEnd,
        worksheetDataList, pdfRenderData, companyInfo,
        proofingCanvases // pass through for preview panel
    };
};

