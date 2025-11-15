import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CostDetails, Database, OrderDetail, PrintDesign, QuoteTask, Row, TaskMaster } from '@shared/types';
import { ArchiveBoxIcon, DuplicateIcon, MicrophoneIcon, PencilIcon, PlayIcon, StopIcon, UserCircleIcon, XMarkIcon } from '@components/atoms';
import { EnrichedQuote } from '../types';
import { useWorkTimer as useSharedWorkTimer } from '@features/work-record/hooks/useWorkTimer';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { useNavigation } from '@core/contexts/NavigationContext';
import { fetchTables } from '@core/data/db.live';
import { updateDatabase, getAllManufacturerTableData, getManufacturerTable, getProductsMasterFromStock, getProductDetailsFromStock } from '@core/utils';
import PrintableEstimate from '@shared/components/PrintableEstimate';
import WorkTimerManager from '@features/work-record/organisms/WorkTimerManager';

interface OrderDetailsModalProps {
    quote: EnrichedQuote;
    database: Partial<Database>;
    onClose: () => void;
    onEdit: (quote: Row) => void;
    onDuplicate: (quote: EnrichedQuote) => void;
    setDatabase: React.Dispatch<React.SetStateAction<Database | null>>;
    onOpenTaskAssignment: (quote: EnrichedQuote) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ quote, database, onClose, onEdit, onDuplicate, setDatabase, onOpenTaskAssignment }) => {
    const { currentPage } = useNavigation();
    const { logDataAccess } = useDatabase();
    const [activeTab, setActiveTab] = useState('overview');
    const [printableData, setPrintableData] = useState<any | null>(null);
    const loadedTablesRef = useRef<Set<string>>(new Set());

    const { activeSessions, startSession, stopSession, isRecording, toggleRecording, sessionsToLog } = useSharedWorkTimer();

    // 在庫テーブル（stock_{manufacturer_id}）を読み込む
    useEffect(() => {
        const loadStockTables = async () => {
            if (!database || !database.manufacturers?.data) return;

            const manufacturers = database.manufacturers.data as Row[];
            const stockTableNames = manufacturers
                .map(m => `stock_${m.id}`)
                .filter(tableName => {
                    if (loadedTablesRef.current.has(tableName)) {
                        return false;
                    }
                    const manufacturerId = tableName.replace('stock_', '');
                    const table = getManufacturerTable(database, 'stock', manufacturerId);
                    return !table || !table.data || !Array.isArray(table.data) || table.data.length === 0;
                });

            if (stockTableNames.length > 0) {
                stockTableNames.forEach(t => loadedTablesRef.current.add(t));
                try {
                    logDataAccess('order-management', stockTableNames);
                    const stockData = await fetchTables(stockTableNames, { toolName: 'order-management' });
                    setDatabase(prev => ({ ...(prev || {}), ...stockData }));
                } catch (err) {
                    console.error('[OrderDetailsModal] Failed to load stock_items tables:', err);
                }
            }
        };

        loadStockTables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [database?.manufacturers]);

    const designs = useMemo(() => {
        const quoteDesignsTable = database.quote_designs as Table | undefined;
        return (quoteDesignsTable && Array.isArray(quoteDesignsTable.data)) 
            ? quoteDesignsTable.data.filter(d => d.quote_id === quote.id) 
            : [];
    }, [database.quote_designs, quote.id]);
    const history = useMemo(() => {
        const quoteHistoryTable = database.quote_history as Table | undefined;
        const historyData = (quoteHistoryTable && Array.isArray(quoteHistoryTable.data)) 
            ? quoteHistoryTable.data.filter(h => h.quote_id === quote.id)
            : [];
        return historyData.sort((a,b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
    }, [database.quote_history, quote.id]);
    const tasks = useMemo(() => {
        const quoteTasksTable = database.quote_tasks as Table | undefined;
        return (quoteTasksTable && Array.isArray(quoteTasksTable.data))
            ? (quoteTasksTable.data as QuoteTask[]).filter(t => t.quote_id === quote.id)
            : [];
    }, [database.quote_tasks, quote.id]);
    const taskMasterMap = useMemo(() => {
        const taskMasterTable = database.task_master as Table | undefined;
        const taskMasterData = (taskMasterTable && Array.isArray(taskMasterTable.data)) 
            ? (taskMasterTable.data as TaskMaster[])
            : [];
        return new Map(taskMasterData.map(t => [t.id, t]));
    }, [database.task_master]);
    
    const allProductsMap = useMemo(() => {
        if (!database) return new Map();
        // stockテーブルから全商品を取得（products_masterとproduct_detailsの代替）
        const allProducts = getProductsMasterFromStock(database);
        const allProductDetails = getProductDetailsFromStock(database);
        return new Map(
            // FIX: Use Object.assign to prevent "Spread types may only be created from object types" error.
            allProducts.map((p: Row) => [p.id, Object.assign({}, p, allProductDetails.find((d: Row) => d.product_id === p.id) || {})])
        );
    }, [database]);

    const itemsWithDetails = useMemo(() => {
        return quote.items.map(item => {
            // ハイブリッド構造対応: productIdから商品を取得（在庫テーブル由来のIDにも対応）
            let product = allProductsMap.get(item.productId as string);
            // manufacturer_idを直接取得（メーカー主体のデータ構造）
            let manufacturerId = product ? (product.manufacturer_id as string) : null;
            
            // productIdが在庫テーブル由来の場合（stock_product_{manufacturer_id}_{productCode}形式）
            // より安全な方法: 在庫テーブルから直接商品情報を取得してproductCodeを特定
            if (!product && item.productId && (item.productId as string).startsWith('stock_product_')) {
                // すべてのメーカーの在庫テーブルを検索
                const manufacturersTable = database.manufacturers as Table | undefined;
                if (manufacturersTable && Array.isArray(manufacturersTable.data)) {
                    const manufacturers = manufacturersTable.data as Row[];
                    for (const manufacturer of manufacturers) {
                        const stockTableName = `stock_${manufacturer.id}`;
                        const stockTable = database[stockTableName];
                        if (stockTable?.data && Array.isArray(stockTable.data)) {
                            // 在庫テーブルから商品コードを取得（商品コードごとにグループ化されているため、最初のアイテムから取得）
                            const stockItems = stockTable.data.filter((si: Row) => 
                                si.manufacturer_id === manufacturer.id
                            );
                            if (stockItems.length > 0) {
                                // 商品コードの一意なリストを取得
                                const productCodes = [...new Set(stockItems.map((si: Row) => si.product_code as string))];
                                // 各商品コードについてproducts_masterを検索（manufacturer_idを直接使用）
                                for (const productCode of productCodes) {
                                    // メーカー依存テーブルから商品を検索
                                    const manufacturerProducts = getManufacturerTable(database, 'products_master', manufacturer.id as string);
                                    if (manufacturerProducts?.data && Array.isArray(manufacturerProducts.data)) {
                                        const productMaster = manufacturerProducts.data.find(
                                            (p: Row) => p.productCode === productCode && p.manufacturer_id === manufacturer.id
                                        );
                                        if (productMaster) {
                                            // この商品がproductIdと一致する可能性がある
                                            const potentialProductId = `stock_product_${manufacturer.id}_${productCode}`;
                                            if (potentialProductId === item.productId) {
                                                const manufacturerDetails = getManufacturerTable(database, 'product_details', manufacturer.id as string);
                                                const detailsData = (manufacturerDetails?.data && Array.isArray(manufacturerDetails.data))
                                                    ? manufacturerDetails.data
                                                    : [];
                                                // product_detailsはproduct_code + manufacturer_idで管理
                                                const productCode = productMaster.productCode as string;
                                                product = Object.assign({}, productMaster, 
                                                    detailsData.find((d: Row) => 
                                                        (d.product_code && String(d.product_code) === productCode) ||
                                                        (d.product_id && String(d.product_id) === productMaster.id)
                                                    ) || {}
                                                );
                                                manufacturerId = manufacturer.id as string;
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (product) break;
                            }
                        }
                    }
                }
            }
    
            // 在庫テーブルから商品情報を取得（stock_{manufacturer_id}）
            // 検索条件の階層: メーカーID + 品番 + カラーコード + サイズコード
            let stockItem: Row | undefined;
            if (manufacturerId && (product?.productCode || item.productId)) {
                const productCode = product?.productCode || item.productId;
                
                // colors, sizesテーブルは削除済み（stockテーブルから取得）
                // stockテーブルから直接取得
                let colorCode: string | undefined;
                let sizeCode: string | undefined;
                
                const stockTableName = `stock_${manufacturerId}`;
                const stockTable = database[stockTableName];
                if (stockTable?.data && Array.isArray(stockTable.data)) {
                    // 階層的検索: メーカーID + 品番 + カラー名 + サイズ名
                    stockItem = stockTable.data.find((si: Row) => {
                        // 1. メーカーID + 品番で商品を特定
                        if (si.manufacturer_id !== manufacturerId || si.product_code !== productCode) {
                            return false;
                        }
                        
                        // 2. カラー名が一致するか（item.colorが指定されている場合のみ）
                        if (item.color && si.color_name !== item.color) {
                            return false;
                        }
                        
                        // 3. サイズ名が一致するか（item.sizeが指定されている場合のみ）
                        if (item.size && si.size_name !== item.size) {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    // stockItemが見つかった場合、colorCodeとsizeCodeを取得
                    if (stockItem) {
                        colorCode = stockItem.color_code as string | undefined;
                        sizeCode = stockItem.size_code as string | undefined;
                    }
                }
            }
    
            // colors, sizesテーブルは削除済み（stockテーブルから取得）
            // stockItemから既に取得済みのため、colorInfoとsizeInfoは不要
            const colorInfo = undefined;
            const sizeInfo = undefined;
    
            // 在庫テーブルから取得した情報を優先（なければ商品マスターから）
            return {
                ...item,
                // stock_product_nameを優先、次にproductNameを使用
                productName: stockItem?.stock_product_name || product?.productName || item.productName,
                productCode: stockItem?.product_code || product?.productCode || item.productId || '',
                colorName: stockItem?.color_name || item.color,
                colorCode: stockItem?.color_code || colorInfo?.colorCode || '',
                sizeName: stockItem?.size_name || item.size,
                sizeCode: stockItem?.size_code || sizeInfo?.sizeCode || '',
            };
        });
    }, [quote.items, allProductsMap, database]);
    // 注意: database.colors, database.sizesは削除済み（stockテーブルから取得）

    const printHistory = useMemo(() => {
        if (!database.print_history || !database.print_history_positions || !database.print_history_images) return [];
        const printHistoryTable = database.print_history as Table;
        if (!printHistoryTable || !Array.isArray(printHistoryTable.data)) return [];
        return printHistoryTable.data
            .filter(h => h.quote_id === quote.id)
            .map(h => {
                const positions = (database.print_history_positions?.data || []).filter(p => p.print_history_id === h.id);
                const images = (database.print_history_images?.data || []).filter(i => i.print_history_id === h.id);
                const entry: Row = { ...h, positions, images };
                return entry;
            })
            .sort((a, b) => new Date(b.printed_at as string).getTime() - new Date(a.printed_at as string).getTime());
    }, [database, quote.id]);

    const relatedDocuments = useMemo(() => {
        const originalId = quote.original_quote_id || quote.id;
        const docs = (database.quotes?.data || []).filter(d => d.id === originalId || d.original_quote_id === originalId);
        const typeOrder: Record<string, number> = { 'estimate': 1, 'delivery_slip': 2, 'invoice': 3, 'receipt': 4 };
        return docs.sort((a, b) => {
            const orderA = typeOrder[a.document_type as string] || 99;
            const orderB = typeOrder[b.document_type as string] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
        });
    }, [database.quotes, quote]);
    
    const docTypeMap: Record<string, { label: string, color: string }> = {
        estimate: { label: '見積書', color: 'bg-blue-500' },
        invoice: { label: '請求書', color: 'bg-green-500' },
        delivery_slip: { label: '納品書', color: 'bg-orange-500' },
        receipt: { label: '領収書', color: 'bg-purple-500' }
    };

    const getPrintLocationLabel = useCallback((locationId: string): string => {
        const printLocationsTable = database.print_locations as Table | undefined;
        if (!printLocationsTable || !Array.isArray(printLocationsTable.data)) return locationId;
        const loc = printLocationsTable.data.find(l => l.locationId === locationId);
        return loc ? `${loc.groupName} ${loc.label}` : locationId;
    }, [database.print_locations]);
    
    const handleTaskToggle = (taskId: string, currentStatus: string) => {
        // まずローカル状態を更新
        setDatabase(db => {
            if (!db) return null;
            const newDb = JSON.parse(JSON.stringify(db));
            const taskIndex = (newDb.quote_tasks.data as QuoteTask[]).findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                const task = newDb.quote_tasks.data[taskIndex];
                task.status = currentStatus === 'completed' ? 'pending' : 'completed';
                task.completed_at = task.status === 'completed' ? new Date().toISOString() : null;
            }
            return newDb;
        });

        // サーバーに保存
        (async () => {
            try {
                if (!database) return;
                const task = (database.quote_tasks?.data || []).find((t: Row) => t.id === taskId);
                if (!task) return;

                const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
                const updatedTask = {
                    ...task,
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                };
                const operation = [{
                    type: 'UPDATE' as const,
                    data: updatedTask,
                    where: { id: taskId }
                }];
                const result = await updateDatabase(currentPage, 'quote_tasks', operation, database as Database);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update task status to server');
                }
            } catch (error) {
                console.error('[OrderDetailsModal] Failed to update task to server:', error);
                alert('サーバーへの更新に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        })();
    };
    
    const handleDuplicate = () => {
        onDuplicate(quote);
        onClose();
    };

    const handlePreviewClick = (doc: Row) => {
        if (!database || !database.company_info || !database.pdf_templates || !database.customers) {
          alert('プレビューに必要なデータが不足しています。');
          return;
        }
        const customersTable = database.customers as Table | undefined;
        if (!customersTable || !Array.isArray(customersTable.data)) {
          alert('顧客データが無効です。');
          return;
        }
        const customer = customersTable.data.find(c => c.id === doc.customer_id);
        if (!customer) {
          alert('顧客情報が見つかりません。');
          return;
        }
    
        const quoteItemsTable = database.quote_items as Table | undefined;
        const items = (quoteItemsTable && Array.isArray(quoteItemsTable.data) 
            ? quoteItemsTable.data.filter(item => item.quote_id === doc.id) 
            : []) as OrderDetail[];
        const quoteDesignsTable = database.quote_designs as Table | undefined;
        const designs = (quoteDesignsTable && Array.isArray(quoteDesignsTable.data)
            ? quoteDesignsTable.data.filter(design => design.quote_id === doc.id)
            : []) as PrintDesign[];
        const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
        // FIX: Add explicit type annotation to reduce callback parameter to resolve 'unknown' type error.
        const tshirtCost = items.reduce((sum: number, i: OrderDetail) => sum + (i.quantity * i.unitPrice), 0);
        const etcCost = ((doc.total_cost_ex_tax as number) || 0) - tshirtCost;
    
        const cost: CostDetails = {
          totalCost: (doc.total_cost_ex_tax || 0) as number,
          shippingCost: (doc.shipping_cost || 0) as number,
          tax: (doc.tax || 0) as number,
          totalCostWithTax: (doc.total_cost_in_tax || 0) as number,
          costPerShirt: totalQuantity > 0 ? (((doc.total_cost_in_tax as number) || 0) / totalQuantity) : 0,
          tshirtCost,
          printCost: etcCost > 0 ? etcCost : 0,
          setupCost: 0,
          additionalOptionsCost: 0,
          totalCustomItemsCost: 0,
          totalProductDiscount: 0,
          totalSampleItemsCost: 0,
          printCostDetail: { base: etcCost > 0 ? etcCost : 0, byDtf: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
          setupCostDetail: {},
          additionalOptionsCostDetail: {},
          groupCosts: [{
            groupId: `group_${doc.id}`,
            groupName: doc.subject as string,
            tshirtCost,
            silkscreenPrintCost: etcCost > 0 ? etcCost : 0,
            dtfPrintCost: 0,
            setupCost: 0,
            quantity: totalQuantity,
            additionalOptionsCost: 0,
            customItemsCost: 0,
            productDiscount: 0,
            sampleItemsCost: 0,
            printCostDetail: { base: 0, byItem: 0, bySize: 0, byInk: 0, byLocation: 0, byPlateType: 0 },
            designPrintCosts: [],
            setupCostDetail: {},
            additionalOptionsCostDetail: {}
          }],
        };
    
        const companyInfo = (database.company_info.data as Row[]).reduce((acc, c) => {
          const keyMap: Record<string, string> = {'COMPANY_NAME':'companyName','COMPANY_ZIP':'zip','COMPANY_ADDRESS':'address','COMPANY_TEL':'tel','COMPANY_FAX':'fax','BANK_NAME':'bankName','BANK_BRANCH_NAME':'bankBranchName','BANK_ACCOUNT_TYPE':'bankAccountType','BANK_ACCOUNT_NUMBER':'bankAccountNumber','BANK_ACCOUNT_HOLDER':'bankAccountHolder','INVOICE_ISSUER_NUMBER':'invoiceIssuerNumber'};
          const mappedKey = keyMap[c.key as string];
          if(mappedKey) (acc as any)[mappedKey] = c.value;
          return acc;
        }, {} as any);
    
        setPrintableData({
          templateId: doc.last_used_template_id,
          templates: database.pdf_templates.data,
          database,
          documentType: doc.document_type,
          orderDetails: items,
          processingGroups: [{
            id: `group_${doc.id}`,
            name: String(doc.subject),
            items,
            printDesigns: designs,
            selectedOptions: [],
          }],
          cost,
          totalQuantity,
          customerInfo: customer,
          estimateId: doc.quote_code,
          companyInfo,
          paymentDueDate: doc.payment_due_date,
          onClose: () => setPrintableData(null),
          isBringInMode: false,
          showGroupTotalsInPdf: true
        });
    };

    const renderItemsTab = () => (
        <table className="min-w-full text-sm table-fixed">
            <thead className="bg-base-200 dark:bg-base-dark-300">
                <tr>
                    <th className="p-2 text-left" style={{ width: '40%' }}>商品名</th>
                    <th className="p-2 text-left" style={{ width: '10%' }}>品番</th>
                    <th className="p-2 text-left" style={{ width: '25%' }}>カラー</th>
                    <th className="p-2 text-left" style={{ width: '15%' }}>サイズ</th>
                    <th className="p-2 text-right" style={{ width: '10%' }}>数量</th>
                </tr>
            </thead>
            <tbody>
                {itemsWithDetails.map((item, index) => (
                    <tr key={index} className="border-b border-default dark:border-default-dark">
                        <td className="p-2 truncate">{item.productName}</td>
                        <td className="p-2 font-mono truncate">{item.productCode}</td>
                        <td className="p-2 truncate">{item.colorCode ? `(${item.colorCode}) ` : ''}{item.colorName}</td>
                        <td className="p-2 truncate">{item.sizeCode ? `(${item.sizeCode}) ` : ''}{item.sizeName}</td>
                        <td className="p-2 text-right font-semibold">{item.quantity}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'documents':
                return (
                    <div className="space-y-2">
                        {relatedDocuments.map(doc => {
                            const docInfo = docTypeMap[doc.document_type as string] || { label: '不明', color: 'bg-gray-500' };
                            return (
                                <button key={doc.id} onClick={() => handlePreviewClick(doc)} className="w-full text-left p-3 bg-base-200 dark:bg-base-dark-300 rounded-md flex items-center justify-between hover:bg-base-300 dark:hover:bg-base-dark-200/50">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${docInfo.color}`}>{docInfo.label}</span>
                                        <span className="font-mono text-sm">{doc.quote_code}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span>{new Date(doc.created_at as string).toLocaleDateString()}</span>
                                        <span className="font-bold ml-4">¥{(doc.total_cost_in_tax as number || 0).toLocaleString()}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                );
            case 'tasks':
                return (
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <button
                                onClick={toggleRecording}
                                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-full transition-colors ${
                                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300'
                                }`}
                            >
                                <MicrophoneIcon className="w-4 h-4"/>
                                {isRecording ? '録音停止' : '音声で操作'}
                            </button>
                        </div>
                        {tasks.map(task => {
                            const master = taskMasterMap.get(task.task_master_id);
                            if (!master) return null;
                            const dueDate =
                                quote?.estimated_delivery_date && master.days_required
                                    ? new Date(new Date(quote.estimated_delivery_date as string).getTime() - (master.days_required as number) * 24 * 60 * 60 * 1000)
                                    : null;
                            const isTaskActive = activeSessions.some(s => s.id === task.task_master_id);
                            return (
                                <div key={task.id} className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-md flex items-center justify-between">
                                    <label htmlFor={`task-checkbox-${task.id}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                                        <input id={`task-checkbox-${task.id}`} name={`task_${task.id}`} type="checkbox" checked={task.status === 'completed'} onChange={() => handleTaskToggle(task.id, task.status)} className="w-5 h-5"/>
                                        <span className={`font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{master.name}</span>
                                    </label>
                                    <div className="text-xs text-gray-500 mr-4">
                                        {dueDate && <span>期限: {dueDate.toLocaleDateString()}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isTaskActive ? (
                                            <button onClick={() => stopSession(task.task_master_id)} className="p-2 bg-red-500 text-white rounded-full"><StopIcon className="w-4 h-4"/></button>
                                        ) : (
                                            <button onClick={() => startSession(task.task_master_id)} className="p-2 bg-green-500 text-white rounded-full"><PlayIcon className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'items':
                return renderItemsTab();
            case 'designs':
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {designs.map(d => (
                             <div key={d.id} className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                                 <h4 className="font-semibold">{getPrintLocationLabel(d.location as string)}</h4>
                                 <div className="text-xs text-gray-600 dark:text-gray-400">
                                     {d.printMethod === 'dtf' 
                                         ? `DTF: ${d.widthCm}x${d.heightCm}cm`
                                         : `シルク: ${d.print_size}, ${d.color_count}色`
                                     }
                                 </div>
                                 {d.image_src && <img src={d.image_src as string} className="mt-2 rounded-md max-h-40 mx-auto bg-white" />}
                             </div>
                        ))}
                    </div>
                 );
            case 'printhistory':
                return (
                    <div className="space-y-4">
                        {printHistory.length > 0 ? printHistory.map(h => (
                            <div key={h.id as string} className="p-4 bg-base-200 dark:bg-base-dark-300 rounded-lg">
                                <p className="font-semibold text-sm mb-2 border-b pb-2">記録日時: {new Date(h.printed_at as string).toLocaleString('ja-JP')}</p>
                                {h.notes && <div className="mb-2"><p className="font-semibold text-xs">総合メモ:</p><pre className="whitespace-pre-wrap font-sans text-xs bg-base-100 dark:bg-base-dark-200 p-2 rounded">{h.notes}</pre></div>}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {h.positions.map((pos: Row) => {
                                        const design = designs.find(d => String(d.id) === String(pos.location));
                                        const location = design ? getPrintLocationLabel(design.location as string) : `不明なデザイン(ID: ${pos.location})`;
                                        const image = h.images.find((img: Row) => String(img.image_name).includes(String(pos.location)));
                                        return (
                                            <div key={pos.id as string} className="text-xs">
                                                <p className="font-bold">{location}</p>
                                                <p className="p-2 bg-base-100 dark:bg-base-dark-200 rounded mt-1">位置メモ: {pos.position_notes}</p>
                                                {image && <img src={image.image_data_url as string} alt={image.image_name as string} className="mt-2 rounded max-w-full h-auto" loading="lazy"/>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500">この案件の印刷履歴はまだありません。</p>}
                    </div>
                );
            case 'history':
                return (
                     <ul className="space-y-3">
                        {history.map(h => (
                            <li key={h.id} className="p-3 bg-base-200 dark:bg-base-dark-300 rounded-lg text-xs">
                                <p><strong>日時:</strong> {new Date(h.created_at as string).toLocaleString()}</p>
                                <p><strong>操作:</strong> {h.action}</p>
                                <p><strong>詳細:</strong> {h.details}</p>
                            </li>
                        ))}
                     </ul>
                );
            case 'overview':
            default:
                return (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center gap-2"><UserCircleIcon className="w-6 h-6" />顧客情報</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><strong>会社名/氏名:</strong> {quote.customer?.company_name || quote.customer?.name_kanji}</p>
                                <p><strong>顧客グループ:</strong> {(() => {
                                    const customerGroupsTable = database.customer_groups as Table | undefined;
                                    if (!customerGroupsTable || !Array.isArray(customerGroupsTable.data)) return '一般';
                                    const group = customerGroupsTable.data.find(g => g.id === quote.customer?.customer_group_id) as Row | undefined;
                                    return group?.name || '一般';
                                })()}</p>
                                <p><strong>Email:</strong> {quote.customer?.email}</p>
                                <p><strong>電話番号:</strong> {quote.customer?.phone}</p>
                            </div>
                        </section>
                        <section>
                            <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center gap-2"><ArchiveBoxIcon className="w-6 h-6" />案件情報</h3>
                             <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                <p><strong>見積ステータス:</strong> {quote.quote_status}</p>
                                <p><strong>製作ステータス:</strong> {quote.production_status}</p>
                                <p><strong>入金状況:</strong> {quote.payment_status}</p>
                                <p><strong>発送状況:</strong> {quote.shipping_status}</p>
                                <p><strong>データ確認:</strong> {quote.data_confirmation_status}</p>
                                <p><strong>希望納品日:</strong> {quote.estimated_delivery_date ? new Date(quote.estimated_delivery_date as string).toLocaleDateString() : '未定'}</p>
                            </div>
                        </section>
                    </div>
                );
        }
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-base-100 dark:bg-base-dark-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-4 border-b border-base-300 dark:border-base-300">
                        <div>
                            <h2 className="text-xl font-bold">案件詳細: {quote.quote_code}</h2>
                            <p className="text-sm text-gray-500">{quote.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onOpenTaskAssignment(quote)} className="p-2 flex items-center gap-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300">
                                <i className="fa-solid fa-list-check w-4 h-4"/> タスクを登録
                            </button>
                            <button onClick={handleDuplicate} className="p-2 flex items-center gap-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300">
                                <DuplicateIcon className="w-4 h-4"/> この内容で見積を複製
                            </button>
                            <button onClick={() => onEdit(quote)} className="p-2 flex items-center gap-1 text-sm bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark rounded hover:opacity-90">
                                <PencilIcon className="w-4 h-4"/> 編集
                            </button>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-base-200 dark:hover:bg-base-dark-300"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                    </header>

                    <div className="border-b border-base-300 dark:border-base-dark-300">
                        <div className="flex space-x-4 px-6 overflow-x-auto">
                            <button onClick={() => setActiveTab('overview')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'overview' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>概要</button>
                            <button onClick={() => setActiveTab('documents')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'documents' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>関連帳票</button>
                            <button onClick={() => setActiveTab('tasks')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>タスク ({tasks.length})</button>
                            <button onClick={() => setActiveTab('items')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'items' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>商品明細</button>
                            <button onClick={() => setActiveTab('designs')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'designs' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>デザイン</button>
                            <button onClick={() => setActiveTab('printhistory')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'printhistory' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>印刷履歴</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-shrink-0 py-2 border-b-2 text-sm font-medium ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500'}`}>履歴</button>
                        </div>
                    </div>

                    <main className="overflow-y-auto p-6 flex-grow">
                        {renderTabContent()}
                    </main>
                    
                    {sessionsToLog.length > 0 && (
                        <div className="flex-shrink-0 p-4 border-t border-base-300 dark:border-base-300">
                             <WorkTimerManager showUnsavedLogs={true} />
                        </div>
                    )}
                </div>
            </div>
            {printableData && <PrintableEstimate {...printableData} />}
        </>
    );
};

export default OrderDetailsModal;