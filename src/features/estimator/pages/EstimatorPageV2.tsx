
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// FIX: Corrected import path for types.
import { SpinnerIcon } from '@components/atoms';
import { CostDetails, Database, EstimatorState, OrderDetail, Product, Row } from '@shared/types';
import EstimatorLayoutV2 from '../EstimatorLayoutV2';
// FIX: The Sidebar component has been moved to a new location.
import DebugPanel from '@components/organisms/DebugPanel';
import { Page } from '@core/config/Routes';
import { useDatabase } from '@core/contexts/DatabaseContext';
import { fetchTables } from '@core/data/db.live';
import { useDebugMode } from '@shared/hooks/useDebugMode';
import { EnrichedQuote } from '../../order-management/types';
import QuoteTypeSelector from '../atoms/QuoteTypeSelector';
import { useEstimatorDataLoading } from '../hooks/useEstimatorDataLoading';
import { calculateCost } from '../services/estimateService';
import { loadQuoteFromDatabase } from '../utils/loadQuoteFromDatabase';

const generateEstimateId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `QT-${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const EMPTY_CUSTOMER_INFO: Row = {
  id: null, company_name: '', name_kanji: '', name_kana: '', email: '', phone: '',
  zip_code: '', address1: '', address2: '', notes: '', customer_group_id: 'cgrp_00001',
  has_separate_shipping_address: false, shipping_name: '', shipping_phone: '',
  shipping_zip_code: '', shipping_address1: '', shipping_address2: '',
  created_at: null, updated_at: null,
};


interface EstimatorPageV2Props {
    onNavigate: (page: Page, table?: string) => void;
    onBackToDocumentList?: (savedQuoteId?: string) => void;
    initialDocumentType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | null;
    initialQuoteId?: string | null;
    selectedDocType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
    isNewDocument?: boolean; // 新規作成モードかどうか
    onDelete?: (quoteId: string) => Promise<void>; // 削除ハンドラ
}

const EstimatorPageV2: React.FC<EstimatorPageV2Props> = ({ 
    onNavigate,
    onBackToDocumentList,
    initialDocumentType,
    initialQuoteId,
    selectedDocType,
    isNewDocument = false,
    onDelete
}) => {
    const { database, setDatabase } = useDatabase();
    const { debugMode, setDebugMode, logs, addLog, clearLogs, exportLogs } = useDebugMode('estimator');
    
    // 共通のデータ読み込みフックを使用（v2の動作パターンに基づく）
    const { isLoading, loadingPhase, error, appData, setAppData } = useEstimatorDataLoading({
        toolName: 'estimator'
    });

    const [selectedQuoteType, setSelectedQuoteType] = useState<string | null>('プリント事業');
    
    // 編集時のドキュメントタイプを保存
    // propsから受け取るか、sessionStorageから読み込む（後方互換性のため）
    const [editDocumentType, setEditDocumentType] = useState<'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | null>(() => {
        // propsから受け取る場合
        if (initialDocumentType) {
            return initialDocumentType;
        }
        // 初期化時にドキュメントタイプを取得（後方互換性）
        const documentType = sessionStorage.getItem('quoteToEditDocumentType');
        if (documentType) {
            sessionStorage.removeItem('quoteToEditDocumentType');
            return documentType as 'estimate' | 'invoice' | 'delivery_slip' | 'receipt';
        }
        return null;
    });
    
    // 編集時のテンプレートIDを保存（作成時に使用したテンプレートIDを保持するため）
    const [editTemplateId, setEditTemplateId] = useState<string | null>(() => {
        // 後方互換性のため、sessionStorageからも読み込む
        const templateId = sessionStorage.getItem('quoteToEditTemplateId');
        if (templateId) {
            sessionStorage.removeItem('quoteToEditTemplateId');
            return templateId;
        }
        return null;
    });
    
    const [state, setState] = useState<EstimatorState>(() => {
        // 編集モードの見積を読み込む
        const editState = sessionStorage.getItem('quoteToEdit');
        if (editState) {
            try {
                const parsed = JSON.parse(editState);
                sessionStorage.removeItem('quoteToEdit');
                return {
                    ...parsed,
                    isDataConfirmed: false,
                    isOrderPlaced: false,
                    orderDate: null,
                };
            } catch (e) {
                console.error("Failed to parse quote to edit state", e);
            }
        }
        
        // 複製モードの見積を読み込む
        const savedState = sessionStorage.getItem('quoteToDuplicate');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                sessionStorage.removeItem('quoteToDuplicate');
                return {
                    ...parsed,
                    isDataConfirmed: false,
                    isOrderPlaced: false,
                    orderDate: null,
                    estimateId: generateEstimateId(),
                    isReorder: true,
                    isBringInMode: false,
                    senderInfo: null,
                };
            } catch (e) {
                console.error("Failed to parse duplicated quote state", e);
            }
        }
        return {
            processingGroups: [{ id: `group_${Date.now()}`, name: '加工グループ1', items: [], printDesigns: [], selectedOptions: [] }],
            customerInfo: EMPTY_CUSTOMER_INFO, 
            senderInfo: null,
            isDataConfirmed: false,
            isOrderPlaced: false, 
            orderDate: null, 
            estimateId: generateEstimateId(),
            isBringInMode: false, 
            isReorder: false, 
            originalEstimateId: null,
        };
    });
    
    // senderInfoの設定を別のuseEffectで処理（無限ループを防ぐ）
    useEffect(() => {
        if (appData?.companyInfo && !state.senderInfo) {
            setState(prevState => ({
                ...prevState,
                senderInfo: appData.companyInfo
            }));
        }
    }, [appData?.companyInfo, state.senderInfo]);

    // customersテーブルを読み込む（必須テーブルに含まれていないため個別に読み込む）
    useEffect(() => {
        const loadCustomers = async () => {
            if (!database || !appData) return;
            if (database.customers?.data) return; // 既に読み込まれている場合はスキップ
            
            try {
                const newData = await fetchTables(['customers'], { toolName: 'estimator' });
                if (newData?.customers) {
                    setDatabase(prev => ({ ...prev, ...newData }));
                }
            } catch (err) {
                console.error('[EstimatorPageV2] Failed to load customers table:', err);
            }
        };
        loadCustomers();
    }, [database, appData, setDatabase]);

    // initialQuoteIdからデータを読み込む（編集時）
    useEffect(() => {
        if (!initialQuoteId || !database || !appData) return;

        // 既にstateが設定されている場合はスキップ（初期化時のみ）
        if (state.estimateId === initialQuoteId && state.customerInfo.id) {
            return;
        }

        // quotesテーブルからquoteを取得
        const quote = database.quotes?.data.find((q: Row) => q.id === initialQuoteId);
        if (!quote) {
            console.error('Quote not found:', initialQuoteId);
            return;
        }

        // EnrichedQuote形式に変換
        const customer = database.customers?.data.find((c: Row) => c.id === quote.customer_id);
        const enrichedQuote: EnrichedQuote = {
            ...quote,
            id: quote.id as string,
            customer: customer || null,
            items: [],
            product: null,
            proofingImage: null,
            tasks: [],
            document_type: quote.document_type as any || 'estimate',
            last_used_template_id: quote.last_used_template_id as string | null || null
        };

        // EstimatorStateを復元
        const estimatorState = loadQuoteFromDatabase(enrichedQuote, database as Database);
        if (estimatorState) {
            setState({
                ...estimatorState,
                isDataConfirmed: false,
                isOrderPlaced: false,
                orderDate: null,
            });

            // テンプレートIDを設定
            if (enrichedQuote.last_used_template_id) {
                setEditTemplateId(enrichedQuote.last_used_template_id);
            }
        }
    }, [initialQuoteId, database, appData, state.estimateId, state.customerInfo.id]);


    const { costDetails, updatedItems } = useMemo(() => {
        if (!appData || !database) return { costDetails: {} as CostDetails, updatedItems: [] };
        
        const dtfData = {
            consumables: appData.dtfConsumables,
            equipment: appData.dtfEquipment,
            laborCosts: appData.dtfLaborCosts,
            pressTimeCosts: appData.dtfPressTimeCosts,
            electricityRates: appData.dtfElectricityRates,
        };

        const customerInfoForCalc = {
            companyName: state.customerInfo.company_name as string || '',
            nameKanji: state.customerInfo.name_kanji as string || '',
            nameKana: state.customerInfo.name_kana as string || '',
            email: state.customerInfo.email as string || '',
            phone: state.customerInfo.phone as string || '',
            zipCode: state.customerInfo.zip_code as string || '',
            address1: state.customerInfo.address1 as string || '',
            address2: state.customerInfo.address2 as string || '',
            notes: state.customerInfo.notes as string || '',
            customer_group_id: state.customerInfo.customer_group_id as string || 'cgrp_00001',
            has_separate_shipping_address: !!state.customerInfo.has_separate_shipping_address,
            shipping_name: state.customerInfo.shipping_name as string || '',
            shipping_phone: state.customerInfo.shipping_phone as string || '',
            shipping_zip_code: state.customerInfo.shipping_zip_code as string || '',
            shipping_address1: state.customerInfo.shipping_address1 as string || '',
            shipping_address2: state.customerInfo.shipping_address2 as string || ''
        };
        
        return calculateCost(
            { processingGroups: state.processingGroups },
            Object.values(appData.products).flat() as Product[],
            customerInfoForCalc,
            appData,
            dtfData,
            appData.dtfPrintSettings,
            { isReorder: state.isReorder, isBringInMode: state.isBringInMode },
            database as Database
        );
    }, [state.processingGroups, state.customerInfo, state.isReorder, state.isBringInMode, appData, database]);

    useEffect(() => {
        if (!updatedItems || updatedItems.length === 0) return;

        setState(prevState => {
            let hasChanged = false;
            const newProcessingGroups = prevState.processingGroups.map(group => {
                // FIX: Add explicit type arguments to new Map to resolve type inference error.
                const updatedItemsMap = new Map<string, OrderDetail>(updatedItems.map(ui => [`${ui.productId}-${ui.color}-${ui.size}-${ui.isBringIn}`, ui]));

                const newItems = group.items.map(item => {
                    const key = `${item.productId}-${item.color}-${item.size}-${item.isBringIn}`;
                    const updatedItem: OrderDetail | undefined = updatedItemsMap.get(key);
                    
                    if (updatedItem && item.unitPrice !== updatedItem.unitPrice) {
                        hasChanged = true;
                        return { ...item, unitPrice: updatedItem.unitPrice };
                    }
                    return item;
                });

                if (JSON.stringify(group.items) !== JSON.stringify(newItems)) {
                    hasChanged = true;
                    return { ...group, items: newItems };
                }
                return group;
            });

            if (!hasChanged) {
                return prevState;
            }

            return {
                ...prevState,
                processingGroups: newProcessingGroups,
            };
        });
    }, [updatedItems, setState]);
    
    const handleNavigateHome = () => {
        onNavigate('order-management', 'quotes');
    };

    const handleAddGroup = useCallback(() => {
        setState(prev => ({
            ...prev,
            processingGroups: [
                ...prev.processingGroups,
                {
                    id: `group_${Date.now()}`,
                    name: `加工グループ${prev.processingGroups.length + 1}`,
                    items: [],
                    printDesigns: [],
                    selectedOptions: []
                }
            ]
        }));
    }, []);

    const handleRemoveGroup = useCallback((groupId: string) => {
        const groupToRemove = state.processingGroups.find(g => g.id === groupId);
        const groupName = groupToRemove?.name || 'このグループ';
        
        if (!window.confirm(`${groupName}を削除しますか？\nこの操作は元に戻せません。`)) {
            return;
        }
        
        setState(prev => ({
            ...prev,
            processingGroups: prev.processingGroups.length > 1 
                ? prev.processingGroups.filter(g => g.id !== groupId)
                : prev.processingGroups
        }));
    }, [state.processingGroups]);

    const handleDuplicateGroup = useCallback((groupId: string) => {
        setState(prev => {
            const groupToDuplicate = prev.processingGroups.find(g => g.id === groupId);
            if (!groupToDuplicate) return prev;

            const newGroup = {
                ...JSON.parse(JSON.stringify(groupToDuplicate)),
                id: `group_${Date.now()}`,
                name: `${groupToDuplicate.name} (コピー)`
            };

            const groupIndex = prev.processingGroups.findIndex(g => g.id === groupId);
            const newGroups = [...prev.processingGroups];
            newGroups.splice(groupIndex + 1, 0, newGroup);

            return { ...prev, processingGroups: newGroups };
        });
    }, []);


    // エラーをデバッグログに記録
    React.useEffect(() => {
        if (error) {
            addLog('error', 'system', 'エラー発生', {
                error,
                isLoading,
                loadingPhase
            });
        }
    }, [error, addLog, isLoading, loadingPhase]);

    // エラーが発生してローディングが完了した場合はエラー画面を表示
    if (error && !isLoading) {
        return (
            <>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center max-w-md">
                        <p className="text-lg font-semibold text-error mb-4">データの読み込みに失敗しました</p>
                        <p className="text-sm text-base-content/70 mb-4">{error}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                            デバッグパネル（右下のアイコン）で詳細を確認できます。
                        </p>
                        <button
                            onClick={() => {
                                // データの再読み込みをトリガー（ページをリロード）
                                window.location.reload();
                            }}
                            className="btn btn-primary"
                        >
                            再読み込み
                        </button>
                    </div>
                </div>
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="見積計算v2"
                />
            </>
        );
    }
    
    // ローディング中、またはデータが不足している場合はローディング画面を表示
    if (isLoading || !appData || !database?.customers) {
        const getLoadingMessage = () => {
            switch (loadingPhase) {
                case 'essential':
                    return '必須データを読み込み中...';
                case 'transform':
                    return 'データを変換中...';
                default:
                    return '見積データを準備中...';
            }
        };

        return (
            <React.Fragment>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                        <SpinnerIcon className="w-12 h-12 mx-auto text-brand-primary animate-spin" />
                        <p className="mt-4 text-lg font-semibold">{getLoadingMessage()}</p>
                        {error && (
                            <div className="mt-2">
                                <p className="text-sm text-error">エラー: {error}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    デバッグパネル（右下のアイコン）で詳細を確認できます。
                                </p>
                            </div>
                        )}
                        {loadingPhase && (
                            <p className="mt-2 text-xs text-base-content/60">
                                {loadingPhase === 'essential' && `必須テーブル読み込み中`}
                                {loadingPhase === 'transform' && `データ変換処理中`}
                            </p>
                        )}
                    </div>
                </div>
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="見積計算v2"
                />
            </React.Fragment>
        );
    }
    
    if (!selectedQuoteType) {
        return (
            <React.Fragment>
                <QuoteTypeSelector onSelect={setSelectedQuoteType} />
                <DebugPanel
                    debugMode={debugMode}
                    onToggle={setDebugMode}
                    logs={logs}
                    onClearLogs={clearLogs}
                    onExportLogs={exportLogs}
                    toolName="見積計算v2"
                />
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <EstimatorLayoutV2
                appData={appData}
                customers={database?.customers?.data || []}
                onNavigateHome={handleNavigateHome}
                database={database as Database}
                setDatabase={setDatabase as React.Dispatch<React.SetStateAction<Database | null>>}
                estimatorState={state}
                setEstimatorState={setState}
                costDetails={costDetails}
                updatedItems={updatedItems}
                onAddGroup={handleAddGroup}
                onRemoveGroup={handleRemoveGroup}
                onDuplicateGroup={handleDuplicateGroup}
                initialDocumentType={editDocumentType}
                initialTemplateId={editTemplateId}
                onBackToDocumentList={onBackToDocumentList}
                isNewDocument={isNewDocument}
            />
            <DebugPanel
                debugMode={debugMode}
                onToggle={setDebugMode}
                logs={logs}
                onClearLogs={clearLogs}
                onExportLogs={exportLogs}
                toolName="見積計算v2"
            />
        </React.Fragment>
    );
};

export default EstimatorPageV2;



