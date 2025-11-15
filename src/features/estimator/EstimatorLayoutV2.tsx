import React, { useEffect, useMemo, useState, useRef } from 'react';
// FIX: Corrected import path for types.
import PrintableEstimate from '../../shared/components/PrintableEstimate';
import { AppData, CostDetails, EstimatorState, OrderDetail, Row } from '../../shared/types';
import { PageHeader } from '../../shared/ui/molecules/PageHeader';
import { Button } from '../../shared/ui/atoms/Button';
import { PrinterIcon, ArrowUturnLeftIcon } from '../../shared/ui/atoms/icons';
import DestinationSenderSection from './organisms/DestinationSenderSection';
import DocumentSettingsSection from './organisms/DocumentSettingsSection';
import ProcessingGroupSection from './organisms/ProcessingGroupSection';
import { saveQuoteToDatabase } from './utils/saveQuote';
import ToggleSwitch from '../../shared/ui/atoms/ToggleSwitch';
import { generateNewId } from '../id-manager/services/idService';

interface EstimatorLayoutV2Props {
    appData: AppData;
    customers: Row[];
    database: any;
    setDatabase: React.Dispatch<React.SetStateAction<any | null>>;
    estimatorState: EstimatorState;
    setEstimatorState: React.Dispatch<React.SetStateAction<EstimatorState>>;
    costDetails: CostDetails;
    updatedItems: OrderDetail[];
    onNavigateHome: () => void;
    onAddGroup: () => void;
    onRemoveGroup: (groupId: string) => void;
    onDuplicateGroup: (groupId: string) => void;
    initialDocumentType?: 'estimate' | 'invoice' | 'delivery_slip' | 'receipt' | null;
    initialTemplateId?: string | null; // 編集時に既存のテンプレートIDを設定
    onBackToDocumentList?: (savedQuoteId?: string) => void; // 保存後に帳票管理画面に戻る関数（保存した見積書のIDを渡す）
    isNewDocument?: boolean; // 新規作成モードかどうか
}

const EstimatorLayoutV2: React.FC<EstimatorLayoutV2Props> = (props) => {
    const { estimatorState, setEstimatorState, costDetails, onAddGroup, onRemoveGroup, onDuplicateGroup, initialDocumentType, initialTemplateId, onBackToDocumentList, isNewDocument = false } = props;
    const [documentType, setDocumentType] = useState<'estimate' | 'delivery_slip' | 'invoice' | 'receipt'>(
        (initialDocumentType as 'estimate' | 'delivery_slip' | 'invoice' | 'receipt') || 'estimate'
    );
    // 編集時は既存のテンプレートIDを使用、新規作成時はnull
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [activeTab, setActiveTab] = useState<'products' | 'destination' | 'settings'>('products');
    const [isSaved, setIsSaved] = useState(false); // 保存済みかどうか
    const [isCustomEstimateId, setIsCustomEstimateId] = useState(false); // 見積書番号を個別修正するかどうか
    const [isConvertMenuOpen, setIsConvertMenuOpen] = useState(false); // 変換メニューの開閉状態
    const [documentSettings, setDocumentSettings] = useState<any>(null); // 帳票設定
    const previewRef = useRef<HTMLDivElement>(null);
    
    // 下書き判定（estimateIdがDRAFT-で始まる場合）
    const isDraft = useMemo(() => {
        return estimatorState.estimateId?.startsWith('DRAFT-') || false;
    }, [estimatorState.estimateId]);

    // 帳票タイプのラベル
    const documentTypeLabels: Record<string, string> = {
        'estimate': '見積書',
        'invoice': '請求書',
        'delivery_slip': '納品書',
        'receipt': '領収書'
    };

            // テンプレートを取得（見積書、納品書、請求書、領収書）
    const templates = useMemo(() => {
        const typeMap = {
            'estimate': 'estimate',
            'delivery_slip': 'delivery_slip',
            'invoice': 'invoice',
            'receipt': 'receipt'
        };
        return props.database.pdf_templates?.data.filter(t => t.type === typeMap[documentType]) || [];
    }, [props.database.pdf_templates, documentType]);

    const totalQuantity = useMemo(() => 
        estimatorState.processingGroups.flatMap(g => g.items).reduce((sum, item) => sum + item.quantity, 0), 
        [estimatorState.processingGroups]
    );

    const customerInfoForComponents = useMemo(() => ({
        companyName: estimatorState.customerInfo.company_name as string || '',
        nameKanji: estimatorState.customerInfo.name_kanji as string || '',
        nameKana: estimatorState.customerInfo.name_kana as string || '',
        email: estimatorState.customerInfo.email as string || '',
        phone: estimatorState.customerInfo.phone as string || '',
        zipCode: estimatorState.customerInfo.zip_code as string || '',
        address1: estimatorState.customerInfo.address1 as string || '',
        address2: estimatorState.customerInfo.address2 as string || '',
        notes: estimatorState.customerInfo.notes as string || '',
        customer_group_id: estimatorState.customerInfo.customer_group_id as string || 'cgrp_00001',
        has_separate_shipping_address: !!estimatorState.customerInfo.has_separate_shipping_address,
        shipping_name: estimatorState.customerInfo.shipping_name as string || '',
        shipping_phone: estimatorState.customerInfo.shipping_phone as string || '',
        shipping_zip_code: estimatorState.customerInfo.shipping_zip_code as string || '',
        shipping_address1: estimatorState.customerInfo.shipping_address1 as string || '',
        shipping_address2: estimatorState.customerInfo.shipping_address2 as string || ''
    }), [estimatorState.customerInfo]);

    const { blocks, margins } = useMemo(() => {
        if (!selectedTemplateId) return { blocks: [], margins: { top: 20, right: 15, bottom: 20, left: 15 } };
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template?.config_json) {
            try {
                const config = JSON.parse(template.config_json as string);
                return {
                    blocks: config.blocks || [],
                    margins: config.margins || { top: 20, right: 15, bottom: 20, left: 15 }
                };
            } catch (e) {
                console.error("Failed to parse template config", e);
            }
        }
        return { blocks: [], margins: { top: 20, right: 15, bottom: 20, left: 15 } };
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        if (!selectedTemplateId && templates.length > 0) {
            setSelectedTemplateId(templates[0].id as string);
        }
    }, [templates, selectedTemplateId]);

    useEffect(() => {
        // ドキュメントタイプが変わったら、テンプレートをリセット
        setSelectedTemplateId(null);
    }, [documentType]);

    // 見積書番号を生成（連番管理）
    const generateQuoteId = () => {
        if (isCustomEstimateId && estimatorState.estimateId) {
            // 個別修正モードの場合、現在のIDを使用
            return estimatorState.estimateId;
        }
        // 連番管理を使用してIDを生成
        return generateNewId('quotes', props.database);
    };

    // 下書き番号を生成（下書き連番）
    const generateDraftId = () => {
        // 下書き用のプレフィックスを追加（例: DRAFT-）
        const draftId = generateNewId('quotes', props.database);
        return `DRAFT-${draftId}`;
    };

    const handleSave = async (isDraft: boolean = false) => {
        if (totalQuantity === 0 || !estimatorState.customerInfo.id || !selectedTemplateId) {
            alert('保存するには、数量・顧客情報・テンプレートが設定されている必要があります。');
            return;
        }

        if (isDraft) {
            setIsSavingDraft(true);
        } else {
            setIsSaving(true);
        }

        try {
            // 見積書IDを生成（下書きの場合は下書きID）
            const quoteId = isDraft ? generateDraftId() : generateQuoteId();
            
            // 見積書IDを更新
            const updatedState = {
                ...estimatorState,
                estimateId: quoteId
            };

            const result = await saveQuoteToDatabase({
                estimatorState: updatedState,
                costDetails,
                updatedItems: props.updatedItems,
                database: props.database,
                setDatabase: props.setDatabase,
                documentType: documentType,
                templateId: selectedTemplateId,
                documentSettings: documentSettings, // 帳票設定を保存
            });

            if (result.success) {
                // 保存成功後、estimatorStateを更新
                setEstimatorState(updatedState);
                setIsSaved(true);

                if (isDraft) {
                    alert(`${documentTypeLabels[documentType] || '帳票'}を下書きとして保存しました。`);
                } else {
                    alert(`${documentTypeLabels[documentType] || '帳票'}を保存しました。`);
                    // 通常保存時は帳票管理画面に戻る（新規作成・編集問わず）
                    if (onBackToDocumentList) {
                        // 保存した見積書のIDを渡す
                        onBackToDocumentList(quoteId);
                    }
                }
            } else {
                alert(`保存に失敗しました: ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to save quote:', error);
            alert('見積書の保存中にエラーが発生しました。');
        } finally {
            setIsSaving(false);
            setIsSavingDraft(false);
        }
    };

    const handleCancel = () => {
        if (window.confirm('編集中の内容を破棄して帳票管理画面に戻りますか？')) {
            if (onBackToDocumentList) {
                onBackToDocumentList();
            }
        }
    };

    const handlePrint = async () => {
        if (!isSaved) {
            alert('印刷するには、まず保存してください。');
            return;
        }

        try {
            // PDF生成APIを呼び出して印刷用に開く
            const response = await fetch('/api/generate-pdf.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: documentType === 'invoice' ? 'invoice' : 'quote',
                    data: {
                        documentType,
                        estimatorState,
                        costDetails,
                        processingGroups: estimatorState.processingGroups,
                        customerInfo: customerInfoForComponents,
                        companyInfo: estimatorState.senderInfo,
                        estimateId: estimatorState.estimateId,
                    }
                })
            });

            // Content-Typeをチェック
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'PDF生成に失敗しました');
            }

            if (!response.ok) {
                throw new Error(`PDF生成に失敗しました (HTTP ${response.status})`);
            }

            const blob = await response.blob();
            
            // blobが空でないかチェック
            if (blob.size === 0) {
                throw new Error('PDFファイルが空です');
            }
            
            const url = window.URL.createObjectURL(blob);
            
            // 新しいウィンドウでPDFを開く（ブラウザの印刷ダイアログが表示される）
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                // ポップアップブロックされた場合、ダウンロードにフォールバック
                const customerName = estimatorState.customerInfo.company_name || estimatorState.customerInfo.name_kanji || '顧客名';
                const customerSuffix = estimatorState.customerInfo.company_name ? '御中' : '様';
                const fileName = `${estimatorState.estimateId}_${customerName}${customerSuffix}_${documentTypeLabels[documentType]}.pdf`;
                
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            // 少し遅延してからURLを解放
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (error) {
            console.error('Failed to generate PDF for print:', error);
            const errorMessage = error instanceof Error ? error.message : 'PDFの生成に失敗しました。';
            alert(`PDFの生成に失敗しました: ${errorMessage}`);
        }
    };

    const handleDownloadPDF = async () => {
        if (!isSaved) {
            alert('PDFをダウンロードするには、まず保存してください。');
            return;
        }

        try {
            // PDF生成APIを呼び出す
            const response = await fetch('/api/generate-pdf.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'quote',
                    data: {
                        documentType,
                        estimatorState,
                        costDetails,
                        processingGroups: estimatorState.processingGroups,
                        customerInfo: customerInfoForComponents,
                        companyInfo: estimatorState.senderInfo,
                        estimateId: estimatorState.estimateId,
                    }
                })
            });

            // Content-Typeをチェックしてエラーかどうかを判定
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // JSONレスポンスの場合はエラー
                const errorData = await response.json();
                throw new Error(errorData.error || 'PDF生成に失敗しました');
            }

            if (!response.ok) {
                throw new Error(`PDF生成に失敗しました (HTTP ${response.status})`);
            }

            const blob = await response.blob();
            
            // blobが空でないかチェック
            if (blob.size === 0) {
                throw new Error('PDFファイルが空です');
            }
            
            const url = window.URL.createObjectURL(blob);
            
            // ファイル名を生成
            const customerName = estimatorState.customerInfo.company_name || estimatorState.customerInfo.name_kanji || '顧客名';
            const customerSuffix = estimatorState.customerInfo.company_name ? '御中' : '様';
            const fileName = `${estimatorState.estimateId}_${customerName}${customerSuffix}_${estimatorState.estimateId}_${documentTypeLabels[documentType]}.pdf`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'PDFのダウンロードに失敗しました。';
            alert(`PDFのダウンロードに失敗しました: ${errorMessage}`);
        }
    };

    // 下書きから通常の帳票に変換
    const handleConvertDraft = async (targetType: 'estimate' | 'delivery_slip' | 'invoice') => {
        if (!isDraft) return;
        
        if (!window.confirm(`下書きを${documentTypeLabels[targetType]}に変換しますか？`)) {
            return;
        }

        try {
            // 新しい見積書IDを生成（下書きプレフィックスを削除）
            const newQuoteId = generateNewId('quotes', props.database);
            
            // documentTypeを変更
            setDocumentType(targetType);
            
            // estimateIdを更新（下書きプレフィックスを削除）
            const updatedState = {
                ...estimatorState,
                estimateId: newQuoteId
            };
            setEstimatorState(updatedState);

            // データベースに保存（通常保存として）
            const result = await saveQuoteToDatabase({
                estimatorState: updatedState,
                costDetails,
                updatedItems: props.updatedItems,
                database: props.database,
                setDatabase: props.setDatabase,
                documentType: targetType,
                templateId: selectedTemplateId,
            });

            if (result.success) {
                setIsSaved(true);
                alert(`下書きを${documentTypeLabels[targetType]}に変換しました。`);
            } else {
                alert(`変換に失敗しました: ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to convert draft:', error);
            alert('下書きの変換中にエラーが発生しました。');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* 新規作成・編集モードのヘッダー（統一） */}
            {(isNewDocument || (!isDraft && onBackToDocumentList)) && (
                <div className="flex-shrink-0 bg-base-100 dark:bg-base-dark-200 border-b border-default dark:border-default-dark p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-2xl font-bold">
                                {documentTypeLabels[documentType]} {isNewDocument ? '新規作成' : '編集'}
                            </h1>
                            {/* 見積書番号の個別修正トグル */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted dark:text-muted-dark">見積書番号を個別修正</span>
                                <ToggleSwitch
                                    checked={isCustomEstimateId}
                                    onChange={setIsCustomEstimateId}
                                />
                            </div>
                            {isCustomEstimateId && (
                                <>
                                    <label htmlFor="custom-estimate-id-input" className="sr-only">見積書番号</label>
                                    <input
                                        id="custom-estimate-id-input"
                                        name="custom-estimate-id"
                                        type="text"
                                        value={estimatorState.estimateId}
                                        onChange={(e) => setEstimatorState({ ...estimatorState, estimateId: e.target.value })}
                                        className="px-2 py-1 border rounded-md bg-base-200 dark:bg-base-dark-300 text-sm"
                                        placeholder="見積書番号"
                                    />
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={totalQuantity === 0 || !estimatorState.customerInfo.id || !selectedTemplateId || isSaving || isSavingDraft}
                                variant="primary"
                                size="md"
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                            {/* 下書き保存は新規作成時のみ表示 */}
                            {isNewDocument && (
                                <Button
                                    onClick={() => handleSave(true)}
                                    disabled={totalQuantity === 0 || !estimatorState.customerInfo.id || !selectedTemplateId || isSaving || isSavingDraft}
                                    variant="secondary"
                                    size="md"
                                >
                                    {isSavingDraft ? '下書き保存中...' : '下書き保存'}
                                </Button>
                            )}
                            <Button
                                onClick={handleCancel}
                                variant="muted"
                                size="md"
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handlePrint}
                                disabled={!isSaved}
                                variant="secondary"
                                size="md"
                                className="flex items-center gap-2"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                印刷
                            </Button>
                            <Button
                                onClick={handleDownloadPDF}
                                disabled={!isSaved}
                                variant="secondary"
                                size="md"
                            >
                                PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* 下書き編集モードのヘッダー */}
            {!isNewDocument && isDraft && (
                <div className="flex-shrink-0 bg-base-100 dark:bg-base-dark-200 border-b border-default dark:border-default-dark p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-2xl font-bold">下書き編集</h1>
                            {/* 変換ボタン（下書きのみ） */}
                            <div className="relative">
                                <Button
                                    onClick={() => setIsConvertMenuOpen(!isConvertMenuOpen)}
                                    variant="secondary"
                                    size="md"
                                    className="flex items-center gap-2"
                                >
                                    変換
                                    </Button>
                                {isConvertMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsConvertMenuOpen(false)}
                                        />
                                        <div className="absolute left-0 top-full mt-2 z-50 bg-base-100 dark:bg-base-dark-200 border border-default dark:border-default-dark rounded-lg shadow-lg min-w-[150px] overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    handleConvertDraft('estimate');
                                                    setIsConvertMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-base-content dark:text-base-dark transition-colors"
                                            >
                                                見積書
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleConvertDraft('delivery_slip');
                                                    setIsConvertMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-base-content dark:text-base-dark transition-colors"
                                            >
                                                納品書
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleConvertDraft('invoice');
                                                    setIsConvertMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-base-content dark:text-base-dark transition-colors"
                                            >
                                                請求書
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={totalQuantity === 0 || !estimatorState.customerInfo.id || !selectedTemplateId || isSaving || isSavingDraft}
                                variant="primary"
                                size="md"
                            >
                                {isSaving ? '保存中...' : '保存'}
                            </Button>
                            <Button
                                onClick={handleCancel}
                                variant="muted"
                                size="md"
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* メインコンテンツエリア - 帳票管理と同じスタイル */}
            <div className="flex-grow flex flex-col min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-grow min-h-0">
                    {/* 左側: フォーム（帳票管理に合わせた幅） */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col bg-transparent min-h-0 overflow-hidden">
                        {/* タブ */}
                        <div className="flex-shrink-0 flex border-b border-default dark:border-default-dark bg-base-100 dark:bg-base-dark-200 mb-4" style={{ borderRadius: 'var(--border-radius, 0.375rem)' }}>
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === 'products'
                                        ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark border-b-2 border-button-primary-bg dark:border-button-primary-bg-dark'
                                        : 'text-base-content dark:text-base-dark hover:bg-hover-bg dark:hover:bg-hover-bg-dark'
                                }`}
                                style={{ 
                                    borderTopLeftRadius: 'var(--border-radius, 0.375rem)',
                                    borderTopRightRadius: activeTab === 'products' ? 'var(--border-radius, 0.375rem)' : '0'
                                }}
                            >
                                1. 商品・印刷
                            </button>
                            <button
                                onClick={() => setActiveTab('destination')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === 'destination'
                                        ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark border-b-2 border-button-primary-bg dark:border-button-primary-bg-dark'
                                        : 'text-base-content dark:text-base-dark hover:bg-hover-bg dark:hover:bg-hover-bg-dark'
                                }`}
                            >
                                2. 宛先・送主
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === 'settings'
                                        ? 'bg-button-primary-bg text-button-primary dark:bg-button-primary-bg-dark dark:text-button-primary-dark border-b-2 border-button-primary-bg dark:border-button-primary-bg-dark'
                                        : 'text-base-content dark:text-base-dark hover:bg-hover-bg dark:hover:bg-hover-bg-dark'
                                }`}
                                style={{ 
                                    borderTopRightRadius: 'var(--border-radius, 0.375rem)',
                                    borderTopLeftRadius: activeTab === 'settings' ? 'var(--border-radius, 0.375rem)' : '0'
                                }}
                            >
                                3. 設定
                            </button>
                        </div>
                        
                        {/* タブコンテンツ */}
                        <div className="flex-1 overflow-y-auto space-y-6">
                            {activeTab === 'products' && (
                                <ProcessingGroupSection 
                                    estimatorState={estimatorState} 
                                    setEstimatorState={setEstimatorState} 
                                    appData={props.appData} 
                                    onAddGroup={onAddGroup}
                                    onRemoveGroup={onRemoveGroup}
                                    onDuplicateGroup={onDuplicateGroup}
                                />
                            )}
                            
                            {activeTab === 'destination' && (
                                <DestinationSenderSection
                                    estimatorState={estimatorState}
                                    setEstimatorState={setEstimatorState}
                                    customers={props.customers}
                                    appData={props.appData}
                                />
                            )}
                            
                            {activeTab === 'settings' && (
                                <DocumentSettingsSection
                                    documentType={documentType}
                                    database={props.database}
                                    selectedTemplateId={selectedTemplateId}
                                    onTemplateIdChange={setSelectedTemplateId}
                                    onSettingsChange={setDocumentSettings}
                                    initialSettings={documentSettings}
                                />
                            )}
                        </div>
                    </div>

                    {/* 右側: 印刷ライブプレビュー（帳票管理に合わせた幅） */}
                    <div className="hidden md:flex md:col-span-7 lg:col-span-8 rounded-lg shadow-inner overflow-hidden relative">
                        {selectedTemplateId ? (
                            <div className="flex-1 overflow-auto">
                                <PrintableEstimate 
                                    templateId={selectedTemplateId}
                                    templates={templates}
                                    database={props.database}
                                    documentType={documentType}
                                    orderDetails={props.updatedItems}
                                    processingGroups={estimatorState.processingGroups}
                                    cost={costDetails} 
                                    totalQuantity={totalQuantity} 
                                    customerInfo={customerInfoForComponents}
                                    estimateId={estimatorState.estimateId} 
                                    companyInfo={estimatorState.senderInfo!}
                                    onClose={() => {}}
                                    isBringInMode={estimatorState.isBringInMode}
                                    showGroupTotalsInPdf={true}
                                    blocks={blocks}
                                    margins={margins}
                                    isEmbedded={true}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                <p>テンプレートを選択してください</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstimatorLayoutV2;
